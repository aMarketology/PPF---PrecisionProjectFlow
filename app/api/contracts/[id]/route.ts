import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

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

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[contracts/milestone]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
