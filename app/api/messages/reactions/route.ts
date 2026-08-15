import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser() {
  const supabaseAuth = await createClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function canAccessConversation(conversationId: string, userId: string) {
  const supabase = createServiceClient();
  const { data: conversation } = await supabase
    .from('user_conversations')
    .select('id, participant_one_id, participant_two_id, conversation_type')
    .eq('id', conversationId)
    .single();
  if (!conversation) return false;
  if (conversation.conversation_type === 'direct') {
    return conversation.participant_one_id === userId || conversation.participant_two_id === userId;
  }
  const { data: membership } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!membership;
}

// GET /api/messages/reactions?conversationId=...
export async function GET(request: NextRequest) {
  try {
    const conversationId = new URL(request.url).searchParams.get('conversationId');
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!conversationId || !(await canAccessConversation(conversationId, user.id))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('message_reactions')
      .select('message_id, user_id, reaction_type')
      .in('message_id', (await supabase.from('user_messages').select('id').eq('conversation_id', conversationId)).data?.map(message => message.id) || []);
    if (error) throw error;
    return NextResponse.json({ reactions: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load reactions' }, { status: 500 });
  }
}

// POST /api/messages/reactions
// Body: { messageId, conversationId } — toggles the caller's thumbs-up.
export async function POST(request: NextRequest) {
  try {
    const { messageId, conversationId } = await request.json();
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!messageId || !conversationId || !(await canAccessConversation(conversationId, user.id))) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const supabase = createServiceClient();
    const { data: message } = await supabase
      .from('user_messages')
      .select('id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const { data: existing } = await supabase
      .from('message_reactions')
      .select('message_id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('reaction_type', 'thumbs_up')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction_type', 'thumbs_up');
      if (error) throw error;
    } else {
      const { error } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        reaction_type: 'thumbs_up',
      });
      if (error) throw error;
    }

    const { data: reactions, error: reactionsError } = await supabase
      .from('message_reactions')
      .select('user_id')
      .eq('message_id', messageId)
      .eq('reaction_type', 'thumbs_up');
    if (reactionsError) throw reactionsError;
    return NextResponse.json({
      active: !existing,
      count: reactions?.length ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update reaction' }, { status: 500 });
  }
}
