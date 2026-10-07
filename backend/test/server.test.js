const { before, after, test } = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
const jwt = require('jsonwebtoken')
const fs = require('node:fs/promises')
const path = require('node:path')

process.env.JWT_SECRET = 'test-only-signing-secret-that-is-long-enough'

const pool = require('../src/db')
const passwordHashPromise = bcrypt.hash('test-password-for-admin', 4)

let server
let baseUrl
let adminHash
let adminToken
let userToken
let savedUser
let savedConversation
let insertedIdeaValues
let insertedMediaValues
let updatedMediaValues
let adminLookup
const searchQueries = []
const uploadedFiles = []

function userAuthorization() {
  return { Authorization: ['Bearer', userToken].join(' ') }
}

test('Vercel handler runs without JWT_SECRET and reports unavailable authentication', () => {
  const apiEntry = JSON.stringify(path.join(__dirname, '..', 'api', 'index.js'))
  const script = `
    const app = require(${apiEntry})
    const server = app.listen(0, async () => {
      const baseUrl = 'http://127.0.0.1:' + server.address().port
      try {
        const root = await fetch(baseUrl)
        const login = await fetch(baseUrl + '/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@example.test', password: 'password' }),
        })
        const messages = await fetch(baseUrl + '/api/messages')
        if (root.status !== 200 || login.status !== 503 || messages.status !== 503) {
          throw new Error('Unexpected status codes: ' + [root.status, login.status, messages.status].join(', '))
        }
      } catch (error) {
        console.error(error)
        process.exitCode = 1
      } finally {
        server.close()
      }
    })
  `
  const env = { ...process.env }
  delete env.JWT_SECRET
  const result = spawnSync(
    process.execPath,
    ['-e', script],
    {
      cwd: os.tmpdir(),
      env,
      encoding: 'utf8',
      timeout: 10_000,
    },
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)
})

