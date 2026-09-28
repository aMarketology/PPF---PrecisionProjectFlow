-- ════════════════════════════════════════════════════════════════════
-- FIX_PROFILE_COMPANY_SYNC.sql
-- Run in: Supabase Dashboard → SQL Editor
--
-- Bug: sync_profile_company_id() cleared profiles.company_id whenever ANY
-- company_members row was removed, even if the user still had another
-- active membership. Removing a stale/test membership therefore wiped the
-- user's real company link, which in turn broke job-title group chats and
-- company resolution in messaging.
--
-- Fix: recompute company_id from the user's remaining ACTIVE memberships
-- instead of blindly nulling it.
--
-- Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_profile_company_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user    UUID;
  v_company UUID;
BEGIN
  v_user := COALESCE(NEW.user_id, OLD.user_id);

  -- Recompute from remaining active memberships (one company per account).
  SELECT company_id INTO v_company
  FROM public.company_members
  WHERE user_id = v_user
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  UPDATE public.profiles
  SET company_id = v_company,
      updated_at = NOW()
  WHERE id = v_user;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_company_id ON public.company_members;
CREATE TRIGGER trg_sync_profile_company_id
  AFTER INSERT OR UPDATE OR DELETE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_company_id();

-- ── Repair existing data ─────────────────────────────────────────────
-- Re-link every profile to its active company membership.
UPDATE public.profiles p
SET company_id = sub.company_id,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (user_id) user_id, company_id
  FROM public.company_members
  WHERE status = 'active'
  ORDER BY user_id, created_at ASC
) sub
WHERE p.id = sub.user_id
  AND (p.company_id IS DISTINCT FROM sub.company_id);

-- Clear company_id for anyone with no active membership.
UPDATE public.profiles p
SET company_id = NULL,
    updated_at = NOW()
WHERE p.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = p.id AND cm.status = 'active'
  );

-- ── Re-run job-title chat backfill now that company_id is correct ────
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

-- ── Verify ───────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'profile company sync fixed and data repaired';
END $$;
