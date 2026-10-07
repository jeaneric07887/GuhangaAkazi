const { afterEach, test } = require('node:test')
const assert = require('node:assert/strict')
const { isWhatsAppConfigured, normalizeWhatsAppNumber, sendWhatsAppNotification } = require('../src/whatsapp')

const keys = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_RECIPIENT',
  'WHATSAPP_TEMPLATE_NAME',
  'WHATSAPP_TEMPLATE_LANGUAGE',
  'WHATSAPP_API_VERSION',
]
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key]
    else process.env[key] = original[key]
  }
})

test('normalizes local Rwanda numbers and validates international numbers', () => {
  assert.equal(normalizeWhatsAppNumber('0798 740 065'), '250798740065')
  assert.equal(normalizeWhatsAppNumber('+250 798 740 065'), '250798740065')
  assert.equal(normalizeWhatsAppNumber('0044 7700 900123'), '447700900123')
  assert.equal(normalizeWhatsAppNumber('not-a-number'), null)
  assert.equal(normalizeWhatsAppNumber('123'), null)
})

test('sends a Meta WhatsApp Cloud API template notification', async () => {
  Object.assign(process.env, {
    WHATSAPP_ACCESS_TOKEN: 'test-access-token',
    WHATSAPP_PHONE_NUMBER_ID: 'phone-number-id',
    WHATSAPP_RECIPIENT: '0798740065',
    WHATSAPP_TEMPLATE_NAME: 'website_contact_notification',
    WHATSAPP_TEMPLATE_LANGUAGE: 'en_US',
    WHATSAPP_API_VERSION: 'v23.0',
  })
  let requestedUrl
  let requestedOptions
  await sendWhatsAppNotification({
    name: 'A visitor',
    whatsapp_number: '250700000001',
    message: 'Please send more information.',
  }, async (url, options) => {
    requestedUrl = url
    requestedOptions = options
    return { ok: true }
  })
  assert.equal(requestedUrl, 'https://graph.facebook.com/v23.0/phone-number-id/messages')
  assert.equal(requestedOptions.headers.Authorization, 'Bearer test-access-token')
  const payload = JSON.parse(requestedOptions.body)
  assert.equal(payload.to, '250798740065')
  assert.equal(payload.type, 'template')
  assert.equal(payload.template.name, 'website_contact_notification')
  assert.deepEqual(payload.template.components[0].parameters.map((parameter) => parameter.text), [
    'A visitor',
    '+250700000001',
    'Please send more information.',
  ])
})

test('keeps WhatsApp provider failures visible to notification retries', async () => {
  Object.assign(process.env, {
    WHATSAPP_ACCESS_TOKEN: 'test-access-token',
    WHATSAPP_PHONE_NUMBER_ID: 'phone-number-id',
    WHATSAPP_RECIPIENT: '250798740065',
    WHATSAPP_TEMPLATE_NAME: 'website_contact_notification',
  })
  assert.equal(isWhatsAppConfigured(), true)
  await assert.rejects(
    sendWhatsAppNotification({ name: 'A visitor', whatsapp_number: '250700000001', message: 'Hello' }, async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Template has not been approved.' } }),
    })),
    /Template has not been approved/,
  )
})
