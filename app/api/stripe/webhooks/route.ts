import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

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
    const supabase = await createClient();

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

  try {
    // Update payment intent status
    const { error: updateError } = await supabase
      .from('payment_intents')
      .update({
        status: 'succeeded',
        succeeded_at: new Date().toISOString(),
        payment_method_id: paymentIntent.payment_method,
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (updateError) {
      console.error('Error updating payment intent:', updateError);
    }

    // Get payment intent details
    const { data: paymentIntentData, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (fetchError || !paymentIntentData) {
      console.error('Payment intent not found:', fetchError);
      return;
    }

    // Create order in product_orders
    const { error: orderError } = await supabase
      .from('product_orders')
      .insert({
        buyer_id: paymentIntentData.customer_id,
        product_id: paymentIntentData.product_id,
        company_id: paymentIntentData.company_id,
        total_amount: paymentIntentData.amount,
        platform_fee: paymentIntentData.platform_fee,
        currency: paymentIntentData.currency,
        status: 'paid',
        payment_intent_id: paymentIntentData.id,
      });

    if (orderError) {
      console.error('Error creating order:', orderError);
    } else {
      console.log('Order created successfully');
    }

  } catch (error) {
    console.error('Error in handlePaymentSuccess:', error);
  }
}

/**
 * Handle failed payment
 * - Update payment_intent status to 'failed'
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
) {
  console.log('Payment failed:', paymentIntent.id);

  try {
    const { error } = await supabase
      .from('payment_intents')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Error updating payment intent:', error);
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
