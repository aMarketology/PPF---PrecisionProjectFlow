-- User-to-User Direct Messaging System
-- This migration creates a universal messaging system where any user can message any other user

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS user_messages CASCADE;
DROP TABLE IF EXISTS user_conversations CASCADE;

-- Drop existing functions that may have conflicting signatures
DROP FUNCTION IF EXISTS get_or_create_conversation(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_unread_message_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_user_conversations_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_user_messages_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_last_message() CASCADE;

-- Create user_conversations table
-- Tracks direct message conversations between two users
CREATE TABLE user_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_one_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_two_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure users can't create duplicate conversations
    CONSTRAINT unique_conversation UNIQUE (participant_one_id, participant_two_id),
    -- Prevent self-messaging
    CONSTRAINT different_participants CHECK (participant_one_id != participant_two_id)
);

-- Create user_messages table
-- Stores all direct messages between users
CREATE TABLE user_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES user_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_user_conversations_participant_one ON user_conversations(participant_one_id);
CREATE INDEX idx_user_conversations_participant_two ON user_conversations(participant_two_id);
CREATE INDEX idx_user_conversations_last_message ON user_conversations(last_message_at DESC);

CREATE INDEX idx_user_messages_conversation ON user_messages(conversation_id);
CREATE INDEX idx_user_messages_sender ON user_messages(sender_id);
CREATE INDEX idx_user_messages_created ON user_messages(created_at);
CREATE INDEX idx_user_messages_unread ON user_messages(conversation_id, is_read) WHERE is_read = FALSE;

-- Create auto-update triggers
CREATE OR REPLACE FUNCTION update_user_conversations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_conversations_timestamp
    BEFORE UPDATE ON user_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_conversations_timestamp();

CREATE OR REPLACE FUNCTION update_user_messages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_messages_timestamp
    BEFORE UPDATE ON user_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_user_messages_timestamp();

-- Update conversation's last_message_at when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON user_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Enable Row Level Security
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_conversations
-- Users can view conversations they're a participant in
CREATE POLICY "Users can view their conversations"
    ON user_conversations FOR SELECT
    USING (
        auth.uid() = participant_one_id 
        OR auth.uid() = participant_two_id
    );

-- Users can create conversations with other users
CREATE POLICY "Users can create conversations"
    ON user_conversations FOR INSERT
    WITH CHECK (
        auth.uid() = participant_one_id 
        OR auth.uid() = participant_two_id
    );

-- Users can update conversations they're part of
CREATE POLICY "Users can update their conversations"
    ON user_conversations FOR UPDATE
    USING (
        auth.uid() = participant_one_id 
        OR auth.uid() = participant_two_id
    );

-- RLS Policies for user_messages
-- Users can view messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations"
    ON user_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_conversations
            WHERE user_conversations.id = user_messages.conversation_id
            AND (
                user_conversations.participant_one_id = auth.uid()
                OR user_conversations.participant_two_id = auth.uid()
            )
        )
    );

-- Users can send messages in conversations they're part of
CREATE POLICY "Users can send messages in their conversations"
    ON user_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM user_conversations
            WHERE user_conversations.id = conversation_id
            AND (
                user_conversations.participant_one_id = auth.uid()
                OR user_conversations.participant_two_id = auth.uid()
            )
        )
    );

-- Users can update their own messages (for read status)
CREATE POLICY "Users can update messages in their conversations"
    ON user_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_conversations
            WHERE user_conversations.id = user_messages.conversation_id
            AND (
                user_conversations.participant_one_id = auth.uid()
                OR user_conversations.participant_two_id = auth.uid()
            )
        )
    );

-- Helper function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    user_one_id UUID,
    user_two_id UUID
)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    normalized_user_one UUID;
    normalized_user_two UUID;
BEGIN
    -- Normalize user IDs (always store smaller UUID first for consistency)
    IF user_one_id < user_two_id THEN
        normalized_user_one := user_one_id;
        normalized_user_two := user_two_id;
    ELSE
        normalized_user_one := user_two_id;
        normalized_user_two := user_one_id;
    END IF;

    -- Try to find existing conversation (checking both directions)
    SELECT id INTO conversation_id
    FROM user_conversations
    WHERE (participant_one_id = normalized_user_one AND participant_two_id = normalized_user_two)
       OR (participant_one_id = normalized_user_two AND participant_two_id = normalized_user_one)
    LIMIT 1;

    -- If conversation doesn't exist, create it
    IF conversation_id IS NULL THEN
        INSERT INTO user_conversations (participant_one_id, participant_two_id)
        VALUES (normalized_user_one, normalized_user_two)
        RETURNING id INTO conversation_id;
    END IF;

    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM user_messages m
    INNER JOIN user_conversations c ON m.conversation_id = c.id
    WHERE (c.participant_one_id = user_id OR c.participant_two_id = user_id)
      AND m.sender_id != user_id
      AND m.is_read = FALSE;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON user_conversations TO authenticated;
GRANT ALL ON user_messages TO authenticated;

-- Add helpful comments
COMMENT ON TABLE user_conversations IS 'Direct message conversations between two users';
COMMENT ON TABLE user_messages IS 'Individual messages in user-to-user conversations';
COMMENT ON FUNCTION get_or_create_conversation IS 'Gets existing conversation or creates new one between two users';
COMMENT ON FUNCTION get_unread_message_count IS 'Returns total unread message count for a user';
