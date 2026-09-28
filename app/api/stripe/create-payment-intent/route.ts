import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { sendNewOrderEmailVendor, sendOrderConfirmationEmail } from '@/lib/email';

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
    const { productId, type } = await request.json();

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

    // ── Resolve the listing (product or service) + seller info ──────
    // Default to 'service' for backwards compatibility, but the product
    // checkout passes type='product'.
    const isProduct = type === 'product';

    let title: string;
    let description: string | null = null;
    let price: number;
    let sellerId: string | null = null;
    let sellerCompanyId: string | null = null;
    let category: string | null = null;

    if (isProduct) {
      const { data: product, error } = await supabase
        .from('products')
        .select(`id, name, description, price, category, is_active, company_id, company:company_profiles(id, owner_id)`)
        .eq('id', productId)
        .eq('is_active', true)
        .single();
      if (error || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      title = product.name;
      description = product.description;
      price = Number(product.price);
      category = product.category;
      sellerCompanyId = product.company_id;
      sellerId = product.company?.owner_id ?? null;
    } else {
      const { data: service, error } = await supabase
        .from('services')
        .select(`id, title, description, price, category, provider_id, provider:profiles(id, full_name, email, company_id)`)
        .eq('id', productId)
        .eq('active', true)
        .single();
      if (error || !service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }
      title = service.title;
      description = service.description;
      price = Number(service.price);
      category = service.category;
      sellerId = service.provider_id;
      sellerCompanyId = (service.provider as any)?.company_id ?? null;
    }

    if (!sellerId) {
      return NextResponse.json(
        { error: 'The seller has no linked profile' },
        { status: 409 }
      );
    }

    const totalAmount = Math.round(price * 100);
    const platformFee = Math.round(totalAmount * 0.10);

    // ── Resolve seller's Stripe Connect account (optional) ──────────
    // Direct Charge when the seller has completed Connect onboarding;
    // otherwise fall back to a platform-direct charge (no fee captured).
    let connectAccountId: string | null = null;
    if (sellerCompanyId) {
      const { data: connectAccount } = await supabase
        .from('stripe_connect_accounts')
        .select('stripe_account_id, charges_enabled, payouts_enabled')
        .eq('company_id', sellerCompanyId)
        .maybeSingle();
      if (connectAccount?.stripe_account_id && connectAccount.charges_enabled) {
        connectAccountId = connectAccount.stripe_account_id;
      }
    }

    const metadata = {
      type: 'marketplace_order',
      order_type: isProduct ? 'product' : 'service',
      [isProduct ? 'product_id' : 'service_id']: productId,
      [isProduct ? 'product_name' : 'service_title']: title,
      provider_id: sellerId,
      customer_id: user.id,
      seller_id: sellerId,
      buyer_id: user.id,
      platform_fee_cents: String(platformFee),
    };

    // ── Create the Payment Intent ───────────────────────────────────
    let paymentIntent: Stripe.PaymentIntent;
    if (connectAccountId) {
      // Direct Charge: charge on the connected account, keep 10% fee.
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: totalAmount,
          currency: 'usd',
          application_fee_amount: platformFee,
          transfer_data: { destination: connectAccountId },
          metadata,
          description: `PPF - ${title}`,
        },
        { stripeAccount: connectAccountId }
      );
    } else {
      // Platform direct charge (no Connect yet).
      paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        metadata,
        description: `PPF - ${title}`,
      });
    }

    // Record an order in the unified ledger (pending until webhook confirms).
    const { error: orderError } = await supabase
      .from('marketplace_orders')
      .insert({
        order_number:            `PPF-${isProduct ? 'PRD' : 'SVC'}-${paymentIntent.id.slice(-8).toUpperCase()}`,
        order_type:              isProduct ? 'product' : 'service',
        buyer_id:                user.id,
        seller_id:               sellerId,
        seller_company_id:       sellerCompanyId,
        subtotal_amount:         price - (platformFee / 100),
        fee_amount:              platformFee / 100,
        total_amount:            price,
        currency:                'usd',
        stripe_payment_intent_id: paymentIntent.id,
        stripe_account_id:       connectAccountId,
        status:                  'pending_payment',
        payout_status:           'not_held',
      });

    if (orderError) {
      console.error('Error creating marketplace order:', orderError);
      // Don't fail checkout - webhook will reconcile.
    }

    // ── Emails (fire and forget) ────────────────────────────────────
    const { data: buyerProfile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();
    const { data: sellerProfile } = await supabase.from('profiles').select('full_name, email').eq('id', sellerId).single();

    const buyerName = buyerProfile?.full_name || 'A client';
    const buyerEmail = buyerProfile?.email || user.email!;
    const vendorName = sellerProfile?.full_name || 'Vendor';
    const vendorEmail = sellerProfile?.email;

    if (vendorEmail) {
      sendNewOrderEmailVendor({ to: vendorEmail, vendorName, clientName: buyerName, serviceTitle: title, orderAmount: totalAmount, orderId: paymentIntent.id }).catch(() => {});
    }
    sendOrderConfirmationEmail({ to: buyerEmail, clientName: buyerName, vendorName, serviceTitle: title, orderAmount: totalAmount, orderId: paymentIntent.id }).catch(() => {});

    // Auto-post feed milestone (fire and forget)
    fetch(`${request.nextUrl.origin}/api/feed/auto-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: isProduct ? 'product_purchased' : 'service_purchased', [isProduct ? 'productId' : 'serviceId']: productId, vendorId: sellerId, buyerId: user.id }),
    }).catch(() => {});

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      currency: 'usd',
      directCharge: !!connectAccountId,
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
