import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/messages/unlock
// Charges 100 tokens to open a cold conversation thread.
// After this, both participants can message each other for free.
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

    // Call the DB-level unlock function (handles token deduction + is_unlocked flag atomically)
    const { data: result, error } = await supabase.rpc('unlock_conversation', {
      p_conversation_id: conversationId,
      p_user_id:         user.id,
    });

    if (error) throw error;

    if (result === 'not_participant') {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (result === 'insufficient_tokens') {
      return NextResponse.json(
        { error: 'insufficient_tokens', unlockCost: 100 },
        { status: 402 }
      );
    }

    // Fetch updated token balance to return to the client
    const { data: profile } = await supabase
      .from('profiles')
      .select('token_balance')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success:      true,
      tokensSpent:  100,
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
