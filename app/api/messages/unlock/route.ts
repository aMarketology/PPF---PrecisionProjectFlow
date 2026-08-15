import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UNLOCK_COST = 50;

// POST /api/messages/unlock
// Charges 100 tokens to open a cold conversation thread.
// Does NOT call the unlock_conversation RPC (it requires columns that
// may not exist yet in the live DB). Handles everything inline using
// only the guaranteed-to-exist is_contracted column.
// Body: { conversationId: string }
export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify the caller is a participant in this conversation
    const { data: conv, error: convErr } = await supabase
      .from('user_conversations')
      .select('id, is_unlocked')
      .eq('id', conversationId)
      .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // 2. Already unlocked — return success without charging again
    if (conv.is_unlocked) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('token_balance')
        .eq('id', user.id)
        .single();
      return NextResponse.json({
        success:      true,
        tokensSpent:  0,
        tokenBalance: profile?.token_balance ?? 0,
      });
    }

    // 3. Deduct tokens via the spend_tokens RPC
    const { data: spendResult, error: spendErr } = await supabase.rpc('spend_tokens', {
      p_user_id:      user.id,
      p_amount:       UNLOCK_COST,
      p_description:  'Unlock conversation thread',
      p_reference_id: conversationId,
    });

    if (spendErr) throw spendErr;

    if (spendResult === 'insufficient_tokens') {
      return NextResponse.json(
        { error: 'insufficient_tokens', unlockCost: UNLOCK_COST },
        { status: 402 }
      );
    }

    // 4. Mark the conversation as unlocked
    await supabase
      .from('user_conversations')
      .update({ is_unlocked: true })
      .eq('id', conversationId);

    // 5. Return updated token balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success:      true,
      tokensSpent:  UNLOCK_COST,
      tokenBalance: profile?.token_balance ?? 0,
    });

  } catch (error: any) {
    console.error('Unlock conversation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unlock conversation' },
      { status: 500 }
    );
  }
}
