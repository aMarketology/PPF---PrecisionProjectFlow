-- =====================================================
-- PRECISION PROJECT FLOW - CREATE TABLES
-- =====================================================
-- Simple, clean database schema
-- Run after 000_reset_database.sql
-- =====================================================

-- =====================================================
-- 1. USER PROFILES
-- =====================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    user_type TEXT CHECK (user_type IN ('client', 'engineer')),
    bio TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. COMPANIES
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

-- =====================================================
-- 3. PRODUCTS/SERVICES
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. ORDERS
-- =====================================================

CREATE TABLE public.product_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    product_id UUID REFERENCES public.products(id),
    company_id UUID REFERENCES public.company_profiles(id),
    buyer_id UUID REFERENCES auth.users(id),
    product_name TEXT NOT NULL,
    product_price BIGINT NOT NULL, -- in cents
    platform_fee BIGINT, -- in cents (10% of price)
    total_amount BIGINT NOT NULL, -- in cents
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. STRIPE CONNECT
-- =====================================================

CREATE TABLE public.stripe_connect_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE UNIQUE,
    stripe_account_id TEXT UNIQUE NOT NULL,
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. MESSAGING SYSTEM
-- =====================================================

CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT,
    -- Optional: Link to specific product or order for context
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.product_orders(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE SET NULL,
    -- Track conversation status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'resolved')),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Track when each participant last read
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    -- Track if participant has muted notifications
    is_muted BOOLEAN DEFAULT false,
    -- Track when participant joined
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    -- Optional: Attachments (store URLs)
    attachments JSONB,
    -- Track if message has been edited
    edited_at TIMESTAMPTZ,
    -- System messages (e.g., "Order placed", "Quote sent")
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MESSAGING FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Update conversation's last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_created
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Function: Get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_count(user_uuid UUID)
RETURNS TABLE (
    conversation_id UUID,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.conversation_id,
        COUNT(*) as unread_count
    FROM public.messages m
    INNER JOIN public.conversation_participants cp 
        ON m.conversation_id = cp.conversation_id
    WHERE cp.user_id = user_uuid
        AND m.created_at > cp.last_read_at
        AND m.sender_id != user_uuid
    GROUP BY m.conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES (for performance)
-- =====================================================

CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_orders_buyer ON public.product_orders(buyer_id);
CREATE INDEX idx_orders_company ON public.product_orders(company_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);

-- =====================================================
-- Done! Tables created.
-- Next: Run 002_enable_rls.sql
-- =====================================================
