import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendRFQAlertEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/rfq/[id]/notify-offer
// Fired after an offer is submitted — notifies the client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { offerId } = await request.json();
    if (!offerId) {
      return NextResponse.json({ error: 'offerId required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get offer + RFQ + client info
    const { data: offer } = await supabase
      .from('rfq_offers')
      .select('*, vendor:profiles!rfq_offers_vendor_id_fkey(full_name, company_name), rfq:rfqs!rfq_offers_rfq_id_fkey(title, client_id, budget)')
      .eq('id', offerId)
      .single();

    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });

    // Get client profile for email
    const { data: client } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', offer.rfq.client_id)
      .single();

    if (client?.email) {
      sendRFQAlertEmail({
        to: client.email,
        name: client.full_name,
        rfqTitle: offer.rfq.title,
        rfqCategory: 'Offer',
        budget: offer.rfq.budget,
      }).catch(e => console.error('[offer notify email]', e));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[offer notify]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}