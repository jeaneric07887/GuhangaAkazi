const { afterEach, test } = require('node:test')
const assert = require('node:assert/strict')
const { isEmailConfigured, sendContactEmail } = require('../src/contact-email')

const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'CONTACT_EMAIL']
const originalSmtpSettings = Object.fromEntries(smtpKeys.map((key) => [key, process.env[key]]))
const contact = {
  id: 12,
  name: 'Jane Visitor',
  email: 'jane@example.test',
  contact_type: 'question',
  message: 'How do I get started?',
}

afterEach(() => {
  for (const key of smtpKeys) {
    if (originalSmtpSettings[key] === undefined) delete process.env[key]
    else process.env[key] = originalSmtpSettings[key]
  }
})

test('sends contact details to the site email and allows a direct reply', async () => {
  Object.assign(process.env, {
    CONTACT_EMAIL: 'site@example.test',
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'sender@example.test',
    SMTP_PASSWORD: 'test-only-password',
    SMTP_FROM: 'GuhangaAkazi <sender@example.test>',
  })
  let transportSettings
  let email

  const sent = await sendContactEmail(contact, (settings) => {
    transportSettings = settings
    return { sendMail: async (options) => { email = options } }
  })

  assert.equal(sent, true)
  assert.equal(transportSettings.host, 'smtp.example.test')
  assert.equal(transportSettings.port, 587)
  assert.equal(transportSettings.secure, false)
  assert.equal(email.to, 'site@example.test')
  assert.equal(email.replyTo, contact.email)
  assert.match(email.subject, /Question from Jane Visitor/)
  assert.match(email.text, /How do I get started\?/)
})

test('reports when SMTP is not configured so the notification queue can retry', async () => {
  for (const key of smtpKeys) delete process.env[key]
  assert.equal(isEmailConfigured(), false)
  await assert.rejects(
    sendContactEmail(contact, () => {
      throw new Error('Transport should not be created without SMTP settings.')
    }),
    /SMTP_HOST, SMTP_USER, and SMTP_PASSWORD/,
  )
})

test('reports email delivery errors to the caller', async () => {
  process.env.SMTP_HOST = 'smtp.example.test'
  process.env.SMTP_USER = 'sender@example.test'
  process.env.SMTP_PASSWORD = 'test-only-password'

  await assert.rejects(
    sendContactEmail(contact, () => ({
      sendMail: async () => { throw new Error('SMTP rejected the message.') },
    })),
    /SMTP rejected the message/,
  )
})
