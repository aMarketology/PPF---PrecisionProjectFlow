-- ════════════════════════════════════════════════════════════════════
-- CHANNELS_AND_GROUPS.sql
-- Evolves the messaging system from 1-on-1 DMs to Slack-style
-- channels + groups + DMs.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (all statements are idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Add conversation_type to user_conversations ──────────────────
-- 'direct'  = 1-on-1 DM (existing behavior)
-- 'group'   = private multi-person conversation
-- 'channel' = company-wide or public topic-based room
ALTER TABLE public.user_conversations
  ADD COLUMN IF NOT EXISTS conversation_type TEXT NOT NULL DEFAULT 'direct';

-- ── 2. Add metadata columns for groups & channels ───────────────────
ALTER TABLE public.user_conversations
  ADD COLUMN IF NOT EXISTS name        TEXT,          -- channel/group name
  ADD COLUMN IF NOT EXISTS description TEXT,          -- channel topic/description
  ADD COLUMN IF NOT EXISTS is_public   BOOLEAN NOT NULL DEFAULT FALSE, -- visible to company
  ADD COLUMN IF NOT EXISTS company_id  UUID,          -- scoped to a company
  ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 3. conversation_participants junction table ─────────────────────
-- For groups & channels, participants are tracked here instead of
-- participant_one_id / participant_two_id.
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.user_conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member'
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_user   ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_conv   ON public.conversation_participants(conversation_id);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Participants can see members of conversations they belong to
DROP POLICY IF EXISTS "Members can view participants" ON public.conversation_participants;
CREATE POLICY "Members can view participants"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- ── 4. Update RLS on user_conversations for groups/channels ─────────
-- Drop old policies, recreate to support all conversation types
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.user_conversations;
CREATE POLICY "Participants can view their conversations"
  ON public.user_conversations FOR SELECT
  USING (
    -- Direct: either participant
    (conversation_type = 'direct' AND (auth.uid() = participant_one_id OR auth.uid() = participant_two_id))
    OR
    -- Group/Channel: member of conversation_participants
    (conversation_type IN ('group', 'channel') AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = user_conversations.id AND cp.user_id = auth.uid()
    ))
    OR
    -- Public channels: visible to anyone in the same company
    (conversation_type = 'channel' AND is_public = TRUE AND company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = user_conversations.company_id
    ))
  );

-- ── 5. Update RLS on user_messages for groups/channels ──────────────
DROP POLICY IF EXISTS "Participants can read messages" ON public.user_messages;
CREATE POLICY "Participants can read messages"
  ON public.user_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_conversations c
      WHERE c.id = conversation_id
        AND (
          -- Direct
          (c.conversation_type = 'direct' AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid()))
          OR
          -- Group/Channel
          (c.conversation_type IN ('group', 'channel') AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid()
          ))
        )
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
        AND (
          (c.conversation_type = 'direct' AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid()))
          OR
          (c.conversation_type IN ('group', 'channel') AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid()
          ))
        )
    )
  );

-- ── 6. create_channel RPC ───────────────────────────────────────────
-- Creates a new channel or group and adds the creator as owner.
CREATE OR REPLACE FUNCTION public.create_channel(
  p_name             TEXT,
  p_conversation_type TEXT,  -- 'channel' or 'group'
  p_description      TEXT DEFAULT NULL,
  p_is_public        BOOLEAN DEFAULT FALSE,
  p_company_id       UUID DEFAULT NULL,
  p_member_ids       UUID[] DEFAULT NULL  -- initial members (for groups)
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_conv_id UUID;
  v_member  UUID;
BEGIN
  -- Create the conversation
  INSERT INTO public.user_conversations
    (conversation_type, name, description, is_public, company_id, created_by)
  VALUES
    (p_conversation_type, p_name, p_description, p_is_public, p_company_id, auth.uid())
  RETURNING id INTO v_conv_id;

  -- Add creator as owner
  INSERT INTO public.conversation_participants
    (conversation_id, user_id, role)
  VALUES
    (v_conv_id, auth.uid(), 'owner');

  -- Add initial members (for groups)
  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member IN ARRAY p_member_ids LOOP
      -- Skip if already added (creator)
      IF v_member != auth.uid() THEN
        INSERT INTO public.conversation_participants
          (conversation_id, user_id, role)
        VALUES
          (v_conv_id, v_member, 'member')
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_conv_id;
END;
$$;

-- ── 7. join_channel RPC ─────────────────────────────────────────────
-- Adds a user to a public channel or group.
CREATE OR REPLACE FUNCTION public.join_channel(
  p_conversation_id UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_conv RECORD;
BEGIN
  SELECT * INTO v_conv FROM public.user_conversations WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_conv.conversation_type = 'direct' THEN
    RETURN 'not_channel';
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  ) THEN
    RETURN 'already_member';
  END IF;

  -- For private groups, only existing members can add others
  -- (handled by RLS on conversation_participants INSERT)
  -- For public channels, anyone in the company can join
  IF v_conv.conversation_type = 'channel' AND v_conv.is_public THEN
    INSERT INTO public.conversation_participants
      (conversation_id, user_id, role)
    VALUES
      (p_conversation_id, auth.uid(), 'member');
    RETURN 'joined';
  END IF;

  RETURN 'not_allowed';
END;
$$;

-- ── 8. Enable Realtime on conversation_participants ─────────────────
ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
END $$;

-- ── 9. Backfill: mark existing conversations as 'direct' ────────────
UPDATE public.user_conversations
  SET conversation_type = 'direct'
  WHERE conversation_type IS NULL OR conversation_type = '';