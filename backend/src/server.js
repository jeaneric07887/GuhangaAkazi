require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const { rateLimit } = require('express-rate-limit')
const pool = require('./db')
const { requireAdmin } = require('./middleware/auth')
const { requireUser } = require('./middleware/user-auth')
const { requireJwtSecret } = require('./middleware/jwt-secret')
const { contactTypes } = require('./contact-email')
const { normalizeWhatsAppNumber } = require('./whatsapp')
const { startNotificationWorker } = require('./notification-worker')

const app = express()
const PORT = Number(process.env.PORT || 4000)
const JWT_SECRET = process.env.JWT_SECRET
const uploadDirectory = path.join(__dirname, '..', 'uploads')
const mediaTypes = {
  'image/jpeg': { extension: 'jpg', category: 'image', matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/png': { extension: 'png', category: 'image', matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/gif': { extension: 'gif', category: 'image', matches: (bytes) => /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6)) },
  'image/webp': { extension: 'webp', category: 'image', matches: (bytes) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' },
  'image/avif': { extension: 'avif', category: 'image', matches: (bytes) => bytes.toString('ascii', 4, 8) === 'ftyp' && /^(avif|avis)$/.test(bytes.toString('ascii', 8, 12)) },
  'image/bmp': { extension: 'bmp', category: 'image', matches: (bytes) => bytes.toString('ascii', 0, 2) === 'BM' },
  'image/tiff': { extension: 'tiff', category: 'image', matches: (bytes) => ['II*\0', 'MM\0*'].includes(bytes.toString('ascii', 0, 4)) },
  'image/heic': { extension: 'heic', category: 'image', matches: (bytes) => bytes.toString('ascii', 4, 8) === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(bytes.toString('ascii', 8, 12)) },
  'image/heif': { extension: 'heif', category: 'image', matches: (bytes) => bytes.toString('ascii', 4, 8) === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(bytes.toString('ascii', 8, 12)) },
  'image/x-icon': { extension: 'ico', category: 'image', matches: (bytes) => bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0 },
  'image/vnd.microsoft.icon': { extension: 'ico', category: 'image', matches: (bytes) => bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0 },
  'video/mp4': { extension: 'mp4', category: 'video', matches: (bytes) => bytes.toString('ascii', 4, 8) === 'ftyp' },
  'video/webm': { extension: 'webm', category: 'video', matches: (bytes) => bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  'video/quicktime': { extension: 'mov', category: 'video', matches: (bytes) => bytes.toString('ascii', 4, 8) === 'ftyp' },
  'video/x-msvideo': { extension: 'avi', category: 'video', matches: (bytes) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'AVI ' },
  'video/x-matroska': { extension: 'mkv', category: 'video', matches: (bytes) => bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  'video/x-ms-wmv': { extension: 'wmv', category: 'video', matches: (bytes) => bytes.subarray(0, 16).equals(Buffer.from([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c])) },
  'video/mpeg': { extension: 'mpeg', category: 'video', matches: (bytes) => bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0xba])) || bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0xb3])) },
  'video/3gpp': { extension: '3gp', category: 'video', matches: (bytes) => bytes.toString('ascii', 4, 8) === 'ftyp' },
  'video/3gpp2': { extension: '3g2', category: 'video', matches: (bytes) => bytes.toString('ascii', 4, 8) === 'ftyp' },
  'video/ogg': { extension: 'ogv', category: 'video', matches: (bytes) => bytes.toString('ascii', 0, 4) === 'OggS' },
  'video/x-flv': { extension: 'flv', category: 'video', matches: (bytes) => bytes.toString('ascii', 0, 3) === 'FLV' },
  'video/x-m4v': { extension: 'm4v', category: 'video', matches: (bytes) => bytes.toString('ascii', 4, 8) === 'ftyp' },
  'video/mp2t': { extension: 'ts', category: 'video', matches: (bytes) => bytes[0] === 0x47 },
}
const contentFields = [
  'title', 'description', 'long_description', 'category', 'image_url',
  'image_description', 'video_url', 'video_description', 'startup_capital',
  'expected_cost', 'expected_revenue', 'requirements', 'equipment',
  'target_customers', 'steps', 'profitability_notes', 'risks', 'tips',
  'featured', 'published',
]
const contentResources = new Set(['ideas', 'opportunities', 'skills'])
const publicPageSlugs = new Set([
  'home', 'ideas', 'skills', 'opportunities', 'about', 'contact', 'search', 'privacy', 'terms',
])
const fieldLabels = {
  title: 'title',
  description: 'short description',
  long_description: 'full description',
  category: 'category',
  startup_capital: 'start-up cost',
  expected_cost: 'expected costs',
  expected_revenue: 'expected income',
  featured: 'home page setting',
  published: 'publish setting',
  image_url: 'image link',
  image_description: 'image description',
  video_url: 'video link',
  video_description: 'video description',
  requirements: 'what you need',
  equipment: 'tools and supplies',
  target_customers: 'target customers',
  steps: 'steps',
  profitability_notes: 'cost and income estimate',
  risks: 'risks',
  tips: 'tips',
}
const publicFields = `id, title, description, long_description, category, image_url, image_description, video_url, video_description, startup_capital, expected_cost, expected_revenue, requirements, equipment, target_customers, steps, profitability_notes, risks, tips, featured, created_at, updated_at`

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    const error = new Error('This website address is not allowed.')
    error.status = 403
    return callback(error)
  },
}))
app.use(express.json({ limit: '32kb' }))
app.use('/uploads', express.static(uploadDirectory, {
  fallthrough: false,
  immutable: true,
  maxAge: '1y',
  dotfiles: 'deny',
}))

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again later.' },
})
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many messages. Please try again later.' },
})

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function validId(value) {
  return /^\d+$/.test(value) && Number(value) > 0
}

