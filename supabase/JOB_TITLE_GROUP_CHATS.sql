-- ════════════════════════════════════════════════════════════════════
-- JOB_TITLE_GROUP_CHATS.sql
-- Run in: Supabase Dashboard → SQL Editor
--
-- Adds:
--   1. profiles.job_title - the member's job title (set in /admin/company)
--   2. Auto-created group chat per job title within a company
--      (any set job title gets a chat, even for a single person)
--   3. Cleanup of channel/group access when a member leaves or is removed
--      (fixes stale participations that caused duplicate "General" entries)
--
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Job title on profiles ─────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;

COMMENT ON COLUMN public.profiles.job_title IS
  'Member job title. Drives per-title company group chats.';

-- ── 2. Ensure a group chat exists for a job title ────────────────────
-- Creates (if missing) a 'group' conversation named after the job title
-- for the given company, and adds the user as a participant.
CREATE OR REPLACE FUNCTION public.ensure_job_title_channel(
  p_company_id UUID,
  p_job_title  TEXT,
  p_user_id    UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
  v_title   TEXT;
BEGIN
  v_title := btrim(COALESCE(p_job_title, ''));
  IF v_title = '' OR p_company_id IS NULL OR p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Reuse an existing group chat for this title in this company
  SELECT id INTO v_conv_id
  FROM public.user_conversations
  WHERE company_id = p_company_id
    AND conversation_type = 'group'
    AND lower(name) = lower(v_title)
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.user_conversations
      (conversation_type, name, description, is_public, company_id, created_by, last_message_at)
    VALUES
      ('group', v_title, 'Group chat for ' || v_title || ' team members', TRUE, p_company_id, p_user_id, NOW())
    RETURNING id INTO v_conv_id;
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (v_conv_id, p_user_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN v_conv_id;
END;
$$;

-- ── 3. Keep job-title chats in sync when a title changes ─────────────
CREATE OR REPLACE FUNCTION public.sync_job_title_channel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.job_title IS NOT NULL
     AND btrim(NEW.job_title) <> ''
     AND NEW.company_id IS NOT NULL THEN
    PERFORM public.ensure_job_title_channel(NEW.company_id, NEW.job_title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_job_title_channel ON public.profiles;
CREATE TRIGGER trg_sync_job_title_channel
  AFTER INSERT OR UPDATE OF job_title, company_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_job_title_channel();

-- ── 4. Remove channel/group access when a member leaves ──────────────
-- Root-cause fix: deleting a company_members row previously left the user
-- as a participant in that company's channels, so they kept seeing its
-- "General" chat (and any job-title groups) after leaving.
CREATE OR REPLACE FUNCTION public.cleanup_company_channel_access()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user    UUID;
  v_company UUID;
BEGIN
  v_user    := COALESCE(NEW.user_id, OLD.user_id);
  v_company := COALESCE(NEW.company_id, OLD.company_id);

  IF TG_OP = 'DELETE'
     OR (TG_OP = 'UPDATE' AND NEW.status <> 'active' AND OLD.status = 'active') THEN
    DELETE FROM public.conversation_participants cp
    USING public.user_conversations uc
    WHERE cp.conversation_id = uc.id
      AND uc.company_id = v_company
      AND cp.user_id = v_user;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_company_channel_access ON public.company_members;
CREATE TRIGGER trg_cleanup_company_channel_access
  AFTER UPDATE OR DELETE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_company_channel_access();

-- ── 5. Backfill: create job-title chats for existing members ─────────
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.id AS user_id, p.company_id, p.job_title
    FROM public.profiles p
    JOIN public.company_members cm
      ON cm.user_id = p.id
     AND cm.company_id = p.company_id
     AND cm.status = 'active'
    WHERE p.job_title IS NOT NULL
      AND btrim(p.job_title) <> ''
      AND p.company_id IS NOT NULL
  LOOP
    PERFORM public.ensure_job_title_channel(rec.company_id, rec.job_title, rec.user_id);
  END LOOP;
END $$;

-- ── 6. Cleanup: drop stale participations for non-active members ─────
-- Removes channel/group access for anyone who is no longer an active
-- member of the company that owns the conversation.
DELETE FROM public.conversation_participants cp
USING public.user_conversations uc
WHERE cp.conversation_id = uc.id
  AND uc.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = uc.company_id
      AND cm.user_id = cp.user_id
      AND cm.status = 'active'
  );

-- ── 7. Verify ────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'job_title column, job-title group chats, and channel cleanup installed';
END $$;
