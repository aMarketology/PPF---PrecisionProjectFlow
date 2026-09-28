-- ════════════════════════════════════════════════════════════════════
-- ADMIN_CHAT_MODERATION.sql
-- Super admin messaging is free & open by default, until a chat is
-- explicitly closed by a super admin.
--
-- Adds `is_closed` / `closed_at` to user_conversations plus a tiny
-- SECURITY DEFINER helper to tell whether a user is a super admin.
-- The app's send route treats any DM involving a super admin as FREE
-- UNLESS `is_closed` is true.
--
-- Run in: Supabase Dashboard → SQL Editor (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Conversation close state ─────────────────────────────────────
ALTER TABLE public.user_conversations
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_conversations
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- ── 1b. Support-ticket state ─────────────────────────────────────────
-- A direct conversation opened by a super admin toward a listing owner
-- or RFQ poster is treated as a support ticket. It is FREE and OPEN by
-- default, and the admin can END the chat (closing the ticket).
ALTER TABLE public.user_conversations
  ADD COLUMN IF NOT EXISTS is_support_ticket BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_conversations
  ADD COLUMN IF NOT EXISTS ticket_opened_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_conversations_closed
  ON public.user_conversations (is_closed)
  WHERE is_closed = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_conversations_ticket
  ON public.user_conversations (is_support_ticket)
  WHERE is_support_ticket = TRUE;

-- ── 2. Is a user a super admin? (already defined in ADMIN_SETUP.sql) ─
-- `public.is_admin(user_id UUID DEFAULT auth.uid())` returns BOOLEAN.
-- Nothing to add here; re-assert for safety in case it was dropped.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = user_id), FALSE);
$$;

-- ── 3. Is a conversation admin-moderated? ────────────────────────────
-- Returns TRUE if either participant is a super admin. Used by the app
-- to keep admin threads free & open by default.
CREATE OR REPLACE FUNCTION public.conversation_involves_admin(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_conversations c
    JOIN public.profiles p
      ON p.id IN (c.participant_one_id, c.participant_two_id)
    WHERE c.id = p_conversation_id
      AND p.is_admin = TRUE
  );
$$;

-- ── 4. Realtime (optional, mirrors existing tables) ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_conversations;
  END IF;
END $$;

-- ── 5. Mark a conversation as a support ticket ───────────────────────
-- Called by the app when a super admin opens a DM toward a listing
-- owner / RFQ poster. Idempotent.
CREATE OR REPLACE FUNCTION public.mark_support_ticket(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_conversations
     SET is_support_ticket = TRUE,
         ticket_opened_at = COALESCE(ticket_opened_at, NOW()),
         is_closed = FALSE,
         closed_at = NULL,
         is_unlocked = TRUE
   WHERE id = p_conversation_id;
  RETURN TRUE;
END;
$$;

-- ── 6. Admin ends a support ticket ───────────────────────────────────
-- Closes the thread and posts system messages to both parties. Only a
-- super admin may end it, and only if they are a participant.
CREATE OR REPLACE FUNCTION public.end_support_ticket(
  p_conversation_id UUID,
  p_admin_id       UUID
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_conv RECORD;
BEGIN
  SELECT * INTO v_conv FROM public.user_conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RETURN 'error:not_found'; END IF;

  IF v_conv.conversation_type != 'direct' THEN
    RETURN 'error:not_direct';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND is_admin = TRUE
  ) THEN
    RETURN 'error:not_admin';
  END IF;

  IF v_conv.participant_one_id != p_admin_id AND v_conv.participant_two_id != p_admin_id THEN
    RETURN 'error:not_participant';
  END IF;

  -- Close the thread.
  UPDATE public.user_conversations
     SET is_closed = TRUE,
         closed_at = NOW(),
         is_support_ticket = TRUE,
         ticket_opened_at = COALESCE(ticket_opened_at, NOW())
   WHERE id = p_conversation_id;

  -- System messages to both parties.
  INSERT INTO public.user_messages (conversation_id, sender_id, content, is_system_message, is_read, created_at)
  VALUES (p_conversation_id, p_admin_id, 'This support chat has been closed by PPF support. Thank you for using Precision Project Flow.', TRUE, TRUE, NOW());

  RETURN 'closed';
END;
$$;