function validMediaUrl(value) {
  if (typeof value !== 'string' || value.length > 2000) return false
  if (/^\/uploads\/[a-f0-9-]+\.(?:jpg|png|gif|webp|avif|bmp|tiff|heic|heif|ico|mp4|webm|mov|avi|mkv|wmv|mpeg|3gp|3g2|ogv|flv|m4v|ts)$/i.test(value)) return true
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname)
  } catch {
    return false
  }
}

function validateContent(body, partial = false) {
  const errors = []
  const data = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Please send the information as JSON.'], data }
  }

  for (const key of Object.keys(body)) {
    if (!contentFields.includes(key)) errors.push('Some fields are not allowed.')
  }
  if (!partial || Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 180) {
      errors.push('Title is required and must be 180 characters or less.')
    } else data.title = body.title.trim()
  }
  if (!partial || Object.hasOwn(body, 'description')) {
    if (typeof body.description !== 'string' || !body.description.trim() || body.description.trim().length > 500) {
      errors.push('Short description is required and must be 500 characters or less.')
    } else data.description = body.description.trim()
  }

  for (const field of contentFields) {
    if (field === 'title' || field === 'description' || !Object.hasOwn(body, field)) continue
    const value = body[field]
    if (['startup_capital', 'expected_cost', 'expected_revenue'].includes(field)) {
      if (typeof value !== 'string' || value.length > 200) errors.push(`${fieldLabels[field] || 'Value'} must be text with no more than 200 characters.`)
      else data[field] = value.trim()
    } else if (['featured', 'published'].includes(field)) {
      if (typeof value !== 'boolean') errors.push(`${fieldLabels[field] || 'Value'} must be true or false.`)
      else data[field] = value
    } else if (['image_url', 'video_url'].includes(field)) {
      if (typeof value !== 'string' || value.length > 2000) {
        errors.push(`${fieldLabels[field] || 'Link'} must be text with no more than 2,000 characters.`)
      } else if (value.trim()) {
        try {
          const url = new URL(value.trim())
          if (!['http:', 'https:'].includes(url.protocol)) errors.push(`${fieldLabels[field] || 'Link'} must use HTTP or HTTPS.`)
          else data[field] = value.trim()
        } catch {
          errors.push(`${fieldLabels[field] || 'Link'} must be a valid HTTP or HTTPS link.`)
        }
      } else {
        data[field] = ''
      }
    } else if (typeof value !== 'string' || value.length > (field === 'long_description' || ['requirements', 'equipment', 'target_customers', 'steps', 'profitability_notes', 'risks', 'tips'].includes(field) ? 10000 : 2000)) {
      errors.push(`${fieldLabels[field] || 'Field'} must be text within the allowed length.`)
    } else {
      data[field] = value.trim()
    }
  }
  return { errors, data }
}

function validateContactOrComment(body, isComment) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Please send the information as JSON.' }
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const message = typeof (isComment ? body.comment : body.message) === 'string'
    ? (isComment ? body.comment : body.message).trim()
    : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!name || name.length > 100) return { error: 'Name is required and must be 100 characters or less.' }
  if (!message || message.length > (isComment ? 2000 : 5000)) {
    return { error: `Message is required and must be ${isComment ? 2000 : 5000} characters or less.` }
  }
  if (!isComment && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) {
    return { error: 'Please enter a valid email address.' }
  }
  return { name, message, email }
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1')
  res.json({ status: 'ok', database: 'connected' })
}))

app.get('/', (_req, res) => {
  res.json({
    message: 'GuhangaAkazi API is running.',
    health: '/api/health',
  })
})

app.post('/api/admin/login', requireJwtSecret, loginLimiter, asyncRoute(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })

  const result = await pool.query(
    'SELECT id, name, email, password_hash FROM admins WHERE lower(email) = $1 ORDER BY id LIMIT 1',
    [email],
  )
  const admin = result.rows[0]
  const matches = admin && await bcrypt.compare(password, admin.password_hash)
  if (!matches) return res.status(401).json({ error: 'Email or password is incorrect.' })
  const token = jwt.sign(
    { sub: String(admin.id), email: admin.email, name: admin.name },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      issuer: 'guhangaakazi-api',
      audience: 'admin',
    },
  )
  res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } })
}))

