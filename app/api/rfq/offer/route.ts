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
    const body = await request.json();
    const { rfqId, amount, note, deliveryDays } = body;
    console.log('🔴 [POST /api/rfq/offer] Received:', { rfqId, amount, note: note?.substring(0, 50), deliveryDays });

    if (!rfqId || !amount) {
      console.log('   ❌ Missing rfqId or amount');
      return NextResponse.json({ error: 'rfqId and amount are required' }, { status: 400 });
    }

    // Auth via cookie-based client
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    console.log('   Auth user:', user ? `${user.email} (${user.id})` : 'NONE', authError ? `| error: ${authError.message}` : '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // DB operations via service client
    const supabase = createServiceClient();

    // Check user is an engineer
    const { data: profile } = await supabase.from('profiles')
      .select('user_type, token_balance, full_name, company_name').eq('id', user.id).single();
    console.log('   Profile:', profile ? `type=${profile.user_type}, tokens=${profile.token_balance}` : 'NOT FOUND');

    if (!profile || profile.user_type !== 'engineer') {
      console.log('   ❌ Not an engineer');
      return NextResponse.json({ error: 'Only engineers can submit offers' }, { status: 403 });
    }

    // Fetch the RFQ
    const { data: rfq } = await supabase
      .from('rfqs')
      .select('id, client_id, title, budget, timeline, quantity, material, inventory_status, lead_time_days, estimated_ship_date, location')
      .eq('id', rfqId)
      .single();
    console.log('   RFQ:', rfq ? rfq.title : 'NOT FOUND');

    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Call the token-gated RPC
    // NOTE: the deployed submit_rfq_offer only accepts (p_rfq_id, p_vendor_id, p_amount).
    // It does NOT accept p_note / p_delivery_days — passing those makes PostgREST fail
    // with "Could not find the function" because the signature doesn't match.
    console.log('   📞 Calling submit_rfq_offer RPC (3 params only)...');
    const { data: result, error: rpcError } = await supabase.rpc('submit_rfq_offer', {
      p_rfq_id: rfqId,
      p_vendor_id: user.id,
      p_amount: amount,
    });

    console.log('   RPC result:', JSON.stringify(result), '| error:', rpcError?.message);

    if (rpcError) {
      console.error('[offer/submit] RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // The RPC may return either:
    // - A UUID string directly (older deployed version)
    // - A JSONB object: { success: true, offer_id: "uuid" }
    let offerId: string | null = null;
    if (typeof result === 'string' && result.match(/^[0-9a-f-]{36}$/)) {
      // RPC returned a UUID directly — success!
      offerId = result;
      console.log('   ✅ Offer created (UUID return)! ID:', offerId);
    } else if (result && typeof result === 'object' && result.success) {
      offerId = result.offer_id;
      console.log('   ✅ Offer created (JSONB return)! ID:', offerId);
    } else if (result && typeof result === 'object' && result.error) {
      console.log('   ❌ RPC returned failure:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    } else {
      console.log('   ❌ Unexpected RPC result type:', typeof result, JSON.stringify(result));
      return NextResponse.json({ error: 'Unexpected response from offer submission' }, { status: 500 });
    }

    if (!offerId) {
      return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
    }

    // ── Attach note + delivery_days after the RPC (deployed RPC doesn't accept them) ──
    if (note || deliveryDays) {
      const { error: updateErr } = await supabase
        .from('rfq_offers')
        .update({
          ...(note ? { note } : {}),
          ...(deliveryDays ? { delivery_days: deliveryDays } : {}),
        })
        .eq('id', offerId);
      if (updateErr) {
        console.error('[offer/submit] Failed to attach note/delivery:', updateErr);
      } else {
        console.log('   ✅ Attached note/delivery to offer');
      }
    }

    // ── Create locked DM with the client ──
    let conversationId: string | null = null;
    try {
      const { data: convId } = await supabase.rpc('get_or_create_conversation', {
        user_one_id: user.id,
        user_two_id: rfq.client_id,
      });

      if (convId) {
        conversationId = convId as string;
        const vendorName = profile.full_name || profile.company_name || 'A vendor';
        const offerMsg = [
          `📨 **New Offer Received**`,
          ``,
          `**RFQ:** ${rfq.title}`,
          `**Vendor:** ${vendorName}`,
          `**Offer Amount:** $${Number(amount).toLocaleString()}`,
          rfq.budget ? `**Your Budget:** ${rfq.budget}` : '',
          deliveryDays ? `**Delivery:** ${deliveryDays} days` : '',
          note ? `` : '',
          note ? `**Note from vendor:** ${note}` : '',
          ``,
          `---`,
          `**RFQ Requirements Recap:**`,
          rfq.quantity ? `• Quantity: ${rfq.quantity}` : '',
          rfq.material ? `• Material: ${rfq.material}` : '',
          rfq.timeline ? `• Timeline: ${rfq.timeline}` : '',
          rfq.location ? `• Location: ${rfq.location}` : '',
          rfq.inventory_status ? `• Inventory: ${rfq.inventory_status === 'in_stock' ? 'In Stock' : rfq.inventory_status === 'out_of_stock' ? 'Out of Stock' : 'Back Order'}` : '',
          rfq.lead_time_days ? `• Lead Time: ${rfq.lead_time_days} days` : '',
          rfq.estimated_ship_date ? `• Ship Date: ${new Date(rfq.estimated_ship_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '',
          ``,
          `🔒 **This conversation is locked.** Unlock for 50 tokens to view the full offer and reply.`,
        ].filter(Boolean).join('\n');

        await supabase.from('user_messages').insert({
          conversation_id: convId,
          sender_id: user.id,
          content: offerMsg,
          is_system_message: true,
          is_read: false,
        });

        await supabase.from('user_conversations')
          .update({ is_unlocked: false, last_message_at: new Date().toISOString() })
          .eq('id', convId);
      }
    } catch (e) {
      console.error('[offer/dm] Failed to create DM:', e);
    }

    return NextResponse.json({ success: true, offerId, conversationId });
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