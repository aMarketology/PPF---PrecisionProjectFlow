-- =====================================================
-- CREATE ALL TABLES - MASTER FILE
-- =====================================================
-- This file creates all tables in the correct order
-- Run this after 000_reset_database.sql
-- =====================================================
-- 
-- OPTION 1: Run this file (all tables at once)
-- OPTION 2: Run individual files in /sql/tables/ folder
-- 
-- Individual files available:
-- - 001_profiles.sql
-- - 002_company_profiles.sql
-- - 003_products.sql
-- - 004_product_orders.sql
-- - 005_stripe_connect_accounts.sql
-- - 006_conversations.sql
-- - 007_conversation_participants.sql
-- - 008_messages.sql
-- =====================================================

-- =====================================================
-- TABLE 1: PROFILES
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

CREATE INDEX idx_profiles_user_type ON public.profiles(user_type);

-- =====================================================
-- TABLE 2: COMPANY_PROFILES
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

CREATE INDEX idx_company_owner ON public.company_profiles(owner_id);
CREATE INDEX idx_company_verified ON public.company_profiles(is_verified);
CREATE INDEX idx_company_location ON public.company_profiles(city, state);

-- =====================================================
-- TABLE 3: PRODUCTS
-- =====================================================

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price BIGINT NOT NULL,
    category TEXT,
    delivery_time_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    requires_consultation BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_price ON public.products(price);

-- =====================================================
-- TABLE 4: PRODUCT_ORDERS
-- =====================================================

CREATE TABLE public.product_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    product_id UUID REFERENCES public.products(id),
    company_id UUID REFERENCES public.company_profiles(id),
    buyer_id UUID REFERENCES auth.users(id),
    product_name TEXT NOT NULL,
    product_price BIGINT NOT NULL,
    platform_fee BIGINT,
    total_amount BIGINT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_buyer ON public.product_orders(buyer_id);
CREATE INDEX idx_orders_company ON public.product_orders(company_id);
CREATE INDEX idx_orders_status ON public.product_orders(status);
CREATE INDEX idx_orders_created ON public.product_orders(created_at DESC);

-- =====================================================
-- TABLE 5: STRIPE_CONNECT_ACCOUNTS
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

CREATE INDEX idx_stripe_company ON public.stripe_connect_accounts(company_id);

-- =====================================================
-- TABLE 6: CONVERSATIONS
-- =====================================================

CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.product_orders(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'resolved')),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_product ON public.conversations(product_id);
CREATE INDEX idx_conversations_order ON public.conversations(order_id);
CREATE INDEX idx_conversations_company ON public.conversations(company_id);

-- =====================================================
-- TABLE 7: CONVERSATION_PARTICIPANTS
-- =====================================================

CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX idx_participants_user ON public.conversation_participants(user_id);

-- =====================================================
-- TABLE 8: MESSAGES
-- =====================================================

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB,
    edited_at TIMESTAMPTZ,
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

-- =====================================================
-- MESSAGING FUNCTIONS & TRIGGERS
-- =====================================================

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
-- Done! All 8 tables created.
-- Next: Run 002_enable_rls.sql for security policies
-- =====================================================
