-- ════════════════════════════════════════════════════════════════════
-- FIX_ADD_MEMBER_POLICY.sql
-- Fixes: admins/owners can't add members to channels because there's
-- no INSERT policy on conversation_participants for them.
--
-- Run in: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- Drop the old "Anyone can join public channels" policy (too restrictive)
DROP POLICY IF EXISTS "Anyone can join public channels" ON public.conversation_participants;

-- Admins/owners can add any member to channels/groups
CREATE POLICY "Admins can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    public.is_channel_admin(conversation_id, auth.uid())
  );

-- Users can self-join public channels
CREATE POLICY "Users can self-join public channels"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_conversations c
      WHERE c.id = conversation_id
        AND c.conversation_type = 'channel'
        AND c.is_public = TRUE
    )
  );