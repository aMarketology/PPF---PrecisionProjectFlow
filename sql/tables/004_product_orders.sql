-- =====================================================
-- PRODUCT_ORDERS TABLE
-- Purchase orders and transactions
-- =====================================================

CREATE TABLE public.product_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    product_id UUID REFERENCES public.products(id),
    company_id UUID REFERENCES public.company_profiles(id),
    buyer_id UUID REFERENCES auth.users(id),
    product_name TEXT NOT NULL,
    product_price BIGINT NOT NULL, -- in cents
    platform_fee BIGINT, -- in cents (5% of price)
    total_amount BIGINT NOT NULL, -- in cents
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_orders_buyer ON public.product_orders(buyer_id);
CREATE INDEX idx_orders_company ON public.product_orders(company_id);
CREATE INDEX idx_orders_status ON public.product_orders(status);
CREATE INDEX idx_orders_created ON public.product_orders(created_at DESC);
