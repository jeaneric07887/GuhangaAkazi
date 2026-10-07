require('dotenv').config()

const fs = require('node:fs/promises')
const path = require('node:path')
const pool = require('../src/db')

async function setup() {
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql')
  const seedPath = path.resolve(__dirname, '../../database/seed.sql')
  const [schema, seed] = await Promise.all([
    fs.readFile(schemaPath, 'utf8'),
    fs.readFile(seedPath, 'utf8'),
  ])
  await pool.query(schema)
  await pool.query(seed)
  console.log('Database tables and sample content are ready.')
}

setup()
  .catch((error) => {
    console.error('Could not set up the database:', error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
