import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNewMessageEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/messages/send
// Works for all conversation types: direct, group, channel.
// DMs: FREE if is_unlocked = true. LOCKED (402) otherwise.
// Groups/Channels: always FREE for members.
// Body: { conversationId, content, attachmentUrl?, attachmentName?, attachmentType? }
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

    // Fetch conversation with type info
    const { data: conv, error: convError } = await supabase
      .from('user_conversations')
      .select('id, participant_one_id, participant_two_id, is_unlocked, conversation_type')
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      console.error('[send] conversation lookup failed:', convError?.message);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify the caller is a participant
    let isParticipant = false;
    let otherUserId: string | null = null;

    if (conv.conversation_type === 'direct') {
      isParticipant = conv.participant_one_id === user.id || conv.participant_two_id === user.id;
      otherUserId = conv.participant_one_id === user.id ? conv.participant_two_id : conv.participant_one_id;
    } else {
      // Group/Channel — check conversation_participants
      const { data: membership } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();
      isParticipant = !!membership;
    }

    if (!isParticipant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Determine if the thread is free to message
    const isGroupOrChannel = conv.conversation_type === 'group' || conv.conversation_type === 'channel';
    let isFree = isGroupOrChannel; // groups & channels are always free

    if (!isFree) {
      // Direct message — check unlock status
      const isUnlocked = conv.is_unlocked ?? false;
      let areFriends = false;
      let isSameCompany = false;
      try {
        const { data } = await supabase.rpc('are_friends', { user_a: user.id, user_b: otherUserId });
        areFriends = data === true;
      } catch {}
      try {
        const { data } = await supabase.rpc('same_company', { user_a: user.id, user_b: otherUserId });
        isSameCompany = data === true;
      } catch {}
      isFree = isUnlocked || areFriends || isSameCompany;
    }

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

    // ── Parse @mentions from content ────────────────────────────────
    if (content?.trim()) {
      const mentionNames: string[] = [];
      const mentionRegex = /@([a-zA-Z]+(?:\s[a-zA-Z]+)?)/g;
      let m;
      while ((m = mentionRegex.exec(content)) !== null) {
        const name = m[1].trim();
        if (name && !mentionNames.includes(name)) mentionNames.push(name);
      }

      for (const name of mentionNames) {
        try {
          const { data: mu } = await supabase.from('profiles')
            .select('id').ilike('full_name', `%${name}%`).limit(1);
          if (!mu || !mu[0]) continue;

          let isMember = false;
          if (conv.conversation_type === 'direct') {
            isMember = mu[0].id === conv.participant_one_id || mu[0].id === conv.participant_two_id;
          } else {
            const { data: cp } = await supabase.from('conversation_participants')
              .select('id').eq('conversation_id', conversationId).eq('user_id', mu[0].id).maybeSingle();
            isMember = !!cp;
          }

          if (isMember) {
            await supabase.from('message_mentions').insert({
              message_id: message.id,
              conversation_id: conversationId,
              mentioned_user_id: mu[0].id,
            });
          }
        } catch (mentionErr) {
          console.error('[send] mention error for', name, mentionErr);
        }
      }
    }
    // ── End @mention parsing ────────────────────────────────────────

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[send] error:', error);
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    );
  }
}
