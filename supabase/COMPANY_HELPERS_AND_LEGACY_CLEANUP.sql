-- ════════════════════════════════════════════════════════════════════
-- COMPANY_HELPERS_AND_LEGACY_CLEANUP.sql
-- Two tasks in one idempotent migration:
--
--   #4  Deploy the 3 missing company-membership helper functions that
--       RLS policies reference but that do not exist live:
--         is_company_member, is_company_manager, is_company_owner
--
--   #5  Drop the legacy tables that no code reads:
--         conversations, messages, token_purchases
--       (company_team_members and payment_intents do NOT exist live,
--        so they are skipped.)
--
-- Run in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- ── #4a. is_company_member ──────────────────────────────────────────
-- NOTE: the old migration 002 defined this against `company_team_members`
-- (a table that does not exist live). Re-point it at the real
-- `company_members` table.
CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = p_company_id
      AND user_id = p_user_id
      AND status = 'active'
  );
$$;

-- ── #4b. is_company_manager (owner OR admin) ────────────────────────
CREATE OR REPLACE FUNCTION public.is_company_manager(p_company_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = p_company_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

-- ── #4c. is_company_owner (via company_profiles.owner_id) ───────────
CREATE OR REPLACE FUNCTION public.is_company_owner(p_company_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_profiles
    WHERE id = p_company_id AND owner_id = p_user_id
  );
$$;

-- ── #4d. Rebuild the company_members RLS policies on the safe helpers ─
-- (mirrors FIX_COMPANY_MEMBERS_UPDATE_RLS.sql; avoids infinite recursion)
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.company_members;
CREATE POLICY "Owners and admins can update members"
  ON public.company_members FOR UPDATE
  USING (
    public.is_company_owner(company_id)
    OR public.is_company_manager(company_id)
    OR auth.uid() = user_id
  )
  WITH CHECK (
    public.is_company_owner(company_id)
    OR public.is_company_manager(company_id)
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.company_members;
CREATE POLICY "Owners and admins can invite members"
  ON public.company_members FOR INSERT
  WITH CHECK (
    public.is_company_owner(company_id)
    OR public.is_company_manager(company_id)
  );

DROP POLICY IF EXISTS "Members can view company roster" ON public.company_members;
CREATE POLICY "Members can view company roster"
  ON public.company_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_company_owner(company_id)
    OR public.is_company_manager(company_id)
  );

-- ── #5. Drop legacy tables (no code reads these) ────────────────────
-- `conversations` (1 orphan row), `messages` (0 rows), `token_purchases`
-- (0 rows). Superseded by user_conversations / user_messages /
-- token_transactions respectively.
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.token_purchases CASCADE;

-- company_team_members and payment_intents do not exist live; nothing to drop.