app.post('/api/account/register', requireJwtSecret, submissionLimiter, asyncRoute(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const whatsappNumber = typeof req.body?.whatsapp_number === 'string'
    ? normalizeWhatsAppNumber(req.body.whatsapp_number)
    : null
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!name || name.length > 100) return res.status(400).json({ error: 'Name is required and must be 100 characters or less.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (!whatsappNumber) return res.status(400).json({ error: 'Enter a valid WhatsApp number with its country code.' })
  if (Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password must be between 12 and 72 UTF-8 bytes.' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  let result
  try {
    result = await pool.query(
      `INSERT INTO users (name, email, whatsapp_number, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, whatsapp_number`,
      [name, email, whatsappNumber, passwordHash],
    )
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with this email address already exists.' })
    throw error
  }
  const user = result.rows[0]
  const token = jwt.sign(
    { sub: String(user.id), email: user.email },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      issuer: 'guhangaakazi-api',
      audience: 'user',
    },
  )
  res.status(201).json({ token, user })
}))

app.post('/api/account/login', requireJwtSecret, loginLimiter, asyncRoute(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })
  const result = await pool.query(
    'SELECT id, name, email, whatsapp_number, password_hash FROM users WHERE email = $1',
    [email],
  )
  const user = result.rows[0]
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' })
  }
  const token = jwt.sign(
    { sub: String(user.id), email: user.email },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      issuer: 'guhangaakazi-api',
      audience: 'user',
    },
  )
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, whatsapp_number: user.whatsapp_number },
  })
}))

app.get('/api/account/me', requireUser, asyncRoute(async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, whatsapp_number FROM users WHERE id = $1',
    [req.user.sub],
  )
  if (!result.rowCount) return res.status(401).json({ error: 'This account is no longer available.' })
  res.json({ user: result.rows[0] })
}))

app.get('/api/messages', requireUser, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT c.id, c.contact_type, c.status, c.created_at, c.updated_at,
            COALESCE(json_agg(json_build_object(
              'id', m.id, 'sender_type', m.sender_type, 'body', m.body, 'created_at', m.created_at
            ) ORDER BY m.created_at, m.id) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS messages
     FROM conversations c
     LEFT JOIN conversation_messages m ON m.conversation_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT 100`,
    [req.user.sub],
  )
  res.json({ items: result.rows })
}))

app.post('/api/contact', requireUser, submissionLimiter, asyncRoute(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!name || name.length > 100) {
    return res.status(400).json({ error: 'Name is required and must be 100 characters or less.' })
  }
  if (!message || message.length > 5000) {
    return res.status(400).json({ error: 'Message is required and must be 5,000 characters or less.' })
  }
  const whatsappNumber = typeof req.body?.whatsapp_number === 'string'
    ? normalizeWhatsAppNumber(req.body.whatsapp_number)
    : null
  if (!whatsappNumber) return res.status(400).json({ error: 'Enter a valid WhatsApp number with its country code.' })
  const contactType = typeof req.body.contact_type === 'string' ? req.body.contact_type : 'message'
  if (!Object.hasOwn(contactTypes, contactType)) {
    return res.status(400).json({ error: 'Choose a valid message type.' })
  }

  const client = await pool.connect()
  let conversation
  try {
    await client.query('BEGIN')
    const user = await client.query(
      'SELECT id, name, email FROM users WHERE id = $1 FOR UPDATE',
      [req.user.sub],
    )
    if (!user.rowCount) {
      await client.query('ROLLBACK')
      return res.status(401).json({ error: 'This account is no longer available.' })
    }
    const account = user.rows[0]
    const result = await client.query(
      `INSERT INTO conversations (user_id, name, email, whatsapp_number, contact_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, contact_type, status, created_at, updated_at`,
      [account.id, name, account.email, whatsappNumber, contactType],
    )
    conversation = result.rows[0]
    const userMessage = await client.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, body)
       VALUES ($1, 'user', $2)
       RETURNING id`,
      [conversation.id, message],
    )
    await client.query(
      `INSERT INTO notification_outbox (conversation_id, message_id, channel)
       VALUES ($1, $2, 'email'), ($1, $2, 'whatsapp')
       ON CONFLICT (message_id, channel) WHERE message_id IS NOT NULL DO NOTHING`,
      [conversation.id, userMessage.rows[0].id],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  res.status(201).json({
    item: { ...conversation, messages: [{ sender_type: 'user', body: message }] },
    message: 'Your message was saved. You can follow its status and any reply on your Messages page.',
  })
}))

