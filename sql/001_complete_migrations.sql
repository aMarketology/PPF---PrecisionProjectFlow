-- =====================================================
-- PRECISION PROJECT FLOW - COMPLETE DATABASE SETUP
-- =====================================================
-- Run this file in Supabase SQL Editor to set up entire database
-- This includes all migrations and is safe to run multiple times
-- =====================================================
-- Created: February 11, 2026
-- Order: Run migrations 001-009 in sequence
-- =====================================================

-- =====================================================
-- MIGRATION 001: USER PROFILES
-- =====================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    user_type TEXT CHECK (user_type IN ('client', 'engineer')),
    bio TEXT,
    location TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- MIGRATION 002: COMPANY PROFILES AND PROJECTS
-- =====================================================

-- Create company_profiles table
CREATE TABLE IF NOT EXISTS public.company_profiles (
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
    country TEXT DEFAULT 'United States',
    logo_url TEXT,
    specialties TEXT[],
    certifications TEXT[],
    years_in_business INTEGER,
    verified BOOLEAN DEFAULT FALSE, -- Note: some seed files use 'is_verified'
    is_verified BOOLEAN DEFAULT FALSE, -- Added for compatibility
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    claimed_by UUID REFERENCES auth.users(id),
    verification_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create portfolio_projects table
CREATE TABLE IF NOT EXISTS public.portfolio_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    project_type TEXT,
    completion_date DATE,
    budget_range TEXT,
    location TEXT,
    images TEXT[],
    technologies TEXT[],
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    permissions TEXT[],
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Company RLS Policies
CREATE POLICY "Anyone can view verified companies"
    ON public.company_profiles FOR SELECT
    USING (verified = true OR is_verified = true OR owner_id = auth.uid());

CREATE POLICY "Company owners can update their company"
    ON public.company_profiles FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Engineers can create companies"
    ON public.company_profiles FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Portfolio RLS Policies
CREATE POLICY "Anyone can view portfolio projects"
    ON public.portfolio_projects FOR SELECT
    USING (true);

CREATE POLICY "Company owners can manage projects"
    ON public.portfolio_projects FOR ALL
    USING (company_id IN (
        SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()
    ));

-- Team RLS Policies
CREATE POLICY "Anyone can view team members"
    ON public.team_members FOR SELECT
    USING (true);

CREATE POLICY "Company owners can manage team"
    ON public.team_members FOR ALL
    USING (company_id IN (
        SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()
    ));

-- =====================================================
-- MIGRATION 003: COMPANY MESSAGING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send messages to companies"
    ON public.company_messages FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Company owners can view their messages"
    ON public.company_messages FOR SELECT
    USING (company_id IN (
        SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can update message status"
    ON public.company_messages FOR UPDATE
    USING (company_id IN (
        SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()
    ));

-- =====================================================
-- MIGRATION 004: USER-TO-USER MESSAGING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their conversations"
    ON public.conversations FOR SELECT
    USING (id IN (
        SELECT conversation_id FROM public.conversation_participants
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (true);

-- Participants policies
CREATE POLICY "Users can view conversation participants"
    ON public.conversation_participants FOR SELECT
    USING (conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can join conversations"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their participation"
    ON public.conversation_participants FOR UPDATE
    USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can send messages to their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT conversation_id FROM public.conversation_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages"
    ON public.messages FOR UPDATE
    USING (sender_id = auth.uid());

-- =====================================================
-- MIGRATION 005: STRIPE PAYMENTS AND PRODUCTS
-- =====================================================

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price BIGINT NOT NULL, -- Price in cents
    currency TEXT DEFAULT 'USD',
    category TEXT,
    image_url TEXT,
    delivery_time_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    requires_consultation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe Connect accounts
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE UNIQUE,
    stripe_account_id TEXT UNIQUE NOT NULL,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    details_submitted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment intents
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.company_profiles(id),
    amount BIGINT NOT NULL, -- Amount in cents
    currency TEXT DEFAULT 'USD',
    platform_fee BIGINT, -- Platform fee in cents
    status TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product orders
CREATE TABLE IF NOT EXISTS public.product_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    product_id UUID REFERENCES public.products(id),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES auth.users(id),
    product_name TEXT NOT NULL,
    product_description TEXT,
    product_price BIGINT NOT NULL, -- Price in cents at time of order
    quantity INTEGER DEFAULT 1,
    platform_fee BIGINT, -- Platform fee in cents
    total_amount BIGINT NOT NULL, -- Total in cents
    stripe_payment_intent_id TEXT,
    status TEXT DEFAULT 'pending',
    delivery_address JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Anyone can view active products"
    ON public.products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Company owners can manage their products"
    ON public.products FOR ALL
    USING (company_id IN (
        SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()
    ));

-- Stripe Connect policies
CREATE POLICY "Company owners can view their Stripe account"
    ON public.stripe_connect_accounts FOR SELECT
    USING (company_id IN (
        SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Company owners can manage their Stripe account"
    ON public.stripe_connect_accounts FOR ALL
    USING (company_id IN (
        SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()
    ));

-- Payment intents policies
CREATE POLICY "Users can view their payment intents"
    ON public.payment_intents FOR SELECT
    USING (
        customer_id = auth.uid() OR
        company_id IN (SELECT id FROM public.company_profiles WHERE owner_id = auth.uid())
    );

-- Orders policies
CREATE POLICY "Buyers can view their orders"
    ON public.product_orders FOR SELECT
    USING (buyer_id = auth.uid());

CREATE POLICY "Companies can view their orders"
    ON public.product_orders FOR SELECT
    USING (company_id IN (
        SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Authenticated users can create orders"
    ON public.product_orders FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

-- =====================================================
-- MIGRATION 006: REVIEWS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.product_orders(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    response TEXT,
    response_date TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, reviewer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified reviews"
    ON public.reviews FOR SELECT
    USING (is_verified = true);

CREATE POLICY "Buyers can create reviews for their orders"
    ON public.reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id AND
        order_id IN (SELECT id FROM public.product_orders WHERE buyer_id = auth.uid())
    );

CREATE POLICY "Company owners can respond to reviews"
    ON public.reviews FOR UPDATE
    USING (company_id IN (
        SELECT id FROM public.company_profiles WHERE owner_id = auth.uid()
    ));

-- =====================================================
-- MIGRATION 007: COMPANY CLAIMS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    claimant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    claimant_name TEXT NOT NULL,
    claimant_email TEXT NOT NULL,
    claimant_phone TEXT,
    position TEXT,
    claim_reason TEXT NOT NULL,
    verification_documents TEXT[],
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create claims"
    ON public.company_claims FOR INSERT
    WITH CHECK (auth.uid() = claimant_id);

CREATE POLICY "Users can view their own claims"
    ON public.company_claims FOR SELECT
    USING (claimant_id = auth.uid());

CREATE POLICY "Admins can view all claims"
    ON public.company_claims FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND user_type = 'admin'
        )
    );

CREATE POLICY "Admins can update claims"
    ON public.company_claims FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND user_type = 'admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_claims_status ON public.company_claims(status);
CREATE INDEX IF NOT EXISTS idx_company_claims_company ON public.company_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_claimed ON public.company_profiles(is_claimed);

-- =====================================================
-- COMPLETE!
-- =====================================================
-- All migrations have been applied
-- Next: Run seed files to populate with data
-- =====================================================
