-- Add first-class typed message support for RFQ offer cards.
ALTER TABLE public.user_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS message_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_messages
  DROP CONSTRAINT IF EXISTS user_messages_message_type_check;

ALTER TABLE public.user_messages
  ADD CONSTRAINT user_messages_message_type_check
  CHECK (message_type IN ('text', 'system', 'company_invite', 'rfq_offer'));

CREATE INDEX IF NOT EXISTS idx_user_messages_type
  ON public.user_messages (message_type, created_at DESC);

-- Convert RFQ offers previously encoded inside the content string.
UPDATE public.user_messages
SET
  message_type = 'rfq_offer',
  message_metadata = substring(content FROM 12)::jsonb,
  content = 'New RFQ offer received'
WHERE content LIKE '[RFQ_OFFER]%';
