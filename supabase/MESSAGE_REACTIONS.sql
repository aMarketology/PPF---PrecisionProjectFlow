-- Per-user message reactions. Currently supports thumbs-up only.
CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id UUID NOT NULL REFERENCES public.user_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'thumbs_up' CHECK (reaction_type = 'thumbs_up'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON public.message_reactions (message_id, reaction_type);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversation members can read message reactions" ON public.message_reactions;
CREATE POLICY "Conversation members can read message reactions"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_messages m
      JOIN public.user_conversations c ON c.id = m.conversation_id
      WHERE m.id = message_id
        AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add their own message reactions" ON public.message_reactions;
CREATE POLICY "Users can add their own message reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove their own message reactions" ON public.message_reactions;
CREATE POLICY "Users can remove their own message reactions"
  ON public.message_reactions FOR DELETE
  USING (user_id = auth.uid());