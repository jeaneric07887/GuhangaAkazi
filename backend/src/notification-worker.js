const pool = require('./db')
const { sendContactEmail, isEmailConfigured } = require('./contact-email')
const { sendWhatsAppNotification, isWhatsAppConfigured } = require('./whatsapp')

const MAX_ATTEMPTS = 8
const RETRY_INTERVAL_MS = 15_000

async function processNextNotification() {
  const client = await pool.connect()
  let notification
  try {
    await client.query('BEGIN')
    const claimed = await client.query(
      `UPDATE notification_outbox
       SET status = 'processing', attempts = attempts + 1, locked_until = NOW() + INTERVAL '2 minutes'
       WHERE id = (
         SELECT id FROM notification_outbox
         WHERE (status IN ('pending', 'retrying') AND next_attempt_at <= NOW())
            OR (status = 'processing' AND locked_until < NOW())
         ORDER BY created_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, conversation_id, message_id, channel, attempts`,
    )
    notification = claimed.rows[0]
    if (!notification) {
      await client.query('COMMIT')
      return false
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.email, c.whatsapp_number, c.contact_type, m.body AS message
       FROM conversations c
       JOIN conversation_messages m ON m.conversation_id = c.id
       WHERE c.id = $1 AND m.id = $2`,
      [notification.conversation_id, notification.message_id],
    )
    const conversation = result.rows[0]
    if (!conversation) throw new Error('The conversation for this notification no longer exists.')

    if (notification.channel === 'email') await sendContactEmail(conversation)
    else await sendWhatsAppNotification(conversation)

    await pool.query(
      `UPDATE notification_outbox
       SET status = 'sent', sent_at = NOW(), locked_until = NULL, last_error = NULL
       WHERE id = $1`,
      [notification.id],
    )
  } catch (error) {
    const terminal = notification.attempts >= MAX_ATTEMPTS
    const retrySeconds = Math.min(60 * (2 ** (notification.attempts - 1)), 21_600)
    await pool.query(
      `UPDATE notification_outbox
       SET status = $2, next_attempt_at = NOW() + ($3 * INTERVAL '1 second'),
           locked_until = NULL, last_error = $4
       WHERE id = $1`,
      [
        notification.id,
        terminal ? 'failed' : 'retrying',
        retrySeconds,
        String(error.message || 'Notification failed').slice(0, 1000),
      ],
    )
    console.error(
      `Contact ${notification.channel} notification ${notification.id} ${terminal ? 'failed permanently' : `will retry in ${retrySeconds} seconds`}:`,
      error.message,
    )
  }
  return true
}

async function processPendingNotifications() {
  for (;;) {
    if (!await processNextNotification()) return
  }
}

function startNotificationWorker() {
  const missingChannels = []
  if (!isEmailConfigured()) missingChannels.push('email (configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD)')
  if (!isWhatsAppConfigured()) {
    missingChannels.push('WhatsApp (configure the Meta Cloud API credentials, recipient, and approved template)')
  }
  if (missingChannels.length) {
    console.error(`Contact notifications are not fully configured: ${missingChannels.join('; ')}.`)
  }

  let running = false
  const run = async () => {
    if (running) return
    running = true
    try {
      await processPendingNotifications()
    } catch (error) {
      console.error('Could not process the contact notification queue:', error.message)
    } finally {
      running = false
    }
  }

  void run()
  const timer = setInterval(run, RETRY_INTERVAL_MS)
  timer.unref()
  return () => clearInterval(timer)
}

module.exports = { MAX_ATTEMPTS, processNextNotification, processPendingNotifications, startNotificationWorker }
