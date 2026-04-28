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

    // Fetch service details with provider info
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        id, title, description, price, category, provider_id,
        provider:profiles!services_provider_id_fkey(id, full_name, email)
      `)
      .eq('id', productId)
      .eq('active', true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // price is stored as DECIMAL in dollars — convert to cents for Stripe
    const totalAmount = Math.round(Number(service.price) * 100);
    const platformFee = Math.round(totalAmount * 0.10);

    // Create Payment Intent (direct charge to platform; no Stripe Connect required for now)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      metadata: {
        service_id: service.id,
        service_title: service.title,
        provider_id: service.provider_id,
        customer_id: user.id,
        platform_fee_cents: String(platformFee),
      },
      description: `PPF - ${service.title}`,
    });

    // Create an order record in the database
    const { error: orderError } = await supabase
      .from('orders')
      .insert([{
        client_id: user.id,
        engineer_id: service.provider_id,
        service_id: service.id,
        status: 'pending',
        total_amount: Number(service.price),
      }]);

    if (orderError) {
      console.error('Error creating order record:', orderError);
      // Don't fail the checkout — order can be reconciled via webhook
    }

    // Fetch buyer profile for emails
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const provider = service.provider as any;
    const buyerName = buyerProfile?.full_name || 'A client';
    const buyerEmail = buyerProfile?.email || user.email!;
    const vendorName = provider?.full_name || 'Vendor';
    const vendorEmail = provider?.email;

    // Email vendor: new order notification
    if (vendorEmail) {
      sendNewOrderEmailVendor({
        to: vendorEmail,
        vendorName,
        clientName: buyerName,
        serviceTitle: service.title,
        orderAmount: Math.round(Number(service.price) * 100),
        orderId: paymentIntent.id,
      }).catch(e => console.error('[Email] vendor notification failed:', e));
    }

    // Email buyer: order confirmation
    sendOrderConfirmationEmail({
      to: buyerEmail,
      clientName: buyerName,
      vendorName,
      serviceTitle: service.title,
      orderAmount: Math.round(Number(service.price) * 100),
      orderId: paymentIntent.id,
    }).catch(e => console.error('[Email] buyer confirmation failed:', e));

    // Auto-post transaction milestone to feed (fire and forget)
    fetch(`${request.nextUrl.origin}/api/feed/auto-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'service_purchased', serviceId: service.id, vendorId: service.provider_id, buyerId: user.id }),
    }).catch(e => console.error('[Feed] auto-post failed:', e));

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      currency: 'usd',
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
