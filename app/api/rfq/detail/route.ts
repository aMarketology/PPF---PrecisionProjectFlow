import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rfq/detail?id=xxx or ?slug=xxx
 * Returns a single RFQ with client profile. Uses service_role to bypass RLS.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (!id && !slug) {
      return NextResponse.json({ error: 'id or slug required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    let query = supabase.from('rfqs').select('*');
    if (id) query = query.eq('id', id);
    else query = query.eq('slug', slug!);

    const { data: rfq, error } = await query.single();
    if (error || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Fetch client profile
    const { data: prof } = await supabase.from('profiles')
      .select('id, full_name, email, avatar_url, company_id')
      .eq('id', rfq.client_id).single();

    let companyName: string | undefined;
    if (prof?.company_id) {
      const { data: comp } = await supabase.from('company_profiles')
        .select('company_name').eq('id', prof.company_id).single();
      companyName = comp?.company_name;
    }

    return NextResponse.json({
      ...rfq,
      client: prof ? { ...prof, company_name: companyName } : null,
    });
  } catch (error: any) {
    console.error('[rfq/detail]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}