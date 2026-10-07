function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN
    && process.env.WHATSAPP_PHONE_NUMBER_ID
    && process.env.WHATSAPP_RECIPIENT
    && process.env.WHATSAPP_TEMPLATE_NAME,
  )
}

function normalizeWhatsAppNumber(value) {
  const digits = value.replace(/\D/g, '')
  const international = digits.startsWith('00') ? digits.slice(2) : digits
  const normalized = international.startsWith('0')
    ? `250${international.slice(1)}`
    : international
  if (!/^[1-9]\d{7,14}$/.test(normalized)) return null
  return normalized
}

async function sendWhatsAppNotification(conversation, fetchRequest = fetch) {
  if (!isWhatsAppConfigured()) {
    throw new Error('WhatsApp Cloud API credentials and template settings are incomplete.')
  }
  const version = process.env.WHATSAPP_API_VERSION || 'v23.0'
  const recipient = normalizeWhatsAppNumber(process.env.WHATSAPP_RECIPIENT)
  if (!/^v\d+\.\d+$/.test(version) || !recipient) {
    throw new Error('WhatsApp API version or recipient number is invalid.')
  }

  const response = await fetchRequest(
    `https://graph.facebook.com/${version}/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: process.env.WHATSAPP_TEMPLATE_NAME,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: conversation.name.slice(0, 100) },
              { type: 'text', text: `+${conversation.whatsapp_number}` },
              { type: 'text', text: conversation.message.slice(0, 900) || 'No message text' },
            ],
          }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = typeof errorData.error?.message === 'string'
      ? errorData.error.message
      : `WhatsApp Cloud API returned HTTP ${response.status}.`
    throw new Error(message)
  }
}

module.exports = { isWhatsAppConfigured, normalizeWhatsAppNumber, sendWhatsAppNotification }
