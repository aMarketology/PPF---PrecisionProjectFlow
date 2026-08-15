import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// GET /api/rfq/[id]/offer
// Returns all pending offers on an RFQ (any authenticated user can view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: offers, error } = await supabase
      .from('rfq_offers')
      .select('*, vendor:profiles!rfq_offers_vendor_id_fkey(id, full_name, avatar_url, company_name)')
      .eq('rfq_id', id)
      .order('amount', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ offers: offers ?? [] });
  } catch (error: any) {
    console.error('Offer GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rfq/[id]/offer
// Vendor submits an offer on an RFQ. Costs 50 tokens.
// Uses the token-gated submit_rfq_offer RPC for atomic token spend + insert.
// Also creates a locked DM with the client containing the offer details.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth via cookie-based client
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // DB operations via service client
    const supabase = createServiceClient();

    const body = await request.json();
    const { amount, note, deliveryDays } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid offer amount' }, { status: 400 });
    }

    // Check user is an engineer
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, token_balance, full_name, company_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.user_type !== 'engineer') {
      return NextResponse.json({ error: 'Only engineers / vendors can submit offers' }, { status: 403 });
    }

    // Fetch the RFQ to get client_id and title
    const { data: rfq } = await supabase
      .from('rfqs')
      .select('id, client_id, title, budget, timeline, quantity, material, inventory_status, lead_time_days, estimated_ship_date, location')
      .eq('id', id)
      .single();

    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Call the token-gated RPC (spends 50 tokens + inserts offer atomically)
    const { data: result, error: rpcError } = await supabase.rpc('submit_rfq_offer', {
      p_rfq_id: id,
      p_vendor_id: user.id,
      p_amount: amount,
      p_note: note || null,
      p_delivery_days: deliveryDays || null,
    });

    if (rpcError) {
      console.error('[offer/submit] RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Failed to submit offer' }, { status: 400 });
    }

    // ── Create locked DM with the client containing the offer ──
    let conversationId: string | null = null;
    try {
      // Find or create conversation between vendor and client
      const { data: convId } = await supabase.rpc('get_or_create_conversation', {
        user_one_id: user.id,
        user_two_id: rfq.client_id,
      });

      if (convId) {
        conversationId = convId as string;

        // Build a rich offer message
        const vendorName = profile.full_name || profile.company_name || 'A vendor';
        const offerMsg = [
          `📨 **New Offer Received**`,
          ``,
          `**RFQ:** ${rfq.title}`,
          `**Vendor:** ${vendorName}`,
          `**Offer Amount:** $${Number(amount).toLocaleString()}`,
          rfq.budget ? `**Your Budget:** ${rfq.budget}` : '',
          deliveryDays ? `**Delivery:** ${deliveryDays} days` : '',
          note ? `` : '',
          note ? `**Note from vendor:** ${note}` : '',
          ``,
          `---`,
          `**RFQ Requirements Recap:**`,
          rfq.quantity ? `• Quantity: ${rfq.quantity}` : '',
          rfq.material ? `• Material: ${rfq.material}` : '',
          rfq.timeline ? `• Timeline: ${rfq.timeline}` : '',
          rfq.location ? `• Location: ${rfq.location}` : '',
          rfq.inventory_status ? `• Inventory: ${rfq.inventory_status === 'in_stock' ? 'In Stock' : rfq.inventory_status === 'out_of_stock' ? 'Out of Stock' : 'Back Order'}` : '',
          rfq.lead_time_days ? `• Lead Time: ${rfq.lead_time_days} days` : '',
          rfq.estimated_ship_date ? `• Ship Date: ${new Date(rfq.estimated_ship_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '',
          ``,
          `🔒 **This conversation is locked.** Unlock for 50 tokens to view the full offer and reply.`,
        ].filter(Boolean).join('\n');

        // Insert the offer as a system message in the DM
        await supabase.from('user_messages').insert({
          conversation_id: convId,
          sender_id: user.id,
          content: offerMsg,
          is_system_message: true,
          is_read: false,
        });

        // Ensure conversation stays LOCKED (client must pay to unlock)
        await supabase.from('user_conversations')
          .update({ is_unlocked: false, last_message_at: new Date().toISOString() })
          .eq('id', convId);
      }
    } catch (e) {
      console.error('[offer/dm] Failed to create DM:', e);
    }

    // Fire-and-forget: notify client about new offer
    fetch(`${request.nextUrl.origin}/api/rfq/${id}/notify-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: result.offer_id }),
    }).catch(e => console.error('[offer notify]', e));

    return NextResponse.json({
      success: true,
      offerId: result.offer_id,
      conversationId,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Offer POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}