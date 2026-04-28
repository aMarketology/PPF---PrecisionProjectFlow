-- ============================================================
-- MESSAGING_TABLES.sql
-- Run this ONCE in the Supabase SQL Editor to enable the
-- full messaging system (user_conversations + user_messages).
-- ============================================================

-- ── 1. user_conversations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_conversations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one_id UUID       NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_two_id UUID       NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_contracted     BOOLEAN     NOT NULL DEFAULT FALSE,
  last_message_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.user_conversations;
CREATE POLICY "Participants can view their conversations"
  ON public.user_conversations FOR SELECT
  USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

DROP POLICY IF EXISTS "Participants can update their conversations" ON public.user_conversations;
CREATE POLICY "Participants can update their conversations"
  ON public.user_conversations FOR UPDATE
  USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

-- Unique index on the sorted pair — prevents duplicate conversations
-- (expressions in UNIQUE constraints aren't valid SQL; use CREATE UNIQUE INDEX instead)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_conversation_pair
  ON public.user_conversations (
    LEAST(participant_one_id::text, participant_two_id::text),
    GREATEST(participant_one_id::text, participant_two_id::text)
  );

-- ── 2. user_messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID        NOT NULL REFERENCES public.user_conversations(id) ON DELETE CASCADE,
  sender_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content           TEXT        NOT NULL CHECK (char_length(content) > 0),
  is_read           BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  is_paid           BOOLEAN     NOT NULL DEFAULT FALSE,
  is_system_message BOOLEAN     NOT NULL DEFAULT FALSE,
  payment_id        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read messages" ON public.user_messages;
CREATE POLICY "Participants can read messages"
  ON public.user_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can insert messages" ON public.user_messages;
CREATE POLICY "Participants can insert messages"
  ON public.user_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.user_messages;
CREATE POLICY "Recipients can mark messages read"
  ON public.user_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid())
    )
  );

-- ── 3. get_or_create_conversation RPC ────────────────────────────────────────
-- Returns the UUID of the existing or newly created conversation.
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  user_one_id UUID,
  user_two_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv_id UUID;
  v_lo TEXT := LEAST(user_one_id::text, user_two_id::text);
  v_hi TEXT := GREATEST(user_one_id::text, user_two_id::text);
BEGIN
  -- Try to find existing conversation
  SELECT id INTO v_conv_id
  FROM public.user_conversations
  WHERE LEAST(participant_one_id::text, participant_two_id::text) = v_lo
    AND GREATEST(participant_one_id::text, participant_two_id::text) = v_hi
  LIMIT 1;

  -- Create it if it doesn't exist
  IF v_conv_id IS NULL THEN
    INSERT INTO public.user_conversations (participant_one_id, participant_two_id)
    VALUES (user_one_id, user_two_id)
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN v_conv_id;
END;
$$;

-- ── 4. are_friends stub ───────────────────────────────────────────────────────
-- Returns false by default (no friend system yet). Replace later.
CREATE OR REPLACE FUNCTION public.are_friends(
  user_a UUID,
  user_b UUID
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT FALSE;
$$;

-- ── 5. Performance indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_conversations_p1
  ON public.user_conversations(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_user_conversations_p2
  ON public.user_conversations(participant_two_id);
CREATE INDEX IF NOT EXISTS idx_user_conversations_last_msg
  ON public.user_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_messages_conv
  ON public.user_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_user_messages_sender
  ON public.user_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_unread
  ON public.user_messages(conversation_id, is_read)
  WHERE is_read = FALSE;

-- ── 6. Auto-update last_message_at on new messages ───────────────────────────
CREATE OR REPLACE FUNCTION public.update_conversation_last_message_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.user_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_last_message_at ON public.user_messages;
CREATE TRIGGER trg_update_last_message_at
  AFTER INSERT ON public.user_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message_at();