app.post('/api/messages/:id/replies', requireUser, submissionLimiter, asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'This conversation ID is not valid.' })
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
  if (!body || body.length > 5000) {
    return res.status(400).json({ error: 'Message is required and must be 5,000 characters or less.' })
  }

  const client = await pool.connect()
  let message
  try {
    await client.query('BEGIN')
    const conversation = await client.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [req.params.id, req.user.sub],
    )
    if (!conversation.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Conversation not found.' })
    }
    const result = await client.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, body)
       VALUES ($1, 'user', $2)
       RETURNING id, sender_type, body, created_at`,
      [req.params.id, body],
    )
    message = result.rows[0]
    await client.query(
      "UPDATE conversations SET status = 'pending', updated_at = NOW() WHERE id = $1",
      [req.params.id],
    )
    await client.query(
      `INSERT INTO notification_outbox (conversation_id, message_id, channel)
       VALUES ($1, $2, 'email'), ($1, $2, 'whatsapp')
       ON CONFLICT (message_id, channel) WHERE message_id IS NOT NULL DO NOTHING`,
      [req.params.id, message.id],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  res.status(201).json({ item: message, status: 'pending' })
}))

app.get('/api/search', asyncRoute(async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (!query) return res.json({ results: [] })
  if (query.length > 100) return res.status(400).json({ error: 'Search text must be 100 characters or less.' })

  const pattern = `%${query}%`
  const searchableFields = [
    'title', 'description', 'long_description', 'category', 'image_description',
    'video_description', 'startup_capital', 'expected_cost', 'expected_revenue',
    'requirements', 'equipment', 'target_customers', 'steps', 'profitability_notes',
    'risks', 'tips',
  ]
  const results = await Promise.all([...contentResources].map(async (resource) => {
    const response = await pool.query(
      `SELECT ${publicFields} FROM ${resource}
       WHERE published = TRUE AND (
         concat_ws(' ', ${searchableFields.join(', ')}) ILIKE $1
         OR EXISTS (
           SELECT 1 FROM media
           WHERE media.content_type = $2 AND media.content_id = ${resource}.id
             AND concat_ws(' ', media.title, media.description) ILIKE $1
         )
       )
         ORDER BY featured DESC, updated_at DESC`,
      [pattern, resource],
    )
    return response.rows.map((item) => ({ ...item, type: resource }))
  }))
  res.json({ results: results.flat() })
}))

for (const resource of contentResources) {
  app.get(`/api/${resource}`, asyncRoute(async (req, res) => {
    const values = []
    const where = []
    if (req.query.featured === 'true') where.push('featured = TRUE')
    if (typeof req.query.category === 'string' && req.query.category.trim()) {
      values.push(req.query.category.trim())
      where.push(`category = $${values.length}`)
    }
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      values.push(`%${req.query.q.trim()}%`)
      where.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length} OR category ILIKE $${values.length})`)
    }
    where.unshift('published = TRUE')
    const result = await pool.query(
      `SELECT ${publicFields} FROM ${resource}
       WHERE ${where.join(' AND ')}
       ORDER BY featured DESC, updated_at DESC LIMIT 100`,
      values,
    )
    res.json({ items: result.rows })
  }))

  app.get(`/api/${resource}/:id`, asyncRoute(async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'This item ID is not valid.' })
    const result = await pool.query(
      `SELECT ${publicFields} FROM ${resource} WHERE id = $1 AND published = TRUE`,
      [req.params.id],
    )
    if (!result.rowCount) return res.status(404).json({ error: 'Item not found.' })
    const media = await pool.query(
      'SELECT id, media_type, title, description, url FROM media WHERE content_type = $1 AND content_id = $2 ORDER BY created_at DESC',
      [resource, req.params.id],
    )
    res.json({ item: result.rows[0], media: media.rows })
  }))

}

app.get('/api/media', asyncRoute(async (req, res) => {
  const page = typeof req.query.page === 'string' ? req.query.page : ''
  if (!publicPageSlugs.has(page)) {
    return res.status(400).json({ error: 'Choose a valid public page.' })
  }

  const result = await pool.query(
    `SELECT id, content_type, content_id, page_slug, media_type, title, description, url, created_at
     FROM media
     WHERE $1 = 'home' OR page_slug = $1
     ORDER BY created_at DESC`,
    [page],
  )
  let items = result.rows

  if (page === 'home') {
    const contentMedia = await Promise.all([...contentResources].map(async (resource) => {
      const content = await pool.query(
        `SELECT id, title, image_url, image_description, video_url, video_description, updated_at
         FROM ${resource}
         WHERE published = TRUE AND (image_url <> '' OR video_url <> '')`,
      )
      return content.rows.flatMap((item) => [
        ...(item.image_url ? [{
          id: `${resource}-${item.id}-image`,
          content_type: resource,
          content_id: item.id,
          media_type: 'image',
          title: item.title,
          description: item.image_description,
          url: item.image_url,
          created_at: item.updated_at,
        }] : []),
        ...(item.video_url ? [{
          id: `${resource}-${item.id}-video`,
          content_type: resource,
          content_id: item.id,
          media_type: 'video',
          title: item.title,
          description: item.video_description,
          url: item.video_url,
          created_at: item.updated_at,
        }] : []),
      ])
    }))
    items = [...items, ...contentMedia.flat()].sort(
      (left, right) => new Date(right.created_at) - new Date(left.created_at),
    )
  }

  res.json({ items })
}))

