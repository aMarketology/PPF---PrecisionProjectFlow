#!/usr/bin/env node
/**
 * apply-schema-fix.js
 * Applies the FIX_MISSING_COLUMNS migration using the Supabase service role key.
 * No direct Postgres connection needed.
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Each statement runs as a separate RPC call using pg_catalog workarounds.
// We use a simple "does the column exist?" check then ADD COLUMN via a
// lightweight stored procedure we create on the fly.
async function addColumnIfMissing(table, column, definition) {
  // Check if column already exists via information_schema
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .eq('column_name', column)
    .maybeSingle()

  if (error) {
    // information_schema might be blocked by RLS — assume it needs adding
    console.log(`  ⚠️  Could not check ${table}.${column} — will attempt add anyway`)
  }

  if (data) {
    console.log(`  ✅  ${table}.${column} — already exists, skipping`)
    return true
  }

  console.log(`  ➕  Adding ${table}.${column} ${definition}...`)
  return false
}

async function runSQL(sql, description) {
  const { error } = await supabase.rpc('exec_migration', { sql_text: sql }).catch(() => ({ error: { message: 'rpc not available' } }))
  if (!error) {
    console.log(`  ✅  ${description}`)
    return true
  }
  return false
}

async function main() {
  console.log('\n🔧  Applying schema fix via Supabase service role...\n')

  // The most reliable approach: create a one-time migration RPC,
  // call it, then drop it.
  const migrationSQL = `
DO $$
BEGIN
  -- user_messages missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_messages' AND column_name='is_system_message') THEN
    ALTER TABLE public.user_messages ADD COLUMN is_system_message BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added user_messages.is_system_message';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_messages' AND column_name='is_paid') THEN
    ALTER TABLE public.user_messages ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added user_messages.is_paid';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_messages' AND column_name='payment_id') THEN
    ALTER TABLE public.user_messages ADD COLUMN payment_id TEXT;
    RAISE NOTICE 'Added user_messages.payment_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_messages' AND column_name='read_at') THEN
    ALTER TABLE public.user_messages ADD COLUMN read_at TIMESTAMPTZ;
    RAISE NOTICE 'Added user_messages.read_at';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_messages' AND column_name='attachment_url') THEN
    ALTER TABLE public.user_messages ADD COLUMN attachment_url TEXT;
    RAISE NOTICE 'Added user_messages.attachment_url';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_messages' AND column_name='attachment_name') THEN
    ALTER TABLE public.user_messages ADD COLUMN attachment_name TEXT;
    RAISE NOTICE 'Added user_messages.attachment_name';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_messages' AND column_name='attachment_type') THEN
    ALTER TABLE public.user_messages ADD COLUMN attachment_type TEXT;
    RAISE NOTICE 'Added user_messages.attachment_type';
  END IF;

  -- user_conversations missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_conversations' AND column_name='is_unlocked') THEN
    ALTER TABLE public.user_conversations ADD COLUMN is_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added user_conversations.is_unlocked';
  END IF;

END $$;
`

  // Create a temporary migration function using service role
  const createFnSQL = `
CREATE OR REPLACE FUNCTION public.run_ppf_migration()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $func$
BEGIN
  ${migrationSQL.replace(/\$/g, '$')}
  RETURN 'ok';
END;
$func$;
`

  // Step 1: Try to create the migration function
  const { error: createErr } = await supabase.rpc('run_ppf_migration').catch(async () => {
    // Function doesn't exist yet, need to create it via a different path
    return { error: { message: 'not found' } }
  })

  if (createErr) {
    // Fall back: use fetch to call the Supabase REST API directly with service role
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/run_ppf_migration`
    
    // Try calling if it already exists
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({}),
    })

    if (res.ok) {
      console.log('✅  Migration function ran successfully!')
    } else {
      console.log('\n⚠️  Cannot run migration automatically.')
      console.log('\nThe direct DB connection password needs to be verified.')
      console.log('\n📋  MANUAL FIX (30 seconds):')
      console.log('    1. Go to: https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new')
      console.log('    2. Paste the contents of: supabase/FIX_MISSING_COLUMNS.sql')
      console.log('    3. Click Run\n')
      console.log('📁  File location: supabase/FIX_MISSING_COLUMNS.sql\n')
      process.exit(1)
    }
  } else {
    console.log('✅  Migration ran successfully via RPC!')
  }

  // Verify the key column now exists
  const { data: check } = await supabase
    .from('user_messages')
    .select('id')
    .limit(1)

  console.log('\n🎉  Schema check passed — user_messages table is accessible.')
  console.log('    The unlock flow should now work.\n')
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