before(async () => {
  for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_RECIPIENT']) {
    delete process.env[key]
  }
  adminHash = await passwordHashPromise
  pool.query = async (query, values = []) => {
    if (query.includes('FROM admins')) adminLookup = { query, values }
    if (query.includes('FROM media') && query.includes('concat_ws')) searchQueries.push({ query, values })
    if (query.startsWith('INSERT INTO media')) {
      insertedMediaValues = values
      return {
        rowCount: 1,
        rows: [{
          id: 4,
          content_type: values[0],
          content_id: values[1],
          media_type: values[2],
          title: values[3],
          description: values[4],
          url: values[5],
          page_slug: values[6],
        }],
      }
    }
    if (query.includes('FROM admins')) {
      return {
        rowCount: 1,
        rows: [{ id: 1, name: 'Test Admin', email: 'admin@example.test', password_hash: adminHash }],
      }
    }
    if (query.includes('FROM ideas') && query.includes('published = TRUE')) {
      return { rowCount: 1, rows: [{ id: 1, title: 'Grow vegetables in containers', published: true }] }
    }
    if (query.includes('INSERT INTO comments')) {
      return { rowCount: 1, rows: [{ id: 1, name: 'Visitor', comment: 'Helpful', created_at: new Date().toISOString() }] }
    }
    if (query.startsWith('UPDATE comments SET')) {
      return { rowCount: 1, rows: [{ id: 1, name: values[0], comment: 'Helpful', approved: false }] }
    }
    if (query.startsWith('UPDATE contacts SET')) {
      return { rowCount: 1, rows: [{ id: Number(values.at(-1)), name: 'Visitor', email: 'visitor@example.test', contact_type: 'message', message: 'A saved contact message.', status: values[0] }] }
    }
    if (query.startsWith('DELETE FROM contacts WHERE id = $1')) {
      return { rowCount: 1, rows: [{ id: Number(values[0]) }] }
    }
    if (query.startsWith('DELETE FROM conversations WHERE id = $1')) {
      return { rowCount: 1, rows: [{ id: Number(values[0]) }] }
    }
    if (query.startsWith('UPDATE conversations SET name =')) {
      return { rowCount: 1, rows: [{ id: Number(values.at(-1)), name: values[0], email: 'user@example.test', whatsapp_number: '250798740065', contact_type: 'message', status: 'pending' }] }
    }
    if (query.startsWith('UPDATE conversation_messages SET body = $1')) {
      return { rowCount: 1, rows: [{ id: Number(values[1]), conversation_id: 21, sender_type: 'user', body: values[0], created_at: new Date().toISOString() }] }
    }
    if (query.startsWith('DELETE FROM conversation_messages WHERE id = $1')) {
      return { rowCount: 1, rows: [{ conversation_id: 21 }] }
    }
    if (query.startsWith('SELECT * FROM media WHERE id = $1')) {
      return { rowCount: 1, rows: [{ id: 3, content_type: 'ideas', content_id: 1, media_type: 'image', title: 'Old photo', description: '', url: 'https://example.test/old.png' }] }
    }
    if (query.startsWith('SELECT 1 FROM ideas WHERE id = $1')) {
      return { rowCount: 1, rows: [{ '?column?': 1 }] }
    }
    if (query.startsWith('UPDATE media SET')) {
      updatedMediaValues = values
      return { rowCount: 1, rows: [{ id: Number(values.at(-1)), content_type: values[0], content_id: values[1], media_type: values[2], title: values[3], description: values[4], url: values[5] }] }
    }
    if (query.startsWith('INSERT INTO ideas')) {
      insertedIdeaValues = values
      return { rowCount: 1, rows: [{ title: values[0], description: values[1] }] }
    }
    if (query.includes('INSERT INTO users')) {
      if (savedUser) {
        const error = new Error('duplicate user email')
        error.code = '23505'
        throw error
      }
      savedUser = {
        id: 7,
        name: values[0],
        email: values[1],
        whatsapp_number: values[2],
        password_hash: values[3],
      }
      return { rowCount: 1, rows: [{ id: savedUser.id, name: savedUser.name, email: savedUser.email, whatsapp_number: savedUser.whatsapp_number }] }
    }
    if (query.includes('FROM users') && query.includes('WHERE id = $1')) {
      const user = savedUser?.id === Number(values[0]) ? savedUser : null
      return { rowCount: user ? 1 : 0, rows: user ? [{ id: user.id, name: user.name, email: user.email, whatsapp_number: user.whatsapp_number }] : [] }
    }
    if (query.includes('FROM users') && query.includes('WHERE email = $1')) {
      const user = savedUser?.email === values[0] ? savedUser : null
      return { rowCount: user ? 1 : 0, rows: user ? [user] : [] }
    }
    if (query.includes('INSERT INTO conversations')) {
      savedConversation = {
        id: 21,
        user_id: values[0],
        name: values[1],
        email: values[2],
        whatsapp_number: values[3],
        contact_type: values[4],
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
        notifications: [{ channel: 'email', status: 'pending', attempts: 0 }, { channel: 'whatsapp', status: 'pending', attempts: 0 }],
      }
      return { rowCount: 1, rows: [savedConversation] }
    }
    if (query.includes('INSERT INTO conversation_messages')) {
      const senderType = query.includes("'admin'") ? 'admin' : 'user'
      const message = {
        id: savedConversation.messages.length + 1,
        sender_type: senderType,
        body: values[1],
        created_at: new Date().toISOString(),
      }
      savedConversation.messages.push(message)
      return { rowCount: 1, rows: [message] }
    }
    if (query.includes('INSERT INTO notification_outbox')) return { rowCount: 2, rows: [] }
    if (query.includes('UPDATE conversations SET status')) {
      if (savedConversation) savedConversation.status = query.includes("'pending'") ? 'pending' : 'replied'
      return { rowCount: 1, rows: [] }
    }
    if (query.includes('FROM conversations c') && query.includes('WHERE c.user_id = $1')) {
      const owned = savedConversation?.user_id === Number(values[0]) ? [savedConversation] : []
      return { rowCount: owned.length, rows: owned }
    }
    if (query.includes('FROM conversations c') && query.includes('GROUP BY c.id')) {
      return { rowCount: savedConversation ? 1 : 0, rows: savedConversation ? [savedConversation] : [] }
    }
    if (query.includes('FROM conversations WHERE id = $1 AND user_id = $2')) {
      const conversation = savedConversation?.id === Number(values[0]) && savedConversation.user_id === Number(values[1])
        ? savedConversation
        : null
      return { rowCount: conversation ? 1 : 0, rows: conversation ? [{ id: conversation.id }] : [] }
    }
    if (query.includes('FROM conversations WHERE id = $1')) {
      const conversation = savedConversation?.id === Number(values[0]) ? savedConversation : null
      return { rowCount: conversation ? 1 : 0, rows: conversation ? [conversation] : [] }
    }
    if (query.includes('SELECT 1')) return { rowCount: 1, rows: [{ '?column?': 1 }] }
    return { rowCount: 0, rows: [] }
  }
  pool.connect = async () => ({ query: pool.query, release() {} })

  const app = require('../src/server')
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await Promise.all(uploadedFiles.map((fileName) => fs.unlink(path.join(__dirname, '..', 'uploads', fileName))))
  await pool.end()
})

