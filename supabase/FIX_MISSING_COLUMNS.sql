-- ════════════════════════════════════════════════════════════════════
-- FIX_MISSING_COLUMNS.sql
-- Fixes: "column is_system_message of relation user_messages does not exist"
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (all statements are idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Add missing columns to user_messages ─────────────────────────
ALTER TABLE public.user_messages
  ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_messages
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_messages
  ADD COLUMN IF NOT EXISTS payment_id TEXT;

ALTER TABLE public.user_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE public.user_messages
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- ── 2. Add is_unlocked to user_conversations (used by unlock flow) ───
ALTER TABLE public.user_conversations
  ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: contracted convos count as unlocked
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_conversations' AND column_name = 'is_contracted'
  ) THEN
    UPDATE public.user_conversations
      SET is_unlocked = TRUE
      WHERE is_contracted = TRUE AND is_unlocked = FALSE;
  END IF;
END $$;

-- ── 3. Recreate unlock_conversation() with the fixed INSERT ──────────
CREATE OR REPLACE FUNCTION public.unlock_conversation(
  p_conversation_id UUID,
  p_user_id         UUID
) RETURNS TEXT AS $$
DECLARE
  v_conv        RECORD;
  v_spend_result TEXT;
  UNLOCK_COST   CONSTANT INT := 100;
BEGIN
  -- Verify caller is a participant
  SELECT * INTO v_conv
    FROM public.user_conversations
    WHERE id = p_conversation_id
      AND (participant_one_id = p_user_id OR participant_two_id = p_user_id);

  IF NOT FOUND THEN
    RETURN 'not_participant';
  END IF;

  -- Already unlocked — no charge needed
  IF v_conv.is_unlocked THEN
    RETURN NULL;
  END IF;

  -- Charge the unlock fee
  v_spend_result := public.spend_tokens(
    p_user_id,
    UNLOCK_COST,
    'Unlock conversation thread',
    p_conversation_id
  );

  IF v_spend_result = 'insufficient_tokens' THEN
    RETURN 'insufficient_tokens';
  END IF;

  -- Mark the thread as unlocked
  UPDATE public.user_conversations
    SET is_unlocked = TRUE
    WHERE id = p_conversation_id;

  -- Drop a system message so both parties see the unlock event
  INSERT INTO public.user_messages
    (conversation_id, sender_id, content, is_system_message)
  VALUES
    (p_conversation_id, p_user_id,
     '🔓 Conversation unlocked — you can now message each other for free.',
     TRUE);

  RETURN NULL; -- success
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
