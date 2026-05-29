import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNewMessageEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/messages/send
// Token model (v2 — unlock-based):
//   FREE   — conversation is_unlocked = true (already paid the one-time fee)
//   FREE   — conversation is_contracted = true (under contract)
//   FREE   — users are friends (are_friends RPC)
//   FREE   — users share the same company_id (same_company RPC)
//   LOCKED — otherwise. Client must call /api/messages/unlock first (100 tokens).
// Body: { conversationId: string, content: string, attachmentUrl?: string, attachmentName?: string, attachmentType?: string }
export async function POST(request: NextRequest) {
  try {
    const { conversationId, content, attachmentUrl, attachmentName, attachmentType } = await request.json();

    if (!conversationId || (!content?.trim() && !attachmentUrl)) {
      return NextResponse.json(
        { error: 'conversationId and content (or attachment) are required' },
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
      .select('id, participant_one_id, participant_two_id, is_contracted, is_unlocked')
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

    const isUnlocked   = conv.is_unlocked   ?? false;
    const isContracted = conv.is_contracted ?? false;

    // Check friends / same company in parallel
    const [{ data: friendCheck }, { data: companyCheck }] = await Promise.all([
      supabase.rpc('are_friends',   { user_a: user.id, user_b: otherUserId }),
      supabase.rpc('same_company',  { user_a: user.id, user_b: otherUserId }),
    ]);
    const areFriends    = friendCheck  === true;
    const isSameCompany = companyCheck === true;

    const isFree = isUnlocked || isContracted || areFriends || isSameCompany;

    // If thread is locked, tell the client — they must unlock first
    if (!isFree) {
      return NextResponse.json(
        { error: 'conversation_locked', unlockCost: 100 },
        { status: 402 }
      );
    }

    // Insert the message
    const { data: message, error: msgError } = await supabase
      .from('user_messages')
      .insert({
        conversation_id:  conversationId,
        sender_id:        user.id,
        content:          content?.trim() ?? '',
        ...(attachmentUrl  && { attachment_url:  attachmentUrl  }),
        ...(attachmentName && { attachment_name: attachmentName }),
        ...(attachmentType && { attachment_type: attachmentType }),
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update last_message_at on the conversation
    await supabase
      .from('user_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Fire-and-forget: notify the recipient by email
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
          preview:       content?.trim() ?? '[attachment]',
          conversationId,
        }).catch(err => console.error('[email] new-message failed:', err));
      }
    }

    return NextResponse.json({
      message,
      free: true,
      reason: isContracted ? 'contracted' : areFriends ? 'friends' : isSameCompany ? 'same_company' : 'unlocked',
    });

  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
