// Update the CNC RFQ with line items
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const lineItems = [
  { part: 'Mounting Bracket \u2014 P/N MB-001 Rev C', qty: 250, material: '6061-T6 Aluminum', tolerance: '\u00B10.005"', finish: 'Clear anodize, MIL-A-8625 Type II', notes: 'Per DWG-MB-001 Rev C. 4x \u00D80.257" thru holes on 1.500" BCD. Deburr all edges.' },
  { part: 'Support Plate \u2014 P/N SP-002 Rev B', qty: 250, material: '6061-T6 Aluminum', tolerance: '\u00B10.002" on mating surface', finish: 'Clear anodize, MIL-A-8625 Type II', notes: 'Per DWG-SP-002 Rev B. .375" thick. Flat within .005" across 8". Counterbored holes for SHCS.' },
  { part: 'Pivot Arm \u2014 P/N PA-003 Rev A', qty: 250, material: '6061-T6 Aluminum', tolerance: '\u00B10.003"', finish: 'Clear anodize, MIL-A-8625 Type II', notes: 'Per DWG-PA-003 Rev A. Contains .500" \u00B1.001" bore for bronze bushing. 2x #10-32 tapped holes.' },
  { part: 'Spacer Sleeve \u2014 P/N SS-004 Rev B', qty: 500, material: '304 Stainless Steel', tolerance: '\u00B10.001" on ID/OD', finish: 'Passivate per ASTM A967', notes: 'Per DWG-SS-004 Rev B. OD 0.625" \u00B1.001", ID 0.375" \u00B1.001", length 1.250" \u00B1.005". 32 Ra max finish.' },
  { part: 'Retaining Clip \u2014 P/N RC-005 Rev A', qty: 500, material: '304 Stainless Steel', tolerance: '\u00B10.005"', finish: 'Passivate per ASTM A967', notes: 'Per DWG-RC-005 Rev A. .062" thick spring-tempered 304. Bent 90\u00B0 with 0.030" radius. No burrs.' },
];

async function main() {
  const { error } = await svc
    .from('rfqs')
    .update({ line_items: lineItems })
    .eq('id', '0a1e8cf8-2dfa-486a-a342-22a0c60a3ab2');

  if (error) {
    console.error('❌', error.message);
    process.exit(1);
  }

  console.log('✅ Line items added!');
  console.log('   Parts:', lineItems.length);
  console.log('   Total qty:', lineItems.reduce((s, i) => s + i.qty, 0), 'pieces');
  console.log('   View: https://www.precisionprojectflow.com/rfq/cnc-machined-parts-assembly-custom-bracket-kit-250-units-7ed90ade');
}

main().catch(e => { console.error(e); process.exit(1); });