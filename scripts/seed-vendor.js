#!/usr/bin/env node
/**
 * seed-vendor.js
 * Creates a random vendor (engineer) account in Supabase, including:
 *   1. Auth user (email + password)
 *   2. Profile row update (full_name, user_type)
 *   3. Company profile row
 *
 * Usage:
 *   node scripts/seed-vendor.js
 *   node scripts/seed-vendor.js --count 5    (create 5 vendors)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

// Use service role for admin ops (bypasses RLS + rate limits).
// Sign-up still uses the anon key because auth.signUp() is always public.
const supabase      = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

if (!supabaseAdmin) {
  console.warn('⚠️   SUPABASE_SERVICE_ROLE_KEY not set — using anon key for DB writes.');
  console.warn('    RLS policies must allow INSERT on profiles and company_profiles.');
  console.warn('    Get the service role key from: https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/settings/api\n');
}

// ─── Random data generators ───────────────────────────────────────────────────
const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Drew', 'Blake', 'Quinn', 'Avery'];
const LAST_NAMES  = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore'];
const CITIES      = ['Austin', 'Chicago', 'Denver', 'Houston', 'Los Angeles', 'Miami', 'New York', 'Phoenix', 'Seattle', 'San Francisco'];
const STATES      = ['TX', 'IL', 'CO', 'TX', 'CA', 'FL', 'NY', 'AZ', 'WA', 'CA'];
const SPECIALTIES = [
  'CNC Machining, Precision Grinding',
  'Sheet Metal Fabrication, Laser Cutting',
  'Injection Molding, Plastic Fabrication',
  'Welding, Structural Steel Fabrication',
  'PCB Assembly, Electronics Manufacturing',
  '3D Printing, Rapid Prototyping',
  'Casting, Forging',
  'Anodizing, Powder Coating',
  'Aerospace Components, Tight Tolerances',
  'Medical Device Manufacturing, ISO 13485',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const timestamp = () => Date.now();

function generateVendor() {
  const firstName = rand(FIRST_NAMES);
  const lastName  = rand(LAST_NAMES);
  const fullName  = `${firstName} ${lastName}`;
  const cityIdx   = randInt(0, CITIES.length - 1);
  const city      = CITIES[cityIdx];
  const state     = STATES[cityIdx];
  const tag       = `${timestamp()}${randInt(10, 99)}`;

  return {
    fullName,
    email:    `vendor.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${tag}@testmail.ppf`,
    password: `TestVendor${tag}!`,
    userType: 'engineer',
    company: {
      companyName:   `${lastName} ${rand(['Industries', 'Manufacturing', 'Fabrication', 'Engineering', 'Solutions'])} LLC`,
      description:   `Precision manufacturer specializing in ${rand(SPECIALTIES).toLowerCase()}. We deliver high-quality components with fast turnaround times and competitive pricing. ISO 9001 certified facility.`,
      email:         `contact@${lastName.toLowerCase()}mfg${tag}.com`,
      phone:         `(${randInt(200,999)}) ${randInt(200,999)}-${randInt(1000,9999)}`,
      website:       '',
      streetAddress: `${randInt(100, 9999)} ${rand(['Industrial', 'Commerce', 'Enterprise', 'Manufacturing'])} Blvd`,
      city,
      state,
      zipCode:       `${randInt(10000, 99999)}`,
      specialties:   rand(SPECIALTIES),
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function createVendor(vendor) {
  const { fullName, email, password, userType, company } = vendor;

  console.log(`\n📋  Creating vendor: ${fullName} <${email}>`);

  // 1. Sign up auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        user_type: userType,
      },
    },
  });

  if (authError) {
    console.error(`  ❌  Auth signup failed: ${authError.message}`);
    return null;
  }

  const userId = authData.user?.id;
  if (!userId) {
    console.error('  ❌  No user ID returned from signUp');
    return null;
  }

  console.log(`  ✅  Auth user created: ${userId}`);

  // 2. Small delay so the trigger has time to create the profile row
  await new Promise((r) => setTimeout(r, 800));

  // Use admin client for DB writes (bypasses RLS) if available
  const db = supabaseAdmin || supabase;

  // 3. Update profile
  const { error: profileError } = await db
    .from('profiles')
    .upsert({
      id:        userId,
      full_name: fullName,
      email,
      user_type: userType,
    }, { onConflict: 'id' });

  if (profileError) {
    // Non-fatal — trigger still created the row
    console.warn(`  ⚠️   Profile update warning: ${profileError.message}`);
  } else {
    console.log('  ✅  Profile updated');
  }

  // 4. Create company profile
  const { error: companyError } = await db
    .from('company_profiles')
    .insert({
      owner_id:       userId,
      company_name:   company.companyName,
      description:    company.description,
      email:          company.email,
      phone:          company.phone,
      website:        company.website || null,
      street_address: company.streetAddress,
      city:           company.city,
      state:          company.state,
      zip_code:       company.zipCode,
      specialties:    company.specialties.split(',').map((s) => s.trim()),
    });

  if (companyError) {
    console.error(`  ❌  Company creation failed: ${companyError.message}`);
  } else {
    console.log(`  ✅  Company profile created: "${company.companyName}"`);
  }

  return {
    userId,
    email,
    password,
    fullName,
    company: company.companyName,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const countFlag = args.indexOf('--count');
  const count = countFlag !== -1 ? parseInt(args[countFlag + 1], 10) || 1 : 1;

  console.log(`\n🚀  Seeding ${count} vendor(s) into ${SUPABASE_URL}\n`);
  console.log('─'.repeat(60));

  const results = [];

  for (let i = 0; i < count; i++) {
    const vendor = generateVendor();
    const result = await createVendor(vendor);
    if (result) results.push(result);

    // Respect Supabase rate limit between signups (1 per ~3s is safe)
    if (i < count - 1) {
      console.log('  ⏳  Waiting 3s before next signup (rate limit)...');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n✅  Done! Created ${results.length}/${count} vendor(s)\n`);

  if (results.length > 0) {
    console.log('📝  Credentials summary:\n');
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.fullName} — ${r.company}`);
      console.log(`     Email:    ${r.email}`);
      console.log(`     Password: ${r.password}`);
      console.log(`     User ID:  ${r.userId}`);
      console.log('');
    });
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
