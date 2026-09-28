/**
 * seed-social-test-users.js
 *
 * Provisions REAL, accessible test accounts for the social feed and company
 * directory, then seeds social posts that flow into the /activity ledger.
 *
 * For each test account it creates / upserts:
 *   1. auth.users            (email + password, email pre-confirmed)
 *   2. profiles              (engineer, company_name, bio, location)
 *   3. company_profiles      (claimed + verified, unique slug)
 *   4. company_members       (owner, active)
 *   5. company General channel (ensure_company_channel RPC)
 *   6. feed_posts            (social posts -> trigger logs site_activities)
 *
 * Idempotent: safe to run repeatedly. Existing users/companies are reused and
 * duplicate posts are skipped.
 *
 * Run:  node scripts/seed-social-test-users.js
 *
 * Credentials:
 *   - Uses TEST_ACCOUNT_PASSWORD from .env.local when present.
 *   - Otherwise generates a strong password and writes it to
 *     seed-credentials.local.json (gitignored) so you can log in.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomBytes } from 'crypto';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

dotenv.config({ path: join(root, '.env.local'), quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CREDENTIALS_FILE = join(root, 'seed-credentials.local.json');

// ── Password resolution ───────────────────────────────────────────────────────
function resolvePassword() {
  if (process.env.TEST_ACCOUNT_PASSWORD) return process.env.TEST_ACCOUNT_PASSWORD;
  if (existsSync(CREDENTIALS_FILE)) {
    try {
      const saved = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8'));
      if (saved.password) return saved.password;
    } catch { /* fall through to generate */ }
  }
  return `Ppf-${randomBytes(9).toString('base64url')}!7`;
}

const PASSWORD = resolvePassword();

// ── Test accounts ─────────────────────────────────────────────────────────────
const ACCOUNTS = [
  {
    email: 'maya.chen@ppf.test',
    full_name: 'Maya Chen',
    company_name: 'Northwind Precision Machining',
    slug: 'northwind-precision-machining',
    industry: 'Mechanical Engineering',
    city: 'Cleveland',
    state: 'OH',
    bio: '5-axis CNC machining and tight-tolerance prototype work for aerospace and medical clients.',
    specialties: ['CNC Machining', '5-Axis Milling', 'Prototyping', 'Titanium'],
    certifications: ['AS9100D', 'ISO 9001:2015'],
    posts: [
      {
        post_type: 'project_showcase',
        content: 'Just wrapped a 250-unit titanium bracket run for a satellite customer. Held ±0.0005" across every part - first article passed on the first submission. 🛰️',
      },
      {
        post_type: 'milestone',
        content: 'Northwind Precision just hit 1,000 completed jobs on Precision Project Flow. Thank you to every client who trusted us with their hardest parts.',
      },
    ],
  },
  {
    email: 'diego.ramirez@ppf.test',
    full_name: 'Diego Ramirez',
    company_name: 'Voltline Electrical Systems',
    slug: 'voltline-electrical-systems',
    industry: 'Electrical Engineering',
    city: 'Austin',
    state: 'TX',
    bio: 'Industrial control panels, power distribution, and UL 508A panel builds for automation integrators.',
    specialties: ['Control Panels', 'Power Distribution', 'UL 508A', 'PLC Integration'],
    certifications: ['UL 508A', 'NEC Compliant'],
    posts: [
      {
        post_type: 'update',
        content: 'Reminder for anyone specifying panels: derating matters. We re-rated a customer enclosure this week and cut their thermal rise by 18°C with zero added cost.',
      },
      {
        post_type: 'job_post',
        content: 'Looking for a contract drafter to help with a 40-panel electrical package for a food-processing line. AutoCAD Electrical experience required.',
        budget: 6500,
        deadline: '2026-11-15',
      },
    ],
  },
  {
    email: 'priya.nair@ppf.test',
    full_name: 'Priya Nair',
    company_name: 'Meridian Structural Group',
    slug: 'meridian-structural-group',
    industry: 'Structural Engineering',
    city: 'Denver',
    state: 'CO',
    bio: 'Structural analysis and seismic retrofit for mid-rise commercial and industrial facilities.',
    specialties: ['Structural Analysis', 'Seismic Retrofit', 'Steel Design', 'Foundations'],
    certifications: ['PE Licensed', 'SE Licensed'],
    posts: [
      {
        post_type: 'project_showcase',
        content: 'Completed a seismic retrofit package for a 1970s warehouse in Denver. Added shear walls and upgraded the diaphragm - the owner kept the building in service the entire time.',
      },
      {
        post_type: 'parts_request',
        content: 'Sourcing 24 custom anchor bolt assemblies, 1" diameter, hot-dip galvanized, for a foundation package. Need quotes with lead times.',
        budget: 4200,
        deadline: '2026-10-30',
      },
    ],
  },
  {
    email: 'sam.okafor@ppf.test',
    full_name: 'Sam Okafor',
    company_name: 'Ironclad Fabrication Works',
    slug: 'ironclad-fabrication-works',
    industry: 'Manufacturing',
    city: 'Pittsburgh',
    state: 'PA',
    bio: 'Heavy structural steel fabrication, welding, and custom weldments up to 20 tons.',
    specialties: ['Structural Steel', 'MIG/TIG Welding', 'Heavy Fabrication', 'Weldments'],
    certifications: ['AWS D1.1', 'AISC Certified'],
    posts: [
      {
        post_type: 'milestone',
        content: 'Ironclad Fabrication passed our annual AISC audit with zero findings. Our welders earned it - the shop floor has been flawless all year.',
      },
      {
        post_type: 'update',
        content: 'New 400-ton press brake is online. We can now form 1" plate in a single hit, which cuts lead time on large weldments by about a week.',
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function findUserByEmail(email) {
  // Paginate through auth users to find an existing account.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureAuthUser(account) {
  const existing = await findUserByEmail(account.email);
  if (existing) {
    // Keep the password in sync so the documented credentials always work.
    await supabase.auth.admin.updateUserById(existing.id, { password: PASSWORD });
    return { id: existing.id, created: false };
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: account.full_name, user_type: 'engineer' },
  });
  if (error) throw error;
  return { id: data.user.id, created: true };
}

async function upsertProfile(userId, account) {
  // NOTE: the live profiles table has no company_name column - the company
  // name lives on company_profiles. Keep this payload to real columns only.
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email: account.email,
    full_name: account.full_name,
    user_type: 'engineer',
    bio: account.bio,
    location: `${account.city}, ${account.state}`,
    token_balance: 500,
  });
  if (error) throw error;
}

