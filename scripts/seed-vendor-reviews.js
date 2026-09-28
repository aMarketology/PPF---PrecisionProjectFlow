/**
 * seed-vendor-reviews.js
 *
 * Adds realistic client reviews to the four seeded vendor companies so the
 * "click the vendor → see real reviews" flow has data.
 *
 * Requires supabase/VENDOR_REVIEWS.sql to be applied first.
 *
 * Idempotent: UNIQUE(vendor_id, reviewer_id) - re-running skips existing rows.
 *
 * Run:  node scripts/seed-vendor-reviews.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = join(__dirname, '..')
dotenv.config({ path: join(root, '.env.local'), quiet: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VENDOR_SLUGS = [
  'northwind-precision-machining',
  'voltline-electrical-systems',
  'meridian-structural-group',
  'ironclad-fabrication-works',
]

// Reviews keyed by vendor client email → { rating, title, body }
const REVIEWS = {
  'northwind-precision-machining': [
    { rating: 5, title: 'Held tolerance on a brutal part', body: 'We sent Northwind a titanium bracket with ±0.0005" callouts that two other shops turned down. First article passed, all 250 parts in spec, delivered a day early. Easily the best machining vendor we have used.' },
    { rating: 5, title: 'True aerospace quality', body: 'Full AS9102 documentation, material certs, and a clean CMM report on every lot. Their inspection package alone saved our quality team a week of work.' },
    { rating: 4, title: 'Great parts, slightly pricier', body: 'Quality is excellent and communication was fast. They are not the cheapest quote, but the parts were perfect and on time so the premium was worth it.' },
    { rating: 5, title: 'Rescued our prototype schedule', body: 'We needed prototypes in 48 hours for an investor demo. Northwind had them in our hands the next morning. Communication was excellent throughout.' },
  ],
  'voltline-electrical-systems': [
    { rating: 5, title: 'Flawless panel build', body: 'The UL 508A panels arrived with every wire labeled, full schematics, and a point-to-point test report. Commissioning was the smoothest we have had on a packaging line.' },
    { rating: 5, title: 'They actually understand the process', body: 'Diego flagged a safety-relay logic issue in our spec that would have failed the safety audit. Caught it before build. That is the kind of engineering partner you want.' },
    { rating: 4, title: 'Solid work, good documentation', body: 'Panels were well built and the thermal re-rating analysis was thorough. Only minor gripe was the lead time ran a week long, but they kept us informed.' },
  ],
  'meridian-structural-group': [
    { rating: 5, title: 'Stamped drawings, fast', body: 'Priya reviewed our rack anchorage and returned stamped calculations in three days. The county accepted them with no comments. Cannot recommend highly enough.' },
    { rating: 5, title: 'Clear, defensible engineering', body: 'The peer-review memo was detailed and well-reasoned honestly. Our architect said it was the clearest structural review she had seen in years.' },
    { rating: 5, title: 'Responsive and thorough', body: 'Answered every question within hours and walked our builder through the foundation details. Worth every dollar.' },
    { rating: 4, title: 'Great analysis, minor back-and-forth', body: 'The load analysis was excellent. We needed a couple of revisions to match our as-builts, which took an extra cycle, but the end result was exactly right.' },
  ],
  'ironclad-fabrication-works': [
    { rating: 5, title: 'Certified welds, zero rework', body: 'Forty machine frames fabricated to drawing, all AWS D1.1 welded with inspection reports. Not a single dimensional reject. Ironclad is now our default fabricator.' },
    { rating: 5, title: 'Heavy steel done right', body: 'They fabricated a mezzanine platform that had to be field-erected in sections. Fit-up was dead-on and the galvanizing was flawless.' },
    { rating: 4, title: 'Good quality, plan for lead time', body: 'The weldments were excellent and the powder coat matched our RAL spec perfectly. Lead times run a bit longer than shops that skip inspection, but the quality justifies it.' },
  ],
}

async function main() {
  console.log('🌱 Seeding vendor reviews...\n')

  // Table check
  const probe = await supabase.from('vendor_reviews').select('id').limit(1)
  if (probe.error) {
    console.error('❌ vendor_reviews table not found. Run supabase/VENDOR_REVIEWS.sql first.')
    console.error('   ' + probe.error.message)
    process.exit(1)
  }

  const { data: companies, error: cErr } = await supabase
    .from('company_profiles')
    .select('id, company_name, slug, owner_id')
    .in('slug', VENDOR_SLUGS)
  if (cErr) throw cErr

  // Reviewer pool - the seeded accounts + admins. Exclude the vendor themselves.
  const { data: pool } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('email', [
      'maya.chen@ppf.test', 'diego.ramirez@ppf.test',
      'priya.nair@ppf.test', 'sam.okafor@ppf.test',
      'precisionprojectflow@gmail.com', 'max@amarketology.com',
    ])
  const reviewers = pool || []
  if (reviewers.length === 0) { console.error('No reviewer accounts found.'); process.exit(1) }

  let inserted = 0, skipped = 0

  for (const company of companies || []) {
    const reviews = REVIEWS[company.slug] || []
    console.log(`\n▶ ${company.company_name}`)

    // Rotate through reviewers so each vendor gets varied, non-self reviews.
    const eligible = reviewers.filter(r => r.id !== company.owner_id)
    let ri = 0

    for (const rev of reviews) {
      if (eligible.length === 0) break
      const reviewer = eligible[ri % eligible.length]
      ri++

      // Skip if this reviewer already reviewed this vendor
      const { data: dup } = await supabase
        .from('vendor_reviews')
        .select('id')
        .eq('vendor_id', company.owner_id)
        .eq('reviewer_id', reviewer.id)
        .maybeSingle()
      if (dup) { skipped++; continue }

      const { error } = await supabase.from('vendor_reviews').insert({
        vendor_id: company.owner_id,
        company_id: company.id,
        reviewer_id: reviewer.id,
        rating: rev.rating,
        title: rev.title,
        body: rev.body,
        is_verified: true,
      })
      if (error) console.error(`  ❌ ${reviewer.full_name}: ${error.message}`)
      else { inserted++; console.log(`  ✅ ${rev.rating}★ from ${reviewer.full_name}: "${rev.title}"`) }
    }
  }

  console.log('\n──────── summary ────────')
  console.log(`vendor_reviews : +${inserted} (skipped ${skipped})`)
}

main().catch(e => { console.error(e); process.exit(1) })
