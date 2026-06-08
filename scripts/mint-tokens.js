#!/usr/bin/env node
/**
 * mint-tokens.js — Admin token minting script
 *
 * Usage:
 *   node scripts/mint-tokens.js <email> <amount> [description]
 *   node scripts/mint-tokens.js reinard.j@gmail.com 10000 "Welcome bonus"
 *   node scripts/mint-tokens.js --all "email1,email2" 10000 "Promo grant"
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function mintTokens(email, amount, description) {
  // Look up user in profiles
  const { data: profile, error: lookupErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, token_balance')
    .eq('email', email)
    .single()

  if (lookupErr || !profile) {
    console.error(`  ❌  User not found: ${email}`)
    return false
  }

  const prevBalance = profile.token_balance ?? 0

  // Update balance
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ token_balance: prevBalance + amount })
    .eq('id', profile.id)

  if (updateErr) {
    console.error(`  ❌  Failed to update balance for ${email}:`, updateErr.message)
    return false
  }

  // Log to token_transactions ledger
  const { error: ledgerErr } = await supabase
    .from('token_transactions')
    .insert({
      user_id:       profile.id,
      amount:        amount,
      type:          'credit',
      description:   description,
      balance_after: prevBalance + amount,
    })

  if (ledgerErr) {
    // Not fatal — balance was already updated. Just warn.
    console.warn(`  ⚠️  Balance updated but ledger insert failed for ${email}:`, ledgerErr.message)
  }

  console.log(`  ✅  ${email} (${profile.full_name || 'Unknown'})`)
  console.log(`      ${prevBalance.toLocaleString()} → ${(prevBalance + amount).toLocaleString()} tokens  (+${amount.toLocaleString()})`)
  return true
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`
Usage:
  node scripts/mint-tokens.js <email> <amount> [description]
  node scripts/mint-tokens.js reinard.j@gmail.com 10000 "Welcome bonus"
  node scripts/mint-tokens.js "email1@x.com,email2@x.com" 10000 "Promo grant"
    `)
    process.exit(1)
  }

  const emailArg   = args[0]
  const amount     = parseInt(args[1], 10)
  const description = args[2] || 'Admin token grant'

  if (isNaN(amount) || amount <= 0) {
    console.error('❌  Amount must be a positive integer')
    process.exit(1)
  }

  // Support comma-separated emails
  const emails = emailArg.split(',').map(e => e.trim()).filter(Boolean)

  console.log(`\n🪙  Minting ${amount.toLocaleString()} tokens to ${emails.length} user(s)...`)
  console.log(`    Description: "${description}"\n`)

  let successCount = 0
  for (const email of emails) {
    const ok = await mintTokens(email, amount, description)
    if (ok) successCount++
  }

  console.log(`\n🎉  Done — ${successCount}/${emails.length} users credited.\n`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