app.get('/api/comments', asyncRoute(async (req, res) => {
  const contentType = req.query.content_type
  const contentId = req.query.content_id
  if (contentType && (!contentResources.has(contentType) || !validId(String(contentId || '')))) {
    return res.status(400).json({ error: 'A valid content type and item ID are required.' })
  }
  const values = []
  let filter = 'approved = TRUE'
  if (contentType) {
    values.push(contentType, contentId)
    filter += ' AND content_type = $1 AND content_id = $2'
  }
  const result = await pool.query(
    `SELECT id, name, comment, content_type, content_id, created_at
     FROM comments WHERE ${filter} ORDER BY created_at DESC LIMIT 50`,
    values,
  )
  res.json({ items: result.rows })
}))

app.post('/api/comments', submissionLimiter, asyncRoute(async (req, res) => {
  const input = validateContactOrComment(req.body, true)
  if (input.error) return res.status(400).json({ error: input.error })
  const contentType = req.body.content_type || null
  const contentId = req.body.content_id || null
  if (contentType !== null && (!contentResources.has(contentType) || !validId(String(contentId)))) {
    return res.status(400).json({ error: 'A valid content type and item ID must be sent together.' })
  }
  if (contentType === null && contentId !== null) {
    return res.status(400).json({ error: 'Please send a content type with the item ID.' })
  }
  if (contentType) {
    const exists = await pool.query(`SELECT 1 FROM ${contentType} WHERE id = $1 AND published = TRUE`, [contentId])
    if (!exists.rowCount) return res.status(404).json({ error: 'Item not found.' })
  }
  const result = await pool.query(
    `INSERT INTO comments (name, comment, content_type, content_id)
     VALUES ($1, $2, $3, $4) RETURNING id, name, comment, created_at`,
    [input.name, input.message, contentType, contentId],
  )
  res.status(201).json({ item: result.rows[0], message: 'Thank you. Your comment is waiting for review.' })
}))

app.use('/api/admin', requireAdmin)

app.post('/api/admin/uploads', (req, res, next) => {
  if (!Object.hasOwn(mediaTypes, req.get('content-type'))) {
    return res.status(415).json({ error: 'Choose a supported photo or video format.' })
  }
  next()
}, express.raw({ type: Object.keys(mediaTypes), limit: '50mb' }), asyncRoute(async (req, res) => {
  const type = mediaTypes[req.get('content-type')]
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).json({ error: 'Choose a photo or video before uploading.' })
  }
  const maxSize = type.category === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
  if (req.body.length > maxSize) return res.status(413).json({ error: `The selected ${type.category} must be ${type.category === 'image' ? '10 MB' : '50 MB'} or smaller.` })
  if (!type.matches(req.body)) {
    return res.status(400).json({ error: `The selected file is not a valid ${type.category} for its content type.` })
  }

  const fileName = `${randomUUID()}.${type.extension}`
  await fs.mkdir(uploadDirectory, { recursive: true })
  await fs.writeFile(path.join(uploadDirectory, fileName), req.body, { flag: 'wx' })
  res.status(201).json({ url: `/uploads/${fileName}` })
}))

app.get('/api/admin/conversations', asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT c.id, c.name, c.email, c.whatsapp_number, c.contact_type, c.status, c.created_at, c.updated_at,
       COALESCE(json_agg(json_build_object(
         'id', m.id, 'sender_type', m.sender_type, 'body', m.body, 'created_at', m.created_at
       ) ORDER BY m.created_at, m.id) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS messages,
       COALESCE((
         SELECT json_agg(json_build_object(
           'channel', n.channel, 'status', n.status, 'attempts', n.attempts
         ) ORDER BY n.channel)
         FROM notification_outbox n
         WHERE n.conversation_id = c.id
       ), '[]'::json) AS notifications
     FROM conversations c
     LEFT JOIN conversation_messages m ON m.conversation_id = c.id
     GROUP BY c.id
     ORDER BY c.updated_at DESC
     LIMIT 200`,
  )
  res.json({ items: result.rows })
}))

app.post('/api/admin/conversations/:id/replies', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'This conversation ID is not valid.' })
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
  if (!body || body.length > 5000) {
    return res.status(400).json({ error: 'Reply is required and must be 5,000 characters or less.' })
  }

  const client = await pool.connect()
  let reply
  try {
    await client.query('BEGIN')
    const conversation = await client.query(
      'SELECT id FROM conversations WHERE id = $1 FOR UPDATE',
      [req.params.id],
    )
    if (!conversation.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Conversation not found.' })
    }
    const result = await client.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, body)
       VALUES ($1, 'admin', $2)
       RETURNING id, sender_type, body, created_at`,
      [req.params.id, body],
    )
    reply = result.rows[0]
    await client.query(
      "UPDATE conversations SET status = 'replied', updated_at = NOW() WHERE id = $1",
      [req.params.id],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  res.status(201).json({ item: reply, status: 'replied' })
}))

