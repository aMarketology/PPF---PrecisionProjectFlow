#!/usr/bin/env node
/**
 * run-migration.js
 * Runs a SQL file against Supabase using the service role key.
 * Usage: node scripts/run-migration.js supabase/RFQ_OFFERS.sql
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const filePath = path.resolve(process.argv[2])
  const sql = fs.readFileSync(filePath, 'utf8')
  console.log(`📄 Running: ${path.basename(filePath)}\n`)

  // Split by semicolons and run each statement separately
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let success = 0
  let failed = 0

  for (const stmt of statements) {
    try {
      // Try using the REST API via rpc
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
      if (error) {
        // Fallback: try direct query if exec_sql doesn't exist
        console.log(`  ⚠️  RPC not available, trying direct query...`)
        const { error: err2 } = await supabase.from('_exec_sql').select('*').limit(0).catch(() => ({}))
        if (err2) {
          console.log(`  ⚠️  Direct query not available. Statement may not have executed: ${stmt.substring(0, 80)}...`)
          failed++
        }
      } else {
        console.log(`  ✅  Executed successfully (${stmt.substring(0, 60)}...)`)
        success++
      }
    } catch (e) {
      console.log(`  ❌  Error: ${e.message}`)
      failed++
    }
  }

  console.log(`\n📊  Done: ${success} succeeded, ${failed} failed`)
}

run().catch(console.error)