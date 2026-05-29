import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNewMessageEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/messages/send
// Token rules:
//   FREE  — first message in the conversation (cold opener)
//   FREE  — conversation is_contracted = true (under contract)
//   FREE  — the two users are friends (accepted friend connection)
//   COSTS 2 tokens — all other messages (cold outreach follow-ups)
// Body: { conversationId: string, content: string }
export async function POST(request: NextRequest) {
  try {
    const { conversationId, content } = await request.json();

    if (!conversationId || !content?.trim()) {
      return NextResponse.json(
        { error: 'conversationId and content are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a participant in this conversation
    const { data: conv, error: convError } = await supabase
      .from('user_conversations')
      .select('id, participant_one_id, participant_two_id, is_contracted')
      .eq('id', conversationId)
      .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Determine the other user
    const otherUserId = conv.participant_one_id === user.id
      ? conv.participant_two_id
      : conv.participant_one_id;

    // Count prior messages from this user in this conversation
    const { count: priorCount } = await supabase
      .from('user_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender_id', user.id);

    const isFirstMessage = (priorCount ?? 0) === 0;
    const isContracted   = conv.is_contracted ?? false;

    // Check if users are friends (accepted)
    const { data: friendCheck } = await supabase
      .rpc('are_friends', { user_a: user.id, user_b: otherUserId });
    const areFriends = friendCheck === true;

    const isFree = isFirstMessage || isContracted || areFriends;

    const MESSAGE_COST = 2;
    let tokensSpent = 0;

    if (!isFree) {
      const { data: spendResult, error: spendError } = await supabase
        .rpc('spend_tokens', {
          p_user_id:      user.id,
          p_amount:       MESSAGE_COST,
          p_description:  'Cold outreach message',
          p_reference_id: conversationId,
        });

      if (spendError) throw spendError;

      if (spendResult === 'insufficient_tokens') {
        return NextResponse.json(
          { error: 'insufficient_tokens', cost: MESSAGE_COST },
          { status: 402 }
        );
      }

      tokensSpent = MESSAGE_COST;
    }

    // Insert the message
    const { data: message, error: msgError } = await supabase
      .from('user_messages')
      .insert({
        conversation_id: conversationId,
        sender_id:       user.id,
        content:         content.trim(),
        tokens_spent:    tokensSpent,
      })
      .select()
      .single();

    // If the message failed to save AFTER we charged tokens, refund them
    // so the user is never charged for a message that didn't send.
    if (msgError) {
      if (tokensSpent > 0) {
        try {
          await supabase.rpc('refund_tokens', {
            p_user_id:      user.id,
            p_amount:       tokensSpent,
            p_description:  'Refund — message failed to send',
            p_reference_id: conversationId,
          });
        } catch (e: any) {
          console.error('[tokens] refund failed:', e);
        }
      }
      throw msgError;
    }

    // Update last_message_at on the conversation
    await supabase
      .from('user_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Fire-and-forget: notify the recipient by email
    // Fetch sender + recipient profiles in one query
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', [user.id, otherUserId]);

    if (profiles && profiles.length === 2) {
      const sender    = profiles.find((p: any) => p.id === user.id);
      const recipient = profiles.find((p: any) => p.id === otherUserId);
      if (sender && recipient) {
        sendNewMessageEmail({
          to:            recipient.email,
          recipientName: recipient.full_name,
          senderName:    sender.full_name,
          preview:       content.trim(),
          conversationId,
        }).catch(err => console.error('[email] new-message failed:', err));
      }
    }

    return NextResponse.json({
      message,
      free: isFree,
      tokensSpent,
      reason: isFirstMessage ? 'first_message' : isContracted ? 'contracted' : areFriends ? 'friends' : 'paid',
    });

  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