app.patch('/api/admin/conversations/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id) || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'A valid conversation ID and editable conversation fields are required.' })
  }
  const allowed = ['name', 'email', 'whatsapp_number', 'contact_type', 'status']
  if (Object.keys(req.body).some((field) => !allowed.includes(field))) {
    return res.status(400).json({ error: 'Some conversation fields are not allowed.' })
  }
  const fields = []
  const values = []
  for (const field of allowed) {
    if (!Object.hasOwn(req.body, field)) continue
    let value = typeof req.body[field] === 'string' ? req.body[field].trim() : ''
    if (field === 'name' && (!value || value.length > 100)) {
      return res.status(400).json({ error: 'Name is required and must be 100 characters or less.' })
    }
    if (field === 'email' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }
    if (field === 'whatsapp_number') {
      value = normalizeWhatsAppNumber(value)
      if (!value) return res.status(400).json({ error: 'Enter a valid WhatsApp number with its country code.' })
    }
    if (field === 'contact_type' && !Object.hasOwn(contactTypes, value)) {
      return res.status(400).json({ error: 'Choose a valid message type.' })
    }
    if (field === 'status' && !['pending', 'replied'].includes(value)) {
      return res.status(400).json({ error: 'Choose a valid conversation status.' })
    }
    fields.push(field)
    values.push(value)
  }
  if (!fields.length) return res.status(400).json({ error: 'Please provide at least one conversation field to update.' })
  values.push(req.params.id)
  const assignments = fields.map((field, index) => `${field} = $${index + 1}`)
  assignments.push('updated_at = NOW()')
  const result = await pool.query(
    `UPDATE conversations SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING id, name, email, whatsapp_number, contact_type, status, created_at, updated_at`,
    values,
  )
  if (!result.rowCount) return res.status(404).json({ error: 'Conversation not found.' })
  res.json({ item: result.rows[0] })
}))

app.delete('/api/admin/conversations/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'This conversation ID is not valid.' })
  const result = await pool.query('DELETE FROM conversations WHERE id = $1 RETURNING id', [req.params.id])
  if (!result.rowCount) return res.status(404).json({ error: 'Conversation not found.' })
  res.status(204).end()
}))

app.patch('/api/admin/conversation-messages/:id', asyncRoute(async (req, res) => {
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
  if (!validId(req.params.id) || !body || body.length > 5000) {
    return res.status(400).json({ error: 'A valid message ID and message of 5,000 characters or less are required.' })
  }
  const result = await pool.query(
    'UPDATE conversation_messages SET body = $1 WHERE id = $2 RETURNING id, conversation_id, sender_type, body, created_at',
    [body, req.params.id],
  )
  if (!result.rowCount) return res.status(404).json({ error: 'Message not found.' })
  res.json({ item: result.rows[0] })
}))

app.delete('/api/admin/conversation-messages/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'This message ID is not valid.' })
  const result = await pool.query(
    'DELETE FROM conversation_messages WHERE id = $1 RETURNING conversation_id',
    [req.params.id],
  )
  if (!result.rowCount) return res.status(404).json({ error: 'Message not found.' })
  await pool.query(
    `UPDATE conversations SET status = CASE
       WHEN (SELECT sender_type FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1) = 'admin'
       THEN 'replied' ELSE 'pending' END, updated_at = NOW()
     WHERE id = $1`,
    [result.rows[0].conversation_id],
  )
  res.status(204).end()
}))

