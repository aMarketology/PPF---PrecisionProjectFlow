-- =============================================
-- COMPANY CLAIMS & VERIFICATION SYSTEM
-- Allows real companies to claim pre-seeded profiles
-- =============================================

-- Add columns to company_profiles for claim tracking
ALTER TABLE company_profiles 
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('unclaimed', 'pending', 'verified', 'rejected')) DEFAULT 'unclaimed';

-- Create company claims table
CREATE TABLE IF NOT EXISTS company_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    claimant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    
    -- Verification information
    business_email TEXT NOT NULL,
    business_phone TEXT,
    position_title TEXT,
    employee_id TEXT,
    verification_document_url TEXT,
    
    -- Admin review
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate claims
    UNIQUE(company_profile_id, claimant_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_claims_status ON company_claims(status);
CREATE INDEX IF NOT EXISTS idx_company_claims_company ON company_claims(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_company_claims_user ON company_claims(claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_claimed ON company_profiles(is_claimed);
CREATE INDEX IF NOT EXISTS idx_company_profiles_verification ON company_profiles(verification_status);

-- Enable RLS
ALTER TABLE company_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_claims
-- Users can view their own claims
CREATE POLICY "Users can view their own claims"
    ON company_claims FOR SELECT
    USING (claimant_user_id = auth.uid());

-- Users can create claims for unclaimed companies
CREATE POLICY "Users can create claims"
    ON company_claims FOR INSERT
    WITH CHECK (
        claimant_user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_profile_id 
            AND is_claimed = FALSE
        )
    );

-- Users can update their pending claims
CREATE POLICY "Users can update their pending claims"
    ON company_claims FOR UPDATE
    USING (claimant_user_id = auth.uid() AND status = 'pending');

-- Add comment
COMMENT ON TABLE company_claims IS 'Tracks requests from users to claim and verify company profiles';
