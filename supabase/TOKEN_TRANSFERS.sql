-- ════════════════════════════════════════════════════════════════════
-- TOKEN_TRANSFERS.sql
-- Peer-to-peer token transfers between company/team members.
--
-- Rules:
--   - Sender must have sufficient balance
--   - Both users must be in the same company (active members)
--   - Logs both debit (sender) and credit (receiver) in the ledger
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. transfer_tokens RPC ──────────────────────────────────────────
-- Moves tokens from sender to receiver. Both must be active in the
-- same company. Returns the sender's new balance, or an error string.
CREATE OR REPLACE FUNCTION public.transfer_tokens(
  p_sender_id   UUID,
  p_receiver_id UUID,
  p_amount      INT,
  p_note        TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sender_balance   INT;
  v_receiver_balance INT;
  v_sender_company   UUID;
  v_receiver_company UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN 'error:amount must be positive';
  END IF;

  -- Sender cannot send to themselves
  IF p_sender_id = p_receiver_id THEN
    RETURN 'error:cannot send to yourself';
  END IF;

  -- Get sender's company and balance
  SELECT company_id, token_balance INTO v_sender_company, v_sender_balance
  FROM public.profiles WHERE id = p_sender_id;

  IF v_sender_company IS NULL THEN
    RETURN 'error:sender has no company';
  END IF;

  -- Get receiver's company
  SELECT company_id INTO v_receiver_company
  FROM public.profiles WHERE id = p_receiver_id;

  IF v_receiver_company IS NULL THEN
    RETURN 'error:receiver has no company';
  END IF;

  -- Both must be in the same company
  IF v_sender_company != v_receiver_company THEN
    RETURN 'error:not same company';
  END IF;

  -- Verify both are active members of that company
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = v_sender_company AND user_id = p_sender_id AND status = 'active'
  ) THEN
    RETURN 'error:sender not active member';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = v_receiver_company AND user_id = p_receiver_id AND status = 'active'
  ) THEN
    RETURN 'error:receiver not active member';
  END IF;

  -- Check balance
  IF v_sender_balance < p_amount THEN
    RETURN 'error:insufficient_tokens';
  END IF;

  -- Debit sender
  UPDATE public.profiles
  SET token_balance = token_balance - p_amount
  WHERE id = p_sender_id
  RETURNING token_balance INTO v_sender_balance;

  INSERT INTO public.token_transactions
    (user_id, amount, balance_after, type, description, reference_id)
  VALUES
    (p_sender_id, -p_amount, v_sender_balance, 'transfer_out',
     'Sent ' || p_amount || ' tokens to team member' ||
     CASE WHEN p_note IS NOT NULL THEN ': ' || p_note ELSE '' END,
     p_receiver_id);

  -- Credit receiver
  UPDATE public.profiles
  SET token_balance = token_balance + p_amount
  WHERE id = p_receiver_id
  RETURNING token_balance INTO v_receiver_balance;

  INSERT INTO public.token_transactions
    (user_id, amount, balance_after, type, description, reference_id)
  VALUES
    (p_receiver_id, p_amount, v_receiver_balance, 'transfer_in',
     'Received ' || p_amount || ' tokens from team member' ||
     CASE WHEN p_note IS NOT NULL THEN ': ' || p_note ELSE '' END,
     p_sender_id);

  RETURN v_sender_balance::TEXT;
END;
$$;

-- ── 2. get_company_balance RPC ──────────────────────────────────────
-- Returns the total token balance of all active members in a company.
CREATE OR REPLACE FUNCTION public.get_company_balance(
  p_company_id UUID
) RETURNS INT
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(SUM(p.token_balance), 0)
  FROM public.profiles p
  JOIN public.company_members cm ON cm.user_id = p.id
  WHERE cm.company_id = p_company_id AND cm.status = 'active';
$$;