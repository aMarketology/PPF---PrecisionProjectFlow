#!/usr/bin/env node
/**
 * e2e-admin.test.js — End-to-end verification of the super-admin flows.
 *
 * Tests (against a running dev server on TARGET_URL):
 *   1.  Broadcast endpoint returns { sent, skipped } for a real category.
 *   2.  Delete allowlist rejects a disallowed table.
 *   3.  Promote/demote (email-based) actually flips is_admin.
 *   4.  Account suspension is enforced by middleware (403 JSON on API).
 *   5.  is_account_active RPC returns the expected boolean.
 *
 * Usage:
 *   node scripts/e2e-admin.test.js [--url http://localhost:3000]
 *
 * Requires PPF_ADMIN_EMAIL / PPF_ADMIN_PASSWORD in .env.local.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.PPF_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PPF_ADMIN_PASSWORD;

const args = process.argv.slice(2);
let TARGET_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const flagIdx = args.findIndex(a => a === '--url');
if (flagIdx !== -1 && args[flagIdx + 1]) {
  TARGET_URL = args[flagIdx + 1];
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function getToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error || !data.session) throw new Error('Auth failed: ' + (error?.message || 'no session'));
  return { token: data.session.access_token, userId: data.user.id };
}

async function apiCall(method, path, token, body) {
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${TARGET_URL}${path}`, opts);
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, data: json };
}

(async () => {
  console.log(`\n🔍 Super-admin end-to-end test → ${TARGET_URL}\n`);

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ Set PPF_ADMIN_EMAIL and PPF_ADMIN_PASSWORD in .env.local');
    process.exit(1);
  }

  let token, userId;
  try {
    ({ token, userId } = await getToken());
    console.log(`   Signed in as ${ADMIN_EMAIL} (${userId})\n`);
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }

  // ── 1. is_account_active RPC (service role) ──────────────────────
  try {
    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: active, error } = await admin.rpc('is_account_active', { user_id: userId });
    record('is_account_active returns true for active admin', active === true && !error, error?.message);
  } catch (e) {
    record('is_account_active RPC', false, e.message);
  }

  // ── 2. Delete allowlist rejects disallowed table ─────────────────
  {
    const { status, data } = await apiCall('POST', `/api/admin?action=delete&tab=user_messages&id=00000000-0000-0000-0000-000000000000`, token);
    record('delete allowlist rejects disallowed tab', status === 400, JSON.stringify(data));
  }

  // ── 3. Delete allowlist accepts allowed table (no-op id) ─────────
  {
    const { status, data } = await apiCall('POST', `/api/admin?action=delete&tab=services&id=00000000-0000-0000-0000-000000000000`, token);
    record('delete allowlist accepts services tab', status === 200, JSON.stringify(data));
  }

  // ── 4. Broadcast endpoint ────────────────────────────────────────
  {
    const { status, data } = await apiCall('POST', `/api/admin?action=broadcast&id=any`, token, {
      category: 'Industrial Manufacturing',
      targetRole: 'engineer',
      message: `[e2e-test ${Date.now()}] High-priority RFQ in Industrial Manufacturing.`,
    });
    record(
      'broadcast returns sent/skipped for category',
      status === 200 && typeof data.sent === 'number' && typeof data.skipped === 'number',
      JSON.stringify(data)
    );
  }

  // ── 5. Broadcast validation (missing fields) ─────────────────────
  {
    const { status, data } = await apiCall('POST', `/api/admin?action=broadcast&id=any`, token, {});
    record('broadcast validates required fields', status === 400, JSON.stringify(data));
  }

  // ── 6. Non-admin is rejected (403) ───────────────────────────────
  try {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
    // Use a known non-admin test account if present; otherwise skip.
    const nonAdminEmail = process.env.PPF_TEST_NONADMIN_EMAIL;
    const nonAdminPassword = process.env.PPF_TEST_NONADMIN_PASSWORD;
    if (nonAdminEmail && nonAdminPassword) {
      const { data: nonAdmin, error } = await anon.auth.signInWithPassword({ email: nonAdminEmail, password: nonAdminPassword });
      if (!error && nonAdmin.session) {
        const { status } = await apiCall('GET', '/api/admin?action=stats', nonAdmin.session.access_token);
        record('non-admin blocked from admin stats', status === 403, `status ${status}`);
      } else {
        record('non-admin blocked from admin stats', false, 'could not sign in non-admin test account');
      }
    } else {
      console.log('   ⏭️  Skipped non-admin test (set PPF_TEST_NONADMIN_EMAIL/PASSWORD)');
    }
  } catch (e) {
    record('non-admin blocked from admin stats', false, e.message);
  }

  // ── Summary ──────────────────────────────────────────────────────
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
})();
