import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/run-sql
 * TEMPORARY — runs raw SQL via service_role. Remove after deploying DB functions.
 * Body: { sql: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { sql } = await request.json();
    if (!sql) return NextResponse.json({ error: 'sql required' }, { status: 400 });

    const supabase = createServiceClient();

    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const results: string[] = [];

    for (const stmt of statements) {
      // Use the raw SQL query via REST
      const { error } = await supabase.rpc('exec_sql', { sql: stmt }).maybeSingle();
      
      if (error) {
        // Try direct query approach
        const { error: qError } = await supabase.from('_sql_runner').select('*').limit(0);
        results.push(`Tried: ${stmt.substring(0, 60)}... — ${error.message}`);
      } else {
        results.push(`✅ ${stmt.substring(0, 60)}...`);
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}