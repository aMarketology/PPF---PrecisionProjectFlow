#!/usr/bin/env node
/**
 * seed-dealer.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Creates the PPF Dealer / Admin account and seeds 15 realistic marketplace
 * service listings in the engineering niche.
 *
 * Usage:
 *   node scripts/seed-dealer.js
 *
 * Saves dealer credentials to .env.local as:
 *   PPF_DEALER_EMAIL
 *   PPF_DEALER_PASSWORD
 *   PPF_DEALER_USER_ID
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Dealer account ─────────────────────────────────────────────────────────────
const DEALER_EMAIL    = 'dealer@precisionprojectflow.com';
const DEALER_PASSWORD = 'PPF_Dealer_2024!';
const DEALER_NAME     = 'PPF Marketplace';

// ── 15 real-world engineering marketplace services ─────────────────────────────
const SERVICES = [
  // ── CIVIL / STRUCTURAL ──────────────────────────────────────────────────────
  {
    title: 'Structural Engineering Plan Review & Stamped Drawings',
    description: 'Licensed PE provides comprehensive structural plan review and stamped drawings for commercial, industrial, and multifamily projects. Includes seismic, wind, and gravity load analysis per IBC 2021. Typical deliverables: foundation plan, framing plans, connection details, and engineer\'s letter. Fully ASCE 7-22 compliant. Texas, California, and Florida PE license held.',
    price: 2800,
    category: 'Structural Engineering',
    tags: ['PE Stamped', 'IBC 2021', 'ASCE 7-22', 'Seismic Design', 'Wind Load', 'Foundation Design'],
    delivery_time: '5–10 business days',
    service_area: 'Nationwide (Remote)',
    certifications: ['PE Licensed', 'AISC Member', 'SEAOC'],
    images: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=500&fit=crop'],
  },
  {
    title: 'Civil Site Engineering & Grading Plan (up to 5 acres)',
    description: 'Complete civil site engineering package for commercial or residential developments up to 5 acres. Services include topographic survey coordination, grading and drainage design, stormwater management (SWPPP), utility layout, and ADA-compliant site access. AutoCAD Civil 3D drawings with municipality-ready submittal package.',
    price: 4500,
    category: 'Civil Engineering',
    tags: ['Site Grading', 'Drainage Design', 'SWPPP', 'ADA Compliance', 'AutoCAD Civil 3D', 'Utility Layout'],
    delivery_time: '10–15 business days',
    service_area: 'Texas, Oklahoma, New Mexico',
    certifications: ['PE Licensed (TX)', 'LEED AP', 'ENV SP'],
    images: ['https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=500&fit=crop'],
  },
  {
    title: 'Retaining Wall Design & Stamped Engineering (up to 12 ft)',
    description: 'Professional retaining wall engineering for walls up to 12 ft in height. Includes geotechnical report review, stability analysis (sliding, overturning, bearing), reinforced concrete or segmental block design, and PE-stamped drawings suitable for permit submittal. Typical turnaround: 5 business days.',
    price: 1200,
    category: 'Structural Engineering',
    tags: ['Retaining Wall', 'Geotechnical', 'Reinforced Concrete', 'PE Stamped', 'Permit Ready'],
    delivery_time: '5 business days',
    service_area: 'Nationwide (Remote)',
    certifications: ['PE Licensed', 'GE Coordination'],
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=500&fit=crop'],
  },

  // ── MECHANICAL / HVAC ───────────────────────────────────────────────────────
  {
    title: 'HVAC System Design & Load Calculations (ACCA Manual J/D/S)',
    description: 'Full HVAC engineering design package for residential and light commercial buildings up to 20,000 sq ft. Includes ACCA Manual J room-by-room load calculations, Manual D duct design, Manual S equipment selection, and equipment schedules. Energy compliance analysis (ASHRAE 90.1 or Title 24). Deliverables are permit-ready PDF drawings and calculation reports.',
    price: 3200,
    category: 'Mechanical Engineering',
    tags: ['Manual J', 'Manual D', 'Manual S', 'ASHRAE 90.1', 'Load Calculations', 'Energy Compliance'],
    delivery_time: '7–10 business days',
    service_area: 'Nationwide (Remote)',
    certifications: ['PE Licensed (Mechanical)', 'ACCA Certified', 'ASHRAE Member'],
    images: ['https://images.unsplash.com/photo-1581091870624-c5b1f65a1f06?w=800&h=500&fit=crop'],
  },
  {
    title: 'Commercial Kitchen Exhaust Hood & Makeup Air Engineering',
    description: 'Specialized mechanical engineering for commercial kitchen ventilation. Includes exhaust CFM calculations, hood sizing per NFPA 96, makeup air system design, fire suppression coordination, and health department compliance documentation. Full permit submittal package. Experience with restaurants, cafeterias, ghost kitchens, and food processing facilities.',
    price: 2400,
    category: 'Mechanical Engineering',
    tags: ['NFPA 96', 'Kitchen Hood', 'Makeup Air', 'Fire Suppression', 'Health Department', 'Commercial Kitchen'],
    delivery_time: '5–7 business days',
    service_area: 'Nationwide (Remote)',
    certifications: ['PE Licensed (Mechanical)', 'NFPA Member'],
    images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=500&fit=crop'],
  },
  {
    title: 'Plumbing Engineering Design — Commercial (up to 50,000 sq ft)',
    description: 'Complete plumbing engineering design for commercial buildings. Includes water supply sizing, drain-waste-vent (DWV) layout, hot water demand calculations, grease interceptor sizing, and fixture unit calculations per IPC/UPC. AutoCAD or Revit MEP drawings ready for permit submission. Experience with office buildings, retail, healthcare, and hospitality projects.',
    price: 3800,
    category: 'Mechanical Engineering',
    tags: ['IPC', 'UPC', 'DWV', 'Grease Interceptor', 'Water Supply', 'Revit MEP', 'Plumbing Design'],
    delivery_time: '10–14 business days',
    service_area: 'Nationwide (Remote)',
    certifications: ['PE Licensed (Mechanical)', 'ASPE Member'],
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=500&fit=crop'],
  },

  // ── ELECTRICAL ──────────────────────────────────────────────────────────────
  {
    title: 'Electrical Engineering Design — Service & Distribution (NEC 2020)',
    description: 'Full electrical engineering design for commercial and industrial facilities. Includes service entrance sizing, panel schedules, branch circuit design, lighting layouts, emergency power (generator/ATS), and NEC 2020 code compliance review. Deliverables: single-line diagram, panel schedules, load calculations, and permit-ready drawings in PDF/DWG format.',
    price: 3500,
    category: 'Electrical Engineering',
    tags: ['NEC 2020', 'Single-Line Diagram', 'Load Calculations', 'Panel Schedules', 'Emergency Power', 'Generator'],
    delivery_time: '7–10 business days',
    service_area: 'Nationwide (Remote)',
    certifications: ['PE Licensed (Electrical)', 'IEEE Member', 'NFPA 70E'],
    images: ['https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=500&fit=crop'],
  },
  {
    title: 'Solar PV System Engineering & Interconnection Package',
    description: 'Commercial solar PV engineering including array layout, string sizing, inverter selection, production modeling (PVsyst), structural roof load analysis, and utility interconnection application support. NEC Article 690 compliant. Suitable for C&I rooftop (50 kW–5 MW) and ground-mount systems. PE-stamped drawings for AHJ and utility submittal.',
    price: 4200,
    category: 'Electrical Engineering',
    tags: ['Solar PV', 'NEC 690', 'PVsyst', 'Interconnection', 'C&I Solar', 'PE Stamped', 'Rooftop Solar'],
    delivery_time: '7–12 business days',
    service_area: 'Nationwide (Remote)',
    certifications: ['PE Licensed (Electrical)', 'NABCEP PV Design Specialist', 'IEEE PES'],
    images: ['https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=500&fit=crop'],
  },

  // ── ANALYSIS & TESTING ──────────────────────────────────────────────────────
  {
    title: 'On-Site Structural Inspection & Engineering Assessment Report',
    description: 'Licensed structural engineer performs on-site condition assessment of existing buildings, foundations, or structures. Identifies distress, damage, or code deficiencies. Deliverables: detailed written report with photos, findings summary, and recommended repair scope. Common uses: pre-purchase due diligence, insurance claims, permit violations, and renovation planning. Available TX/FL/AZ.',
    price: 900,
    category: 'Analysis & Testing',
    tags: ['Structural Inspection', 'Condition Assessment', 'Engineering Report', 'PE Report', 'Due Diligence'],
    delivery_time: '3–5 business days',
    service_area: 'Texas, Florida, Arizona (On-Site)',
    certifications: ['PE Licensed', 'RCI Member', 'ICC Building Inspector'],
    images: ['https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=500&fit=crop'],
  },
  {
    title: 'FEA Analysis — Finite Element Analysis for Mechanical Components',
    description: 'Advanced finite element analysis (FEA) using ANSYS or SolidWorks Simulation for mechanical components, pressure vessels, weldments, and custom fabrications. Static, fatigue, thermal, and modal analysis available. Deliverables: color stress/deformation contour plots, safety factor summary, written engineering report, and recommendations. Ideal for ASME, PED, or CE compliance.',
    price: 2200,
    category: 'Analysis & Testing',
    tags: ['FEA', 'ANSYS', 'SolidWorks Simulation', 'Fatigue Analysis', 'ASME', 'Pressure Vessel', 'Modal Analysis'],
    delivery_time: '5–8 business days',
    service_area: 'Nationwide (Remote)',
    certifications: ['PE Licensed (Mechanical)', 'ASME Member', 'ANSYS Certified'],
    images: ['https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=500&fit=crop'],
  },

  // ── CONSULTING / PROJECT MANAGEMENT ────────────────────────────────────────
  {
    title: 'Engineering Project Management — Construction Phase Services',
    description: 'Experienced engineering PM provides construction-phase support including RFI/submittal review, change order analysis, schedule oversight, and owner representation. Available for commercial, industrial, and infrastructure projects. Daily or weekly site visit options. Reduces risk and keeps projects on budget. PMP and PE certified.',
    price: 500,
    category: 'Project Management',
    tags: ['PMP', 'RFI Review', 'Submittal Review', 'Owner Rep', 'Construction Management', 'Change Orders'],
    delivery_time: 'Ongoing (weekly retainer)',
    service_area: 'Dallas-Fort Worth, TX (On-Site); Nationwide (Remote)',
    certifications: ['PE Licensed', 'PMP Certified', 'OSHA 30'],
    images: ['https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=500&fit=crop'],
  },
  {
    title: 'Web Design & Engineering Portal Development for AEC Firms',
    description: 'Professional web design and custom portal development tailored for architecture, engineering, and construction (AEC) firms. Services include branded website design, client project portals, RFQ/bid management tools, and document management systems. Built with Next.js, React, and Supabase. Mobile-first, SEO optimized. Ideal for PE firms, contractors, and engineering consultancies.',
    price: 500,
    category: 'Consulting Services',
    tags: ['Web Design', 'AEC Portal', 'Next.js', 'Client Portal', 'Document Management', 'RFQ System'],
    delivery_time: '2–4 weeks',
    service_area: 'Nationwide (Remote)',
    certifications: ['AWS Certified', 'Google Partner'],
    images: ['https://images.unsplash.com/photo-1559028006-448665bd7c7f?w=800&h=500&fit=crop'],
  },

  // ── DESIGN SERVICES ─────────────────────────────────────────────────────────
  {
    title: 'BIM Coordination & Clash Detection (Revit / Navisworks)',
    description: 'Full BIM coordination services for MEP, structural, and architectural systems using Autodesk Revit and Navisworks. Includes federated model assembly, clash detection reports, RFI generation, and coordination meeting support. Reduces costly field conflicts. Experience on projects ranging from $2M medical tenant improvements to $200M hospital towers. LOD 300–400 deliverables.',
    price: 1800,
    category: 'Design Services',
    tags: ['BIM', 'Revit', 'Navisworks', 'Clash Detection', 'MEP Coordination', 'LOD 400', 'VDC'],
    delivery_time: '5–10 business days per phase',
    service_area: 'Nationwide (Remote)',
    certifications: ['Autodesk Certified Professional', 'VDC Specialist', 'MCAA BIM Certified'],
    images: ['https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=500&fit=crop'],
  },
  {
    title: 'CAD Drafting & As-Built Documentation Services',
    description: 'Professional CAD drafting for as-built drawings, shop drawings, and record documents. Supported formats: AutoCAD, MicroStation, PDF to CAD conversion, hand sketch to CAD. Industries served: industrial plants, commercial buildings, oil & gas, and municipal infrastructure. Fast turnaround — standard 48-hr delivery for straightforward projects. Pricing per sheet.',
    price: 150,
    category: 'Design Services',
    tags: ['AutoCAD', 'As-Built Drawings', 'Shop Drawings', 'PDF to CAD', 'MicroStation', 'Record Drawings'],
    delivery_time: '24–72 hours',
    service_area: 'Nationwide (Remote)',
    certifications: ['Autodesk AutoCAD Certified', 'ISO 9001'],
    images: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop'],
  },
  {
    title: 'Geotechnical Engineering Report Review & Foundation Recommendation',
    description: 'Experienced geotechnical engineer reviews existing boring logs, lab results, and geotech reports to provide independent foundation type recommendations and allowable bearing capacity values for your project. Ideal for contractors and developers who need a second opinion or a cost-effective alternative to a full site investigation. Deliverables: 2–5 page technical memo with PE stamp.',
    price: 750,
    category: 'Civil Engineering',
    tags: ['Geotechnical', 'Foundation Design', 'Boring Logs', 'Bearing Capacity', 'PE Memo', 'Soil Report Review'],
    delivery_time: '3–5 business days',
    service_area: 'Nationwide (Remote)',
    certifications: ['PE Licensed (Civil)', 'GE Licensed (CA)', 'ASCE Member'],
    images: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=500&fit=crop'],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function appendEnvVar(key, value) {
  const envPath = path.resolve(__dirname, '../.env.local');
  let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  const regex   = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  PPF Dealer / Admin Seed Script');
  console.log('────────────────────────────────────────\n');

  // 1. Create or find dealer auth user
  let dealerUserId = null;

  console.log(`📧  Creating dealer auth user: ${DEALER_EMAIL}`);
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email: DEALER_EMAIL,
    password: DEALER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: DEALER_NAME, user_type: 'engineer' },
  });

  if (createError) {
    if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
      console.log('  ℹ️   Dealer already exists — looking up existing user…');
      const { data: listData } = await admin.auth.admin.listUsers();
      const existing = listData?.users?.find(u => u.email === DEALER_EMAIL);
      if (existing) {
        dealerUserId = existing.id;
        console.log(`  ✅  Found existing dealer: ${dealerUserId}`);
      } else {
        console.error('  ❌  Could not find existing dealer');
        process.exit(1);
      }
    } else {
      console.error(`  ❌  Failed to create dealer: ${createError.message}`);
      process.exit(1);
    }
  } else {
    dealerUserId = createData.user.id;
    console.log(`  ✅  Dealer created: ${dealerUserId}`);
  }

  // 2. Upsert dealer profile
  console.log('\n👤  Upserting dealer profile…');
  const { error: profileError } = await admin.from('profiles').upsert({
    id: dealerUserId,
    full_name: DEALER_NAME,
    email: DEALER_EMAIL,
    user_type: 'engineer',
    company_name: 'PPF Marketplace',
    bio: 'Official Precision Project Flow marketplace account. Curated listing of verified engineering services across structural, civil, mechanical, electrical, and consulting disciplines.',
    location: 'Dallas, TX',
    avatar_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop&crop=center',
  }, { onConflict: 'id' });

  if (profileError) {
    console.warn(`  ⚠️   Profile upsert warning: ${profileError.message}`);
  } else {
    console.log('  ✅  Dealer profile upserted');
  }

  // 3. Delete old dealer services (clean slate)
  console.log('\n🧹  Removing old dealer service listings…');
  const { error: deleteError } = await admin
    .from('services')
    .delete()
    .eq('provider_id', dealerUserId);

  if (deleteError) {
    console.warn(`  ⚠️   Delete warning: ${deleteError.message}`);
  } else {
    console.log('  ✅  Old listings cleared');
  }

  // 4. Insert new service listings
  console.log('\n📦  Inserting 15 marketplace service listings…\n');

  const rows = SERVICES.map(s => ({
    provider_id:    dealerUserId,
    title:          s.title,
    description:    s.description,
    price:          s.price,
    category:       s.category,
    tags:           s.tags,
    images:         s.images,
    delivery_time:  s.delivery_time,
    service_area:   s.service_area,
    certifications: s.certifications,
    active:         true,
  }));

  const { data: inserted, error: insertError } = await admin
    .from('services')
    .insert(rows)
    .select('id, title, price');

  if (insertError) {
    console.error(`  ❌  Insert failed: ${insertError.message}`);
    process.exit(1);
  }

  inserted.forEach((s, i) => {
    console.log(`  ✅  [${String(i+1).padStart(2,'0')}] $${s.price.toLocaleString().padStart(6)} — ${s.title.substring(0,65)}`);
  });

  // 5. Save credentials to .env.local
  console.log('\n💾  Saving dealer credentials to .env.local…');
  appendEnvVar('PPF_DEALER_EMAIL',    DEALER_EMAIL);
  appendEnvVar('PPF_DEALER_PASSWORD', DEALER_PASSWORD);
  appendEnvVar('PPF_DEALER_USER_ID',  dealerUserId);
  console.log('  ✅  Credentials saved');

  console.log('\n────────────────────────────────────────');
  console.log('🎉  Done! Dealer seeded and marketplace populated.');
  console.log(`\n   Email:    ${DEALER_EMAIL}`);
  console.log(`   Password: ${DEALER_PASSWORD}`);
  console.log(`   User ID:  ${dealerUserId}`);
  console.log('\n   Login at: /login');
  console.log('────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});