for (const resource of contentResources) {
  app.get(`/api/admin/${resource}`, asyncRoute(async (_req, res) => {
    const result = await pool.query(`SELECT ${publicFields}, published FROM ${resource} ORDER BY updated_at DESC LIMIT 200`)
    res.json({ items: result.rows })
  }))

  app.post(`/api/admin/${resource}`, asyncRoute(async (req, res) => {
    const { errors, data } = validateContent(req.body)
    if (errors.length) return res.status(400).json({ error: errors.join(' ') })
    const fields = Object.keys(data)
    const values = fields.map((field) => data[field])
    const placeholders = fields.map((_, index) => `$${index + 1}`)
    const result = await pool.query(
      `INSERT INTO ${resource} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})
       RETURNING ${publicFields}, published`,
      values,
    )
    res.status(201).json({ item: result.rows[0] })
  }))

  app.patch(`/api/admin/${resource}/:id`, asyncRoute(async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'This item ID is not valid.' })
    const { errors, data } = validateContent(req.body, true)
    if (errors.length) return res.status(400).json({ error: errors.join(' ') })
    const fields = Object.keys(data)
    if (!fields.length) return res.status(400).json({ error: 'Please provide at least one field to update.' })
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`)
    assignments.push('updated_at = NOW()')
    const result = await pool.query(
      `UPDATE ${resource} SET ${assignments.join(', ')} WHERE id = $${fields.length + 1}
       RETURNING ${publicFields}, published`,
      [...fields.map((field) => data[field]), req.params.id],
    )
    if (!result.rowCount) return res.status(404).json({ error: 'Item not found.' })
    res.json({ item: result.rows[0] })
  }))

  app.delete(`/api/admin/${resource}/:id`, asyncRoute(async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'This item ID is not valid.' })
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      try {
        const existing = await client.query(`SELECT id FROM ${resource} WHERE id = $1 FOR UPDATE`, [req.params.id])
        if (!existing.rowCount) {
          await client.query('ROLLBACK')
          return res.status(404).json({ error: 'Item not found.' })
        }
        await client.query('DELETE FROM comments WHERE content_type = $1 AND content_id = $2', [resource, req.params.id])
        await client.query('DELETE FROM media WHERE content_type = $1 AND content_id = $2', [resource, req.params.id])
        await client.query(`DELETE FROM ${resource} WHERE id = $1`, [req.params.id])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    } finally {
      client.release()
    }
    res.status(204).end()
  }))
}

app.get('/api/admin/comments', asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT * FROM comments ORDER BY created_at DESC LIMIT 200')
  res.json({ items: result.rows })
}))

app.patch('/api/admin/comments/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id) || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'A valid comment ID and editable comment fields are required.' })
  }
  const allowed = ['approved', 'name', 'comment']
  if (Object.keys(req.body).some((field) => !allowed.includes(field))) {
    return res.status(400).json({ error: 'Some comment fields are not allowed.' })
  }
  const fields = []
  const values = []
  if (Object.hasOwn(req.body, 'approved')) {
    if (typeof req.body.approved !== 'boolean') return res.status(400).json({ error: 'Approval must be true or false.' })
    fields.push('approved')
    values.push(req.body.approved)
  }
  for (const field of ['name', 'comment']) {
    if (!Object.hasOwn(req.body, field)) continue
    const value = typeof req.body[field] === 'string' ? req.body[field].trim() : ''
    const limit = field === 'name' ? 100 : 2000
    if (!value || value.length > limit) return res.status(400).json({ error: `${field === 'name' ? 'Name' : 'Comment'} is required and must be ${limit} characters or less.` })
    fields.push(field)
    values.push(value)
  }
  if (!fields.length) return res.status(400).json({ error: 'Please provide at least one comment field to update.' })
  const assignments = fields.map((field, index) => `${field} = $${index + 1}`)
  values.push(req.params.id)
  const result = await pool.query(
    `UPDATE comments SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  )
  if (!result.rowCount) return res.status(404).json({ error: 'Comment not found.' })
  res.json({ item: result.rows[0] })
}))

app.delete('/api/admin/comments/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'This comment ID is not valid.' })
  const result = await pool.query('DELETE FROM comments WHERE id = $1 RETURNING id', [req.params.id])
  if (!result.rowCount) return res.status(404).json({ error: 'Comment not found.' })
  res.status(204).end()
}))

app.get('/api/admin/contacts', asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT * FROM contacts
     ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'read' THEN 1 ELSE 2 END, created_at DESC
     LIMIT 200`,
  )
  res.json({ items: result.rows })
}))

app.patch('/api/admin/contacts/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id) || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'A valid message ID and editable message fields are required.' })
  }
  const allowed = ['name', 'email', 'contact_type', 'message', 'status']
  if (Object.keys(req.body).some((field) => !allowed.includes(field))) {
    return res.status(400).json({ error: 'Some message fields are not allowed.' })
  }
  const fields = []
  const values = []
  const limits = { name: 100, email: 254, message: 5000 }
  for (const field of ['name', 'email', 'contact_type', 'message', 'status']) {
    if (!Object.hasOwn(req.body, field)) continue
    const value = typeof req.body[field] === 'string' ? req.body[field].trim() : ''
    if (field === 'name' || field === 'email' || field === 'message') {
      if (!value || value.length > limits[field]) return res.status(400).json({ error: `${field === 'name' ? 'Name' : field === 'email' ? 'Email' : 'Message'} is required and must be ${limits[field]} characters or less.` })
      if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' })
      }
    }
    if (field === 'contact_type' && !Object.hasOwn(contactTypes, value)) {
      return res.status(400).json({ error: 'Choose a valid message type.' })
    }
    if (field === 'status' && !['new', 'read', 'archived'].includes(value)) {
      return res.status(400).json({ error: 'Choose a valid message status.' })
    }
    fields.push(field)
    values.push(value)
  }
  if (!fields.length) return res.status(400).json({ error: 'Please provide at least one message field to update.' })
  values.push(req.params.id)
  const assignments = fields.map((field, index) => `${field} = $${index + 1}`)
  const result = await pool.query(
    `UPDATE contacts SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  )
  if (!result.rowCount) return res.status(404).json({ error: 'Message not found.' })
  res.json({ item: result.rows[0] })
}))

