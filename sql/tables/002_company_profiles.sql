-- =====================================================
-- COMPANY_PROFILES TABLE
-- Vendor companies on the platform
-- =====================================================

CREATE TABLE public.company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    description TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    specialties TEXT[],
    certifications TEXT[],
    is_verified BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_company_owner ON public.company_profiles(owner_id);
CREATE INDEX idx_company_verified ON public.company_profiles(is_verified);
CREATE INDEX idx_company_location ON public.company_profiles(city, state);
