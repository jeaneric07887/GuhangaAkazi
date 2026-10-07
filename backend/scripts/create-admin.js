require('dotenv').config()

const bcrypt = require('bcryptjs')
const pool = require('../src/db')

async function createAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  const passwordLength = ADMIN_PASSWORD ? Buffer.byteLength(ADMIN_PASSWORD, 'utf8') : 0
  if (!ADMIN_NAME?.trim() || !ADMIN_EMAIL?.trim() || passwordLength < 12 || passwordLength > 72) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters) in backend/.env.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL.trim()) || ADMIN_EMAIL.trim().length > 254) {
    throw new Error('ADMIN_EMAIL must be a valid email address with no more than 254 characters.')
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const email = ADMIN_EMAIL.trim().toLowerCase()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query(
      'SELECT id FROM admins WHERE lower(email) = $1 ORDER BY id LIMIT 1 FOR UPDATE',
      [email],
    )
    if (existing.rowCount) {
      await client.query(
        'UPDATE admins SET name = $1, email = $2, password_hash = $3, updated_at = NOW() WHERE id = $4',
        [ADMIN_NAME.trim(), email, passwordHash, existing.rows[0].id],
      )
    } else {
      await client.query(
        'INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3)',
        [ADMIN_NAME.trim(), email, passwordHash],
      )
    }
    await client.query('COMMIT')
    console.log(`Admin account created or updated for ${email}.`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

createAdmin()
  .catch((error) => {
    console.error('Could not create the admin account:', error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
