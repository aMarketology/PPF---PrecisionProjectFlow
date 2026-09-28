/**
 * db-introspect.js — deep read-only introspection of the live Supabase schema.
 *
 * Uses the PostgREST OpenAPI spec for column types/formats, then probes
 * foreign-key relationships by attempting embedded resource selects.
 *
 * Run: node scripts/db-introspect.js
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

// ── 1. Column definitions from the OpenAPI spec ──────────────────────
const spec = await (await fetch(`${url}/rest/v1/`, {
  headers: { ...H, Accept: 'application/openapi+json' },
})).json();

const defs = spec.definitions ?? {};
const tableNames = Object.keys(defs).sort();

console.log('══════════════════════════════════════════════════════════');
console.log('  LIVE SCHEMA — ' + tableNames.length + ' TABLES');
console.log('══════════════════════════════════════════════════════════\n');

for (const t of tableNames) {
  const props = defs[t].properties ?? {};
  const required = new Set(defs[t].required ?? []);
  const cols = Object.entries(props).map(([name, def]) => {
    let type = def.format || def.type || '?';
    if (def.type === 'array') type = `${def.items?.format || def.items?.type || '?'}[]`;
    if (def.enum) type = `enum(${def.enum.join('|')})`;
    const pk = def.description?.includes('Primary Key') ? ' PK' : '';
    const req = required.has(name) ? ' NOT NULL' : '';
    return `${name}:${type}${pk}${req}`;
  });
  console.log(`── ${t} (${cols.length} cols)`);
  console.log('   ' + cols.join('\n   '));
  console.log('');
}
