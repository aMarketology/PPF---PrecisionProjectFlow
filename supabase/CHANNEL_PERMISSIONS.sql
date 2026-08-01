-- ════════════════════════════════════════════════════════════════════
-- CHANNEL_PERMISSIONS.sql
-- Role-based permissions for channels & projects (groups).
--
-- Roles: owner > admin > member
-- - Owner: full control (delete, manage all members, all settings)
-- - Admin: manage members (add/remove), channel settings (rename/description)
-- - Member: send/read messages only
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Role-check helper functions ─────────────────────────────────
-- These use SECURITY DEFINER to bypass RLS and avoid recursion.

-- Is the user the owner of this conversation?
CREATE OR REPLACE FUNCTION public.is_channel_owner(
  p_conversation_id UUID,
  p_user_id         UUID
) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id AND role = 'owner'
  );
$$;

-- Is the user an owner or admin of this conversation?
CREATE OR REPLACE FUNCTION public.is_channel_admin(
  p_conversation_id UUID,
  p_user_id         UUID
) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id AND role IN ('owner', 'admin')
  );
$$;

-- Get the user's role in a conversation (null if not a member)
CREATE OR REPLACE FUNCTION public.get_channel_role(
  p_conversation_id UUID,
  p_user_id         UUID
) RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
$$;

-- ── 2. Management RPCs ─────────────────────────────────────────────

-- Update a member's role (owner only)
CREATE OR REPLACE FUNCTION public.update_channel_member_role(
  p_conversation_id UUID,
  p_target_user_id  UUID,
  p_new_role        TEXT
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_channel_owner(p_conversation_id, auth.uid()) THEN
    RETURN 'not_owner';
  END IF;
  IF p_new_role NOT IN ('owner', 'admin', 'member') THEN
    RETURN 'invalid_role';
  END IF;
  UPDATE public.conversation_participants
  SET role = p_new_role
  WHERE conversation_id = p_conversation_id AND user_id = p_target_user_id;
  RETURN 'ok';
END;
$$;

-- Remove a member from a channel/project (owner or admin)
CREATE OR REPLACE FUNCTION public.remove_channel_member(
  p_conversation_id UUID,
  p_target_user_id  UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_channel_admin(p_conversation_id, auth.uid()) THEN
    RETURN 'not_admin';
  END IF;
  DELETE FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id AND user_id = p_target_user_id;
  RETURN 'ok';
END;
$$;

-- Update channel settings (admin or owner)
CREATE OR REPLACE FUNCTION public.update_channel(
  p_conversation_id UUID,
  p_name            TEXT DEFAULT NULL,
  p_description     TEXT DEFAULT NULL,
  p_is_public       BOOLEAN DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_channel_admin(p_conversation_id, auth.uid()) THEN
    RETURN 'not_admin';
  END IF;
  UPDATE public.user_conversations
  SET
    name        = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    is_public   = COALESCE(p_is_public, is_public)
  WHERE id = p_conversation_id;
  RETURN 'ok';
END;
$$;

-- Delete a channel/project entirely (owner only)
CREATE OR REPLACE FUNCTION public.delete_channel(
  p_conversation_id UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_channel_owner(p_conversation_id, auth.uid()) THEN
    RETURN 'not_owner';
  END IF;
  DELETE FROM public.user_conversations WHERE id = p_conversation_id;
  RETURN 'ok';
END;
$$;

-- Add a member to a channel/project (admin or owner)
CREATE OR REPLACE FUNCTION public.add_channel_member(
  p_conversation_id UUID,
  p_target_user_id  UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_channel_admin(p_conversation_id, auth.uid()) THEN
    RETURN 'not_admin';
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (p_conversation_id, p_target_user_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  RETURN 'ok';
END;
$$;

-- ── 3. RLS policies for UPDATE/DELETE on user_conversations ────────
-- Admins/owners can update channel/group settings
DROP POLICY IF EXISTS "Admins can update channels" ON public.user_conversations;
CREATE POLICY "Admins can update channels"
  ON public.user_conversations FOR UPDATE
  USING (
    conversation_type IN ('group', 'channel') AND public.is_channel_admin(id, auth.uid())
  );

-- Owners can delete channels/groups
DROP POLICY IF EXISTS "Owners can delete channels" ON public.user_conversations;
CREATE POLICY "Owners can delete channels"
  ON public.user_conversations FOR DELETE
  USING (
    conversation_type IN ('group', 'channel') AND public.is_channel_owner(id, auth.uid())
  );

-- ── 4. RLS policies for UPDATE/DELETE on conversation_participants ─
-- Admins can manage participants (add/remove roles)
DROP POLICY IF EXISTS "Admins can update participants" ON public.conversation_participants;
CREATE POLICY "Admins can update participants"
  ON public.conversation_participants FOR UPDATE
  USING (
    public.is_channel_admin(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete participants" ON public.conversation_participants;
CREATE POLICY "Admins can delete participants"
  ON public.conversation_participants FOR DELETE
  USING (
    public.is_channel_admin(conversation_id, auth.uid())
  );

-- Anyone can insert themselves (for joining public channels)
DROP POLICY IF EXISTS "Anyone can join public channels" ON public.conversation_participants;
CREATE POLICY "Anyone can join public channels"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid() -- self-join
    AND EXISTS (
      SELECT 1 FROM public.user_conversations c
      WHERE c.id = conversation_id
        AND c.conversation_type = 'channel'
        AND c.is_public = TRUE
    )
  );

-- ── 5. Fix the General channel owner role ──────────────────────────
-- The ensure_company_channel RPC adds everyone as 'member'.
-- Fix: set the company owner as 'owner' in the General channel.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT cp.id AS company_id, cp.owner_id
    FROM public.company_profiles cp
    WHERE cp.owner_id IS NOT NULL
  LOOP
    UPDATE public.conversation_participants cp_set
    SET role = 'owner'
    FROM public.user_conversations uc
    WHERE uc.id = cp_set.conversation_id
      AND uc.company_id = rec.company_id
      AND uc.conversation_type = 'channel'
      AND uc.name = 'General'
      AND cp_set.user_id = rec.owner_id;
  END LOOP;
END;
$$;