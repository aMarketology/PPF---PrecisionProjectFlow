/**
 * Stripe Connect Utilities
 * Functions for managing Stripe Connect accounts for companies
 */

import { stripe } from './config';
import { createClient } from '@/lib/supabase/client';

/**
 * Create a Stripe Connect account link for onboarding
 * @param companyId - Company UUID
 * @param returnUrl - URL to return to after onboarding
 * @param refreshUrl - URL to return to if onboarding needs refresh
 * @returns Account link URL
 */
export async function createConnectAccountLink(
  companyId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  const supabase = createClient();

  // Check if company already has a Stripe account
  const { data: existingAccount } = await supabase
    .from('stripe_connect_accounts')
    .select('stripe_account_id')
    .eq('company_id', companyId)
    .single();

  let accountId: string;

  if (existingAccount?.stripe_account_id) {
    accountId = existingAccount.stripe_account_id;
  } else {
    // Create new Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: {
        company_id: companyId,
      },
    });

    accountId = account.id;

    // Save to database
    await supabase.from('stripe_connect_accounts').insert({
      company_id: companyId,
      stripe_account_id: accountId,
      account_type: 'standard',
    });
  }

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

/**
 * Get Stripe Connect account details
 * @param stripeAccountId - Stripe account ID
 * @returns Account details
 */
export async function getConnectAccountDetails(stripeAccountId: string) {
  const account = await stripe.accounts.retrieve(stripeAccountId);

  return {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    country: account.country,
    defaultCurrency: account.default_currency,
    requirements: account.requirements ?? null,
  };
}

/**
 * Get the outstanding onboarding requirements for a Connect account.
 * Returns the list of currently-due requirement strings (empty = done).
 */
export async function getConnectAccountRequirements(stripeAccountId: string) {
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return {
    currentlyDue: account.requirements?.currently_due ?? [],
    eventuallyDue: account.requirements?.eventually_due ?? [],
    pendingVerification: account.requirements?.pending_verification ?? null,
    disabledReason: account.requirements?.disabled_reason ?? null,
  };
}

/**
 * Update Stripe Connect account status in database
 * @param companyId - Company UUID
 */
export async function updateConnectAccountStatus(companyId: string) {
  const supabase = createClient();

  const { data: connectAccount } = await supabase
    .from('stripe_connect_accounts')
    .select('stripe_account_id')
    .eq('company_id', companyId)
    .single();

  if (!connectAccount) {
    throw new Error('No Stripe account found for company');
  }

  const accountDetails = await getConnectAccountDetails(connectAccount.stripe_account_id);

  const fullyOnboarded = accountDetails.chargesEnabled && accountDetails.payoutsEnabled;

  await supabase
    .from('stripe_connect_accounts')
    .update({
      charges_enabled: accountDetails.chargesEnabled,
      payouts_enabled: accountDetails.payoutsEnabled,
      details_submitted: accountDetails.detailsSubmitted,
      country: accountDetails.country,
      default_currency: accountDetails.defaultCurrency,
      requirements_due: accountDetails.requirements,
      onboarded_at: fullyOnboarded ? new Date().toISOString() : null,
    })
    .eq('company_id', companyId);

  return accountDetails;
}

/**
 * Check if company can accept payments
 * @param companyId - Company UUID
 * @returns true if company can accept payments
 */
export async function canAcceptPayments(companyId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: account } = await supabase
    .from('stripe_connect_accounts')
    .select('charges_enabled, details_submitted')
    .eq('company_id', companyId)
    .single();

  return account?.charges_enabled && account?.details_submitted || false;
}

/**
 * Create login link for Stripe Express Dashboard
 * @param stripeAccountId - Stripe account ID
 * @returns Login link URL
 */
export async function createLoginLink(stripeAccountId: string): Promise<string> {
  const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
  return loginLink.url;
}
