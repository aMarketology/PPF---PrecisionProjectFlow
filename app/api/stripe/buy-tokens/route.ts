import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Hardcoded token packs — no DB table needed
const TOKEN_PACKS: Record<string, { id: string; name: string; tokens: number; price_cents: number }> = {
  starter:  { id: 'starter',  name: 'Starter',  tokens: 10,  price_cents: 1000 },
  pro:      { id: 'pro',      name: 'Pro',       tokens: 50,  price_cents: 4500 },
  business: { id: 'business', name: 'Business',  tokens: 120, price_cents: 9900 },
};

// POST /api/stripe/buy-tokens
// Creates a Stripe PaymentIntent for a token pack purchase.
// Body: { packId: 'starter' | 'pro' | 'business' }
export async function POST(request: NextRequest) {
  try {
    const { packId } = await request.json();
    if (!packId) {
      return NextResponse.json({ error: 'packId is required' }, { status: 400 });
    }

    const pack = TOKEN_PACKS[packId];
    if (!pack) {
      return NextResponse.json({ error: 'Token pack not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-12-15.clover' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   pack.price_cents,
      currency: 'usd',
      metadata: {
        type:    'token_purchase',
        user_id: user.id,
        pack_id: pack.id,
        tokens:  String(pack.tokens),
      },
      description: `${pack.name} token pack — ${pack.tokens} tokens`,
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, pack });

  } catch (error: any) {
    console.error('Buy tokens error:', error);
    return NextResponse.json({ error: error.message || 'Payment failed' }, { status: 500 });
  }
}
