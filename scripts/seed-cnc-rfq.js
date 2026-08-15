/**
 * SEED: Post a realistic CNC Machined Parts RFQ with line items
 * from precisionprojectflow@gmail.com
 *
 * First, this script attempts to add the line_items column.
 * If that fails, it tells you the single SQL command to run.
 *
 * Run: node scripts/seed-cnc-rfq.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const RFQ = {
  title: 'CNC Machined Parts Assembly — Custom Bracket Kit (250 Units)',
  category: 'CNC Machining',
  description: `We are seeking a precision CNC machine shop to manufacture a custom bracket assembly kit for our industrial equipment line. This is a multi-part order with 5 unique part numbers — see the line items below for details.

KEY REQUIREMENTS:
• All parts must be machined from 6061-T6 Aluminum
• Tolerances: ±0.005" on general dimensions, ±0.002" on mating surfaces
• Break and deburr all sharp edges (0.005" max chamfer)
• No visible tool marks on exposed surfaces
• First Article Inspection (FAI) report required per AS9102 for each part number
• Material certifications required with shipment
• Parts must be individually bagged and labeled with part number + revision

QUALITY:
• ISO 9001:2015 certified shop preferred
• CMM inspection report for first article
• Surface finish 32 Ra max on all machined surfaces
• Clear chemical film (MIL-DTL-5541, Class 1A) on all parts

TIMELINE:
• Production lead time: 4-6 weeks from PO
• First article approval: 2 weeks (sample parts + inspection report)
• Production run: 2-4 weeks after FAI approval
• Shipping: UPS Ground, FOB Origin

We are looking for an ongoing production partner — this order is expected to repeat quarterly with quantities increasing to 500+ units per run.`,
  quantity: '250 kits',
  budget: '$18,000 - $28,000',
  timeline: '4-6 weeks',
  location: 'Portland, OR',
  material: '6061-T6 Aluminum, 304 Stainless Steel',
  nda_required: true,
  is_asap: false,
  line_items: [
    {
      part: 'Mounting Bracket — P/N MB-001 Rev C',
      qty: 250,
      material: '6061-T6 Aluminum',
      tolerance: '±0.005"',
      finish: 'Clear anodize, MIL-A-8625 Type II',
      notes: 'Per DWG-MB-001 Rev C. 4x Ø0.257" thru holes on 1.500" BCD. Deburr all edges.'
    },
    {
      part: 'Support Plate — P/N SP-002 Rev B',
      qty: 250,
      material: '6061-T6 Aluminum',
      tolerance: '±0.002" on mating surface',
      finish: 'Clear anodize, MIL-A-8625 Type II',
      notes: 'Per DWG-SP-002 Rev B. .375" thick. Flat within .005" across 8". Counterbored holes for SHCS.'
    },
    {
      part: 'Pivot Arm — P/N PA-003 Rev A',
      qty: 250,
      material: '6061-T6 Aluminum',
      tolerance: '±0.003"',
      finish: 'Clear anodize, MIL-A-8625 Type II',
      notes: 'Per DWG-PA-003 Rev A. Contains .500" ±.001" bore for bronze bushing. 2x #10-32 tapped holes.'
    },
    {
      part: 'Spacer Sleeve — P/N SS-004 Rev B',
      qty: 500,
      material: '304 Stainless Steel',
      tolerance: '±0.001" on ID/OD',
      finish: 'Passivate per ASTM A967',
      notes: 'Per DWG-SS-004 Rev B. OD 0.625" ±.001", ID 0.375" ±.001", length 1.250" ±.005". 32 Ra max finish.'
    },
    {
      part: 'Retaining Clip — P/N RC-005 Rev A',
      qty: 500,
      material: '304 Stainless Steel',
      tolerance: '±0.005"',
      finish: 'Passivate per ASTM A967',
      notes: 'Per DWG-RC-005 Rev A. .062" thick spring-tempered 304. Bent 90° with 0.030" radius. No burrs.'
    }
  ]
};

async function main() {
  const userId = '01dddb11-db3e-4ebb-be2d-e5be74fe3fa5'; // precisionprojectflow@gmail.com

  // 1. Check if line_items column exists
  console.log('🔍 Checking if line_items column exists...');
  const { data: probe, error: probeErr } = await svc
    .from('rfqs').select('line_items').limit(1);
  
  const columnExists = !(probeErr && probeErr.message?.includes('line_items'));

  if (!columnExists) {
    console.log('❌ line_items column does not exist.');
    console.log('');
    console.log('📋 Run this ONE command in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new');
    console.log('');
    console.log('   ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS line_items jsonb NOT NULL DEFAULT \'[]\'::jsonb;');
    console.log('');
    console.log('   Then re-run this script.');
    console.log('');

    // Ask user if they want to continue without line_items
    const { createInterface } = require('readline');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => {
      rl.question('❓ Post RFQ WITHOUT line items for now? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('👋 Exiting. Run the SQL above first, then re-run.');
      process.exit(0);
    }

    // Remove line_items from the insert
    delete RFQ.line_items;
    console.log('⏩ Posting RFQ without line items...');
  } else {
    console.log('✅ line_items column exists!');
  }

  // 2. Check for duplicate by title
  const { data: existing } = await svc.from('rfqs')
    .select('id').eq('title', RFQ.title).limit(1);
  if (existing && existing.length > 0) {
    console.log('⏭️  RFQ with same title already exists (id:', existing[0].id, ')');
    console.log('Skipping insert.');
    process.exit(0);
  }

  // 3. Build the insert payload
  const insertPayload = {
    client_id: userId,
    title: RFQ.title,
    category: RFQ.category,
    description: RFQ.description,
    quantity: RFQ.quantity,
    budget: RFQ.budget,
    timeline: RFQ.timeline,
    location: RFQ.location,
    material: RFQ.material,
    nda_required: RFQ.nda_required,
    is_asap: RFQ.is_asap,
    slug: RFQ.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + require('crypto').randomBytes(4).toString('hex'),
    status: 'open',
  };

  if (RFQ.line_items) {
    insertPayload.line_items = RFQ.line_items;
  }

  const { data, error } = await svc.from('rfqs').insert(insertPayload).select('id, slug').single();

  if (error) {
    console.error('❌ Failed to insert RFQ:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('✅ RFQ POSTED!');
  console.log('   Title:', RFQ.title);
  console.log('   ID:', data.id);
  console.log('   Slug:', data.slug);
  if (RFQ.line_items) {
    console.log('   Line Items:', RFQ.line_items.length, 'parts');
  }
  console.log('   URL: https://www.precisionprojectflow.com/rfq/' + (data.slug || data.id));
  console.log('');
  console.log('📱 View it live:');
  console.log('   https://www.precisionprojectflow.com/rfq/' + (data.slug || data.id));
}

main().catch(e => { console.error(e); process.exit(1); });