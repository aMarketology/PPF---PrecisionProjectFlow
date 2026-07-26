-- ════════════════════════════════════════════════════════════════════
-- MENTIONS_AND_NOTIFICATIONS.sql
-- Adds @mention support to channels and groups.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (all statements are idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. mentions table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_mentions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID        NOT NULL REFERENCES public.user_messages(id) ON DELETE CASCADE,
  conversation_id UUID        NOT NULL REFERENCES public.user_conversations(id) ON DELETE CASCADE,
  mentioned_user_id UUID     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_mm_user         ON public.message_mentions(mentioned_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mm_conversation ON public.message_mentions(conversation_id);

ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

-- Users can see their own mentions
DROP POLICY IF EXISTS "Users can see their own mentions" ON public.message_mentions;
CREATE POLICY "Users can see their own mentions"
  ON public.message_mentions FOR SELECT
  USING (mentioned_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert mentions they're involved in" ON public.message_mentions;
CREATE POLICY "Users can insert mentions"
  ON public.message_mentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_messages
      WHERE id = message_id AND sender_id = auth.uid()
    )
  );

-- ── 2. unread_mentions_count helper ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.unread_mentions_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.message_mentions mm
  JOIN public.user_messages m ON m.id = mm.message_id
  WHERE mm.mentioned_user_id = p_user_id
    AND (m.is_read = FALSE OR m.is_read IS NULL);
$$;

-- ── 3. Enable Realtime on message_mentions ──────────────────────────
ALTER TABLE public.message_mentions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_mentions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_mentions;
  END IF;
END;
$$;