const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SAMPLE_RFQS = [
  {
    title: 'Emergency Replacement: Baldor 50HP Motor EM4110T',
    category: 'Industrial Manufacturing',
    description: 'We have a Baldor EM4110T 50HP motor that failed this morning on our main production line. Need an exact replacement or equivalent cross-reference ASAP. Nameplate photo attached. Must be in stock and ready to ship today. Will pay premium for fast delivery.',
    quantity: '1 unit',
    budget: '$8,000 - $12,000',
    timeline: 'Immediate - within 24 hours',
    location: 'Buffalo, NY',
    status: 'open',
  },
  {
    title: 'Grundfos CR45-3-2 Pump Rebuild or Replacement',
    category: 'Plumbing & Piping',
    description: 'Our Grundfos CR45-3-2 multistage pump is cavitating and losing pressure. Looking for either a rebuild kit with seals, bearings, and impellers OR a complete replacement unit. System runs 24/7 so downtime is critical. Please include lead time in your quote.',
    quantity: '1 rebuild kit or pump',
    budget: '$3,000 - $6,000',
    timeline: 'Within 3-5 business days',
    location: 'Rochester, NY',
    status: 'open',
  },
  {
    title: 'Custom CNC Machined Aluminum Brackets - 200 Units',
    category: 'Mechanical Engineering',
    description: 'Need 200 custom aluminum brackets machined from 6061-T6. Tolerances: ±0.005". Includes tapped holes (M6x1.0) and counterbores. STEP files and 2D drawings available. Surface finish: clear anodize. First article inspection required before full production run.',
    quantity: '200 units',
    budget: '$4,000 - $6,500',
    timeline: '4-6 weeks',
    location: 'Syracuse, NY',
    status: 'open',
  },
  {
    title: 'HVAC Chiller Compressor Replacement - Carrier 30RB',
    category: 'HVAC Systems',
    description: 'Carrier 30RB 80-ton air-cooled chiller compressor has seized. Need replacement compressor (Copeland scroll) and installation service. Building serves 200 occupants so we need this resolved quickly. Include labor and refrigerant recovery/recharge in quote.',
    quantity: '1 compressor + installation',
    budget: '$15,000 - $25,000',
    timeline: 'Within 1 week',
    location: 'Albany, NY',
    status: 'open',
  },
  {
    title: 'Electrical Panel Upgrade - 400A to 800A Service',
    category: 'Electrical Engineering',
    description: 'Upgrading our facility from 400A to 800A 3-phase 480V service. Need complete panel design, equipment specification, and installation. Must comply with NEC 2023. Includes new switchgear, distribution panels, and coordination study. Site survey available this week.',
    quantity: '1 complete upgrade',
    budget: '$40,000 - $65,000',
    timeline: '8-12 weeks',
    location: 'Buffalo, NY',
    status: 'open',
  },
  {
    title: 'Structural Steel Fabrication - Mezzanine Support Beams',
    category: 'Structural Engineering',
    description: 'Fabrication of 12 W12x40 steel beams, 24ft length each, with welded end plates and stiffeners. ASTM A992 steel. Shop drawings required for approval before fabrication. Includes primer coat. Delivery to job site in Niagara Falls.',
    quantity: '12 beams',
    budget: '$18,000 - $25,000',
    timeline: '3-4 weeks',
    location: 'Niagara Falls, NY',
    status: 'open',
  },
  {
    title: 'Siemens S7-1500 PLC Programming for Packaging Line',
    category: 'Controls & Automation',
    description: 'Need PLC programming for a new packaging line integration. Siemens S7-1500 with TIA Portal. Includes HMI development (TP1200 Comfort), VFD configuration (Sinamics G120), and IO-Link sensor integration. Must have experience with packaging machinery and safety PLC programming.',
    quantity: '1 complete programming package',
    budget: '$12,000 - $18,000',
    timeline: '4-6 weeks',
    location: 'Remote / Buffalo, NY',
    status: 'open',
  },
  {
    title: 'Fire Sprinkler System Design for 50,000 sqft Warehouse',
    category: 'Fire Protection',
    description: 'New construction 50,000 sqft warehouse needs complete fire sprinkler system design per NFPA 13. ESFR sprinklers, fire pump sizing, hydraulic calculations, and permit-ready drawings. Building is steel frame with 32ft clear height. Storage classification: Class IV commodities.',
    quantity: '1 complete design package',
    budget: '$8,000 - $14,000',
    timeline: '2-3 weeks for design',
    location: 'Buffalo, NY',
    status: 'in_review',
  },
];

(async () => {
  // Get the PPF company owner as the client
  const { data: ppf } = await supabase.from('company_profiles')
    .select('owner_id').eq('company_name', 'Precision Project Flow').single();

  const clientId = ppf?.owner_id;
  if (!clientId) { console.log('PPF company not found'); process.exit(1); }

  console.log('Using client:', clientId);

  for (const rfq of SAMPLE_RFQS) {
    const { data, error } = await supabase.from('rfqs').insert({
      client_id: clientId,
      ...rfq,
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select('id').single();

    if (error) {
      console.error('Insert error:', error.message);
    } else {
      console.log('Created RFQ:', data.id, '-', rfq.title.substring(0, 50));
    }
  }

  console.log('\nDone seeding', SAMPLE_RFQS.length, 'RFQs');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });