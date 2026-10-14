/**
 * Stripe Connect Account Onboarding API
 * Creates account links for companies to connect their Stripe accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createConnectAccountLink, updateConnectAccountStatus, getConnectAccountRequirements } from '@/lib/stripe/connect';

// Mark this route as dynamic to prevent build-time execution
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, action } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Verify user owns this company
    const { data: company } = await supabase
      .from('company_profiles')
      .select('id, owner_id')
      .eq('id', companyId)
      .single();

    if (!company || company.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Handle different actions
    if (action === 'create_link') {
      // Create onboarding link
      const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/payments?success=true`;
      const refreshUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/payments?refresh=true`;

      const accountLink = await createConnectAccountLink(companyId, returnUrl, refreshUrl);

      return NextResponse.json({ url: accountLink });
    }

    if (action === 'refresh_status') {
      // Update account status from Stripe
      const accountDetails = await updateConnectAccountStatus(companyId);

      return NextResponse.json({
        success: true,
        account: accountDetails
      });
    }

    if (action === 'requirements') {
      // Fetch outstanding onboarding requirements from Stripe
      const { data: stripeAccount } = await supabase
        .from('stripe_connect_accounts')
        .select('stripe_account_id')
        .eq('company_id', companyId)
        .single();

      if (!stripeAccount?.stripe_account_id) {
        return NextResponse.json({ error: 'No Stripe account found' }, { status: 404 });
      }

      const requirements = await getConnectAccountRequirements(stripeAccount.stripe_account_id);
      return NextResponse.json({ success: true, requirements });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Stripe Connect onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Verify user owns this company
    const { data: company } = await supabase
      .from('company_profiles')
      .select('id, owner_id')
      .eq('id', companyId)
      .single();

    if (!company || company.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get Stripe account status
    const { data: stripeAccount } = await supabase
      .from('stripe_connect_accounts')
      .select('*')
      .eq('company_id', companyId)
      .single();

    return NextResponse.json({ 
      connected: !!stripeAccount,
      account: stripeAccount || null
    });

  } catch (error: any) {
    console.error('Get Stripe account error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get account status' },
      { status: 500 }
    );
  }
}
