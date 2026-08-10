import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// GET /api/rfq/list?page=0&limit=50&category=Mechanical&search=...&status=open
// Returns paginated RFQs with client profiles, offer counts, and lowest offer
// Uses service_role to bypass RLS — accessible to everyone including anon
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page     = parseInt(searchParams.get('page') ?? '0', 10);
    const limit    = parseInt(searchParams.get('limit') ?? '50', 10);
    const category = searchParams.get('category') ?? '';
    const search   = searchParams.get('search') ?? '';
    const status   = searchParams.get('status') ?? '';
    const rfqType  = searchParams.get('rfq_type') ?? '';
    const offset   = page * limit;

    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from('rfqs')
      .select('*, client:profiles!rfqs_client_id_fkey(id, full_name, avatar_url, company_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (rfqType) {
      query = query.eq('rfq_type', rfqType);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: rfqs, error, count } = await query;
    if (error) throw error;

    // Try to resolve company names for profiles with company_id
    const rfqList = rfqs ?? [];
    const companyIds = Array.from(new Set(
      rfqList
        .map(r => (r.client as any)?.company_id)
        .filter(Boolean)
    )) as string[];

    let companyMap = new Map<string, string>();
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('company_profiles')
        .select('id, company_name')
        .in('id', companyIds);
      companyMap = new Map(companies?.map(c => [c.id, c.company_name]) || []);
    }

    // For each RFQ, get offer counts and the lowest offer amount
    const rfqIds = rfqList.map(r => r.id);
    const { data: offerStats } = rfqIds.length > 0
      ? await supabase
          .from('rfq_offers')
          .select('rfq_id, amount')
          .in('rfq_id', rfqIds)
          .eq('status', 'pending')
      : { data: [] };

    // Calculate counts and lowest per RFQ
    const offerMap = new Map<string, { count: number; lowest: number | null }>();
    for (const offer of offerStats ?? []) {
      const entry = offerMap.get(offer.rfq_id) ?? { count: 0, lowest: null };
      entry.count += 1;
      if (entry.lowest === null || Number(offer.amount) < entry.lowest) {
        entry.lowest = Number(offer.amount);
      }
      offerMap.set(offer.rfq_id, entry);
    }

    // Get current user for "my offer" info
    const { data: { user } } = await supabase.auth.getUser();
    let myOfferMap = new Map<string, number>();
    if (user && rfqIds.length > 0) {
      const { data: myOffers } = await supabase
        .from('rfq_offers')
        .select('rfq_id, amount')
        .in('rfq_id', rfqIds)
        .eq('vendor_id', user.id)
        .eq('status', 'pending');
      myOfferMap = new Map(myOffers?.map(o => [o.rfq_id, Number(o.amount)]) || []);
    }

    // Enrich RFQs with client company name, offer stats, and my offer
    const enriched = rfqList.map(r => {
      const prof = r.client as any;
      return {
        ...r,
        client: prof ? {
          id: prof.id,
          full_name: prof.full_name,
          avatar_url: prof.avatar_url,
          company_name: prof.company_id ? companyMap.get(prof.company_id) : undefined,
        } : null,
        offers_count: offerMap.get(r.id)?.count ?? 0,
        lowest_offer: offerMap.get(r.id)?.lowest ?? null,
        my_offer: myOfferMap.get(r.id) ?? null,
      };
    });

    return NextResponse.json({
      rfqs: enriched,
      page,
      hasMore: rfqList.length === limit,
      total: count ?? 0,
    });
  } catch (error: any) {
    console.error('RFQ list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
