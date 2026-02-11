-- =====================================================
-- PRODUCTS TABLE
-- Products and services offered by vendors
-- =====================================================

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price BIGINT NOT NULL, -- in cents (e.g., 45900 = $459.00)
    category TEXT,
    delivery_time_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    requires_consultation BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_price ON public.products(price);
