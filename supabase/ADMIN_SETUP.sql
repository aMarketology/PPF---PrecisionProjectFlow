-- ════════════════════════════════════════════════════════════════════
-- ADMIN_SETUP.sql
-- Adds admin role support to profiles and sets precisionprojectflow
-- as the initial admin.
-- Run in: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- 1. Add is_admin column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Set precisionprojectflow@gmail.com as admin
UPDATE public.profiles SET is_admin = TRUE
WHERE email ILIKE '%precisionprojectflow%';

-- 3. Create admin check helper
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = user_id), FALSE);
$$;

-- 4. RLS: admins can read all profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()) OR auth.uid() = id);

-- 5. RLS: admins can update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()) OR auth.uid() = id);

-- 6. RLS: admins can read/update/delete any company profile
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.company_profiles;
CREATE POLICY "Admins can manage all companies"
  ON public.company_profiles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 7. RLS: admins can read/update all RFQs
DROP POLICY IF EXISTS "Admins can manage all rfqs" ON public.rfqs;
CREATE POLICY "Admins can manage all rfqs"
  ON public.rfqs FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 8. RLS: admins can read/update/delete any product
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products"
  ON public.products FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 9. RLS: admins can manage services
DROP POLICY IF EXISTS "Admins can manage all services" ON public.services;
CREATE POLICY "Admins can manage all services"
  ON public.services FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 10. RLS: admins can see all token transactions
DROP POLICY IF EXISTS "Admins can see all token transactions" ON public.token_transactions;
CREATE POLICY "Admins can see all token transactions"
  ON public.token_transactions FOR SELECT
  USING (public.is_admin(auth.uid()));