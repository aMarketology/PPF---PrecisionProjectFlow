-- ════════════════════════════════════════════════════════════════════
-- FIX_COMPANY_MEMBERS_UPDATE_RLS.sql
-- Run in: Supabase Dashboard → SQL Editor (or scripts/apply-sql-file.js)
--
-- Problem: the UPDATE policy on company_members queried company_members
-- inside its own USING clause, causing "infinite recursion detected in
-- policy for relation company_members" (HTTP 500) whenever an owner tried
-- to change a member's role or remove them.
--
-- Fix: move the membership check into a SECURITY DEFINER function, which
-- bypasses RLS and therefore cannot recurse.
--
-- Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Helper: is the current user an active owner/admin of this company? ──
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

-- ── 2. Helper: is the current user the company owner (via company_profiles)? ──
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

-- ── 3. Replace the recursive UPDATE policy ────────────────────────────────
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.company_members;
CREATE POLICY "Owners and admins can update members"
  ON public.company_members FOR UPDATE
  USING (
    public.is_company_owner(company_id)
    OR public.is_company_manager(company_id)
    OR auth.uid() = user_id          -- users may update their own row (e.g. leave)
  )
  WITH CHECK (
    public.is_company_owner(company_id)
    OR public.is_company_manager(company_id)
    OR auth.uid() = user_id
  );

-- ── 4. Replace the recursive INSERT policy with the same safe helpers ─────
DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.company_members;
CREATE POLICY "Owners and admins can invite members"
  ON public.company_members FOR INSERT
  WITH CHECK (
    public.is_company_owner(company_id)
    OR public.is_company_manager(company_id)
  );

-- ── 5. Replace the recursive SELECT policy ────────────────────────────────
DROP POLICY IF EXISTS "Members can view company roster" ON public.company_members;
CREATE POLICY "Members can view company roster"
  ON public.company_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_company_owner(company_id)
    OR public.is_company_manager(company_id)
  );

-- ── 6. Verify ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'company_members policies rebuilt with SECURITY DEFINER helpers';
END $$;