app.delete('/api/admin/contacts/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'This message ID is not valid.' })
  const result = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING id', [req.params.id])
  if (!result.rowCount) return res.status(404).json({ error: 'Message not found.' })
  res.status(204).end()
}))

app.get('/api/admin/media', asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT * FROM media ORDER BY created_at DESC LIMIT 200')
  res.json({ items: result.rows })
}))

app.post('/api/admin/media', asyncRoute(async (req, res) => {
  const { content_type, content_id, page_slug = null, media_type, title, description = '', url } = req.body || {}
  const pageTarget = content_type === 'pages'
    && content_id === null
    && publicPageSlugs.has(page_slug)
  const contentTarget = contentResources.has(content_type)
    && validId(String(content_id || ''))
    && page_slug === null
  if ((!pageTarget && !contentTarget)
    || !['image', 'video'].includes(media_type) || typeof title !== 'string' || !title.trim()
    || title.length > 180 || typeof description !== 'string' || description.length > 500
    || !validMediaUrl(url)) {
    return res.status(400).json({ error: 'Choose a valid public page or content item, media type, title, description, and HTTP or HTTPS link.' })
  }
  if (contentTarget) {
    const content = await pool.query(`SELECT 1 FROM ${content_type} WHERE id = $1`, [content_id])
    if (!content.rowCount) return res.status(404).json({ error: 'Item not found.' })
  }
  const result = await pool.query(
    `INSERT INTO media (content_type, content_id, media_type, title, description, url, page_slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [content_type, contentTarget ? content_id : null, media_type, title.trim(), description.trim(), url.trim(), pageTarget ? page_slug : null],
  )
  res.status(201).json({ item: result.rows[0] })
}))

app.patch('/api/admin/media/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id) || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'A valid media ID and editable media fields are required.' })
  }
  const allowed = ['content_type', 'content_id', 'page_slug', 'media_type', 'title', 'description', 'url']
  if (!Object.keys(req.body).length || Object.keys(req.body).some((field) => !allowed.includes(field))) {
    return res.status(400).json({ error: 'Provide valid media fields to update.' })
  }
  const current = await pool.query('SELECT * FROM media WHERE id = $1', [req.params.id])
  if (!current.rowCount) return res.status(404).json({ error: 'Media not found.' })
  const item = { page_slug: null, ...current.rows[0], ...req.body }
  const pageTarget = item.content_type === 'pages'
    && item.content_id === null
    && publicPageSlugs.has(item.page_slug)
  const contentTarget = contentResources.has(item.content_type)
    && validId(String(item.content_id || ''))
    && item.page_slug === null
  if ((!pageTarget && !contentTarget)
    || !['image', 'video'].includes(item.media_type) || typeof item.title !== 'string' || !item.title.trim()
    || item.title.trim().length > 180 || typeof item.description !== 'string' || item.description.length > 500
    || !validMediaUrl(item.url)) {
    return res.status(400).json({ error: 'Choose a valid public page or content item, media type, title, description, and HTTP or HTTPS link.' })
  }
  if (contentTarget) {
    const content = await pool.query(`SELECT 1 FROM ${item.content_type} WHERE id = $1`, [item.content_id])
    if (!content.rowCount) return res.status(404).json({ error: 'Item not found.' })
  }
  const result = await pool.query(
    `UPDATE media SET content_type = $1, content_id = $2, media_type = $3, title = $4, description = $5, url = $6, page_slug = $7
     WHERE id = $8 RETURNING *`,
    [item.content_type, contentTarget ? item.content_id : null, item.media_type, item.title.trim(), item.description.trim(), item.url.trim(), pageTarget ? item.page_slug : null, req.params.id],
  )
  res.json({ item: result.rows[0] })
}))

app.delete('/api/admin/media/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'This media ID is not valid.' })
  const result = await pool.query('DELETE FROM media WHERE id = $1 RETURNING id', [req.params.id])
  if (!result.rowCount) return res.status(404).json({ error: 'Media not found.' })
  res.status(204).end()
}))

app.use((_req, res) => res.status(404).json({ error: 'Page not found. Check the API route and try again.' }))
app.use((error, _req, res, _next) => {
  console.error(error)
  if (res.headersSent) return
  const status = error.status || 500
  const publicMessage = error.status === 403
    ? 'This website address is not allowed.'
    : error.type === 'entity.parse.failed'
      ? 'The information sent to the server is not valid JSON.'
      : error.type === 'entity.too.large'
        ? 'The information sent to the server is too large.'
        : status >= 500
          ? 'Something went wrong on the server.'
          : error.message
  res.status(status).json({
    error: publicMessage,
  })
})

if (require.main === module) {
  const stopNotificationWorker = startNotificationWorker()
  if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
  
  const shutdown = () => {
    stopNotificationWorker()
    server.close(() => pool.end().finally(() => process.exit(0)))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

module.exports = app