test('checks whether the database is connected', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' })
})

test('backend root displays an API-running message', async () => {
  const response = await fetch(baseUrl)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    message: 'GuhangaAkazi API is running.',
    health: '/api/health',
  })
})

test('public content is available without a visitor account', async () => {
  const response = await fetch(`${baseUrl}/api/ideas`)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).items[0].title, 'Grow vegetables in containers')
})

test('public media galleries accept every configured public page', async () => {
  const response = await fetch(`${baseUrl}/api/media?page=about`)
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).items, [])

  const invalid = await fetch(`${baseUrl}/api/media?page=account`)
  assert.equal(invalid.status, 400)
})

test('public search matches partial text across content details and media keywords', async () => {
  const response = await fetch(`${baseUrl}/api/search?q=f`)
  const result = await response.json()
  assert.equal(response.status, 200)
  assert.equal(result.results.length, 3)
  assert.equal(searchQueries.length, 3)
  for (const { query, values } of searchQueries) {
    assert.match(query, /long_description/)
    assert.match(query, /expected_cost/)
    assert.match(query, /requirements/)
    assert.match(query, /media\.title, media\.description/)
    assert.match(query, /published = TRUE/)
    assert.equal(values[0], '%f%')
  }
})

test('admin routes reject requests without a token', async () => {
  const response = await fetch(`${baseUrl}/api/admin/ideas`)
  assert.equal(response.status, 401)
  const upload = await fetch(`${baseUrl}/api/admin/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: Buffer.from('not-an-image'),
  })
  assert.equal(upload.status, 401)
})

test('admin sign-in returns a signed token', async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ADMIN@EXAMPLE.TEST', password: 'test-password-for-admin' }),
  })
  const result = await response.json()
  assert.equal(response.status, 200)
  assert.ok(result.token)
  assert.equal(result.admin.email, 'admin@example.test')
  assert.match(adminLookup.query, /lower\(email\) = \$1/)
  assert.equal(adminLookup.values[0], 'admin@example.test')
  adminToken = result.token
})

test('admins can assign uploaded media to a public page', async () => {
  const response = await fetch(`${baseUrl}/api/admin/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content_type: 'pages',
      content_id: null,
      page_slug: 'about',
      media_type: 'video',
      title: 'About page video',
      description: 'A video for the About page.',
      url: 'https://example.test/about.mp4',
    }),
  })
  const result = await response.json()
  assert.equal(response.status, 201)
  assert.equal(result.item.page_slug, 'about')
  assert.equal(insertedMediaValues[0], 'pages')
  assert.equal(insertedMediaValues[1], null)
  assert.equal(insertedMediaValues[6], 'about')
})

