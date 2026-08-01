import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client with SERVICE_ROLE key — bypasses RLS.
 * ONLY use in server-side API routes. NEVER expose to the browser.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}