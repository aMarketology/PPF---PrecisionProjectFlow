import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

const RFQ_UNLOCK_COST = 50;

// POST /api/rfq/offer/unlock
// Unlocks the full RFQ application for its client. This is deliberately
// independent from whether the direct-message conversation is unlocked.
export async function POST(request: NextRequest) {
  try {
    const { messageId } = await request.json();
    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: offer, error: offerError } = await supabase
      .from('rfq_offers')
      .select('id, client_id, message_id')
      .eq('message_id', messageId)
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: 'RFQ offer not found' }, { status: 404 });
    }
    if (offer.client_id !== user.id) {
      return NextResponse.json({ error: 'Only the RFQ owner can unlock this application' }, { status: 403 });
    }

    const { data: message, error: messageError } = await supabase
      .from('user_messages')
      .select('id, is_paid')
      .eq('id', messageId)
      .single();
    if (messageError || !message) {
      return NextResponse.json({ error: 'RFQ offer message not found' }, { status: 404 });
    }

    if (!message.is_paid) {
      const { data: spendResult, error: spendError } = await supabase.rpc('spend_tokens', {
        p_user_id: user.id,
        p_amount: RFQ_UNLOCK_COST,
        p_description: 'Unlock RFQ application',
        p_reference_id: offer.id,
      });
      if (spendError) throw spendError;
      if (spendResult === 'insufficient_tokens') {
        return NextResponse.json({ error: 'Insufficient tokens to unlock this application', unlockCost: RFQ_UNLOCK_COST }, { status: 402 });
      }

      const { error: updateError } = await supabase
        .from('user_messages')
        .update({ is_paid: true })
        .eq('id', messageId);
      if (updateError) throw updateError;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      tokenBalance: profile?.token_balance ?? 0,
      tokensSpent: message.is_paid ? 0 : RFQ_UNLOCK_COST,
    });
  } catch (error: any) {
    console.error('[rfq/offer/unlock]', error);
    return NextResponse.json({ error: error.message || 'Failed to unlock RFQ application' }, { status: 500 });
  }
}
