/**
 * fix-em-dashes-db.js
 *
 * PPF style rule: the em dash (U+2014 "—") is not allowed on the site.
 * The codebase sweep (scripts/fix-em-dashes.mjs) handles source files; this
 * script scrubs em dashes out of user-facing TEXT already stored in the DB
 * (seeded listings, posts, reviews, activity summaries, notifications).
 *
 * Usage:
 *   node scripts/fix-em-dashes-db.js           # apply
 *   node scripts/fix-em-dashes-db.js --dry     # report only
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true })

const DRY = process.argv.includes('--dry')
const EM = '\u2014'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// table -> [ columns ]. Array (text[]) columns are detected at runtime and
// scanned in JS (ILKE does not work on text[]).
const TARGETS = {
  products:            ['name', 'description'],
  services:            ['title', 'description', 'tags', 'certifications'],
  rfqs:                ['title', 'description', 'material'],
  company_profiles:    ['company_name', 'description', 'specialties', 'certifications', 'contact_name', 'name'],
  profiles:            ['full_name', 'bio', 'location'],
  vendor_reviews:      ['title', 'body', 'reviewer_name'],
  feed_posts:          ['content'],
  site_activities:     ['summary'],
  user_notifications:  ['title', 'body'],
  rfq_offers:          ['terms', 'notes'],
}

const swap = (v) => typeof v === 'string' ? v.split(EM).join('-') : v
const arrSwap = (a) => Array.isArray(a) ? a.map(x => typeof x === 'string' ? x.split(EM).join('-') : x) : a

let grandTotal = 0

for (const [table, columns] of Object.entries(TARGETS)) {
  let tableChanges = 0
  for (const col of columns) {
    // Pull the column for every row (handles both text and text[]),
    // then filter in JS so array columns work too.
    const { data, error } = await supabase.from(table).select(`id, ${col}`)
    if (error) { console.log(`  ⚠️  ${table}.${col}: ${error.message}`); continue }
    if (!data || data.length === 0) continue

    const hasEm = (v) => (typeof v === 'string' && v.includes(EM)) ||
      (Array.isArray(v) && v.some(x => typeof x === 'string' && x.includes(EM)))

    for (const row of data) {
      const original = row[col]
      if (!hasEm(original)) continue
      const updated = Array.isArray(original) ? arrSwap(original) : swap(original)
      if (JSON.stringify(original) === JSON.stringify(updated)) continue
      tableChanges++
      if (!DRY) {
        const { error: upErr } = await supabase.from(table).update({ [col]: updated }).eq('id', row.id)
        if (upErr) console.log(`  ❌ ${table}.${col} ${row.id}: ${upErr.message}`)
      }
    }
    if (tableChanges > 0) console.log(`  ${table}.${col}: ${tableChanges} row(s)`)
  }
  grandTotal += tableChanges
}

console.log(`\n${DRY ? '[DRY RUN] ' : ''}${grandTotal} row update(s) ${DRY ? 'would be applied' : 'applied'}.`)
