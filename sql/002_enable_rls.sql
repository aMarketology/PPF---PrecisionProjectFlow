-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
-- This protects your data so users can only see what they should
-- Run after 001_create_tables.sql
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES - Anyone can view, users can update their own
-- =====================================================

CREATE POLICY "Anyone can view profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- COMPANIES - Anyone can view, owners can manage
-- =====================================================

CREATE POLICY "Anyone can view companies"
    ON public.company_profiles FOR SELECT
    USING (true);

CREATE POLICY "Owners can update their company"
    ON public.company_profiles FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can create companies"
    ON public.company_profiles FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- =====================================================
-- PRODUCTS - Anyone can view, companies can manage
-- =====================================================

CREATE POLICY "Anyone can view active products"
    ON public.products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Companies can manage their products"
    ON public.products FOR ALL
    USING (
        company_id IN (
            SELECT id FROM public.company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

-- =====================================================
-- ORDERS - Buyers and sellers can view their orders
-- =====================================================

CREATE POLICY "Buyers can view their orders"
    ON public.product_orders FOR SELECT
    USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view their orders"
    ON public.product_orders FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM public.company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create orders"
    ON public.product_orders FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

-- =====================================================
-- STRIPE - Only company owners can see their accounts
-- =====================================================

CREATE POLICY "Owners can view their Stripe account"
    ON public.stripe_connect_accounts FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM public.company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage their Stripe account"
    ON public.stripe_connect_accounts FOR ALL
    USING (
        company_id IN (
            SELECT id FROM public.company_profiles 
            WHERE owner_id = auth.uid()
        )
    );

-- =====================================================
-- MESSAGING - Users can only see their conversations
-- =====================================================

CREATE POLICY "Users can view their conversations"
    ON public.conversations FOR SELECT
    USING (
        id IN (
            SELECT conversation_id 
            FROM public.conversation_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view participants"
    ON public.conversation_participants FOR SELECT
    USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join conversations"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- Done! Security enabled.
-- Next: Run 003_seed_vendors.sql to add test data
-- =====================================================
