import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { stripe } from '@/lib/stripe/config';

export const dynamic = 'force-dynamic';

const ACTION_COST = 50;

type OfferAction = 'send_contract' | 'schedule_meeting';

export async function GET(request: NextRequest) {
  const supabaseAuth = await createClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversationId = request.nextUrl.searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: conversation } = await supabase
    .from('user_conversations')
    .select('participant_one_id, participant_two_id')
    .eq('id', conversationId)
    .single();
  if (!conversation || (conversation.participant_one_id !== user.id && conversation.participant_two_id !== user.id)) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const { data: offers, error: offersError } = await supabase
    .from('rfq_offers')
    .select('message_id, vendor_id, rfq_id')
    .eq('conversation_id', conversationId)
    .not('message_id', 'is', null);
  if (offersError) throw offersError;

  const rfqIds = Array.from(new Set((offers || []).map(offer => offer.rfq_id)));
  const { data: rfqs, error: rfqsError } = rfqIds.length
    ? await supabase.from('rfqs').select('id, client_id').in('id', rfqIds)
    : { data: [], error: null };
  if (rfqsError) throw rfqsError;

  const ownerByRfq = new Map((rfqs || []).map(rfq => [rfq.id, rfq.client_id]));
  const contexts = Object.fromEntries((offers || []).map(offer => [offer.message_id, {
    vendorId: offer.vendor_id,
    ownerId: ownerByRfq.get(offer.rfq_id) || null,
  }]));

  return NextResponse.json({ contexts });
}

