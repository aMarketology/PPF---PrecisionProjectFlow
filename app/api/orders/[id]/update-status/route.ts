import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendOrderConfirmationEmail, sendNewOrderEmailVendor } from '@/lib/email';

// Mark this route as dynamic to prevent build-time execution
export const dynamic = 'force-dynamic';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['in_progress', 'refunded', 'cancelled'],
  in_progress: ['delivered', 'cancelled'],
  delivered: ['completed', 'in_progress'], // Can go back if revision needed
  completed: [], // Final state
  cancelled: [], // Final state
  refunded: [], // Final state
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const orderId = params.id;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Fetch the order
    const { data: order, error: fetchError } = await supabase
      .from('product_orders')
      .select(`
        *,
        products!inner(company_id)
      `)
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get company profile to verify ownership
    const { data: company } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('id', order.products.company_id)
      .eq('owner_id', user.id)
      .single();

    if (!company) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this order' },
        { status: 403 }
      );
    }

    // Validate status transition
    const currentStatus = order.status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from "${currentStatus}" to "${newStatus}"`,
          allowedTransitions,
        },
        { status: 400 }
      );
    }

    // Prepare update object
    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set timestamps based on status
    switch (newStatus) {
      case 'paid':
        updates.paid_at = new Date().toISOString();
        break;
      case 'in_progress':
        // Don't update if already set (revision case)
        if (!order.in_progress_at) {
          updates.in_progress_at = new Date().toISOString();
        }
        break;
      case 'delivered':
        updates.delivered_at = new Date().toISOString();
        break;
      case 'completed':
        updates.completed_at = new Date().toISOString();
        break;
      case 'cancelled':
        updates.cancelled_at = new Date().toISOString();
        break;
      case 'refunded':
        updates.refunded_at = new Date().toISOString();
        break;
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('product_orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // TODO: Create activity log entry
    // await createActivityLog({ ... });

    // Send email notification on key status transitions
    if (newStatus === 'in_progress' || newStatus === 'delivered' || newStatus === 'completed') {
      try {
        const { data: buyer } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', updatedOrder.buyer_id)
          .single();
        const { data: vendor } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (buyer?.email) {
          sendOrderConfirmationEmail({
            to: buyer.email,
            clientName: buyer.full_name || 'Customer',
            vendorName: vendor?.full_name || 'Vendor',
            serviceTitle: updatedOrder.title || `Order #${orderId.slice(0, 8)}`,
            orderAmount: updatedOrder.amount_cents || 0,
            orderId,
          }).catch(e => console.error('[email] order-status update failed:', e));
        }
      } catch (e) {
        console.error('[email] failed to fetch profiles for status email:', e);
      }
    }

    // ── Contract-to-Unlock: auto-unlock DM on in_progress ──
    // App-layer fallback. The DB trigger (trg_auto_unlock_conversation)
    // is the source of truth — this mirrors it and enables future
    // realtime broadcast. Non-blocking: wrapped in try/catch.
    if (newStatus === 'in_progress' && currentStatus !== 'in_progress') {
      try {
        // Look up the vendor (company owner)
        const { data: companyProfile } = await supabase
          .from('company_profiles')
          .select('owner_id')
          .eq('id', updatedOrder.company_id)
          .single();

        if (companyProfile?.owner_id) {
          // Find or create DM conversation
          const { data: convId } = await supabase.rpc('get_or_create_conversation', {
            user_one_id: updatedOrder.buyer_id,
            user_two_id: companyProfile.owner_id,
          });

          if (convId) {
            // Unlock (no-op if already unlocked — DB trigger handles it)
            await supabase
              .from('user_conversations')
              .update({ is_unlocked: true })
              .eq('id', convId);

            // Insert system message (idempotent — DB trigger also inserts,
            // but this ensures the message appears even if trigger is removed)
            await supabase
              .from('user_messages')
              .insert({
                conversation_id:  convId,
                sender_id:        updatedOrder.buyer_id,
                content:          '🤝 Contract started — you can now message freely',
                is_system_message: true,
                is_read:          true,
                created_at:       new Date().toISOString(),
              });

            console.log(`[contract-unlock] App-layer: unlocked conversation ${convId} for order ${orderId}`);
          }
        }
      } catch (e) {
        // Non-blocking — DB trigger is the source of truth
        console.error('[contract-unlock] App-layer fallback failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to "${newStatus}"`,
      order: updatedOrder,
      previousStatus: currentStatus,
    });
  } catch (error) {
    console.error('Unexpected error in status update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check valid transitions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const orderId = params.id;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the order
    const { data: order, error: fetchError } = await supabase
      .from('product_orders')
      .select('id, status, company_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const currentStatus = order.status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    return NextResponse.json({
      orderId,
      currentStatus,
      allowedTransitions,
      transitionMap: VALID_TRANSITIONS,
    });
  } catch (error) {
    console.error('Error fetching order status info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
