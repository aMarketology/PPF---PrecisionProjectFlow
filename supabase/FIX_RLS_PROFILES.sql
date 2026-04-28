-- =====================================================
-- FIX_RLS_PROFILES.sql
-- Fixes RLS so that:
--   1. The handle_new_user trigger can INSERT new profiles
--   2. Users can read and update their own profile
--   3. Everyone can read profiles (for marketplace listings)
-- Run this in the Supabase SQL editor.
-- =====================================================

-- Drop all existing profile policies (start clean)
DROP POLICY IF EXISTS "Users can view own profile"          ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"        ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable"        ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy"             ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy"             ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy"             ON public.profiles;

-- Make sure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Allow anyone to read profiles (needed for marketplace/company pages)
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (true);

-- 2. Allow INSERT from the service role OR when the row id matches the authed user.
--    The trigger runs as SECURITY DEFINER / service role, so we allow
--    inserts where auth.uid() matches OR where the caller is service_role.
CREATE POLICY "Allow profile creation on signup"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR current_setting('role') = 'service_role'
  );

-- 3. Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- Also fix company_profiles so new vendors can insert
-- =====================================================
DROP POLICY IF EXISTS "Company profiles are viewable by everyone" ON public.company_profiles;
DROP POLICY IF EXISTS "Users can create company profile"          ON public.company_profiles;
DROP POLICY IF EXISTS "Users can update own company profile"      ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles_select_policy"            ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles_insert_policy"            ON public.company_profiles;
DROP POLICY IF EXISTS "company_profiles_update_policy"            ON public.company_profiles;

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read company profiles
CREATE POLICY "Company profiles are publicly readable"
  ON public.company_profiles FOR SELECT
  USING (true);

-- Authenticated users can create their own company profile
CREATE POLICY "Authenticated users can create company profile"
  ON public.company_profiles FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own company profile
CREATE POLICY "Users can update own company profile"
  ON public.company_profiles FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
