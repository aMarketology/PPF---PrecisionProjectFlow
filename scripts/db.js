#!/usr/bin/env node
/**
 * db.js — Direct Postgres query runner
 *
 * Usage:
 *   node scripts/db.js "SELECT id, email, token_balance FROM profiles LIMIT 10;"
 *   node scripts/db.js --file ./supabase/FIX_MISSING_COLUMNS.sql
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL || DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  console.error(`
❌  No DATABASE_URL found in .env.local.

To connect directly:
1. Go to: https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/settings/database
2. Copy the Connection String (URI tab)
3. Replace the DATABASE_URL line in .env.local with the real URI
  `)
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function run(sql) {
  const client = await pool.connect()
  try {
    const result = await client.query(sql)
    return result
  } finally {
    client.release()
    await pool.end()
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Usage:
  node scripts/db.js "SELECT * FROM profiles LIMIT 5;"
  node scripts/db.js --file ./supabase/FIX_MISSING_COLUMNS.sql
    `)
    process.exit(0)
  }

  let sql
  if (args[0] === '--file' && args[1]) {
    const filePath = path.resolve(args[1])
    sql = fs.readFileSync(filePath, 'utf8')
    console.log(`\n📄 Running: ${filePath}\n`)
  } else {
    sql = args.join(' ')
  }

  try {
    const result = await run(sql)
    if (result.rows && result.rows.length > 0) {
      console.table(result.rows)
      console.log(`\n✅  ${result.rowCount} row(s) returned.`)
    } else if (result.rowCount !== null) {
      console.log(`\n✅  Done. ${result.rowCount} row(s) affected.`)
    } else {
      console.log(`\n✅  Done.`)
    }
  } catch (err) {
    console.error(`\n❌  Query failed:\n   ${err.message}\n`)
    process.exit(1)
  }
}

main()
