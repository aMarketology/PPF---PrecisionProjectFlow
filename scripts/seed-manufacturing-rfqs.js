/**
 * Seed Manufacturing RFQs — CNC, Parts, Replacement, Industrial
 * Run: node scripts/seed-manufacturing-rfqs.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MANUFACTURING_RFQS = [
  // ── CNC Machining ──
  {
    title: 'CNC Milling: 316 Stainless Steel Flanges — 500 Units',
    category: 'CNC Machining',
    description: 'Need 500 precision CNC milled flanges in 316 stainless steel. OD 4.500" ±0.002", thickness 0.375" ±0.001", with 6x countersunk bolt holes on a 3.250" BCD. Surface finish 32 Ra max. STEP files and inspection reports required. First article approval before full production.',
    quantity: '500 units',
    budget: '$12,000 - $18,000',
    timeline: '6-8 weeks',
    location: 'Detroit, MI',
    status: 'open',
  },
  {
    title: '5-Axis CNC: Titanium Aerospace Brackets — 50 Units',
    category: 'CNC Machining',
    description: '50 titanium (Ti-6Al-4V) aerospace brackets requiring 5-axis simultaneous machining. Complex geometry with thin walls (0.060" min), tight tolerances ±0.001". NADCAP certified shop preferred. Must provide CMM inspection data, material certs, and FAI per AS9102.',
    quantity: '50 units',
    budget: '$25,000 - $40,000',
    timeline: '8-10 weeks',
    location: 'Seattle, WA',
    status: 'open',
  },
  {
    title: 'CNC Turning: Brass Valve Bodies — 1,000 Units',
    category: 'CNC Machining',
    description: 'Production run of 1,000 brass (C360) valve bodies. CNC turning with live tooling for cross-drilling and threading. 1/2" NPT threads, O-ring groove, and hex body. ±0.003" tolerances. Deburred and cleaned. Looking for ongoing production partner — 5,000+ units/year.',
    quantity: '1,000 units',
    budget: '$8,000 - $12,000',
    timeline: '4-6 weeks',
    location: 'Cleveland, OH',
    status: 'open',
  },
  {
    title: 'CNC Router: Aluminum Control Panel Faceplates — 200 Units',
    category: 'CNC Machining',
    description: '200 custom aluminum (5052-H32) control panel faceplates. CNC routed with engraved text/labels, rectangular cutouts for displays, and circular holes for buttons/switches. 0.125" thick, brushed finish with clear anodize. Vector files provided (DXF/AI).',
    quantity: '200 units',
    budget: '$3,500 - $5,500',
    timeline: '3-4 weeks',
    location: 'Chicago, IL',
    status: 'open',
  },

  // ── Industrial Parts & Replacement ──
  {
    title: 'Emergency: Haas VF-2 Spindle Cartridge Replacement',
    category: 'Industrial Parts & Replacement',
    description: 'Haas VF-2 (2018) spindle cartridge failed — grinding noise, runout >0.001". Need OEM or high-quality aftermarket replacement spindle cartridge. Machine is down and we\'re losing $2K/day. Must be in stock and ready to ship. Will pay premium for overnight delivery. Part #: 93-30-12000B.',
    quantity: '1 spindle cartridge',
    budget: '$4,500 - $7,000',
    timeline: 'Immediate — within 48 hours',
    location: 'Grand Rapids, MI',
    status: 'open',
  },
  {
    title: 'Mazak Quick Turn 250 Ballscrew Replacement — X-Axis',
    category: 'Industrial Parts & Replacement',
    description: 'X-axis ballscrew on our Mazak Quick Turn 250MY (2016) has excessive backlash (0.004"). Need replacement ballscrew assembly or precision regrind service. Must be C3 grade or better. Include new ball nut and support bearings. Installation not required — we have in-house maintenance.',
    quantity: '1 ballscrew assembly',
    budget: '$3,000 - $5,500',
    timeline: '1-2 weeks',
    location: 'Houston, TX',
    status: 'open',
  },
  {
    title: 'Fanuc Servo Drive A06B-6270-H045 Replacement',
    category: 'Industrial Parts & Replacement',
    description: 'Fanuc Alpha i series servo drive module failed on our CNC lathe. Model A06B-6270-H045. Alarm 438 (current overload). Need tested/refurbished or new replacement unit. Must be compatible with Fanuc 31i-B control. Include 90-day warranty minimum.',
    quantity: '1 servo drive',
    budget: '$2,500 - $4,000',
    timeline: 'Within 1 week',
    location: 'Milwaukee, WI',
    status: 'open',
  },
  {
    title: 'Hydraulic Cylinder Rebuild Kit — Parker 2.5" Bore x 18" Stroke',
    category: 'Industrial Parts & Replacement',
    description: 'Need rebuild kit for Parker hydraulic cylinder: 2.5" bore, 1.375" rod, 18" stroke. Includes piston seals, rod seals, wiper, O-rings, and wear rings. Cylinder is on a press brake that\'s critical to production. Polyurethane or HNBR seals preferred for high cycle life.',
    quantity: '2 rebuild kits',
    budget: '$200 - $500',
    timeline: 'Within 3-5 days',
    location: 'Pittsburgh, PA',
    status: 'open',
  },

  // ── Sheet Metal & Fabrication ──
  {
    title: 'Laser Cut & Bent: 304 Stainless Enclosures — 100 Units',
    category: 'Sheet Metal & Fabrication',
    description: '100 custom 304 stainless steel electrical enclosures. 16ga material, laser cut, CNC bent, and TIG welded corners. NEMA 4X rated with gasketed door, mounting panel, and cable glands. Dimensions: 24"x20"x10". Powder coat optional. DXF files provided.',
    quantity: '100 units',
    budget: '$15,000 - $22,000',
    timeline: '6-8 weeks',
    location: 'Atlanta, GA',
    status: 'open',
  },
  {
    title: 'Welded Steel Machine Base Frames — 25 Units',
    category: 'Sheet Metal & Fabrication',
    description: '25 welded steel machine base frames. 4"x4"x0.25" square tube construction, stress-relieved after welding. Machined mounting pads on top surface (flat within 0.010" over 48"). Painted with industrial enamel. Approx 48"x36"x30" each. Lifting eyes included.',
    quantity: '25 frames',
    budget: '$18,000 - $28,000',
    timeline: '8-10 weeks',
    location: 'Cincinnati, OH',
    status: 'open',
  },

  // ── 3D Printing / Additive ──
  {
    title: 'SLS Nylon 12: End-Use Drone Housings — 200 Units',
    category: '3D Printing / Additive Manufacturing',
    description: '200 SLS printed drone sensor housings in Nylon 12 (PA2200). Complex internal channels, snap-fit features, and living hinges. Wall thickness 1.2mm minimum. Dyed black. No support removal needed (SLS). STEP files provided. Looking for consistent quality across batches.',
    quantity: '200 units',
    budget: '$4,000 - $6,500',
    timeline: '2-3 weeks',
    location: 'Austin, TX',
    status: 'open',
  },
  {
    title: 'DMLS: Inconel 718 Turbine Blades — 20 Units',
    category: '3D Printing / Additive Manufacturing',
    description: '20 DMLS (Direct Metal Laser Sintering) Inconel 718 turbine blades for a small gas turbine prototype. As-built surface acceptable on airfoil; root and shroud need post-machining. HIP treatment required. Provide material certs and CT scan or X-ray inspection report.',
    quantity: '20 blades',
    budget: '$8,000 - $14,000',
    timeline: '3-4 weeks',
    location: 'Phoenix, AZ',
    status: 'open',
  },

  // ── Injection Molding ──
  {
    title: 'Injection Mold Tooling: ABS Electronics Housing',
    category: 'Injection Molding & Tooling',
    description: 'Need injection mold tooling for a new ABS electronics housing. Single cavity, P20 steel mold. Part size approx 6"x4"x2" with 2mm wall thickness. Includes side actions for undercuts, ejector system, and texture (MT-11000). Also quoting first production run of 5,000 parts.',
    quantity: '1 mold + 5,000 parts',
    budget: '$15,000 - $25,000',
    timeline: '8-12 weeks for mold',
    location: 'Nashville, TN',
    status: 'open',
  },
  {
    title: 'Overmolding: TPE Grip on Nylon Handle — Mold + 10K Units',
    category: 'Injection Molding & Tooling',
    description: 'Two-shot overmolding project: glass-filled nylon (PA66-GF30) substrate with TPE overmold for soft grip. Need mold design, tooling, and production of 10,000 units. Part is a power tool handle, 5" long. Chemical bond required between materials. Texture on grip area.',
    quantity: '1 mold set + 10,000 units',
    budget: '$20,000 - $35,000',
    timeline: '10-14 weeks',
    location: 'Charlotte, NC',
    status: 'open',
  },

  // ── Electrical / Controls ──
  {
    title: 'VFD Replacement: Allen-Bradley PowerFlex 755 — 20HP',
    category: 'Electrical & Controls',
    description: 'Need replacement Allen-Bradley PowerFlex 755 VFD, 20HP, 480V 3-phase. Catalog # 20G11NC8P0JA0NNNNN. Our unit failed with F12 (HW Overcurrent) fault. Need new or factory refurbished with warranty. Must include Ethernet/IP communication module.',
    quantity: '1 VFD unit',
    budget: '$3,500 - $5,500',
    timeline: 'Within 1 week',
    location: 'Indianapolis, IN',
    status: 'open',
  },
  {
    title: 'Control Panel Build: Conveyor System — 3 Panels',
    category: 'Electrical & Controls',
    description: 'Build 3 control panels for a new conveyor system. Each panel: 480V/120V transformer, PowerFlex 525 VFDs (x4), CompactLogix PLC, PanelView Plus 7 HMI, Ethernet switch, circuit protection. UL 508A certified shop required. Schematics and BOM provided.',
    quantity: '3 control panels',
    budget: '$25,000 - $40,000',
    timeline: '6-8 weeks',
    location: 'Memphis, TN',
    status: 'open',
  },

  // ── Welding & Assembly ──
  {
    title: 'Certified Welding: ASME Section IX Pressure Vessel',
    category: 'Welding & Assembly',
    description: 'Need ASME Section IX certified welder for pressure vessel fabrication. Material: SA-516-70 carbon steel, 0.75" wall thickness. Full penetration butt welds, 100% UT inspection. Vessel is 48" diameter x 120" long. Includes nozzle and flange welding. WPQ/WPS required.',
    quantity: '1 vessel welding package',
    budget: '$12,000 - $18,000',
    timeline: '3-4 weeks',
    location: 'Baton Rouge, LA',
    status: 'open',
  },

  // ── Quality / Inspection ──
  {
    title: 'CMM Inspection Services: First Article — 25 Part Numbers',
    category: 'Quality & Inspection',
    description: 'Need CMM inspection and FAI reports (AS9102 Form 3) for 25 different part numbers. Parts range from small brackets to large housings (up to 24"). Must have Zeiss or Hexagon CMM with Calypso or PC-DMIS. ISO 17025 accredited lab preferred. Provide digital reports.',
    quantity: '25 FAIs',
    budget: '$5,000 - $8,000',
    timeline: '2-3 weeks',
    location: 'Wichita, KS',
    status: 'open',
  },

  // ── More CNC ──
  {
    title: 'Swiss CNC: Medical Device Bone Screws — 5,000 Units',
    category: 'CNC Machining',
    description: '5,000 titanium (Ti-6Al-4V ELI) bone screws for medical device. Swiss-type CNC turning required. Thread: 3.5mm major diameter, self-tapping, cancellous thread form. Hexalobe drive. Passivation and cleaning per ASTM F86. ISO 13485 certified shop required. Full lot traceability.',
    quantity: '5,000 units',
    budget: '$15,000 - $22,000',
    timeline: '6-8 weeks',
    location: 'Minneapolis, MN',
    status: 'open',
  },
  {
    title: 'Wire EDM: D2 Tool Steel Progressive Die Components',
    category: 'CNC Machining',
    description: 'Wire EDM work on D2 tool steel (58-60 HRC). Need punch and die inserts for a progressive stamping die. Tolerances ±0.0002", surface finish 16 Ra or better. 10 unique geometries, 2-4 pieces each. Provide inspection data with each batch.',
    quantity: '30 pieces total',
    budget: '$6,000 - $9,000',
    timeline: '3-4 weeks',
    location: 'Dayton, OH',
    status: 'open',
  },
];

async function main() {
  // Get a client to assign RFQs to
  const { data: profiles } = await supabase.from('profiles')
    .select('id, user_type').eq('user_type', 'client').limit(1);
  
  let clientId = profiles?.[0]?.id;
  
  if (!clientId) {
    // Fall back to any profile
    const { data: anyProfile } = await supabase.from('profiles')
      .select('id').limit(1);
    clientId = anyProfile?.[0]?.id;
  }

  if (!clientId) {
    console.error('❌ No profiles found in database. Create a user first.');
    process.exit(1);
  }

  console.log(`Using client_id: ${clientId}`);

  let created = 0;
  let skipped = 0;

  for (const rfq of MANUFACTURING_RFQS) {
    // Check for duplicate by title
    const { data: existing } = await supabase.from('rfqs')
      .select('id').eq('title', rfq.title).limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`  ⏭️  Skipping (exists): ${rfq.title.substring(0, 60)}`);
      skipped++;
      continue;
    }

    const { data, error } = await supabase.from('rfqs').insert({
      client_id: clientId,
      ...rfq,
      created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
    }).select('id').single();

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Created: ${rfq.title.substring(0, 60)}`);
      created++;
    }
  }

  console.log(`\n🎯 Done! Created ${created} RFQs, skipped ${skipped} duplicates.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });