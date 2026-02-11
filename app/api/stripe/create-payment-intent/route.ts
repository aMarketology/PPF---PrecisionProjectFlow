import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Mark this route as dynamic to prevent build-time execution
export const dynamic = 'force-dynamic';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch product details with company info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        company_profiles!inner (
          id,
          company_name,
          stripe_connect_accounts (
            stripe_account_id
          )
        )
      `)
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get Stripe Connect account ID
    const stripeConnectAccount = product.company_profiles.stripe_connect_accounts?.[0];
    
    if (!stripeConnectAccount?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Company has not connected their Stripe account' },
        { status: 400 }
      );
    }

    // Calculate platform fee (10%)
    // Note: product.price is already in cents (BIGINT) from database
    const platformFeePercent = 0.10;
    const totalAmount = product.price; // Already in cents, no conversion needed
    const platformFee = Math.round(totalAmount * platformFeePercent);

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: product.currency.toLowerCase(),
      application_fee_amount: platformFee,
      transfer_data: {
        destination: stripeConnectAccount.stripe_account_id,
      },
      metadata: {
        product_id: product.id,
        product_name: product.name,
        company_id: product.company_profiles.id,
        company_name: product.company_profiles.company_name,
        customer_id: user.id,
      },
    });

    // Store payment intent in database
    const { error: insertError } = await supabase
      .from('payment_intents')
      .insert([{
        stripe_payment_intent_id: paymentIntent.id,
        customer_id: user.id,
        product_id: product.id,
        company_id: product.company_profiles.id,
        amount: product.price, // Store in cents
        currency: product.currency,
        platform_fee: platformFee, // Store in cents
        status: 'created',
      }]);

    if (insertError) {
      console.error('Error storing payment intent:', insertError);
      // Don't fail the request, payment intent is still created
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: product.price,
      currency: product.currency,
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
