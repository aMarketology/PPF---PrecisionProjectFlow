import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/service';
import { sendNewOrderEmailVendor, sendOrderConfirmationEmail } from '@/lib/email';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    const supabase = createServiceClient();

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent, supabase);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(failedPayment, supabase);
        break;

      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account, supabase);
        break;

      case 'payout.paid':
        const payout = event.data.object as Stripe.Payout;
        await handlePayoutPaid(payout, supabase);
        break;

      case 'charge.dispute.created':
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 * - Update payment_intent status to 'succeeded'
 * - Create order in product_orders table
 */
async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
) {
  console.log('Payment succeeded:', paymentIntent.id);

  if (paymentIntent.metadata?.type === 'rfq_contract') {
    const contractId = paymentIntent.metadata.contract_id;
    if (!contractId) {
      console.error('[webhook] RFQ contract payment is missing contract_id metadata');
      return;
    }
    const { error } = await supabase.from('contracts').update({
      status: 'active',
      stripe_payment_intent_id: paymentIntent.id,
      accepted_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', contractId);
    if (error) console.error('[webhook] contract activation failed:', error);

    // Mark the matching unified-ledger row as paid (funds held in escrow
    // on the connected account; released via manual payout on approval).
    const { error: ledgerErr } = await supabase
      .from('marketplace_orders')
      .update({ status: 'paid', payout_status: 'held', paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent.id })
      .eq('order_type', 'rfq_contract')
      .eq('status', 'pending_payment');
    if (ledgerErr) console.error('[webhook] rfq_contract ledger update failed:', ledgerErr);

    return;
  }

  // ── Token purchase safety net ───────────────────────────────────
  // If the buyer closed their browser before the client-side credit
  // call fired, this guarantees tokens are still credited. add_tokens
  // is idempotent on stripe_payment_id, so this can never double-credit.
  if (paymentIntent.metadata?.type === 'token_purchase') {
    try {
      const userId = paymentIntent.metadata.user_id;
      const tokens = parseInt(paymentIntent.metadata.tokens || '0', 10);
      const packId = paymentIntent.metadata.pack_id || 'unknown';

      if (userId && tokens > 0) {
        const { error: creditErr } = await supabase.rpc('add_tokens', {
          p_user_id:           userId,
          p_amount:            tokens,
          p_description:       `Purchased ${tokens} tokens (pack: ${packId}) [webhook]`,
          p_stripe_payment_id: paymentIntent.id,
        });
        if (creditErr) console.error('[webhook] token credit failed:', creditErr);
        else console.log(`[webhook] credited ${tokens} tokens to ${userId}`);
      }
    } catch (e) {
      console.error('[webhook] token purchase handling error:', e);
    }
    return; // token purchases don't create product orders
  }

  // ── Marketplace order (product / service) ────────────────────────
  // Reconstruct the unified ledger row directly from Stripe metadata
  // (no dependency on the legacy `payment_intents` table, which does
  // not exist live).
  if (paymentIntent.metadata?.type === 'marketplace_order') {
    const m = paymentIntent.metadata;
    const buyerId = m.buyer_id || m.customer_id;
    const sellerId = m.seller_id || m.provider_id;
    const orderType = m.order_type || 'service';
    const amountCents = paymentIntent.amount;
    const amountDollars = amountCents / 100;
    const feeCents = parseInt(m.platform_fee_cents || '0', 10);
    const feeDollars = feeCents / 100;

    if (!buyerId || !sellerId) {
      console.error('[webhook] marketplace_order missing buyer/seller metadata', m);
      return;
    }

    // Upsert by stripe payment intent id (idempotent).
    const { data: existing, error: existingErr } = await supabase
      .from('marketplace_orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle();

    if (existingErr) console.error('[webhook] existing order lookup failed:', existingErr);

    if (!existing) {
      const { error: orderError } = await supabase
        .from('marketplace_orders')
        .insert({
          order_number:            `PPF-${orderType === 'product' ? 'PRD' : 'SVC'}-${paymentIntent.id.slice(-8).toUpperCase()}`,
          order_type:              orderType,
          buyer_id:                buyerId,
          seller_id:               sellerId,
          subtotal_amount:         amountDollars - feeDollars,
          fee_amount:              feeDollars,
          total_amount:            amountDollars,
          currency:                paymentIntent.currency || 'usd',
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id:        typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : null,
          status:                  'paid',
          payout_status:           orderType === 'rfq_contract' ? 'held' : 'not_held',
          paid_at:                 new Date().toISOString(),
        });

      if (orderError) {
        console.error('[webhook] marketplace_orders insert failed:', orderError);
        return;
      }
      console.log('[webhook] marketplace order created', paymentIntent.id);
    }

    // Unlock the buyer<->seller DM (contract-to-unlock parity).
    try {
      const { data: convId } = await supabase.rpc('get_or_create_conversation', {
        user_one_id: buyerId,
        user_two_id: sellerId,
      });
      if (convId) {
        await supabase.from('user_conversations')
          .update({ is_unlocked: true })
          .eq('id', convId);
      }
    } catch (e) { console.error('[webhook] conversation unlock failed:', e); }

    // Fire-and-forget emails.
    try {
      const { data: buyer } = await supabase.from('profiles').select('full_name, email').eq('id', buyerId).single();
      const { data: seller } = await supabase.from('profiles').select('full_name, email').eq('id', sellerId).single();
      const serviceTitle = m.service_title || m.product_name || 'Engineering Service';
      const orderId = paymentIntent.id;
      if (seller?.email) sendNewOrderEmailVendor({ to: seller.email, vendorName: seller.full_name, clientName: buyer?.full_name || 'A client', serviceTitle, orderAmount: amountCents, orderId }).catch(() => {});
      if (buyer?.email) sendOrderConfirmationEmail({ to: buyer.email, clientName: buyer.full_name, vendorName: seller?.full_name || 'Vendor', serviceTitle, orderAmount: amountCents, orderId }).catch(() => {});
    } catch (emailErr) { console.error('[webhook] email lookup failed:', emailErr); }

    return;
  }

/**
 * Handle failed payment
 * - Mark the marketplace order as failed/refunded (or leave pending)
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
) {
  console.log('Payment failed:', paymentIntent.id);

  try {
    // If a marketplace order was already created, mark it paid->failed.
    // Orders are only created on success, so this is mostly a no-op guard.
    const { error } = await supabase
      .from('marketplace_orders')
      .update({ status: 'refunded' })
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .eq('status', 'pending_payment');

    if (error) {
      console.error('Error updating failed order:', error);
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

/**
 * Handle Stripe Connect account updates
 * - Update stripe_connect_accounts table
 */
async function handleAccountUpdated(
  account: Stripe.Account,
  supabase: any
) {
  console.log('Account updated:', account.id);

  try {
    const { error } = await supabase
      .from('stripe_connect_accounts')
      .update({
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', account.id);

    if (error) {
      console.error('Error updating Connect account:', error);
    }

  } catch (error) {
    console.error('Error in handleAccountUpdated:', error);
  }
}

/**
 * Handle payout.paid - mark marketplace orders as paid out.
 * A single payout may cover multiple orders; match by payout id.
 */
async function handlePayoutPaid(
  payout: Stripe.Payout,
  supabase: any
) {
  console.log('Payout paid:', payout.id);

  try {
    const { error } = await supabase
      .from('marketplace_orders')
      .update({
        payout_status: 'paid_out',
        payout_id: payout.id,
        updated_at: new Date().toISOString(),
      })
      .eq('payout_id', payout.id);

    if (error) {
      console.error('Error updating payout status:', error);
    }
  } catch (error) {
    console.error('Error in handlePayoutPaid:', error);
  }
}

/**
 * Handle charge.dispute.created - flag the marketplace order as disputed.
 */
async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  supabase: any
) {
  console.log('Dispute created:', dispute.id);

  try {
    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
    if (!chargeId) return;

    const { error } = await supabase
      .from('marketplace_orders')
      .update({
        status: 'disputed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_charge_id', chargeId);

    if (error) {
      console.error('Error flagging disputed order:', error);
    }
  } catch (error) {
    console.error('Error in handleDisputeCreated:', error);
  }
}
