-- =====================================================
-- STRIPE_CONNECT_ACCOUNTS TABLE
-- Stripe Connect accounts for vendor payments
-- =====================================================

CREATE TABLE public.stripe_connect_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE UNIQUE,
    stripe_account_id TEXT UNIQUE NOT NULL,
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,
    details_submitted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_stripe_company ON public.stripe_connect_accounts(company_id);
