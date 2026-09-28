/**
 * seed-real-marketplace.js
 *
 * Loads the marketplace with REAL listings from the four seeded vendor
 * companies so the storefront, RFQ feed, and super-admin moderation
 * panels have believable data to work with.
 *
 * Creates / upserts (idempotent - matched by company + name/title):
 *   1. products        - priced catalog items (price in DOLLARS)
 *   2. services        - priced service listings (price in DOLLARS)
 *   3. rfqs            - open buyer requests across engineering categories
 *
 * Vendors seeded:
 *   Maya Chen    → Northwind Precision Machining  (CNC / machining)
 *   Diego Ramirez→ Voltline Electrical Systems     (panels / controls)
 *   Priya Nair   → Meridian Structural Group       (structural)
 *   Sam Okafor   → Ironclad Fabrication Works      (fabrication)
 *
 * Run:  node scripts/seed-real-marketplace.js
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

// ── helpers ───────────────────────────────────────────────────────────────────
function slugify(title) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const suffix = Math.random().toString(16).slice(2, 10)
  return `${base}-${suffix}`
}

const IMG = {
  cnc: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=600&fit=crop',
  machining: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  metal: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=800&h=600&fit=crop',
  electrical: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
  panel: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop',
  automation: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop',
  structural: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop',
  steel: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop',
  fab: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&h=600&fit=crop',
}

// ── vendor + catalog definitions ──────────────────────────────────────────────
const VENDORS = [
  {
    email: 'maya.chen@ppf.test',
    company_slug: 'northwind-precision-machining',
    products: [
      { name: 'CNC Machined Aluminum Brackets - Prototype Run', price: 185, category: 'CNC Machining', delivery_time_days: 7, description: 'Precision-milled 6061-T6 aluminum brackets, up to 25 units per run. Includes first-article inspection report. Ideal for design validation before production tooling.' },
      { name: '5-Axis Titanium Aerospace Component', price: 1450, category: 'CNC Machining', delivery_time_days: 14, description: 'Complex 5-axis machined Ti-6Al-4V components held to ±0.0005". AS9100D traceable, full material certs and CMM inspection included.' },
      { name: 'Precision Turned Stainless Shafts (500 Units)', price: 620, category: 'CNC Machining', delivery_time_days: 10, description: 'High-volume CNC turning of 316L stainless shafts. Tight concentricity, ground finishes, and lot traceability for every order.' },
      { name: 'Rapid Prototype Machining - 48 Hour Turnaround', price: 950, category: 'Prototyping', delivery_time_days: 2, description: 'Expedited 2-axis and 3-axis machining to get your prototype in hand within 48 hours. Overnight shipping available.' },
      { name: 'CMM Inspection & First Article Report', price: 240, category: 'Inspection & QA', delivery_time_days: 3, description: 'Full dimensional CMM inspection with a documented AS9102 first-article inspection report. Standalone service - parts need not be machined by us.' },
    ],
    services: [
      { title: '5-Axis CNC Machining Services', category: 'Industrial Manufacturing', price: 1200, delivery_time: '5-10 business days', service_area: 'both', tags: ['CNC Machining', '5-Axis', 'Titanium'], certifications: ['AS9100D', 'ISO 9001:2015'], images: [IMG.cnc], description: 'Contract 5-axis CNC machining for tight-tolerance aerospace, medical, and industrial parts. From prototypes to low-volume production with full inspection documentation.' },
      { title: 'Titanium Prototyping & DFM Review', category: 'Mechanical Engineering', price: 2400, delivery_time: '7-14 business days', service_area: 'remote', tags: ['Prototyping', 'DFM', 'Titanium'], certifications: ['ISO 9001:2015'], images: [IMG.machining], description: 'Design-for-manufacture review plus rapid titanium prototype machining. We find cost-down opportunities before you commit to tooling.' },
    ],
  },
  {
    email: 'diego.ramirez@ppf.test',
    company_slug: 'voltline-electrical-systems',
    products: [
      { name: 'UL 508A Industrial Control Panel Build', price: 3850, category: 'Control Panels', delivery_time_days: 21, description: 'Fully assembled and UL 508A labeled industrial control panel. Wire numbering, terminal schedules, and thorough point-to-point test reports included.' },
      { name: 'PLC Programming & Commissioning', price: 2250, category: 'Automation', delivery_time_days: 14, description: 'Ladder and structured-text PLC programming for Allen-Bradley, Siemens, and AutomationDirect platforms. Includes on-site commissioning and operator training.' },
      { name: 'Power Distribution Panel - Custom', price: 5400, category: 'Power Distribution', delivery_time_days: 28, description: 'Custom power distribution and MCC sections built to your single-line diagram. Short-circuit and coordination studies available.' },
      { name: 'Electrical Panel Re-Rate & Thermal Analysis', price: 1850, category: 'Engineering Services', delivery_time_days: 7, description: 'Thermal and ampacity analysis to safely increase an existing panel’s capacity. Includes stamped re-rating report.' },
      { name: 'VFD Retrofit & Motor Controls', price: 4100, category: 'Automation', delivery_time_days: 18, description: 'Turnkey variable-frequency-drive retrofits for pumps, fans, and conveyors. Energy savings analysis and harmonic mitigation included.' },
    ],
    services: [
      { title: 'Industrial Control Panel Design & Build', category: 'Controls & Automation', price: 2500, delivery_time: '3-5 weeks', service_area: 'both', tags: ['Control Panels', 'UL 508A', 'PLC'], certifications: ['UL 508A', 'NEC Compliant'], images: [IMG.panel], description: 'UL 508A panel design, fabrication, and build for automation integrators and OEMs. Schematics, bills of material, and full test documentation delivered.' },
      { title: 'Power System Engineering & Load Studies', category: 'Electrical Engineering', price: 1800, delivery_time: '1-2 weeks', service_area: 'remote', tags: ['Power Distribution', 'Load Analysis', 'Arc Flash'], certifications: ['PE Stamped'], images: [IMG.electrical], description: 'Single-line diagrams, load calculations, arc-flash studies, and equipment specifications for commercial and industrial facilities.' },
    ],
  },
  {
    email: 'priya.nair@ppf.test',
    company_slug: 'meridian-structural-group',
    products: [
      { name: 'PE-Stamped Structural Drawings', price: 1850, category: 'Structural Engineering', delivery_time_days: 10, description: 'Fully stamped and sealed structural drawings for permit submission and construction. Signed by a licensed PE in your state.' },
      { name: 'Structural Load Analysis & Calculation Package', price: 2400, category: 'Structural Engineering', delivery_time_days: 12, description: 'Gravity, wind, and seismic load analysis with a complete, permit-ready calculation package. Includes a stamped summary letter.' },
      { name: 'Third-Party Structural Plan Review', price: 1200, category: 'Engineering Services', delivery_time_days: 5, description: 'Independent peer review of structural drawings and calculations. Red-line markup and a formal review memo for your records.' },
      { name: 'Seismic Retrofit Design', price: 7600, category: 'Structural Engineering', delivery_time_days: 30, description: 'Assessment and design of seismic strengthening for existing structures. Includes ASCE 41 evaluation and stamped retrofit drawings.' },
      { name: 'Residential Foundation Design', price: 1650, category: 'Structural Engineering', delivery_time_days: 12, description: 'Site-specific foundation design with soil-bearing assumptions, rebar schedules, and stamped plans ready for your builder.' },
    ],
    services: [
      { title: 'PE-Stamped Structural Engineering', category: 'Structural Engineering', price: 1500, delivery_time: '1-2 weeks', service_area: 'remote', tags: ['PE Stamp', 'Structural Analysis', 'Plan Review'], certifications: ['Licensed PE', 'SE'], images: [IMG.structural], description: 'Licensed structural engineering for residential and commercial projects - stamped drawings, load calculations, and permit support in 30+ states.' },
      { title: 'Structural Peer Review & Consulting', category: 'Consulting Services', price: 1100, delivery_time: '5-7 business days', service_area: 'remote', tags: ['Peer Review', 'Plan Review', 'Code Compliance'], certifications: ['Licensed PE'], images: [IMG.steel], description: 'Independent third-party review of structural designs for municipalities, architects, and developers. Fast, defensible review memos.' },
    ],
  },
  {
    email: 'sam.okafor@ppf.test',
    company_slug: 'ironclad-fabrication-works',
    products: [
      { name: 'Custom Steel Weldments - MIG/TIG', price: 2850, category: 'Fabrication', delivery_time_days: 15, description: 'Certified MIG and TIG welding of custom steel weldments to your drawings. WPS/PQR documentation and dimensional inspection included.' },
      { name: 'Sheet Metal Enclosure Fabrication', price: 1650, category: 'Sheet Metal', delivery_time_days: 12, description: 'Laser-cut, formed, and welded sheet-metal enclosures in mild steel, stainless, or aluminum. NEMA-rated options available.' },
      { name: 'Heavy Structural Steel Fabrication', price: 9200, category: 'Fabrication', delivery_time_days: 35, description: 'AISC-compliant structural steel fabrication for platforms, mezzanines, and supports. Galvanizing and field-erection coordination available.' },
      { name: 'Laser Cut & Formed Parts', price: 1450, category: 'Sheet Metal', delivery_time_days: 8, description: 'High-precision fiber-laser cutting and CNC press-brake forming for production parts. Deburring and first-article inspection included.' },
      { name: 'Powder Coated Weldment Assemblies', price: 3400, category: 'Finishing', delivery_time_days: 18, description: 'Complete fabrication plus in-house powder coating in your specified RAL color. Consistent finish, batch-to-batch color matching.' },
    ],
    services: [
      { title: 'Custom Steel Fabrication & Welding', category: 'Industrial Manufacturing', price: 2200, delivery_time: '1-3 weeks', service_area: 'both', tags: ['Welding', 'Steel Fabrication', 'MIG/TIG'], certifications: ['AWS D1.1', 'AISC'], images: [IMG.fab], description: 'Certified fabrication of custom steel structures, weldments, and machine frames from your drawings. AWS D1.1 certified welders and full inspection documentation.' },
      { title: 'Sheet Metal Prototyping & Production', category: 'Industrial Manufacturing', price: 1400, delivery_time: '5-10 business days', service_area: 'both', tags: ['Sheet Metal', 'Laser Cutting', 'Forming'], certifications: ['ISO 9001:2015'], images: [IMG.metal], description: 'Laser cutting, forming, and finishing for sheet-metal prototypes through low-volume production. Fast quotes and DFM feedback on every order.' },
    ],
  },
]

// ── RFQs (open buyer requests across categories) ──────────────────────────────
const RFQS = [
  {
    title: 'Prototype CNC Run - 200 Anodized Aluminum Enclosures',
    category: 'Industrial Manufacturing',
    description: 'We need 200 machined 6061-T6 aluminum enclosures with a Type II anodized finish for an industrial sensor product. Tolerances ±0.005" on all critical features. First article required before the full run.',
    quantity: '200 units',
    budget: '$12,000 - $18,000',
    timeline: '3-4 weeks',
    location: 'Cleveland, OH',
    material: '6061-T6 Aluminum',
    rfq_type: 'product',
    is_asap: false,
  },
  {
    title: 'Control Panel Build for Packaging Line (2 Panels)',
    category: 'Controls & Automation',
    description: 'Two UL 508A control panels to operate a new packaging line. Includes PLC, HMI, VFDs for 3 conveyors, and safety relay logic. Schematics will be provided. Need build plus on-site commissioning in Austin, TX.',
    quantity: '2 panels',
    budget: '$25,000 - $35,000',
    timeline: '6 weeks',
    location: 'Austin, TX',
    material: 'NEMA 12 enclosures',
    rfq_type: 'product',
    is_asap: false,
  },
  {
    title: 'PE-Stamped Structural Review - Warehouse Rack Anchorage',
    category: 'Structural Engineering',
    description: 'Need a licensed PE to review and stamp anchorage calculations for a pallet-rack system in a 40,000 sq ft warehouse. Existing slab-on-grade, seismic category B. Deliverable is a stamped letter and calc package for the county permit.',
    quantity: '1 project',
    budget: '$2,500 - $4,000',
    timeline: '2 weeks',
    location: 'Denver, CO',
    material: null,
    rfq_type: 'service',
    is_asap: true,
  },
  {
    title: 'Custom Steel Weldments - 40 Machine Frames',
    category: 'Industrial Manufacturing',
    description: 'Fabricate 40 welded machine-base frames from provided drawings (mild steel, 1/4" plate). Need AWS D1.1 certified welding, dimensional inspection reports, and a prime coat. Delivery to Pittsburgh.',
    quantity: '40 assemblies',
    budget: '$40,000 - $60,000',
    timeline: '5 weeks',
    location: 'Pittsburgh, PA',
    material: 'A36 mild steel',
    rfq_type: 'product',
    is_asap: false,
  },
  {
    title: 'HVAC Ducting & Load Design - 12,000 sq ft Facility',
    category: 'HVAC Systems',
    description: 'Full HVAC design for a 12,000 sq ft light-manufacturing facility. Need a manual J/D load calc, duct layout, equipment selection, and stamped drawings for permitting. North Texas climate.',
    quantity: '1 facility',
    budget: '$8,000 - $14,000',
    timeline: '3 weeks',
    location: 'Fort Worth, TX',
    material: null,
    rfq_type: 'service',
    is_asap: false,
  },
  {
    title: 'Retrofit Electrical Panels - 3 Buildings',
    category: 'Electrical Engineering',
    description: 'Retrofit and re-label distribution panels across three facilities. Need load analysis, updated single-line diagrams, arc-flash labeling, and installation support. Work can be phased over two months.',
    quantity: '3 buildings',
    budget: '$30,000 - $45,000',
    timeline: '8 weeks',
    location: 'Columbus, OH',
    material: null,
    rfq_type: 'service',
    is_asap: false,
  },
]

async function main() {
  console.log('🌱 Seeding real marketplace data...\n')

  // Resolve company + owner profile IDs
  const slugs = VENDORS.map(v => v.company_slug)
  const { data: companies, error: cErr } = await supabase
    .from('company_profiles')
    .select('id, company_name, slug, owner_id')
    .in('slug', slugs)
  if (cErr) throw cErr

  const bySlug = new Map((companies || []).map(c => [c.slug, c]))

  let prodInserted = 0, prodSkipped = 0
  let svcInserted = 0, svcSkipped = 0

  for (const vendor of VENDORS) {
    const company = bySlug.get(vendor.company_slug)
    if (!company?.owner_id) {
      console.warn(`  ⚠️  No company/owner for ${vendor.company_slug} - skipping`)
      continue
    }
    console.log(`\n▶ ${company.company_name}`)

    // ── products (price in DOLLARS) ──
    const { data: existingProducts } = await supabase
      .from('products').select('name').eq('company_id', company.id)
    const existingProductNames = new Set((existingProducts || []).map(p => p.name))

    for (const p of vendor.products) {
      if (existingProductNames.has(p.name)) { prodSkipped++; continue }
      const { error } = await supabase.from('products').insert({
        company_id: company.id,
        name: p.name,
        description: p.description,
        price: p.price,               // dollars
        category: p.category,
        delivery_time_days: p.delivery_time_days,
        is_active: true,
        requires_consultation: false,
      })
      if (error) console.error(`  ❌ product "${p.name}": ${error.message}`)
      else { prodInserted++; console.log(`  ✅ product: ${p.name}`) }
    }

    // ── services (price in DOLLARS) ──
    const { data: existingServices } = await supabase
      .from('services').select('title').eq('provider_id', company.owner_id)
    const existingServiceTitles = new Set((existingServices || []).map(s => s.title))

    for (const s of vendor.services) {
      if (existingServiceTitles.has(s.title)) { svcSkipped++; continue }
      const { error } = await supabase.from('services').insert({
        provider_id: company.owner_id,
        title: s.title,
        description: s.description,
        price: s.price,               // dollars
        category: s.category,
        tags: s.tags,
        images: s.images,
        delivery_time: s.delivery_time,
        service_area: s.service_area,
        certifications: s.certifications,
        active: true,
      })
      if (error) console.error(`  ❌ service "${s.title}": ${error.message}`)
      else { svcInserted++; console.log(`  ✅ service: ${s.title}`) }
    }
  }

  // ── RFQs ──
  console.log('\n▶ RFQs')
  const { data: existingRfqs } = await supabase.from('rfqs').select('title')
  const existingRfqTitles = new Set((existingRfqs || []).map(r => r.title))

  // Real accounts act as the requesting buyers.
  const { data: buyers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('email', ['precisionprojectflow@gmail.com', 'maya.chen@ppf.test', 'diego.ramirez@ppf.test'])
  const buyerPool = buyers || []
  if (buyerPool.length === 0) console.warn('  ⚠️  No buyer accounts found - skipping RFQs')

  let rfqInserted = 0, rfqSkipped = 0
  for (let i = 0; i < RFQS.length; i++) {
    const r = RFQS[i]
    if (existingRfqTitles.has(r.title)) { rfqSkipped++; continue }
    const buyer = buyerPool[i % buyerPool.length]
    const { error } = await supabase.from('rfqs').insert({
      client_id: buyer.id,
      title: r.title,
      category: r.category,
      description: r.description,
      quantity: r.quantity,
      budget: r.budget,
      timeline: r.timeline,
      location: r.location,
      attachment_urls: [],
      status: 'open',
      slug: slugify(r.title),
      material: r.material,
      rfq_type: r.rfq_type,
      nda_required: false,
      is_asap: r.is_asap,
      line_items: [],
    })
    if (error) console.error(`  ❌ rfq "${r.title}": ${error.message}`)
    else { rfqInserted++; console.log(`  ✅ rfq: ${r.title}  (buyer: ${buyer.full_name})`) }
  }

  console.log('\n──────── summary ────────')
  console.log(`products : +${prodInserted} (skipped ${prodSkipped})`)
  console.log(`services : +${svcInserted} (skipped ${svcSkipped})`)
  console.log(`rfqs     : +${rfqInserted} (skipped ${rfqSkipped})`)
}

main().catch(e => { console.error(e); process.exit(1) })