test('admins can upload a photo and receive a public image URL', async () => {
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nXcAAAAASUVORK5CYII=', 'base64')
  const response = await fetch(`${baseUrl}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'image/png' },
    body: bytes,
  })
  const result = await response.json()
  assert.equal(response.status, 201)
  assert.match(result.url, /^\/uploads\/[a-f0-9-]+\.png$/)
  uploadedFiles.push(path.basename(result.url))
  const imageResponse = await fetch(`${baseUrl}${result.url}`)
  assert.equal(imageResponse.status, 200)
  assert.equal(imageResponse.headers.get('content-type'), 'image/png')
  assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), bytes)
})

test('admin content preserves free-form cost and income text', async () => {
  const response = await fetch(`${baseUrl}/api/admin/ideas`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test idea',
      description: 'A test description',
      startup_capital: '3,000 - 50,000 RWF',
      expected_cost: 'around 2,000 RWF',
      expected_revenue: 'varies by season',
    }),
  })
  assert.equal(response.status, 201)
  assert.ok(insertedIdeaValues.includes('3,000 - 50,000 RWF'))
  assert.ok(insertedIdeaValues.includes('around 2,000 RWF'))
  assert.ok(insertedIdeaValues.includes('varies by season'))
})

test('admins can upload GIF photos and WebM videos', async () => {
  const gifBytes = Buffer.from('GIF89a\u0001\u0000\u0001\u0000', 'binary')
  const gifResponse = await fetch(`${baseUrl}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'image/gif' },
    body: gifBytes,
  })
  assert.equal(gifResponse.status, 201)
  const gif = await gifResponse.json()
  uploadedFiles.push(path.basename(gif.url))
  assert.match(gif.url, /^\/uploads\/[a-f0-9-]+\.gif$/)
  const publicGif = await fetch(`${baseUrl}${gif.url}`)
  assert.equal(publicGif.headers.get('content-type'), 'image/gif')

  const webmResponse = await fetch(`${baseUrl}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'video/webm' },
    body: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]),
  })
  assert.equal(webmResponse.status, 201)
  const webm = await webmResponse.json()
  uploadedFiles.push(path.basename(webm.url))
  assert.match(webm.url, /^\/uploads\/[a-f0-9-]+\.webm$/)
  const publicWebm = await fetch(`${baseUrl}${webm.url}`)
  assert.equal(publicWebm.headers.get('content-type'), 'video/webm')
})

test('photo uploads reject unsupported types and invalid image bytes', async () => {
  const unsupported = await fetch(`${baseUrl}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'image/svg+xml' },
    body: '<svg />',
  })
  assert.equal(unsupported.status, 415)

  const invalid = await fetch(`${baseUrl}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'image/png' },
    body: Buffer.from('not-an-image'),
  })
  assert.equal(invalid.status, 400)
})

test('admins can edit and delete comments, media, contact messages, and conversation messages', async () => {
  const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
  const comment = await fetch(`${baseUrl}/api/admin/comments/1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ name: 'Updated visitor' }),
  })
  assert.equal(comment.status, 200)

  const media = await fetch(`${baseUrl}/api/admin/media/3`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ title: 'Updated photo' }),
  })
  assert.equal(media.status, 200)
  assert.equal((await media.json()).item.title, 'Updated photo')

  const pageMedia = await fetch(`${baseUrl}/api/admin/media/3`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ content_type: 'pages', content_id: null, page_slug: 'home' }),
  })
  assert.equal(pageMedia.status, 200)
  assert.equal(updatedMediaValues[0], 'pages')
  assert.equal(updatedMediaValues[1], null)
  assert.equal(updatedMediaValues[6], 'home')

  const contact = await fetch(`${baseUrl}/api/admin/contacts/2`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'archived' }),
  })
  assert.equal(contact.status, 200)
  assert.equal((await contact.json()).item.status, 'archived')

  const conversation = await fetch(`${baseUrl}/api/admin/conversations/21`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ name: 'Updated account name' }),
  })
  assert.equal(conversation.status, 200)
  assert.equal((await conversation.json()).item.name, 'Updated account name')

  const message = await fetch(`${baseUrl}/api/admin/conversation-messages/1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ body: 'Updated message.' }),
  })
  assert.equal(message.status, 200)
  assert.equal((await message.json()).item.body, 'Updated message.')

  for (const url of ['/api/admin/contacts/2', '/api/admin/conversations/21', '/api/admin/conversation-messages/1']) {
    const response = await fetch(`${baseUrl}${url}`, { method: 'DELETE', headers })
    assert.equal(response.status, 204)
  }
})

test('users can create an account with a normalized WhatsApp number', async () => {
  const response = await fetch(`${baseUrl}/api/account/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Message User',
      email: 'user@example.test',
      whatsapp_number: '0798740065',
      password: 'test-user-password-long',
    }),
  })
  const result = await response.json()
  assert.equal(response.status, 201)
  assert.equal(result.user.whatsapp_number, '250798740065')
  assert.ok(result.token)
  assert.notEqual(savedUser.password_hash, 'test-user-password-long')
})

