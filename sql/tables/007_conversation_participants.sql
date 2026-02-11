-- =====================================================
-- CONVERSATION_PARTICIPANTS TABLE
-- Links users to conversations
-- =====================================================

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

-- Indexes for performance
CREATE INDEX idx_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX idx_participants_user ON public.conversation_participants(user_id);
