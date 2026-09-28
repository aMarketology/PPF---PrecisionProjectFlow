/**
 * db-verify-orphans.js — check whether the flagged company_ids actually exist.
 * (Previous run hit the 1000-row API cap on company_profiles.)
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

// Paginate ALL company_profiles ids using Range headers
async function allCompanyIds() {
  const ids = new Set();
  const PAGE = 1000;
  for (let from = 0; from < 20000; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/company_profiles?select=id`, {
      headers: { ...H, Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    rows.forEach(r => ids.add(r.id));
    if (rows.length < PAGE) break;
  }
  return ids;
}

const companyIds = await allCompanyIds();
console.log(`company_profiles ids fetched: ${companyIds.size}\n`);

const SUSPECTS = [
  '4edca172-e616-4f32-aa11-7a7de8425644',
  '072e42b9-2e36-4944-8f2f-28dd726f8d9e',
  '4a2ef5d4-8461-457e-b81c-32883001c3be',
  '125d10e0-e204-4108-8a5f-057de53302a6',
];

console.log('════ DO THE "ORPHAN" company_ids EXIST? ════\n');
for (const id of SUSPECTS) {
  const res = await fetch(`${url}/rest/v1/company_profiles?select=id,company_name&id=eq.${id}`, { headers: H });
  const rows = await res.json();
  const found = Array.isArray(rows) && rows.length > 0;
  console.log(`  ${id}  ${found ? '✅ EXISTS — ' + rows[0].company_name : '❌ TRULY MISSING'}`);
}

// Re-run the integrity check with the FULL id set
console.log('\n════ RE-CHECK WITH FULL ID SET ════\n');
const profiles = await (await fetch(`${url}/rest/v1/profiles?select=id,company_id`, { headers: H })).json();
const members = await (await fetch(`${url}/rest/v1/company_members?select=id,user_id,company_id`, { headers: H })).json();

const badProfiles = profiles.filter(p => p.company_id && !companyIds.has(p.company_id));
const badMembers = members.filter(m => m.company_id && !companyIds.has(m.company_id));

console.log(`  profiles.company_id orphans: ${badProfiles.length}`);
console.log(`  company_members.company_id orphans: ${badMembers.length}`);
console.log(`\n  ${badProfiles.length + badMembers.length === 0 ? '✅ ALL CLEAR — safe to add constraints' : '❌ real orphans remain'}`);