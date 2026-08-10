import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// GET /api/rfq/[id]/offer
// Returns all pending offers on an RFQ (any authenticated user can view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: offers, error } = await supabase
      .from('rfq_offers')
      .select('*, vendor:profiles!rfq_offers_vendor_id_fkey(id, full_name, avatar_url, company_name)')
      .eq('rfq_id', id)
      .order('amount', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ offers: offers ?? [] });
  } catch (error: any) {
    console.error('Offer GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rfq/[id]/offer
// Vendor submits an offer on an RFQ. Costs 50 tokens.
// Uses the token-gated submit_rfq_offer RPC for atomic token spend + insert.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Get current user via service client (still respects auth)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, note, deliveryDays } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid offer amount' }, { status: 400 });
    }

    // Check user is an engineer
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, token_balance')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.user_type !== 'engineer') {
      return NextResponse.json({ error: 'Only engineers / vendors can submit offers' }, { status: 403 });
    }

    // Call the token-gated RPC (spends 50 tokens + inserts offer atomically)
    const { data: result, error: rpcError } = await supabase.rpc('submit_rfq_offer', {
      p_rfq_id: id,
      p_vendor_id: user.id,
      p_amount: amount,
      p_note: note || null,
      p_delivery_days: deliveryDays || null,
    });

    if (rpcError) {
      console.error('[offer/submit] RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Failed to submit offer' }, { status: 400 });
    }

    // Fire-and-forget: notify client about new offer
    fetch(`${request.nextUrl.origin}/api/rfq/${id}/notify-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: result.offer_id }),
    }).catch(e => console.error('[offer notify]', e));

    return NextResponse.json({ success: true, offerId: result.offer_id }, { status: 201 });
  } catch (error: any) {
    console.error('Offer POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}