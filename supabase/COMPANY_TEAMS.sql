-- ════════════════════════════════════════════════════════════════════
-- COMPANY_TEAMS.sql
-- Team membership, company-scoped channels, and invite system.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (all statements are idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 0. Fix: make participant columns nullable ───────────────────────
-- Channels and groups use conversation_participants instead of
-- participant_one_id / participant_two_id, so those must be nullable.
ALTER TABLE public.user_conversations
  ALTER COLUMN participant_one_id DROP NOT NULL;

ALTER TABLE public.user_conversations
  ALTER COLUMN participant_two_id DROP NOT NULL;

-- ── 1. company_members table ────────────────────────────────────────
-- Tracks who belongs to which company and their role.
CREATE TABLE IF NOT EXISTS public.company_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member'
  status      TEXT        NOT NULL DEFAULT 'active', -- 'active' | 'invited' | 'removed'
  invited_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cm_company ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_cm_user    ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cm_status  ON public.company_members(status);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Members can view their own company's roster
DROP POLICY IF EXISTS "Members can view company roster" ON public.company_members;
CREATE POLICY "Members can view company roster"
  ON public.company_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_members.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

-- Owners/admins can insert (invite) members
DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.company_members;
CREATE POLICY "Owners and admins can invite members"
  ON public.company_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_members.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
  );

-- Owners/admins can update members (change role, remove)
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.company_members;
CREATE POLICY "Owners and admins can update members"
  ON public.company_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_members.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
  );

-- Users can leave a company (delete their own membership)
DROP POLICY IF EXISTS "Users can leave company" ON public.company_members;
CREATE POLICY "Users can leave company"
  ON public.company_members FOR DELETE
  USING (user_id = auth.uid());

-- ── 2. Sync profiles.company_id trigger ─────────────────────────────
-- When a user becomes an active company_member, auto-set their
-- profiles.company_id. When they leave, clear it.
CREATE OR REPLACE FUNCTION public.sync_profile_company_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
    UPDATE public.profiles SET company_id = NEW.company_id, updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSIF (TG_OP = 'UPDATE' AND NEW.status != 'active' AND OLD.status = 'active') OR
        (TG_OP = 'DELETE' AND OLD.status = 'active') THEN
    UPDATE public.profiles SET company_id = NULL, updated_at = NOW()
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_company_id ON public.company_members;
CREATE TRIGGER trg_sync_profile_company_id
  AFTER INSERT OR UPDATE OR DELETE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_company_id();

-- ── 3. ensure_company_channel RPC ───────────────────────────────────
-- Creates (if not exists) the default "General" channel for a company
-- and adds the given user as a participant. Returns the channel UUID.
CREATE OR REPLACE FUNCTION public.ensure_company_channel(
  p_company_id UUID,
  p_user_id    UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  -- Check if company channel already exists
  SELECT id INTO v_conv_id
  FROM public.user_conversations
  WHERE company_id = p_company_id
    AND conversation_type = 'channel'
    AND name = 'General'
  LIMIT 1;

  -- Create if not exists
  IF v_conv_id IS NULL THEN
    INSERT INTO public.user_conversations
      (conversation_type, name, description, is_public, company_id, created_by, last_message_at)
    VALUES
      ('channel', 'General', 'Company-wide announcements and discussion', TRUE, p_company_id, p_user_id, NOW())
    RETURNING id INTO v_conv_id;
  END IF;

  -- Ensure the user is a participant (idempotent)
  INSERT INTO public.conversation_participants
    (conversation_id, user_id, role)
  VALUES
    (v_conv_id, p_user_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN v_conv_id;
END;
$$;

-- ── 4. invite_company_member RPC ────────────────────────────────────
-- Invites a user to a company by user_id. On success, auto-joins them
-- to the company's General channel.
CREATE OR REPLACE FUNCTION public.invite_company_member(
  p_company_id UUID,
  p_user_id    UUID DEFAULT NULL,
  p_role       TEXT DEFAULT 'member'
) RETURNS TEXT  -- returns 'active' | 'error:message'
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_status     TEXT;
  v_channel_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'error:must provide user_id';
  END IF;

  -- Check if already a member
  SELECT status INTO v_status FROM public.company_members
  WHERE company_id = p_company_id AND user_id = p_user_id;

  IF FOUND THEN
    IF v_status = 'active' THEN
      RETURN 'active'; -- already a member
    ELSE
      -- Reactivate
      UPDATE public.company_members SET status = 'active', role = p_role, updated_at = NOW()
      WHERE company_id = p_company_id AND user_id = p_user_id;
    END IF;
  ELSE
    -- Insert new active member
    INSERT INTO public.company_members (company_id, user_id, role, status, invited_by)
    VALUES (p_company_id, p_user_id, p_role, 'active', auth.uid());
  END IF;

  -- Auto-join the company's General channel
  SELECT ensure_company_channel(p_company_id, p_user_id) INTO v_channel_id;

  RETURN 'active';
END;
$$;

-- ── 5. Backfill: add existing company owners as members ─────────────
-- For every company_profiles row, ensure the owner_id is in
-- company_members as 'owner' and has the General channel.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT cp.id AS company_id, cp.owner_id
    FROM public.company_profiles cp
    WHERE cp.owner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = cp.id AND cm.user_id = cp.owner_id
      )
  LOOP
    INSERT INTO public.company_members (company_id, user_id, role, status)
    VALUES (rec.company_id, rec.owner_id, 'owner', 'active')
    ON CONFLICT (company_id, user_id) DO NOTHING;

    PERFORM ensure_company_channel(rec.company_id, rec.owner_id);
  END LOOP;
END;
$$;

-- ── 6. Enable Realtime on company_members ───────────────────────────
ALTER TABLE public.company_members REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'company_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_members;
  END IF;
END;
$$;