#!/usr/bin/env node
/**
 * seed-companies-from-tsv.js
 * 
 * Parses joshua_inside_sales_merged.tsv and seeds company_profiles in Supabase.
 * - Deduplicates by company name
 * - Infers industry/category from company name + contact title
 * - All entries seeded as is_claimed = false (claimable directory)
 * - Batches inserts to avoid rate limits
 * 
 * Usage:
 *   node scripts/seed-companies-from-tsv.js
 *   node scripts/seed-companies-from-tsv.js --dry-run     (preview without inserting)
 *   node scripts/seed-companies-from-tsv.js --limit 100   (only seed first 100 companies)
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TSV_PATH = path.join(__dirname, '..', 'joshua_inside_sales_merged - joshua_inside_sales_merged.tsv');
const BATCH_SIZE = 50;

// ─── State name → abbreviation ────────────────────────────────────────────────
const STATE_MAP = {
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
  'colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA',
  'hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA',
  'kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD',
  'massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS',
  'missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV','new hampshire':'NH',
  'new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC',
  'north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA',
  'rhode island':'RI','south carolina':'SC','south dakota':'SD','tennessee':'TN',
  'texas':'TX','utah':'UT','vermont':'VT','virginia':'VA','washington':'WA',
  'west virginia':'WV','wisconsin':'WI','wyoming':'WY',
  'district of columbia':'DC','pennsylvania':'PA',
};

function parseLocation(loc) {
  if (!loc || !loc.trim()) return { city: '', state: '' };
  const parts = loc.split(',').map(s => s.trim());
  const city  = parts[0] ? titleCase(parts[0]) : '';
  const stateRaw = parts[1] ? parts[1].toLowerCase().trim() : '';
  const state = STATE_MAP[stateRaw] || (stateRaw.length === 2 ? stateRaw.toUpperCase() : titleCase(stateRaw));
  return { city, state };
}

function titleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// ─── Industry inference ────────────────────────────────────────────────────────
const INDUSTRY_RULES = [
  // Electrical
  { keywords: ['electric','electrical','electronics','wiring','power','lighting','illumination','voltage','circuit','pcb'], industry: 'Electrical Engineering', specialties: ['Electrical Systems','Power Distribution','Lighting Solutions'] },
  // Mechanical / Manufacturing
  { keywords: ['steel','metal','aluminum','aluminium','fabricat','machining','cnc','bearing','casting','forging','stamping','welding','precision','manufacturing','industrial'], industry: 'Mechanical Engineering', specialties: ['Metal Fabrication','CNC Machining','Precision Manufacturing'] },
  // Structural / Construction
  { keywords: ['structural','construction','building','door','window','roofing','wall','panel','screen','architectural','concrete','civil'], industry: 'Structural Engineering', specialties: ['Structural Design','Construction Materials','Building Systems'] },
  // Pneumatic / Hydraulic / Fluid
  { keywords: ['pneumatic','hydraulic','fluid','valve','pump','compressor','filtration','flow','pressure','seal'], industry: 'Mechanical Engineering', specialties: ['Pneumatic Systems','Hydraulic Engineering','Fluid Control'] },
  // HVAC / Thermal
  { keywords: ['hvac','heating','cooling','thermal','climate','refrigerat','duct','air handling','chiller'], industry: 'Mechanical Engineering', specialties: ['HVAC Systems','Thermal Management','Climate Control'] },
  // Software / Controls
  { keywords: ['software','automation','control','sensor','data','digital','ai','tech','system','network','security','crestron'], industry: 'Software Engineering', specialties: ['Industrial Automation','Control Systems','IoT Integration'] },
  // Chemicals / Materials
  { keywords: ['chemical','plastic','polymer','rubber','resin','carbons','coating','adhesive','lubricant','coolant'], industry: 'Analysis & Testing', specialties: ['Material Analysis','Chemical Testing','Coating Services'] },
  // Consulting / Services
  { keywords: ['consulting','services','solutions','group','associates','management','advisory'], industry: 'Consulting Services', specialties: ['Engineering Consulting','Project Advisory','Technical Services'] },
  // Default
  { keywords: [], industry: 'Other Services', specialties: ['Industrial Supply','Engineering Services'] },
];

function inferIndustry(companyName, title = '') {
  const haystack = (companyName + ' ' + title).toLowerCase();
  for (const rule of INDUSTRY_RULES) {
    if (rule.keywords.length === 0) continue;
    if (rule.keywords.some(kw => haystack.includes(kw))) {
      return { industry: rule.industry, specialties: rule.specialties };
    }
  }
  return { industry: 'Other Services', specialties: ['Industrial Supply','Engineering Services'] };
}

function generateDescription(companyName, industry, city, state) {
  const locationStr = city && state ? `based in ${city}, ${state}` : state ? `based in ${state}` : 'US-based';
  const descriptions = {
    'Electrical Engineering': `${companyName} is an electrical engineering and supply company ${locationStr}. They specialize in electrical components, systems, and solutions for industrial and commercial applications.`,
    'Mechanical Engineering': `${companyName} is a precision manufacturing and mechanical engineering firm ${locationStr}. They provide high-quality fabricated components, machined parts, and engineering services to industrial clients.`,
    'Structural Engineering': `${companyName} is a structural and construction materials company ${locationStr}. They supply engineered building products, structural components, and construction solutions.`,
    'Software Engineering': `${companyName} is a technology and automation solutions provider ${locationStr}. They deliver software, control systems, and automation tools for engineering and industrial operations.`,
    'Consulting Services': `${companyName} is an engineering consulting and services firm ${locationStr}. They provide technical advisory, project management, and specialized engineering solutions.`,
    'Analysis & Testing': `${companyName} is a materials and testing company ${locationStr}. They provide material analysis, quality testing, and specialized coating or chemical services.`,
    'Other Services': `${companyName} is an industrial products and services company ${locationStr}. They supply engineering components, specialty materials, and technical services to manufacturers and contractors.`,
  };
  return descriptions[industry] || descriptions['Other Services'];
}

// ─── Parse TSV ─────────────────────────────────────────────────────────────────
function parseTSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines   = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split('\t').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const row  = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
    if (row.company) rows.push(row);
  }
  return rows;
}

// ─── Deduplicate by company name ───────────────────────────────────────────────
function deduplicateCompanies(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!map.has(key)) {
      map.set(key, row);
    } else {
      // Keep the row with more data (email + phone present)
      const existing = map.get(key);
      if (!existing.email && row.email) map.set(key, row);
    }
  }
  return Array.from(map.values());
}

// ─── Build company record ──────────────────────────────────────────────────────
function buildCompanyRecord(row) {
  const { city, state } = parseLocation(row.location);
  const { industry, specialties } = inferIndustry(row.company, row.title);
  const description = generateDescription(row.company, industry, city, state);
  const baseSlug = slugify(row.company);

  return {
    // No owner_id — unclaimed
    owner_id:      null,
    company_name:  titleCase(row.company),
    slug:          baseSlug,
    description,
    industry,
    specialties,
    email:         row.contact_email || null,    // company contact email (not personal)
    phone:         row.company_phone || null,
    website:       row.website ? (row.website.startsWith('http') ? row.website : `https://${row.website}`) : null,
    city,
    state,
    zip_code:      null,
    street_address: null,
    is_claimed:    false,
    source:        'tsv_import',
    // Contact info from the TSV row
    contact_name:     row.name ? titleCase(row.name) : null,
    contact_title:    row.title || null,
    contact_email:    row.email || null,
    contact_phone:    row.mobile || null,
    contact_mobile:   row.mobile || null,
    contact_linkedin: row.linkedin || null,
  };
}

// ─── Insert in batches ─────────────────────────────────────────────────────────
async function insertBatch(companies, dryRun) {
  if (dryRun) {
    companies.forEach(c => console.log(`  [DRY RUN] ${c.company_name} — ${c.industry} — ${c.city}, ${c.state}`));
    return { inserted: companies.length, errors: 0 };
  }

  const { data, error } = await supabase
    .from('company_profiles')
    .upsert(companies, {
      onConflict: 'slug',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error(`  ❌  Batch error: ${error.message}`);
    return { inserted: 0, errors: companies.length };
  }
  return { inserted: companies.length, errors: 0 };
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args    = process.argv.slice(2);
  const dryRun  = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit   = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  console.log('\n🏭  PPF Company Directory Seeder');
  console.log('─'.repeat(60));
  if (dryRun) console.log('⚠️   DRY RUN — no data will be written\n');

  // 1. Parse TSV
  console.log(`📂  Reading ${TSV_PATH}`);
  const rows = parseTSV(TSV_PATH);
  console.log(`✅  Parsed ${rows.length} contact rows`);

  // 2. Deduplicate
  const unique = deduplicateCompanies(rows);
  console.log(`🔄  Deduplicated → ${unique.length} unique companies`);

  // 3. Apply limit
  const toProcess = limit < Infinity ? unique.slice(0, limit) : unique;
  console.log(`📦  Processing ${toProcess.length} companies\n`);

  // 4. Build records — handle duplicate slugs by appending city suffix
  const slugsSeen = new Set();
  const records = [];
  for (const row of toProcess) {
    const rec = buildCompanyRecord(row);
    // Make slug unique if collision
    let slug = rec.slug;
    if (slugsSeen.has(slug)) {
      const suffix = rec.city ? `-${slugify(rec.city)}` : `-${records.length}`;
      slug = rec.slug + suffix;
    }
    // If still a collision, add counter
    let counter = 2;
    while (slugsSeen.has(slug)) {
      slug = rec.slug + `-${counter++}`;
    }
    slugsSeen.add(slug);
    records.push({ ...rec, slug });
  }

  // 5. Industry breakdown preview
  const byIndustry = {};
  records.forEach(r => { byIndustry[r.industry] = (byIndustry[r.industry] || 0) + 1; });
  console.log('📊  Industry breakdown:');
  Object.entries(byIndustry).sort((a, b) => b[1] - a[1]).forEach(([ind, count]) => {
    console.log(`    ${ind.padEnd(30)} ${count}`);
  });
  console.log('');

  // 6. Insert in batches
  let totalInserted = 0;
  let totalErrors   = 0;
  const batches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const batch = records.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    process.stdout.write(`  Batch ${String(i + 1).padStart(3)}/${batches} (${batch.length} records)... `);
    const { inserted, errors } = await insertBatch(batch, dryRun);
    totalInserted += inserted;
    totalErrors   += errors;
    if (!dryRun) console.log(`✅  ${inserted} inserted`);
    else console.log('');
    // Small delay to avoid hammering the DB
    if (!dryRun && i < batches - 1) await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n✅  Done!`);
  console.log(`   Inserted : ${totalInserted}`);
  console.log(`   Errors   : ${totalErrors}`);
  console.log(`   Skipped  : ${toProcess.length - totalInserted - totalErrors} (likely duplicates)\n`);

  if (!dryRun) {
    console.log('👉  Next steps:');
    console.log('   1. Visit /claim-company to see the directory');
    console.log('   2. Companies can now be claimed by their owners');
    console.log('   3. Run with --dry-run first if you haven\'t yet\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
