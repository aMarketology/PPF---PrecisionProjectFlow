#!/usr/bin/env node
/**
 * admin-cli.js — Admin CLI for Precision Project Flow
 *
 * Authenticates as the admin user (ADMIN_EMAIL / ADMIN_PASSWORD from .env.local),
 * gets a Supabase JWT, and calls /api/admin with Bearer auth.
 *
 * Usage:
 *   node scripts/admin-cli.js stats
 *   node scripts/admin-cli.js list <tab>          (users|companies|products|services|rfqs|orders)
 *   node scripts/admin-cli.js delete <tab> <id>
 *   node scripts/admin-cli.js grant-tokens <userId> <amount>
 *   node scripts/admin-cli.js grant-tokens-by-email <email> <amount>
 *
 * Options:
 *   --url <url>   Override target URL (default: http://localhost:3000)
 *   --prod        Shortcut for https://www.precisionprojectflow.com
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// ── Config ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Parse flags
const args = process.argv.slice(2);
let TARGET_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const flagIdx = args.findIndex(a => a === '--url');
if (flagIdx !== -1 && args[flagIdx + 1]) {
  TARGET_URL = args[flagIdx + 1];
  args.splice(flagIdx, 2);
}
if (args.includes('--prod')) {
  TARGET_URL = 'https://www.precisionprojectflow.com';
  args.splice(args.indexOf('--prod'), 1);
}

const [command, ...rest] = args;

// ── Validation ──────────────────────────────────────────────────────
if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local');
  console.error('   Add: ADMIN_EMAIL=precisionprojectflow@gmail.com');
  console.error('   Add: ADMIN_PASSWORD=123456md');
  process.exit(1);
}

// ── Auth ────────────────────────────────────────────────────────────
async function getToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error || !data.session) {
    console.error('❌ Auth failed:', error?.message || 'No session');
    process.exit(1);
  }
  return data.session.access_token;
}

async function apiCall(method, path, body) {
  const token = await getToken();
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${TARGET_URL}${path}`, opts);
  const json = await res.json();
  return { status: res.status, data: json };
}

// ── Commands ────────────────────────────────────────────────────────

async function cmdStats() {
  console.log(`📊 Fetching stats from ${TARGET_URL}...`);
  const { status, data } = await apiCall('GET', '/api/admin?action=stats');
  if (status !== 200) return console.error('❌', data.error);
  console.log('');
  console.log('  Users:     ', data.users);
  console.log('  Companies: ', data.companies);
  console.log('  Products:  ', data.products);
  console.log('  Services:  ', data.services);
  console.log('  RFQs:      ', data.rfqs);
  console.log('');
}

async function cmdList(tab) {
  const valid = ['users', 'companies', 'products', 'services', 'rfqs', 'orders'];
  if (!valid.includes(tab)) {
    console.error(`❌ Invalid tab. Use: ${valid.join('|')}`);
    process.exit(1);
  }
  console.log(`📋 Listing ${tab} from ${TARGET_URL}...`);
  const { status, data } = await apiCall('GET', `/api/admin?action=data&tab=${tab}`);
  if (status !== 200) return console.error('❌', data.error);
  console.log(`\n${data.data.length} ${tab}:\n`);
  data.data.forEach((row, i) => {
    const label = row.title || row.full_name || row.company_name || row.email || row.id;
    const extra = tab === 'rfqs' ? ` [${row.status}]` : tab === 'users' ? ` (${row.user_type})` : '';
    console.log(`  ${i + 1}. ${label}${extra}`);
    if (tab === 'rfqs') console.log(`     id: ${row.id}`);
  });
  console.log('');
}

async function cmdDelete(tab, id) {
  if (!id) { console.error('❌ id required'); process.exit(1); }
  console.log(`🗑️  Deleting ${tab} ${id}...`);
  const { status, data } = await apiCall('POST', `/api/admin?action=delete&tab=${tab}&id=${id}`);
  if (status !== 200) return console.error('❌', data.error);
  console.log('✅', data.success ? 'Deleted' : data);
}

async function cmdGrantTokens(userId, amount) {
  if (!userId || !amount) { console.error('❌ userId and amount required'); process.exit(1); }
  console.log(`💰 Granting ${amount} tokens to ${userId}...`);
  const { status, data } = await apiCall('POST', '/api/admin', {
    action: 'grant-tokens',
    userId,
    amount: Number(amount),
  });
  if (status !== 200) return console.error('❌', data.error);
  console.log('✅', data.message, '| New balance:', data.newBalance);
}

async function cmdGrantTokensByEmail(email, amount) {
  if (!email || !amount) { console.error('❌ email and amount required'); process.exit(1); }
  console.log(`🔍 Looking up user ${email}...`);
  const token = await getToken();
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: { user } } = await supabase.auth.getUser(token);
  // Use the admin API to list users and find by email
  const { status, data } = await apiCall('GET', '/api/admin?action=data&tab=users');
  if (status !== 200) return console.error('❌', data.error);
  const found = data.data.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) return console.error('❌ User not found:', email);
  console.log(`   Found: ${found.full_name} (${found.id})`);
  return cmdGrantTokens(found.id, amount);
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔐 Authenticating as ${ADMIN_EMAIL} against ${TARGET_URL}...\n`);

  switch (command) {
    case 'stats':
      return cmdStats();
    case 'list':
      return cmdList(rest[0]);
    case 'delete':
      return cmdDelete(rest[0], rest[1]);
    case 'grant-tokens':
      return cmdGrantTokens(rest[0], rest[1]);
    case 'grant-tokens-by-email':
      return cmdGrantTokensByEmail(rest[0], rest[1]);
    default:
      console.log(`PPF Admin CLI — manage the marketplace from the terminal

Usage:
  node scripts/admin-cli.js stats
  node scripts/admin-cli.js list <tab>          (users|companies|products|services|rfqs|orders)
  node scripts/admin-cli.js delete <tab> <id>
  node scripts/admin-cli.js grant-tokens <userId> <amount>
  node scripts/admin-cli.js grant-tokens-by-email <email> <amount>

Options:
  --url <url>   Override target URL (default: http://localhost:3000)
  --prod        Shortcut for https://www.precisionprojectflow.com

Examples:
  node scripts/admin-cli.js stats
  node scripts/admin-cli.js list rfqs
  node scripts/admin-cli.js grant-tokens-by-email vendor@ppf.test 500
  node scripts/admin-cli.js --prod stats
`);
      process.exit(0);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });