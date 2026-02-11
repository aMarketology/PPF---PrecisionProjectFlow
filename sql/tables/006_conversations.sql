-- =====================================================
-- CONVERSATIONS TABLE
-- Message threads between users
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

-- Indexes for performance
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_product ON public.conversations(product_id);
CREATE INDEX idx_conversations_order ON public.conversations(order_id);
CREATE INDEX idx_conversations_company ON public.conversations(company_id);
