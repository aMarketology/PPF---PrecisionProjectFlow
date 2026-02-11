-- Stripe Connect and Payment System Migration
-- This creates tables for product listings, orders, payments, and Stripe Connect integration

-- =====================================================
-- STRIPE CONNECT ACCOUNTS
-- =====================================================
-- Stores company's Stripe Connect account information
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL UNIQUE,
    account_type TEXT DEFAULT 'standard', -- standard, express, custom
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    details_submitted BOOLEAN DEFAULT FALSE,
    country TEXT,
    default_currency TEXT DEFAULT 'usd',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_company_stripe UNIQUE (company_id)
);

-- =====================================================
-- PRODUCTS/SERVICES
-- =====================================================
-- Products or services that companies list for sale
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    currency TEXT DEFAULT 'usd',
    category TEXT, -- structural, mechanical, electrical, etc.
    delivery_time_days INTEGER, -- estimated delivery time
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_price CHECK (price >= 1.00)
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
    
    -- Order details
    product_name TEXT NOT NULL, -- snapshot at order time
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    
    -- Status tracking
    status TEXT DEFAULT 'pending_payment' CHECK (
        status IN (
            'pending_payment',
            'paid',
            'in_progress',
            'delivered',
            'completed',
            'cancelled',
            'refunded',
            'disputed'
        )
    ),
    
    -- Important dates
    paid_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Delivery info
    delivery_notes TEXT,
    buyer_notes TEXT,
    company_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PAYMENT INTENTS
-- =====================================================
-- Tracks Stripe payment intents
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL, -- requires_payment_method, succeeded, canceled, etc.
    client_secret TEXT,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRANSFERS (Platform to Company)
-- =====================================================
-- Tracks transfers from platform to company Stripe accounts
CREATE TABLE IF NOT EXISTS stripe_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE RESTRICT,
    stripe_transfer_id TEXT NOT NULL UNIQUE,
    destination_account_id TEXT NOT NULL, -- Company's Stripe account
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'pending', -- pending, succeeded, failed
    transferred_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLATFORM FEES
-- =====================================================
-- Track platform fees collected
CREATE TABLE IF NOT EXISTS platform_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REFUNDS
-- =====================================================
-- Track refunds issued
CREATE TABLE IF NOT EXISTS refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE RESTRICT,
    stripe_refund_id TEXT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    reason TEXT,
    status TEXT DEFAULT 'pending',
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_category ON products(category);

CREATE INDEX idx_orders_company ON product_orders(company_id);
CREATE INDEX idx_orders_buyer ON product_orders(buyer_id);
CREATE INDEX idx_orders_product ON product_orders(product_id);
CREATE INDEX idx_orders_status ON product_orders(status);
CREATE INDEX idx_orders_created ON product_orders(created_at DESC);

CREATE INDEX idx_payment_intents_order ON payment_intents(order_id);
CREATE INDEX idx_stripe_transfers_order ON stripe_transfers(order_id);
CREATE INDEX idx_platform_fees_order ON platform_fees(order_id);
CREATE INDEX idx_refunds_order ON refunds(order_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate format: ORD-YYYYMMDD-XXXX (e.g., ORD-20251224-1234)
        new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                      LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
        
        -- Check if exists
        SELECT EXISTS(SELECT 1 FROM product_orders WHERE order_number = new_number) INTO exists;
        
        -- If doesn't exist, we found a unique number
        IF NOT exists THEN
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_stripe_connect_accounts_updated_at
    BEFORE UPDATE ON stripe_connect_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON product_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_intents_updated_at
    BEFORE UPDATE ON payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Stripe Connect Accounts: Only company owners/admins can view/manage
CREATE POLICY "Companies can view their own Stripe accounts"
    ON stripe_connect_accounts FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Companies can update their own Stripe accounts"
    ON stripe_connect_accounts FOR UPDATE
    USING (
        company_id IN (
            SELECT id FROM company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

-- Products: Public can view active, companies can manage their own
CREATE POLICY "Anyone can view active products"
    ON products FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Companies can view their own products (including inactive)"
    ON products FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Companies can insert their own products"
    ON products FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT id FROM company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Companies can update their own products"
    ON products FOR UPDATE
    USING (
        company_id IN (
            SELECT id FROM company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Companies can delete their own products"
    ON products FOR DELETE
    USING (
        company_id IN (
            SELECT id FROM company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

-- Orders: Buyers and sellers can view their own orders
CREATE POLICY "Buyers can view their orders"
    ON product_orders FOR SELECT
    USING (buyer_id = auth.uid());

CREATE POLICY "Companies can view product_orders for their products"
    ON product_orders FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Buyers can create orders"
    ON product_orders FOR INSERT
    WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Companies can update their orders"
    ON product_orders FOR UPDATE
    USING (
        company_id IN (
            SELECT id FROM company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

-- Payment Intents: Users can view their own payment intents
CREATE POLICY "Users can view their payment intents"
    ON payment_intents FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM product_orders WHERE buyer_id = auth.uid()
        )
    );

CREATE POLICY "Companies can view payment intents for their orders"
    ON payment_intents FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM product_orders WHERE company_id IN (
                SELECT id FROM company_profiles WHERE owner_id = auth.uid()
            )
        )
    );

-- Transfers: Companies can view their transfers
CREATE POLICY "Companies can view their transfers"
    ON stripe_transfers FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM product_orders WHERE company_id IN (
                SELECT id FROM company_profiles WHERE owner_id = auth.uid()
            )
        )
    );

-- Platform Fees: Admin only (no policies = only service role)
-- Refunds: Related users can view
CREATE POLICY "Users can view refunds for their orders"
    ON refunds FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM product_orders WHERE buyer_id = auth.uid()
            OR company_id IN (
                SELECT id FROM company_profiles WHERE owner_id = auth.uid()
            )
        )
    );

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON stripe_connect_accounts TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON product_orders TO authenticated;
GRANT ALL ON payment_intents TO authenticated;
GRANT ALL ON stripe_transfers TO authenticated;
GRANT SELECT ON platform_fees TO authenticated;
GRANT ALL ON refunds TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE stripe_connect_accounts IS 'Stores company Stripe Connect account information';
COMMENT ON TABLE products IS 'Products or services companies list for sale';
COMMENT ON TABLE product_orders IS 'Customer product_orders with payment and delivery tracking';
COMMENT ON TABLE payment_intents IS 'Stripe payment intent tracking';
COMMENT ON TABLE stripe_transfers IS 'Transfers from platform to company accounts';
COMMENT ON TABLE platform_fees IS 'Platform fees collected on transactions';
COMMENT ON TABLE refunds IS 'Refund tracking';
