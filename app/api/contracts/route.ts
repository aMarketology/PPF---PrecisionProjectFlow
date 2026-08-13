import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts
 * Returns the current user's contracts (as buyer or vendor) with milestone summaries.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') ?? ''; // 'buyer' | 'vendor' | '' (both)

    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    let query = supabase
      .from('contracts')
      .select(`
        *,
        buyer:profiles!contracts_buyer_id_fkey(id, full_name, avatar_url, company_name),
        vendor:profiles!contracts_vendor_id_fkey(id, full_name, avatar_url, company_name),
        milestones:contract_milestones(id, title, amount, status, due_date)
      `)
      .order('created_at', { ascending: false });

    if (role === 'buyer') {
      query = query.eq('buyer_id', user.id);
    } else if (role === 'vendor') {
      query = query.eq('vendor_id', user.id);
    } else {
      query = query.or(`buyer_id.eq.${user.id},vendor_id.eq.${user.id}`);
    }

    const { data: contracts, error } = await query;
    if (error) throw error;

    return NextResponse.json({ contracts: contracts ?? [] });
  } catch (error: any) {
    console.error('[contracts/list]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/contracts
 * Admin-only: manually create a contract.
 * Body: { buyerId, vendorId, title, description?, totalAmount }
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { buyerId, vendorId, title, description, totalAmount } = await request.json();
    if (!buyerId || !vendorId || !title || !totalAmount) {
      return NextResponse.json({ error: 'buyerId, vendorId, title, and totalAmount are required' }, { status: 400 });
    }

    const { data: contractId, error } = await supabase.rpc('create_contract_from_offer', {
      p_order_id: null,
      p_buyer_id: buyerId,
      p_vendor_id: vendorId,
      p_title: title,
      p_description: description || null,
      p_total_amount: totalAmount,
    });

    if (error) throw error;
    return NextResponse.json({ success: true, contractId });
  } catch (error: any) {
    console.error('[contracts/create]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
