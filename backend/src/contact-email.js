const nodemailer = require('nodemailer')

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'jeaneric07887@gmail.com'

const contactTypes = {
  message: 'General message',
  question: 'Question',
  problem: 'Problem report',
  suggestion: 'Suggestion',
  feedback: 'Feedback',
}

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
}

async function sendContactEmail(contact, createTransport = nodemailer.createTransport) {
  if (!isEmailConfigured()) throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASSWORD must be configured to send contact notifications.')

  const transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.CONTACT_EMAIL || CONTACT_EMAIL,
    replyTo: contact.email,
    subject: `[GuhangaAkazi] ${contactTypes[contact.contact_type]} from ${contact.name}`,
    text: [
      `Name: ${contact.name}`,
      `Email: ${contact.email}`,
      `WhatsApp: +${contact.whatsapp_number}`,
      `Type: ${contactTypes[contact.contact_type]}`,
      `Conversation ID: ${contact.id}`,
      '',
      contact.message,
      '',
      'Open the Admin Dashboard to reply to this conversation.',
    ].join('\n'),
  })
  return true
}

module.exports = { CONTACT_EMAIL, contactTypes, isEmailConfigured, sendContactEmail }
