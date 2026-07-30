-- =====================================================
-- CONTRACT-TO-UNLOCK MESSAGING TRIGGER
-- =====================================================
-- Date: July 30, 2026
-- 
-- Automatically unlocks the DM conversation between a
-- buyer and vendor when an order enters "in_progress"
-- status (vendor accepted, work began).
--
-- Architecture:
--   DB trigger (source of truth) + App layer (fallback)
--   The trigger guarantees consistency across webhook,
--   API, admin panel, or direct DB updates.
--
-- Key decisions:
--   - Unlock on 'in_progress' (not 'paid') — "paid" means
--     money moved but work hasn't started.
--   - Stay unlocked forever — re-gating behind 100 tokens
--     after a paid contract creates friction for revisions,
--     support, and repeat business.
--   - Uses is_unlocked (already exists, already checked by
--     send route). No need to wire up is_contracted.
-- =====================================================

-- ── 1. Add missing in_progress_at column ──────────────
-- Referenced by app/api/orders/[id]/update-status/route.ts
-- but was missing from the live schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'product_orders'
      AND column_name  = 'in_progress_at'
  ) THEN
    ALTER TABLE public.product_orders
      ADD COLUMN in_progress_at TIMESTAMPTZ;
    RAISE NOTICE 'Added in_progress_at column to product_orders';
  ELSE
    RAISE NOTICE 'in_progress_at already exists';
  END IF;
END;
$$;

-- ── 2. Trigger function ───────────────────────────────
-- Fires on UPDATE of status on product_orders.
-- When status changes TO 'in_progress', finds or creates
-- the DM between buyer and vendor, unlocks it, and inserts
-- a system message.
CREATE OR REPLACE FUNCTION public.auto_unlock_conversation_on_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_vendor_owner_id UUID;
  v_conversation_id UUID;
  v_system_message  TEXT;
BEGIN
  -- Only fire when transitioning TO 'in_progress'
  IF NEW.status != 'in_progress' OR OLD.status = 'in_progress' THEN
    RETURN NEW;
  END IF;

  -- Look up the vendor (company owner) for this order
  SELECT cp.owner_id INTO v_vendor_owner_id
  FROM company_profiles cp
  WHERE cp.id = NEW.company_id;

  IF v_vendor_owner_id IS NULL THEN
    RAISE WARNING 'Contract-unlock: no owner found for company_id %', NEW.company_id;
    RETURN NEW;
  END IF;

  -- Find or create the DM conversation between buyer and vendor
  SELECT public.get_or_create_conversation(NEW.buyer_id, v_vendor_owner_id)
  INTO v_conversation_id;

  IF v_conversation_id IS NULL THEN
    RAISE WARNING 'Contract-unlock: get_or_create_conversation returned NULL';
    RETURN NEW;
  END IF;

  -- Unlock the conversation (no-op if already unlocked)
  UPDATE user_conversations
  SET is_unlocked = TRUE
  WHERE id = v_conversation_id;

  -- Insert a system message to notify both parties
  v_system_message := '🤝 Contract started — you can now message freely';

  INSERT INTO user_messages (
    conversation_id,
    sender_id,
    content,
    is_system_message,
    is_read,
    created_at
  ) VALUES (
    v_conversation_id,
    NEW.buyer_id,  -- sender_id = buyer so both parties see it
    v_system_message,
    TRUE,          -- is_system_message = true
    TRUE,          -- is_read = true (system messages are always "read")
    NOW()
  );

  RAISE NOTICE 'Contract-unlock: conversation % unlocked for order %', v_conversation_id, NEW.id;

  RETURN NEW;
END;
$$;

-- ── 3. Apply the trigger ──────────────────────────────
DROP TRIGGER IF EXISTS trg_auto_unlock_conversation ON public.product_orders;

CREATE TRIGGER trg_auto_unlock_conversation
  AFTER UPDATE OF status ON public.product_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_unlock_conversation_on_contract();

-- ── 4. Backfill existing in_progress orders ───────────
-- For any orders already in 'in_progress' status whose
-- conversations are NOT yet unlocked, unlock them.
-- This is a one-time backfill, safe to run multiple times.
DO $$
DECLARE
  v_order RECORD;
  v_owner_id UUID;
  v_conv_id  UUID;
BEGIN
  FOR v_order IN
    SELECT po.id, po.buyer_id, po.company_id
    FROM public.product_orders po
    WHERE po.status = 'in_progress'
  LOOP
    SELECT cp.owner_id INTO v_owner_id
    FROM company_profiles cp
    WHERE cp.id = v_order.company_id;

    IF v_owner_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT public.get_or_create_conversation(v_order.buyer_id, v_owner_id)
    INTO v_conv_id;

    IF v_conv_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.user_conversations
    SET is_unlocked = TRUE
    WHERE id = v_conv_id AND is_unlocked = FALSE;
  END LOOP;

  RAISE NOTICE 'Contract-unlock backfill complete';
END;
$$;

-- =====================================================
-- ROLLBACK
-- =====================================================
-- To remove this feature:
--   DROP TRIGGER IF EXISTS trg_auto_unlock_conversation ON public.product_orders;
--   DROP FUNCTION IF EXISTS public.auto_unlock_conversation_on_contract();
--   ALTER TABLE public.product_orders DROP COLUMN IF EXISTS in_progress_at;