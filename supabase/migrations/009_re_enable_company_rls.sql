-- =============================================
-- RE-ENABLE RLS ON COMPANY_PROFILES
-- Production-ready policies for company profiles
-- =============================================

-- Re-enable Row Level Security
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "company_profiles_insert" ON company_profiles;
DROP POLICY IF EXISTS "company_profiles_insert_authenticated" ON company_profiles;
DROP POLICY IF EXISTS "company_profiles_select_all" ON company_profiles;
DROP POLICY IF EXISTS "company_profiles_update_members" ON company_profiles;
DROP POLICY IF EXISTS "company_profiles_select_own" ON company_profiles;
DROP POLICY IF EXISTS "company_profiles_update_own" ON company_profiles;
DROP POLICY IF EXISTS "company_profiles_delete_own" ON company_profiles;

-- =============================================
-- SELECT POLICIES (READ)
-- =============================================

-- Everyone can view all company profiles (marketplace needs this)
CREATE POLICY "company_profiles_select_all" 
ON company_profiles FOR SELECT 
USING (true);

-- =============================================
-- INSERT POLICIES (CREATE)
-- =============================================

-- Authenticated users can create company profiles
-- Must set themselves as owner
CREATE POLICY "company_profiles_insert_authenticated" 
ON company_profiles FOR INSERT 
WITH CHECK (
    auth.uid() = owner_id 
    AND auth.uid() IS NOT NULL
);

-- =============================================
-- UPDATE POLICIES (MODIFY)
-- =============================================

-- Company owners can update their company
CREATE POLICY "company_profiles_update_owner" 
ON company_profiles FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Company team members can update their company
CREATE POLICY "company_profiles_update_team_members" 
ON company_profiles FOR UPDATE 
USING (is_company_member(id))
WITH CHECK (is_company_member(id));

-- Admins can update any company (for claim approvals)
-- Note: You'll need to add an is_admin column to profiles table
-- For now, this is a placeholder for future admin functionality
-- CREATE POLICY "company_profiles_update_admin" 
-- ON company_profiles FOR UPDATE 
-- USING (
--     EXISTS (
--         SELECT 1 FROM profiles 
--         WHERE id = auth.uid() 
--         AND is_admin = TRUE
--     )
-- );

-- =====================================================
-- DELETE POLICIES (REMOVE)
-- =====================================================

-- Only company owners can delete their company
CREATE POLICY "company_profiles_delete_owner" 
ON company_profiles FOR DELETE 
USING (owner_id = auth.uid());

-- =====================================================
-- ADDITIONAL SECURITY
-- =====================================================

-- Ensure company_team_members policies are working
-- (These should already exist from migration 002)

-- Verify is_company_member function exists
-- This function is critical for team-based access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'is_company_member'
    ) THEN
        RAISE EXCEPTION 'is_company_member function does not exist. Run migration 002 first.';
    END IF;
END
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "company_profiles_select_all" ON company_profiles 
IS 'Allow all users to view company profiles for marketplace discovery';

COMMENT ON POLICY "company_profiles_insert_authenticated" ON company_profiles 
IS 'Allow authenticated users to create company profiles (must be owner)';

COMMENT ON POLICY "company_profiles_update_owner" ON company_profiles 
IS 'Allow company owners to update their company profiles';

COMMENT ON POLICY "company_profiles_update_team_members" ON company_profiles 
IS 'Allow team members to update their company profiles (via is_company_member check)';

COMMENT ON POLICY "company_profiles_delete_owner" ON company_profiles 
IS 'Only company owners can delete their company profiles';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check RLS is enabled
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'company_profiles';
    
    IF NOT rls_enabled THEN
        RAISE EXCEPTION 'RLS is not enabled on company_profiles table';
    END IF;
    
    RAISE NOTICE 'RLS successfully enabled on company_profiles';
END
$$;

-- List all active policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'company_profiles';
    
    RAISE NOTICE 'Total policies on company_profiles: %', policy_count;
END
$$;