test('users can sign in and admin/user tokens cannot cross authorization boundaries', async () => {
  const response = await fetch(`${baseUrl}/api/account/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.test', password: 'test-user-password-long' }),
  })
  const result = await response.json()
  assert.equal(response.status, 200)
  userToken = result.token
  const adminRequest = await fetch(`${baseUrl}/api/admin/conversations`, {
    headers: { Authorization: `Bearer ${userToken}` },
  })
  assert.equal(adminRequest.status, 401)
  const userRequest = await fetch(`${baseUrl}/api/messages`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  assert.equal(userRequest.status, 401)
})

test('invalid admin sign-in returns a clear English error', async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.test', password: 'wrong-password' }),
  })
  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { error: 'Email or password is incorrect.' })
})

test('visitor comments wait for review', async () => {
  const response = await fetch(`${baseUrl}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Visitor', comment: 'Helpful' }),
  })
  const result = await response.json()
  assert.equal(response.status, 201)
  assert.match(result.message, /waiting for review/)
})

test('contact messages require a signed-in user and a valid WhatsApp number', async () => {
  const unauthorized = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Visitor', message: 'Hello' }),
  })
  assert.equal(unauthorized.status, 401)

  const response = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ name: 'Message User', whatsapp_number: 'not-a-number', contact_type: 'question', message: 'Hello' }),
  })
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /valid WhatsApp number/)
})

test('contact messages are stored with their WhatsApp number and durable channel notifications', async () => {
  const response = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      name: 'Message User',
      whatsapp_number: '+250 798 740 065',
      contact_type: 'suggestion',
      message: 'Please add a new skill.',
    }),
  })
  const result = await response.json()
  assert.equal(response.status, 201)
  assert.match(result.message, /Messages page/)
  assert.equal(savedConversation.contact_type, 'suggestion')
  assert.equal(savedConversation.whatsapp_number, '250798740065')
  assert.equal(savedConversation.messages[0].body, 'Please add a new skill.')
  assert.equal(savedConversation.notifications.length, 2)
})

test('users see only their own conversation and administrators can reply', async () => {
  const privateRequest = await fetch(`${baseUrl}/api/messages`, {
    headers: { Authorization: `Bearer ${jwt.sign({ sub: '8' }, process.env.JWT_SECRET, { issuer: 'guhangaakazi-api', audience: 'user', expiresIn: '1h' })}` },
  })
  assert.deepEqual((await privateRequest.json()).items, [])

  const visible = await fetch(`${baseUrl}/api/messages`, {
    headers: { Authorization: `Bearer ${userToken}` },
  })
  const visibleResult = await visible.json()
  assert.equal(visibleResult.items[0].status, 'pending')
  assert.equal(visibleResult.items[0].messages[0].body, 'Please add a new skill.')

  const response = await fetch(`${baseUrl}/api/admin/conversations`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const result = await response.json()
  assert.equal(response.status, 200)
  assert.equal(result.items[0].whatsapp_number, '250798740065')

  const reply = await fetch(`${baseUrl}/api/admin/conversations/21/replies`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: 'Thank you. Here is the information you requested.' }),
  })
  assert.equal(reply.status, 201)
  const afterReply = await fetch(`${baseUrl}/api/messages`, { headers: { Authorization: `Bearer ${userToken}` } })
  const conversation = (await afterReply.json()).items[0]
  assert.equal(conversation.status, 'replied')
  assert.equal(conversation.messages[1].sender_type, 'admin')
  assert.match(conversation.messages[1].body, /information you requested/)

  const userReply = await fetch(`${baseUrl}/api/messages/21/replies`, {
    method: 'POST',
    headers: { ...userAuthorization(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: 'I have another question.' }),
  })
  assert.equal(userReply.status, 201)
  const afterUserReply = await fetch(`${baseUrl}/api/messages`, { headers: userAuthorization() })
  const updatedConversation = (await afterUserReply.json()).items[0]
  assert.equal(updatedConversation.status, 'pending')
  assert.equal(updatedConversation.messages[2].sender_type, 'user')
  assert.equal(updatedConversation.messages[2].body, 'I have another question.')

  const otherUserReply = await fetch(`${baseUrl}/api/messages/21/replies`, {
    method: 'POST',
    headers: {
      Authorization: ['Bearer', jwt.sign(
        { sub: '8' },
        process.env.JWT_SECRET,
        { issuer: 'guhangaakazi-api', audience: 'user', expiresIn: '1h' },
      )].join(' '),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: 'This conversation is not mine.' }),
  })
  assert.equal(otherUserReply.status, 404)
})
