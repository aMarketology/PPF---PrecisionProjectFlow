import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
      .select('*, vendor:profiles!rfq_offers_vendor_id_fkey(id, full_name, avatar_url)')
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
// Also creates a locked DM with the client containing the offer details.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth via cookie-based client
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // DB operations via service client
    const supabase = createServiceClient();

    const body = await request.json();
    const { amount, note, deliveryDays } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid offer amount' }, { status: 400 });
    }

    // Any authenticated user (not just engineers) can bid — no user_type check.
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, token_balance, full_name, company_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch the RFQ to get client_id and title
    const { data: rfq } = await supabase
      .from('rfqs')
      .select('id, client_id, title, budget, timeline, quantity, material, location')
      .eq('id', id)
      .single();

    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Block: owner or same company
    if (rfq.client_id === user.id) {
      return NextResponse.json({ error: 'You cannot bid on your own RFQ' }, { status: 403 });
    }

    if (profile.company_id) {
      const { data: posterProfile } = await supabase.from('profiles')
        .select('company_id').eq('id', rfq.client_id).single();
      if (posterProfile?.company_id && posterProfile.company_id === profile.company_id) {
        return NextResponse.json({ error: 'You cannot bid on an RFQ from your own company' }, { status: 403 });
      }
    }

    // Call the token-gated RPC (spends 50 tokens + inserts offer atomically)
    const { data: result, error: rpcError } = await supabase.rpc('submit_rfq_offer', {
      p_rfq_id: id,
      p_vendor_id: user.id,
      p_amount: amount,
      p_notes: note || null,
      p_timeline: deliveryDays ? `${deliveryDays} days` : null,
      p_terms: null,
    });

    if (rpcError) {
      console.error('[offer/submit] RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Failed to submit offer' }, { status: 400 });
    }

    // ── Create locked DM with the client containing the offer ──
    let conversationId: string | null = null;
    try {
      // Find or create conversation between vendor and client
      const { data: convId } = await supabase.rpc('get_or_create_conversation', {
        user_one_id: user.id,
        user_two_id: rfq.client_id,
      });

      if (convId) {
        conversationId = convId as string;

        // Store the proposal as a first-class RFQ offer message.
        const vendorName = profile.full_name || 'A vendor';
        const offerMetadata = {
          rfqId: rfq.id,
          title: rfq.title,
          vendorName,
          amount: Number(amount),
          deliveryDays: deliveryDays ? Number(deliveryDays) : null,
          note: note || null,
        };

        // Insert the offer as a system message in the DM
        const { data: message, error: messageError } = await supabase.from('user_messages').insert({
          conversation_id: convId,
          sender_id: user.id,
          content: 'New RFQ offer received',
          message_type: 'rfq_offer',
          message_metadata: offerMetadata,
          is_system_message: true,
          is_read: false,
        }).select('id').single();
        if (messageError || !message) throw new Error(messageError?.message || 'Unable to create the offer message');

        const { error: offerUpdateError } = await supabase.from('rfq_offers')
          .update({ conversation_id: convId, message_id: message.id })
          .eq('id', result.offer_id);
        if (offerUpdateError) throw offerUpdateError;

        // Preserve existing DM access. New direct conversations default to locked.
        await supabase.from('user_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', convId);
      }
    } catch (e) {
      console.error('[offer/dm] Failed to create DM:', e);
    }

    // Fire-and-forget: notify client about new offer
    fetch(`${request.nextUrl.origin}/api/rfq/${id}/notify-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: result.offer_id }),
    }).catch(e => console.error('[offer notify]', e));

    return NextResponse.json({
      success: true,
      offerId: result.offer_id,
      conversationId,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Offer POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}