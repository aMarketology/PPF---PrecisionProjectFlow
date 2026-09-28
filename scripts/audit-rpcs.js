/**
 * audit-rpcs.js - list live RPCs from the PostgREST OpenAPI spec.
 * (Probing with rpc(name, {}) gives false negatives because PostgREST
 *  matches functions by argument signature.)
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const res = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
});
const spec = await res.json();

const paths = Object.keys(spec.paths ?? {});
const rpcs = paths.filter(p => p.startsWith('/rpc/')).map(p => p.replace('/rpc/', ''));
const tables = paths.filter(p => !p.startsWith('/rpc/')).map(p => p.replace('/', ''));

console.log('════ LIVE RPCs (' + rpcs.length + ') ════\n');
for (const r of rpcs.sort()) console.log('  ' + r);

console.log('\n════ EXPOSED TABLES (' + tables.length + ') ════\n');
for (const t of tables.sort()) console.log('  ' + t);