export async function POST(request: NextRequest) {
  const supabaseAuth = await createClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let tokensSpent = false;
  let referenceId: string | null = null;
  let createdContractId: string | null = null;
  let checkoutSessionId: string | null = null;

  try {
    const { messageId, action, meetingAt, durationMinutes, meetingNote } = await request.json() as {
      messageId?: string;
      action?: OfferAction;
      meetingAt?: string;
      durationMinutes?: number;
      meetingNote?: string;
    };

    if (!messageId || !action || !['send_contract', 'schedule_meeting'].includes(action)) {
      return NextResponse.json({ error: 'A valid messageId and action are required' }, { status: 400 });
    }

    const { data: offer, error: offerError } = await supabase
      .from('rfq_offers')
      .select('id, rfq_id, vendor_id, amount, conversation_id, message_id')
      .eq('message_id', messageId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: 'RFQ offer not found' }, { status: 404 });
    }

    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .select('id, client_id, title')
      .eq('id', offer.rfq_id)
      .single();

    if (rfqError || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    const isOwner = rfq.client_id === user.id;
    const isVendor = offer.vendor_id === user.id;

    if (action === 'send_contract' && !isOwner) {
      return NextResponse.json({ error: 'Only the person who posted the RFQ can send a contract' }, { status: 403 });
    }
    if (action === 'schedule_meeting' && !isOwner && !isVendor) {
      return NextResponse.json({ error: 'Only the RFQ parties can schedule a meeting' }, { status: 403 });
    }

    let meetingDate: Date | null = null;
    if (action === 'schedule_meeting') {
      meetingDate = new Date(meetingAt || '');
      if (!meetingAt || Number.isNaN(meetingDate.getTime()) || meetingDate.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'Choose a meeting time in the future' }, { status: 400 });
      }
    }

    let connectAccountId: string | null = null;
    if (action === 'send_contract') {
      const { data: vendorProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', offer.vendor_id)
        .single();
      if (!vendorProfile?.company_id) {
        return NextResponse.json({ error: 'The vendor must create or join a company before receiving a contract payment' }, { status: 409 });
      }

      const { data: connectAccount } = await supabase
        .from('stripe_connect_accounts')
        .select('stripe_account_id, charges_enabled, payouts_enabled, details_submitted')
        .eq('company_id', vendorProfile.company_id)
        .maybeSingle();
      if (!connectAccount?.stripe_account_id || !connectAccount.charges_enabled || !connectAccount.payouts_enabled || !connectAccount.details_submitted) {
        return NextResponse.json({ error: 'The vendor must finish Stripe Connect onboarding before you can send this contract' }, { status: 409 });
      }
      connectAccountId = connectAccount.stripe_account_id;

      const { data: existingContract } = await supabase
        .from('contracts')
        .select('id')
        .eq('buyer_id', rfq.client_id)
        .eq('vendor_id', offer.vendor_id)
        .eq('title', rfq.title)
        .in('status', ['draft', 'pending_payment', 'active', 'in_progress'])
        .limit(1)
        .maybeSingle();
      if (existingContract) {
        return NextResponse.json({ error: 'A contract for this RFQ offer has already been sent', contractId: existingContract.id }, { status: 409 });
      }
    }

    referenceId = offer.id;
    const { data: spendResult, error: spendError } = await supabase.rpc('spend_tokens', {
      p_user_id: user.id,
      p_amount: ACTION_COST,
      p_description: action === 'send_contract' ? 'Send RFQ contract' : 'Schedule RFQ meeting',
      p_reference_id: offer.id,
    });
    if (spendError) throw spendError;
    if (spendResult === 'insufficient_tokens') {
      return NextResponse.json({ error: 'Insufficient tokens', actionCost: ACTION_COST }, { status: 402 });
    }
    tokensSpent = true;

    if (action === 'send_contract') {
      const { data, error } = await supabase.rpc('create_contract_from_offer', {
        p_order_id: null,
        p_buyer_id: rfq.client_id,
        p_vendor_id: offer.vendor_id,
        p_title: rfq.title,
        p_description: `Contract sent from RFQ offer. Offer amount: $${Number(offer.amount).toLocaleString()}.`,
        p_total_amount: offer.amount,
      });
      if (error || !data) throw new Error(error?.message || 'Unable to create contract');
      const contractId = data as string;
      createdContractId = contractId;

      const amountCents = Math.round(Number(offer.amount) * 100);
      const platformFeeCents = Math.round(amountCents * 0.1);
      const { error: contractUpdateError } = await supabase.from('contracts')
        .update({ status: 'pending_payment' })
        .eq('id', contractId);
      if (contractUpdateError) throw contractUpdateError;

      const origin = request.nextUrl.origin;
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: { name: rfq.title, description: 'Precision Project Flow RFQ contract' },
          },
        }],
        payment_intent_data: {
          application_fee_amount: platformFeeCents,
          transfer_data: { destination: connectAccountId! },
          metadata: { type: 'rfq_contract', contract_id: contractId, rfq_id: rfq.id, offer_id: offer.id },
        },
        metadata: { type: 'rfq_contract', contract_id: contractId, rfq_id: rfq.id, offer_id: offer.id },
        success_url: `${origin}/contracts/${contractId}?payment=success`,
        cancel_url: `${origin}/messages?conversation=${offer.conversation_id}`,
      });
      if (!checkoutSession.url) throw new Error('Stripe did not return a checkout URL');
      checkoutSessionId = checkoutSession.id;

      const { error: messageError } = await supabase.from('user_messages').insert({
        conversation_id: offer.conversation_id,
        sender_id: user.id,
        content: `Contract sent for "${rfq.title}". Review it at /contracts/${contractId}`,
        is_system_message: true,
        is_read: false,
      });
      if (messageError) throw messageError;

      const { data: profile } = await supabase.from('profiles').select('token_balance').eq('id', user.id).single();
  return NextResponse.json({ success: true, contractId, checkoutUrl: checkoutSession.url, tokenBalance: profile?.token_balance ?? 0, tokensSpent: ACTION_COST });
    }

    const duration = Math.min(240, Math.max(15, Number(durationMinutes) || 30));
    const note = meetingNote?.trim() ? ` Notes: ${meetingNote.trim()}` : '';
    const meetingIso = meetingDate!.toISOString();
    const { error: messageError } = await supabase.from('user_messages').insert({
      conversation_id: offer.conversation_id,
      sender_id: user.id,
      content: `Meeting proposed for ${meetingIso} (${duration} minutes).${note}`,
      is_system_message: false,
      is_read: false,
    });
    if (messageError) throw messageError;

    const { data: profile } = await supabase.from('profiles').select('token_balance').eq('id', user.id).single();
    return NextResponse.json({ success: true, meetingAt: meetingIso, durationMinutes: duration, tokenBalance: profile?.token_balance ?? 0, tokensSpent: ACTION_COST });
  } catch (error: any) {
    if (checkoutSessionId) {
      try {
        await stripe.checkout.sessions.expire(checkoutSessionId);
      } catch (expireError) {
        console.error('[rfq/offer/action] checkout cleanup failed:', expireError);
      }
    }
    if (createdContractId) {
      await supabase.from('contracts').delete().eq('id', createdContractId);
    }
    if (tokensSpent && referenceId) {
      const { error: refundError } = await supabase.rpc('refund_tokens', {
        p_user_id: user.id,
        p_amount: ACTION_COST,
        p_description: 'Refund failed RFQ proposal action',
        p_reference_id: referenceId,
      });
      if (refundError) console.error('[rfq/offer/action] refund failed:', refundError);
    }
    console.error('[rfq/offer/action]', error);
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
