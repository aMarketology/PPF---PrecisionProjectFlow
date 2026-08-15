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

    // Auth via cookie-based client
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // DB operations via service client
    const supabase = createServiceClient();

    // Get the user's profile (no engineer restriction — anyone can bid)
    const { data: profile } = await supabase.from('profiles')
      .select('user_type, token_balance, full_name, company_id').eq('id', user.id).single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch the RFQ
    const { data: rfq } = await supabase
      .from('rfqs')
      .select('id, client_id, title, budget, timeline, quantity, material, location')
      .eq('id', rfqId)
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

    // Call the token-gated RPC
    const { data: result, error: rpcError } = await supabase.rpc('submit_rfq_offer', {
      p_rfq_id: rfqId,
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

    // ── Create locked DM with the client ──
    let conversationId: string | null = null;
    const { data: convId, error: conversationError } = await supabase.rpc('get_or_create_conversation', {
        user_one_id: user.id,
        user_two_id: rfq.client_id,
    });

    if (conversationError || !convId) {
      throw new Error(conversationError?.message || 'Unable to create an offer conversation');
    }

    conversationId = convId as string;
    const vendorName = profile.full_name || 'A vendor';
    const offerMetadata = {
      rfqId: rfq.id,
      title: rfq.title,
      vendorName,
      amount: Number(amount),
      deliveryDays: deliveryDays ? Number(deliveryDays) : null,
      note: note || null,
    };

    const { data: message, error: messageError } = await supabase.from('user_messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: 'New RFQ offer received',
      message_type: 'rfq_offer',
      message_metadata: offerMetadata,
      is_system_message: true,
      is_read: false,
    }).select('id').single();

    if (messageError || !message) {
      throw new Error(messageError?.message || 'Unable to create the offer message');
    }

    const { error: conversationUpdateError } = await supabase.from('user_conversations')
      .update({ is_unlocked: false, last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
    if (conversationUpdateError) throw new Error(conversationUpdateError.message);

    const { error: offerUpdateError } = await supabase.from('rfq_offers')
      .update({ conversation_id: conversationId, message_id: message.id })
      .eq('id', result.offer_id);
    if (offerUpdateError) throw new Error(offerUpdateError.message);

    return NextResponse.json({ success: true, offerId: result.offer_id, conversationId });
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

    // DB operations via service client
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

      // ── Create a contract from this accepted offer ──
      let contractId: string | null = null;
      try {
        const { data: cid, error: contractError } = await supabase.rpc('create_contract_from_offer', {
          p_order_id: null,
          p_buyer_id: user.id,
          p_vendor_id: offer.vendor_id,
          p_title: rfq.title,
          p_description: `Contract awarded from RFQ: ${rfq.title}. Accepted offer: $${offer.amount}.`,
          p_total_amount: offer.amount,
        });
        if (!contractError && cid) contractId = cid as string;
      } catch (e) {
        console.error('[offer/accept] contract creation failed:', e);
      }

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
          content: `🎉 **Offer Accepted!** The client accepted your offer of $${offer.amount} for "${rfq.title}".${contractId ? ` A contract has been created.` : ''} You can now discuss project details freely.`,
          is_system_message: true,
        });
      }

      return NextResponse.json({ success: true, conversationId: convId, contractId });
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

    const supabase = createServiceClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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