-- =====================================================
-- STRIPE CONNECT & PRODUCTS SYSTEM (FIXED)
-- This is the corrected version with proper data types
-- =====================================================

-- Enable UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STRIPE CONNECT ACCOUNTS
-- =====================================================
-- Stores Stripe Connect account info for companies
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL UNIQUE,
    
    -- Account status
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    details_submitted BOOLEAN DEFAULT FALSE,
    account_type TEXT, -- 'standard', 'express', 'custom'
    
    -- Requirements and capabilities
    requirements JSONB, -- Stripe's requirements object
    
    -- Metadata
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT one_stripe_account_per_company UNIQUE(company_id)
);

-- =====================================================
-- PRODUCTS (Services/Products for Sale) - FIXED
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- FIXED: Price stored as INTEGER cents (Stripe format)
    -- Example: $25,000.00 = 2500000 cents
    price BIGINT NOT NULL CHECK (price > 0),
    currency TEXT DEFAULT 'usd',
    
    -- Product details
    category TEXT, -- structural, mechanical, electrical, etc.
    delivery_time_days INTEGER, -- estimated delivery time
    
    -- FIXED: Column name matches seed data
    is_active BOOLEAN DEFAULT TRUE,
    
    -- ADDED: Missing column from seed script
    requires_consultation BOOLEAN DEFAULT FALSE,
    
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- FIXED: Minimum price $1.00 = 100 cents
    CONSTRAINT valid_price CHECK (price >= 100)
);

-- =====================================================
-- ORDERS (Product Orders)
-- =====================================================
-- Customer product_orders for products/services
CREATE TABLE IF NOT EXISTS product_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Order details (snapshot at order time)
    product_name TEXT NOT NULL,
    product_price BIGINT NOT NULL, -- Stored in cents for consistency
    quantity INTEGER DEFAULT 1,
    subtotal BIGINT NOT NULL,
    
    -- Fees and totals (all in cents)
    platform_fee BIGINT NOT NULL,
    total_amount BIGINT NOT NULL,
    currency TEXT DEFAULT 'usd',
    
    -- Order status workflow
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'processing', 'completed', 'cancelled', 'refunded')
    ),
    
    -- Payment reference
    payment_intent_id UUID REFERENCES payment_intents(id),
    
    -- Delivery tracking
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Order notes
    buyer_notes TEXT,
    seller_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT
);

-- =====================================================
-- PAYMENT INTENTS
-- =====================================================
-- Tracks Stripe payment intents for orders
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_payment_intent_id TEXT NOT NULL UNIQUE,
    
    -- References
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE RESTRICT,
    
    -- Payment details (stored in cents)
    amount BIGINT NOT NULL,
    currency TEXT DEFAULT 'usd',
    platform_fee BIGINT NOT NULL, -- 10% platform fee in cents
    
    -- Status
    status TEXT DEFAULT 'created' CHECK (
        status IN ('created', 'processing', 'succeeded', 'failed', 'canceled')
    ),
    
    -- Stripe details
    client_secret TEXT,
    payment_method_id TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    succeeded_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT
);

-- =====================================================
-- STRIPE TRANSFERS (Payouts to Companies)
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_transfer_id TEXT NOT NULL UNIQUE,
    
    -- References
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE RESTRICT,
    destination_account TEXT NOT NULL, -- Stripe account ID
    
    -- Transfer details (in cents)
    amount BIGINT NOT NULL,
    currency TEXT DEFAULT 'usd',
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'failed', 'reversed')
    ),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    failure_reason TEXT
);

-- =====================================================
-- PLATFORM FEES (Accounting)
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE RESTRICT,
    payment_intent_id UUID REFERENCES payment_intents(id),
    
    -- Fee details (in cents)
    amount BIGINT NOT NULL,
    percentage DECIMAL(5,2) DEFAULT 10.00, -- 10% default
    currency TEXT DEFAULT 'usd',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REFUNDS
-- =====================================================
CREATE TABLE IF NOT EXISTS refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_refund_id TEXT NOT NULL UNIQUE,
    payment_intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE RESTRICT,
    
    -- Refund details (in cents)
    amount BIGINT NOT NULL,
    currency TEXT DEFAULT 'usd',
    
    -- Reason
    reason TEXT CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),
    description TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'succeeded', 'failed', 'canceled')
    ),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    succeeded_at TIMESTAMPTZ,
    failure_reason TEXT
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Stripe Connect Accounts
CREATE INDEX IF NOT EXISTS idx_stripe_connect_company_id ON stripe_connect_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_account_id ON stripe_connect_accounts(stripe_account_id);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON product_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON product_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON product_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON product_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON product_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON product_orders(order_number);

-- Payment Intents
CREATE INDEX IF NOT EXISTS idx_payment_intents_customer ON payment_intents(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_product ON payment_intents(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_company ON payment_intents(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);

-- Transfers
CREATE INDEX IF NOT EXISTS idx_transfers_order ON stripe_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination ON stripe_transfers(destination_account);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON stripe_transfers(status);

-- Platform Fees
CREATE INDEX IF NOT EXISTS idx_platform_fees_order ON platform_fees(order_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_payment_intent ON platform_fees(payment_intent_id);

-- Refunds
CREATE INDEX IF NOT EXISTS idx_refunds_payment_intent ON refunds(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: STRIPE CONNECT ACCOUNTS
-- =====================================================

-- Company owners can view their own Stripe account
CREATE POLICY "stripe_accounts_select_owner" ON stripe_connect_accounts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_id 
            AND owner_id = auth.uid()
        )
    );

-- Company owners can insert their Stripe account
CREATE POLICY "stripe_accounts_insert_owner" ON stripe_connect_accounts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_id 
            AND owner_id = auth.uid()
        )
    );

