import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' });
}

/**
 * GET /api/contracts/[id]
 * Returns a single contract with milestones.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        *,
        buyer:profiles!contracts_buyer_id_fkey(id, full_name, avatar_url, company_name),
        vendor:profiles!contracts_vendor_id_fkey(id, full_name, avatar_url, company_name),
        milestones:contract_milestones(*)
      `)
      .eq('id', id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Only parties or admin can view
    const isAdmin = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (contract.buyer_id !== user.id && contract.vendor_id !== user.id && !isAdmin?.data?.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ contract });
  } catch (error: any) {
    console.error('[contracts/detail]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/contracts/[id]/milestone-action
 * Vendor marks delivered OR buyer releases milestone.
 * Body: { action: 'deliver' | 'release', milestoneId }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, milestoneId } = await request.json();
    if (!action || !milestoneId) {
      return NextResponse.json({ error: 'action and milestoneId required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const rpc = action === 'deliver' ? 'mark_milestone_delivered' : action === 'release' ? 'release_milestone' : null;
    if (!rpc) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: result, error } = await supabase.rpc(rpc, {
      p_milestone_id: milestoneId,
      p_user_id: user.id,
    });

    if (error) throw error;

    if (result && result.startsWith('error:')) {
      return NextResponse.json({ error: result.replace('error:', '').replace(/_/g, ' ') }, { status: 400 });
    }

    // ── On release: trigger a manual payout to the vendor's connected ─
    // account for this milestone's amount (Direct Charge + Manual Payout
    // escrow model). Funds are held on the connected account; releasing
    // the milestone creates a payout to the vendor's bank.
    if (action === 'release' && result === 'released') {
      try {
        const { data: milestone } = await supabase
          .from('contract_milestones')
          .select('amount, contract_id')
          .eq('id', milestoneId)
          .single();

        if (milestone) {
          const { data: contract } = await supabase
            .from('contracts')
            .select('vendor_id')
            .eq('id', milestone.contract_id)
            .single();

          if (contract?.vendor_id) {
            // Resolve the vendor's connected account.
            const { data: vendorProfile } = await supabase
              .from('profiles')
              .select('company_id')
              .eq('id', contract.vendor_id)
              .single();

            const { data: connectAccount } = vendorProfile?.company_id
              ? await supabase
                  .from('stripe_connect_accounts')
                  .select('stripe_account_id')
                  .eq('company_id', vendorProfile.company_id)
                  .maybeSingle()
              : { data: null };

            if (connectAccount?.stripe_account_id) {
              const amountCents = Math.round(Number(milestone.amount) * 100);
              const stripe = getStripe();
              const payout = await stripe.payouts.create(
                { amount: amountCents, currency: 'usd' },
                { stripeAccount: connectAccount.stripe_account_id }
              );

              // Record the payout id on the milestone + any linked ledger order.
              await supabase
                .from('contract_milestones')
                .update({ stripe_transfer_id: payout.id })
                .eq('id', milestoneId);
              await supabase
                .from('marketplace_orders')
                .update({ payout_status: 'paid_out', payout_id: payout.id })
                .eq('seller_id', contract.vendor_id)
                .eq('order_type', 'rfq_contract');
            }
          }
        }
      } catch (payoutErr: any) {
        // Payout failure must not fail the release itself (DB is source
        // of truth; finance can re-trigger payouts manually).
        console.error('[contracts/payout] manual payout failed:', payoutErr?.message);
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[contracts/milestone]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
