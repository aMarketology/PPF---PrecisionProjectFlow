-- =====================================================
-- MESSAGES TABLE
-- Individual messages within conversations
-- =====================================================

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

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

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