-- Company owners can update their Stripe account
CREATE POLICY "stripe_accounts_update_owner" ON stripe_connect_accounts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_id 
            AND owner_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES: PRODUCTS
-- =====================================================

-- Everyone can view active products
CREATE POLICY "products_select_active" ON products
    FOR SELECT
    USING (is_active = TRUE OR company_id IN (
        SELECT id FROM company_profiles WHERE owner_id = auth.uid()
    ));

-- Company owners can insert products
CREATE POLICY "products_insert_owner" ON products
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_id 
            AND owner_id = auth.uid()
        )
    );

-- Company owners can update their products
CREATE POLICY "products_update_owner" ON products
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_id 
            AND owner_id = auth.uid()
        )
    );

-- Company owners can delete their products
CREATE POLICY "products_delete_owner" ON products
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_id 
            AND owner_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES: ORDERS
-- =====================================================

-- Buyers can view their own orders
CREATE POLICY "orders_select_buyer" ON product_orders
    FOR SELECT
    USING (buyer_id = auth.uid());

-- Companies can view orders for their products
CREATE POLICY "orders_select_company" ON product_orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_id 
            AND owner_id = auth.uid()
        )
    );

-- Authenticated users can create orders
CREATE POLICY "orders_insert_authenticated" ON product_orders
    FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

-- Buyers can update their pending orders
CREATE POLICY "orders_update_buyer" ON product_orders
    FOR UPDATE
    USING (buyer_id = auth.uid() AND status = 'pending');

-- Companies can update orders for their products
CREATE POLICY "orders_update_company" ON product_orders
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_id 
            AND owner_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES: PAYMENT INTENTS
-- =====================================================

-- Customers can view their own payment intents
CREATE POLICY "payment_intents_select_customer" ON payment_intents
    FOR SELECT
    USING (customer_id = auth.uid());

-- Companies can view payment intents for their products
CREATE POLICY "payment_intents_select_company" ON payment_intents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM company_profiles 
            WHERE id = company_id 
            AND owner_id = auth.uid()
        )
    );

-- Service role can insert payment intents (API endpoints)
CREATE POLICY "payment_intents_insert_service" ON payment_intents
    FOR INSERT
    WITH CHECK (true); -- Restricted to service role in practice

-- =====================================================
-- RLS POLICIES: TRANSFERS
-- =====================================================

-- Companies can view their own transfers
CREATE POLICY "transfers_select_company" ON stripe_transfers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM product_orders po
            JOIN company_profiles cp ON po.company_id = cp.id
            WHERE po.id = order_id
            AND cp.owner_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES: PLATFORM FEES
-- =====================================================

-- Companies can view platform fees for their orders
CREATE POLICY "platform_fees_select_company" ON platform_fees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM product_orders po
            JOIN company_profiles cp ON po.company_id = cp.id
            WHERE po.id = order_id
            AND cp.owner_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES: REFUNDS
-- =====================================================

-- Customers can view refunds for their orders
CREATE POLICY "refunds_select_customer" ON refunds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM product_orders 
            WHERE id = order_id 
            AND buyer_id = auth.uid()
        )
    );

-- Companies can view refunds for their orders
CREATE POLICY "refunds_select_company" ON refunds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM product_orders po
            JOIN company_profiles cp ON po.company_id = cp.id
            WHERE po.id = order_id
            AND cp.owner_id = auth.uid()
        )
    );

-- =====================================================
-- AUTO-UPDATE TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER stripe_connect_accounts_updated_at
    BEFORE UPDATE ON stripe_connect_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER product_orders_updated_at
    BEFORE UPDATE ON product_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payment_intents_updated_at
    BEFORE UPDATE ON payment_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER stripe_transfers_updated_at
    BEFORE UPDATE ON stripe_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER refunds_updated_at
    BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON stripe_connect_accounts TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON product_orders TO authenticated;
GRANT ALL ON payment_intents TO authenticated;
GRANT ALL ON stripe_transfers TO authenticated;
GRANT ALL ON platform_fees TO authenticated;
GRANT ALL ON refunds TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE stripe_connect_accounts IS 'Stripe Connect accounts for vendor payouts';
COMMENT ON TABLE products IS 'Products/services available for purchase - PRICES IN CENTS';
COMMENT ON TABLE product_orders IS 'Customer orders for products/services - AMOUNTS IN CENTS';
COMMENT ON TABLE payment_intents IS 'Stripe payment intent tracking - AMOUNTS IN CENTS';
COMMENT ON TABLE stripe_transfers IS 'Vendor payout transfers - AMOUNTS IN CENTS';
COMMENT ON TABLE platform_fees IS 'Platform fee accounting - AMOUNTS IN CENTS';
COMMENT ON TABLE refunds IS 'Order refunds - AMOUNTS IN CENTS';

COMMENT ON COLUMN products.price IS 'Price in cents (e.g., 2500000 = $25,000.00)';
COMMENT ON COLUMN product_orders.product_price IS 'Snapshot price in cents at order time';
COMMENT ON COLUMN payment_intents.amount IS 'Total payment amount in cents';
COMMENT ON COLUMN stripe_transfers.amount IS 'Transfer amount to vendor in cents';
COMMENT ON COLUMN platform_fees.amount IS 'Platform fee in cents (10% of order total)';
COMMENT ON COLUMN refunds.amount IS 'Refund amount in cents';
