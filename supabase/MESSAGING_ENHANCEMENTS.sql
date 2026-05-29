-- ════════════════════════════════════════════════════════════════════
-- MESSAGING_ENHANCEMENTS.sql
-- Run in: Supabase Dashboard → SQL Editor
-- Adds:
--   1. is_unlocked flag on user_conversations
--   2. Attachment columns on user_messages  
--   3. company_id on profiles (same-company free messaging)
--   4. unlock_conversation() RPC
--   5. same_company() helper
--   6. Realtime enabled on messaging tables
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. is_unlocked on user_conversations ────────────────────────────
-- Once a cold conversation is unlocked (100 tokens), both parties
-- can message each other for free forever.
ALTER TABLE public.user_conversations
  ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: contracted convos are already effectively unlocked (only if column exists)
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

-- ── 2. Attachment columns on user_messages ───────────────────────────
ALTER TABLE public.user_messages
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT; -- 'image' | 'pdf' | 'file'

-- Allow empty content when an attachment is present
ALTER TABLE public.user_messages
  DROP CONSTRAINT IF EXISTS user_messages_content_check;
ALTER TABLE public.user_messages
  ADD CONSTRAINT user_messages_content_check
    CHECK (char_length(content) > 0 OR attachment_url IS NOT NULL);

-- ── 3. company_id on profiles (same-company free messaging) ──────────
-- Two users with the same non-null company_id can message each other free.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id UUID;

-- ── 4. unlock_conversation() RPC ─────────────────────────────────────
-- Charges UNLOCK_COST tokens to open a cold conversation thread.
-- After this, both participants can message for free.
-- Returns: NULL on success | 'not_participant' | 'insufficient_tokens'
CREATE OR REPLACE FUNCTION public.unlock_conversation(
  p_conversation_id UUID,
  p_user_id         UUID
) RETURNS TEXT AS $$
DECLARE
  v_conv       RECORD;
  v_spend_result TEXT;
  UNLOCK_COST  CONSTANT INT := 100;
BEGIN
  -- Verify caller is a participant
  SELECT * INTO v_conv
    FROM public.user_conversations
    WHERE id = p_conversation_id
      AND (participant_one_id = p_user_id OR participant_two_id = p_user_id);

  IF NOT FOUND THEN
    RETURN 'not_participant';
  END IF;

  -- Already free — no charge needed
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

  -- Drop a system message into the thread so both parties see it
  INSERT INTO public.user_messages
    (conversation_id, sender_id, content, is_system_message)
  VALUES
    (p_conversation_id, p_user_id,
     '🔓 Conversation unlocked — you can now message each other for free.',
     TRUE);

  RETURN NULL; -- success
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. same_company() helper ──────────────────────────────────────────
-- Returns TRUE if both users share a non-null company_id.
CREATE OR REPLACE FUNCTION public.same_company(
  user_a UUID,
  user_b UUID
) RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    (SELECT company_id FROM public.profiles WHERE id = user_a) IS NOT NULL
    AND
    (SELECT company_id FROM public.profiles WHERE id = user_a)
    = (SELECT company_id FROM public.profiles WHERE id = user_b);
$$;

-- ── 6. Enable Realtime on messaging tables ────────────────────────────
-- Allows Supabase Realtime postgres_changes to fire on these tables.
ALTER TABLE public.user_messages       REPLICA IDENTITY FULL;
ALTER TABLE public.user_conversations  REPLICA IDENTITY FULL;

-- Add tables to the realtime publication (safe if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'user_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'user_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_conversations;
  END IF;
END $$;

-- ── 7. Storage bucket for message attachments ────────────────────────
-- Run this block ONCE. If the bucket already exists it will be skipped.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  FALSE,                -- private (only accessible via signed URLs)
  26214400,             -- 25 MB max per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    -- CAD / engineering formats
    'application/octet-stream',
    'application/dxf',
    'application/dwg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder + read files in their conversations
DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Conversation participants can read attachments" ON storage.objects;
CREATE POLICY "Conversation participants can read attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
  );

-- ════════════════════════════════════════════════════════════════════
-- Done.
-- After running this SQL:
--   1. Realtime will stream new messages live to connected clients.
--   2. Conversations require 100 tokens to unlock (cold outreach).
--   3. Contracted / same-company / friends = always free.
--   4. Users can send images, PDFs, and CAD files in messages.
-- ════════════════════════════════════════════════════════════════════
