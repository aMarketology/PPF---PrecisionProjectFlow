import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/my-listings
// Returns all of the current user's listings: services, products, and RFQs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .single();

    const companyId = profile?.company_id;

    // Parallel fetch: services, products (via company), and RFQs (via client_id)
    const [servicesRes, productsRes, rfqsRes] = await Promise.all([
      // Services created by this user
      supabase.from('services')
        .select('id, title, category, price, active, created_at')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),

      // Products under the user's company
      companyId
        ? supabase.from('products')
            .select('id, name, price, category, is_active, created_at')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),

      // RFQs posted by this user
      supabase.from('rfqs')
        .select('id, title, category, status, created_at')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      services: servicesRes.data || [],
      products: productsRes.data || [],
      rfqs: rfqsRes.data || [],
      counts: {
        services: servicesRes.data?.length || 0,
        products: productsRes.data?.length || 0,
        rfqs: rfqsRes.data?.length || 0,
      },
    });
  } catch (error) {
    console.error('[my-listings] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}