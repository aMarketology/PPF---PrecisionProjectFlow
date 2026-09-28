-- ════════════════════════════════════════════════════════════════════
-- USER_ACCOUNT_STATUS.sql
-- Adds account status / deactivation support to profiles so a super
-- admin can suspend or deactivate an account (e.g. for moderation).
--
-- A future KYC system can layer on top of this without schema churn.
--
-- Run in: Supabase Dashboard → SQL Editor (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Account status column ────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_reason TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_profiles_account_status
  ON public.profiles (account_status)
  WHERE account_status != 'active';

-- Ensure existing rows default to 'active' (in case the column existed
-- before this migration with NULLs).
UPDATE public.profiles
   SET account_status = 'active'
 WHERE account_status IS NULL OR account_status = '';

-- ── 2. Admin can read/update any profile's status ───────────────────
-- (already covered by "Admins can update any profile" from ADMIN_SETUP,
--  but re-assert an explicit read policy so the status is queryable.)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()) OR auth.uid() = id);

-- ── 3. Helper: is this account active? ──────────────────────────────
CREATE OR REPLACE FUNCTION public.is_account_active(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(
    (SELECT account_status = 'active' FROM public.profiles WHERE id = user_id),
    FALSE
  );
$$;