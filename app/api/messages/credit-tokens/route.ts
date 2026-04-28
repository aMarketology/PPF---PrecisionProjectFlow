import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' });
}

// POST /api/messages/credit-tokens
// Called client-side after stripe.confirmPayment() succeeds for a token pack.
// Verifies the PaymentIntent with Stripe, then credits the user's token balance.
// Body: { paymentIntentId: string }
export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json();
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the payment with Stripe
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    if (pi.metadata?.type !== 'token_purchase') {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    if (pi.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check this payment hasn't already been credited (idempotency)
    const { data: existing } = await supabase
      .from('token_transactions')
      .select('id')
      .eq('stripe_payment_id', paymentIntentId)
      .single();

    if (existing) {
      // Already credited — just return current balance from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('token_balance')
        .eq('id', user.id)
        .single();
      return NextResponse.json({ alreadyCredited: true, balance: profile?.token_balance ?? 0 });
    }

    const tokensToCredit = parseInt(pi.metadata.tokens, 10);
    const packId         = pi.metadata.pack_id;

    // Credit the tokens via DB function
    const { data: newBalance, error: creditError } = await supabase
      .rpc('add_tokens', {
        p_user_id:           user.id,
        p_amount:            tokensToCredit,
        p_description:       `Purchased ${tokensToCredit} tokens (pack: ${packId})`,
        p_stripe_payment_id: paymentIntentId,
      });

    if (creditError) throw creditError;

    return NextResponse.json({ ok: true, tokensAdded: tokensToCredit, newBalance });

  } catch (error: any) {
    console.error('Credit tokens error:', error);
    return NextResponse.json({ error: error.message || 'Failed to credit tokens' }, { status: 500 });
  }
}
