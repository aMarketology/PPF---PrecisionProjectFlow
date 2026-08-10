import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rfq/offer
 * Submit an offer on an RFQ. Costs 50 tokens.
 * Body: { rfqId, amount, note?, deliveryDays? }
 */
export async function POST(request: NextRequest) {
  try {
    const { rfqId, amount, note, deliveryDays } = await request.json();

    if (!rfqId || !amount) {
      return NextResponse.json({ error: 'rfqId and amount are required' }, { status: 400 });
    }

    // Use server client (cookie-based auth) to get the current user
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service client for RPC calls (bypasses RLS for token operations)
    const supabase = createServiceClient();

    // Check user is an engineer
    const { data: profile } = await supabase.from('profiles')
      .select('user_type, token_balance').eq('id', user.id).single();

    if (!profile || profile.user_type !== 'engineer') {
      return NextResponse.json({ error: 'Only engineers can submit offers' }, { status: 403 });
    }

    // Call the token-gated RPC
    const { data: result, error: rpcError } = await supabase.rpc('submit_rfq_offer', {
      p_rfq_id: rfqId,
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

    return NextResponse.json({ success: true, offerId: result.offer_id });
  } catch (error: any) {
    console.error('[offer/submit]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/rfq/offer
 * Accept or reject an offer (client only).
 * Body: { offerId, action: 'accept' | 'reject' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { offerId, action } = await request.json();

    if (!offerId || !action) {
      return NextResponse.json({ error: 'offerId and action are required' }, { status: 400 });
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be accept or reject' }, { status: 400 });
    }

    // Auth via cookie-based client
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // DB operations via service client (bypasses RLS)
    const supabase = createServiceClient();

    // Fetch the offer with RFQ info
    const { data: offer, error: offerError } = await supabase
      .from('rfq_offers')
      .select('id, rfq_id, vendor_id, amount, status, rfqs!inner(id, client_id, title, status)')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const rfq = (offer as any).rfqs;
    if (!rfq || rfq.client_id !== user.id) {
      return NextResponse.json({ error: 'Only the RFQ owner can manage offers' }, { status: 403 });
    }

    if (offer.status !== 'pending') {
      return NextResponse.json({ error: 'Offer is no longer pending' }, { status: 400 });
    }

    if (action === 'accept') {
      // Accept this offer
      await supabase.from('rfq_offers').update({ status: 'accepted' }).eq('id', offerId);

      // Reject all other pending offers
      await supabase.from('rfq_offers')
        .update({ status: 'rejected' })
        .eq('rfq_id', offer.rfq_id)
        .neq('id', offerId)
        .eq('status', 'pending');

      // Mark RFQ as awarded
      await supabase.from('rfqs').update({ status: 'awarded' }).eq('id', offer.rfq_id);

      // Get or create + unlock conversation
      const { data: convs } = await supabase
        .from('user_conversations')
        .select('id')
        .eq('conversation_type', 'direct')
        .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`)
        .or(`participant_one_id.eq.${offer.vendor_id},participant_two_id.eq.${offer.vendor_id}`);

      // Find the conversation between these two
      let convId: string | null = null;
      if (convs) {
        for (const c of convs) {
          const { data: full } = await supabase.from('user_conversations')
            .select('id, participant_one_id, participant_two_id')
            .eq('id', c.id).single();
          if (full && 
              ((full.participant_one_id === user.id && full.participant_two_id === offer.vendor_id) ||
               (full.participant_one_id === offer.vendor_id && full.participant_two_id === user.id))) {
            convId = full.id;
            break;
          }
        }
      }

      if (convId) {
        await supabase.from('user_conversations')
          .update({ is_unlocked: true, last_message_at: new Date().toISOString() })
          .eq('id', convId);
      } else {
        const { data: newConv } = await supabase.from('user_conversations')
          .insert({
            participant_one_id: user.id,
            participant_two_id: offer.vendor_id,
            conversation_type: 'direct',
            is_unlocked: true,
            last_message_at: new Date().toISOString(),
          })
          .select('id').single();
        convId = newConv?.id || null;
      }

      // Send system message
      if (convId) {
        await supabase.from('user_messages').insert({
          conversation_id: convId,
          sender_id: user.id,
          content: `🎉 **Offer Accepted!** The client accepted your offer of $${offer.amount} for "${rfq.title}". You can now discuss project details freely.`,
          is_system_message: true,
        });
      }

      return NextResponse.json({ success: true, conversationId: convId });
    }

    // Reject
    await supabase.from('rfq_offers').update({ status: 'rejected' }).eq('id', offerId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[offer/manage]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/rfq/offer?offerId=xxx
 * Withdraw own offer (vendor only).
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('offerId');

    if (!offerId) {
      return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
    }

    // Auth via cookie-based client
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // DB operation via service client (bypasses RLS)
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('rfq_offers')
      .update({ status: 'withdrawn' })
      .eq('id', offerId)
      .eq('vendor_id', user.id)
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[offer/withdraw]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}