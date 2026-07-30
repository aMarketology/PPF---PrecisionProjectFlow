-- =====================================================
-- PRODUCT ORDERS TABLE
-- =====================================================
-- Live schema as of July 30, 2026
-- Updated: Added in_progress_at column, fixed status
-- check constraint to include full workflow.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.product_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    product_id UUID REFERENCES products(id),
    company_id UUID REFERENCES company_profiles(id),
    buyer_id UUID REFERENCES auth.users(id),
    product_name TEXT NOT NULL,
    product_price BIGINT NOT NULL,
    platform_fee BIGINT,
    total_amount BIGINT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (
        status IN (
            'pending_payment', 'paid', 'in_progress',
            'delivered', 'completed', 'cancelled',
            'refunded', 'disputed'
        )
    ),
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    in_progress_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_orders_buyer ON product_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_company ON product_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON product_orders(status);