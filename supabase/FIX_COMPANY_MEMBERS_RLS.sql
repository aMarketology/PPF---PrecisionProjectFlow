-- ════════════════════════════════════════════════════════════════════
-- FIX_COMPANY_MEMBERS_RLS.sql
-- Run in: Supabase Dashboard → SQL Editor
--
-- Fixes infinite recursion in company_members RLS policies.
-- The old SELECT policy queried itself (EXISTS SELECT FROM company_members)
-- which caused infinite recursion.
--
-- Safe to run multiple times (DROP IF EXISTS + CREATE).
-- ════════════════════════════════════════════════════════════════════

-- 1. Fix SELECT policy: users can view their own row OR company owner can view all
DROP POLICY IF EXISTS "Members can view company roster" ON public.company_members;
CREATE POLICY "Members can view company roster"
  ON public.company_members FOR SELECT
  USING (
    -- User is viewing their own membership row
    auth.uid() = user_id
    OR
    -- User is the owner of the company
    auth.uid() = (SELECT owner_id FROM public.company_profiles WHERE id = company_id)
  );

-- 2. Fix INSERT policy: only admins/owners can invite (still checks company_members
--    but for INSERT the policy only runs once, not recursively)
DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.company_members;
CREATE POLICY "Owners and admins can invite members"
  ON public.company_members FOR INSERT
  WITH CHECK (
    -- Company owner can always invite
    auth.uid() = (SELECT owner_id FROM public.company_profiles WHERE id = company_id)
    OR
    -- Admins can invite (this subquery is safe for INSERT policies)
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = company_members.company_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );