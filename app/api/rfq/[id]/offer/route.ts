import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/rfq/[id]/offer
// Returns all pending offers on an RFQ (any authenticated user can view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

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
// Vendor submits an offer on an RFQ
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, note } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid offer amount' }, { status: 400 });
    }

    // Verify RFQ exists and is open
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .select('id, client_id, status, title')
      .eq('id', id)
      .single();

    if (rfqError || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    if (rfq.status !== 'open') {
      return NextResponse.json({ error: 'This RFQ is no longer accepting offers' }, { status: 400 });
    }

    // Can't offer on your own RFQ
    if (rfq.client_id === user.id) {
      return NextResponse.json({ error: 'You cannot submit an offer on your own RFQ' }, { status: 400 });
    }

    // Check if vendor already has a pending offer
    const { data: existing } = await supabase
      .from('rfq_offers')
      .select('id')
      .eq('rfq_id', id)
      .eq('vendor_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending offer on this RFQ' }, { status: 409 });
    }

    // Insert the offer
    const { data: offer, error: insertError } = await supabase
      .from('rfq_offers')
      .insert({
        rfq_id: id,
        vendor_id: user.id,
        amount,
        note: note || null,
        status: 'pending',
      })
      .select('*, vendor:profiles!rfq_offers_vendor_id_fkey(id, full_name, avatar_url, company_name)')
      .single();

    if (insertError) throw insertError;

    // Fire-and-forget: notify client about new offer
    fetch(`${request.nextUrl.origin}/api/rfq/${id}/notify-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: offer.id }),
    }).catch(e => console.error('[offer notify]', e));

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error: any) {
    console.error('Offer POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}