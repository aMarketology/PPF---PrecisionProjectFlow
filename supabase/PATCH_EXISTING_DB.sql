-- =====================================================
-- SAFE PATCH - Only adds missing pieces
-- Safe to run even if tables already exist
-- =====================================================

-- =====================================================
-- STEP 1: CREATE MISSING TABLES (safe, uses IF NOT EXISTS)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    description TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    logo_url TEXT,
    specialties TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_owner UNIQUE (owner_id)
);

CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL UNIQUE,
    account_type TEXT DEFAULT 'standard',
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    details_submitted BOOLEAN DEFAULT FALSE,
    country TEXT,
    default_currency TEXT DEFAULT 'usd',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_company_stripe UNIQUE (company_id)
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 1.00),
    currency TEXT DEFAULT 'usd',
    category TEXT,
    delivery_time_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE DEFAULT ('ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0')),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL DEFAULT '',
    product_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'pending_payment' CHECK (
        status IN ('pending_payment','paid','in_progress','delivered','completed','cancelled','refunded','disputed')
    ),
    paid_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    delivery_notes TEXT,
    buyer_notes TEXT,
    company_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_intents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_payment_intent_id TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    company_id UUID REFERENCES company_profiles(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES product_orders(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    currency TEXT DEFAULT 'usd',
    platform_fee BIGINT DEFAULT 0,
    status TEXT DEFAULT 'created' CHECK (
        status IN ('created','processing','succeeded','failed','canceled')
    ),
    client_secret TEXT,
    payment_method_id TEXT,
    succeeded_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stripe_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE RESTRICT,
    stripe_transfer_id TEXT NOT NULL UNIQUE,
    destination_account_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'pending',
    transferred_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.refunds (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_company_profiles_owner ON company_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON product_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_company ON product_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON product_orders(status);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: DROP OLD POLICIES (safe, uses IF EXISTS)
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Companies can view all their own products" ON products;
DROP POLICY IF EXISTS "Companies can insert products" ON products;
DROP POLICY IF EXISTS "Companies can update their own products" ON products;
DROP POLICY IF EXISTS "Companies can delete their own products" ON products;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Company profiles are viewable by everyone" ON company_profiles;
DROP POLICY IF EXISTS "Users can create their own company profile" ON company_profiles;
DROP POLICY IF EXISTS "Users can update their own company profile" ON company_profiles;
DROP POLICY IF EXISTS "Companies can view their own Stripe accounts" ON stripe_connect_accounts;
DROP POLICY IF EXISTS "Companies can update their own Stripe accounts" ON stripe_connect_accounts;
DROP POLICY IF EXISTS "Buyers can view their orders" ON product_orders;
DROP POLICY IF EXISTS "Companies can view orders for their products" ON product_orders;
DROP POLICY IF EXISTS "Buyers can create orders" ON product_orders;
DROP POLICY IF EXISTS "Companies can update their orders" ON product_orders;
DROP POLICY IF EXISTS "Users can view their payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Companies can view payment intents for their orders" ON payment_intents;
DROP POLICY IF EXISTS "Companies can view their transfers" ON stripe_transfers;
DROP POLICY IF EXISTS "Users can view refunds for their orders" ON refunds;

-- =====================================================
-- RECREATE ALL POLICIES
-- =====================================================

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- COMPANY PROFILES
CREATE POLICY "Company profiles are viewable by everyone"
    ON company_profiles FOR SELECT USING (true);

CREATE POLICY "Users can create their own company profile"
    ON company_profiles FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own company profile"
    ON company_profiles FOR UPDATE USING (auth.uid() = owner_id);

-- STRIPE CONNECT
CREATE POLICY "Companies can view their own Stripe accounts"
    ON stripe_connect_accounts FOR SELECT
    USING (company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid()));

CREATE POLICY "Companies can update their own Stripe accounts"
    ON stripe_connect_accounts FOR UPDATE
    USING (company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid()));

-- PRODUCTS
CREATE POLICY "Anyone can view active products"
    ON products FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Companies can view all their own products"
    ON products FOR SELECT
    USING (company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid()));

CREATE POLICY "Companies can insert products"
    ON products FOR INSERT
    WITH CHECK (company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid()));

CREATE POLICY "Companies can update their own products"
    ON products FOR UPDATE
    USING (company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid()));

CREATE POLICY "Companies can delete their own products"
    ON products FOR DELETE
    USING (company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid()));

-- ORDERS
CREATE POLICY "Buyers can view their orders"
    ON product_orders FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "Companies can view orders for their products"
    ON product_orders FOR SELECT
    USING (company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid()));

CREATE POLICY "Buyers can create orders"
    ON product_orders FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Companies can update their orders"
    ON product_orders FOR UPDATE
    USING (company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid()));

-- PAYMENT INTENTS
CREATE POLICY "Users can view their payment intents"
    ON payment_intents FOR SELECT
    USING (order_id IN (SELECT id FROM product_orders WHERE buyer_id = auth.uid()));

CREATE POLICY "Companies can view payment intents for their orders"
    ON payment_intents FOR SELECT
    USING (order_id IN (
        SELECT id FROM product_orders
        WHERE company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid())
    ));

-- TRANSFERS
CREATE POLICY "Companies can view their transfers"
    ON stripe_transfers FOR SELECT
    USING (order_id IN (
        SELECT id FROM product_orders
        WHERE company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid())
    ));

-- REFUNDS
CREATE POLICY "Users can view refunds for their orders"
    ON refunds FOR SELECT
    USING (order_id IN (
        SELECT id FROM product_orders
        WHERE buyer_id = auth.uid()
        OR company_id IN (SELECT id FROM company_profiles WHERE owner_id = auth.uid())
    ));

-- =====================================================
-- ENSURE TRIGGER EXISTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- GRANTS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- VERIFY - Run this after to confirm all tables exist
-- =====================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
