-- ════════════════════════════════════════════════════════════════════
-- ADMIN_SETUP.sql
-- Adds database-backed admin role support to profiles.
-- Run in: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- 1. Add is_admin column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Bootstrap the first admin manually by immutable auth user UUID.
-- Never grant administrator access by matching an email address.
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = '<auth-user-uuid>'::uuid;

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

-- 11. RLS: admins can read all messages
DROP POLICY IF EXISTS "Admins can read all messages" ON public.user_messages;
CREATE POLICY "Admins can read all messages"
  ON public.user_messages FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 12. RLS: admins can read all conversations
DROP POLICY IF EXISTS "Admins can read all conversations" ON public.user_conversations;
CREATE POLICY "Admins can read all conversations"
  ON public.user_conversations FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 13. RLS: admins can manage all company members
DROP POLICY IF EXISTS "Admins can manage all company members" ON public.company_members;
CREATE POLICY "Admins can manage all company members"
  ON public.company_members FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 14. RLS: admins can manage all company claims
DROP POLICY IF EXISTS "Admins can manage all company claims" ON public.company_claims;
CREATE POLICY "Admins can manage all company claims"
  ON public.company_claims FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 15. RLS: admins can manage all orders
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.product_orders;
CREATE POLICY "Admins can manage all orders"
  ON public.product_orders FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 16. RLS: admins can manage all contracts (requires CONTRACTS_AND_ESCROW.sql)
-- Applied in CONTRACTS_AND_ESCROW.sql when that migration runs.

-- 17. RLS: admins can manage all contract milestones (requires CONTRACTS_AND_ESCROW.sql)
-- Applied in CONTRACTS_AND_ESCROW.sql when that migration runs.

-- 18. RLS: admins can manage all reviews (requires migrations/005_create_reviews_system.sql)
-- Applied in migrations/005_create_reviews_system.sql when that migration runs.

-- 19. RLS: admins can read all site activities
DROP POLICY IF EXISTS "Admins can read all activities" ON public.site_activities;
CREATE POLICY "Admins can read all activities"
  ON public.site_activities FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 20. RLS: admins can manage all storage objects
DROP POLICY IF EXISTS "Admins can manage all storage" ON storage.objects;
CREATE POLICY "Admins can manage all storage"
  ON storage.objects FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));