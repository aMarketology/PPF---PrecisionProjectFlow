-- ════════════════════════════════════════════════════════════════════
-- FIX_RLS_CONVERSATION_PARTICIPANTS.sql
-- Fixes infinite recursion in conversation_participants RLS policy.
--
-- Problem: The SELECT policy queried conversation_participants itself
-- to check membership, causing infinite recursion for any query that
-- touched channels/groups.
--
-- Fix: Use a SECURITY DEFINER helper function to break the recursion.
-- Users see their own rows directly, and see other members of
-- conversations they belong to via the helper.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Create a SECURITY DEFINER helper to check membership ────────
-- This runs as the function owner (bypasses RLS), breaking recursion.
CREATE OR REPLACE FUNCTION public.is_conversation_member(
  p_conversation_id UUID,
  p_user_id         UUID
) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
$$;

-- ── 2. Fix conversation_participants SELECT policy ─────────────────
DROP POLICY IF EXISTS "Members can view participants" ON public.conversation_participants;

CREATE POLICY "Members can view participants"
  ON public.conversation_participants FOR SELECT
  USING (
    -- You can always see your own row
    user_id = auth.uid()
    OR
    -- You can see other members of conversations you belong to
    public.is_conversation_member(conversation_id, auth.uid())
  );

-- ── 3. Fix user_conversations SELECT policy ────────────────────────
-- Use the helper instead of querying conversation_participants directly
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.user_conversations;

CREATE POLICY "Participants can view their conversations"
  ON public.user_conversations FOR SELECT
  USING (
    -- Direct: either participant
    (conversation_type = 'direct' AND (auth.uid() = participant_one_id OR auth.uid() = participant_two_id))
    OR
    -- Group/Channel: member of conversation_participants (via SECURITY DEFINER helper)
    (conversation_type IN ('group', 'channel') AND public.is_conversation_member(id, auth.uid()))
    OR
    -- Public channels: visible to anyone in the same company
    (conversation_type = 'channel' AND is_public = TRUE AND company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = user_conversations.company_id
    ))
  );

-- ── 4. Fix user_messages SELECT/INSERT policies ───────────────────
DROP POLICY IF EXISTS "Participants can read messages" ON public.user_messages;
CREATE POLICY "Participants can read messages"
  ON public.user_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_conversations c
      WHERE c.id = conversation_id
        AND (
          (c.conversation_type = 'direct' AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid()))
          OR
          (c.conversation_type IN ('group', 'channel') AND public.is_conversation_member(c.id, auth.uid()))
          OR
          (c.conversation_type = 'channel' AND c.is_public = TRUE AND c.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = c.company_id
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
          (c.conversation_type IN ('group', 'channel') AND public.is_conversation_member(c.id, auth.uid()))
          OR
          (c.conversation_type = 'channel' AND c.is_public = TRUE AND c.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = c.company_id
          ))
        )
    )
  );

-- ── 5. Fix user_messages UPDATE policy (for mark-as-read) ──────────
DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.user_messages;
CREATE POLICY "Recipients can mark messages read"
  ON public.user_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_conversations c
      WHERE c.id = conversation_id
        AND (
          (c.conversation_type = 'direct' AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid()))
          OR
          (c.conversation_type IN ('group', 'channel') AND public.is_conversation_member(c.id, auth.uid()))
          OR
          (c.conversation_type = 'channel' AND c.is_public = TRUE AND c.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = c.company_id
          ))
        )
    )
  );