async function upsertCompany(userId, account) {
  const payload = {
    owner_id: userId,
    company_name: account.company_name,
    name: account.company_name,
    slug: account.slug,
    industry: account.industry,
    description: account.bio,
    email: account.email,
    city: account.city,
    state: account.state,
    specialties: account.specialties,
    certifications: account.certifications,
    is_claimed: true,
    claimed_by: userId,
    claimed_at: new Date().toISOString(),
    is_verified: true,
    source: 'seed',
  };

  const { data: existing } = await supabase
    .from('company_profiles')
    .select('id')
    .eq('slug', account.slug)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('company_profiles').update(payload).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from('company_profiles')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureMembership(companyId, userId) {
  const { error } = await supabase
    .from('company_members')
    .upsert(
      { company_id: companyId, user_id: userId, role: 'owner', status: 'active' },
      { onConflict: 'company_id,user_id' }
    );
  if (error) throw error;

  const { error: rpcError } = await supabase.rpc('ensure_company_channel', {
    p_company_id: companyId,
    p_user_id: userId,
  });
  if (rpcError) throw rpcError;
}

async function seedPosts(userId, companyId, account) {
  const { data: existing } = await supabase
    .from('feed_posts')
    .select('content')
    .eq('author_id', userId);
  const existingContent = new Set((existing ?? []).map(p => p.content));

  let inserted = 0;
  for (const post of account.posts) {
    if (existingContent.has(post.content)) continue;
    const { error } = await supabase.from('feed_posts').insert({
      author_id: userId,
      content: post.content,
      post_type: post.post_type,
      media_urls: [],
      linked_type: 'company',
      linked_id: companyId,
      budget: post.budget ?? null,
      deadline: post.deadline ?? null,
      is_published: true,
    });
    if (error) throw error;
    inserted++;
  }
  return inserted;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding social test users + companies + posts\n');

  const summary = [];

  for (const account of ACCOUNTS) {
    try {
      const { id: userId, created } = await ensureAuthUser(account);
      await upsertProfile(userId, account);
      const companyId = await upsertCompany(userId, account);
      await ensureMembership(companyId, userId);
      const posts = await seedPosts(userId, companyId, account);

      summary.push({ account, userId, companyId, created, posts });
      console.log(`✅ ${account.company_name}`);
      console.log(`   user:    ${account.email} (${created ? 'created' : 'reused'})`);
      console.log(`   company: /companies/${account.slug}`);
      console.log(`   posts:   ${posts} new\n`);
    } catch (err) {
      console.error(`❌ ${account.company_name}: ${err.message}\n`);
    }
  }

  // Persist credentials so the accounts are actually accessible.
  writeFileSync(
    CREDENTIALS_FILE,
    JSON.stringify(
      {
        password: PASSWORD,
        note: 'Local test credentials for seeded PPF accounts. Gitignored - do not commit.',
        accounts: summary.map(s => ({
          email: s.account.email,
          company: s.account.company_name,
          company_url: `/companies/${s.account.slug}`,
          profile_url: `/profiles/${s.userId}`,
        })),
      },
      null,
      2
    )
  );

  console.log('─'.repeat(64));
  console.log(`🔑 Password for all accounts: ${PASSWORD}`);
  console.log(`📄 Saved to: seed-credentials.local.json (gitignored)`);
  console.log('─'.repeat(64));
  console.log('\nLogin at /login, then visit /activity to see the seeded posts.\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
