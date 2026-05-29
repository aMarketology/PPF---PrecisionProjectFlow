-- ════════════════════════════════════════════════════════════════════
-- $ProjectFlow Token Ledger — Unified Token Economy for PPF
-- ════════════════════════════════════════════════════════════════════
-- This REPLACES the old split system (token_purchases + bare add/spend).
-- It introduces a single source of truth: `token_transactions` — an
-- append-only ledger that records EVERY credit and debit. The
-- `profiles.token_balance` column stays as the fast-read wallet, and the
-- ledger is the auditable history behind it.
--
-- Safe to run multiple times (idempotent).
-- Run in: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Wallet column (fast read) ────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS token_balance INT NOT NULL DEFAULT 0;

-- ── 2. The unified ledger ───────────────────────────────────────────
-- Every row is one movement of $ProjectFlow tokens.
--   amount > 0  → credit (purchase, bonus, refund)
--   amount < 0  → debit  (message send, future spend types)
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount             INT         NOT NULL,                 -- +credit / -debit
  balance_after      INT         NOT NULL,                 -- snapshot for audit
  type               TEXT        NOT NULL,                 -- 'purchase' | 'spend' | 'bonus' | 'refund'
  description        TEXT,
  stripe_payment_id  TEXT,                                 -- set on purchases
  reference_id       UUID,                                 -- e.g. conversation/message id
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_tx_user    ON public.token_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_tx_stripe  ON public.token_transactions(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_token_tx_type    ON public.token_transactions(type);

-- Prevent double-crediting the same Stripe payment (idempotency at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_token_tx_stripe
  ON public.token_transactions(stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own token transactions" ON public.token_transactions;
CREATE POLICY "Users see own token transactions" ON public.token_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ── 3. add_tokens — credit the wallet + log the ledger ──────────────
-- Matches the signature the app calls:
--   add_tokens(p_user_id, p_amount, p_description, p_stripe_payment_id)
CREATE OR REPLACE FUNCTION public.add_tokens(
  p_user_id           UUID,
  p_amount            INT,
  p_description       TEXT DEFAULT NULL,
  p_stripe_payment_id TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
  v_balance INT;
  v_type    TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'add_tokens amount must be positive';
  END IF;

  -- Idempotency: if this Stripe payment was already credited, return current balance
  IF p_stripe_payment_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.token_transactions
      WHERE stripe_payment_id = p_stripe_payment_id
    ) THEN
      SELECT token_balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
      RETURN v_balance;
    END IF;
  END IF;

  UPDATE public.profiles
    SET token_balance = token_balance + p_amount
    WHERE id = p_user_id
    RETURNING token_balance INTO v_balance;

  v_type := CASE WHEN p_stripe_payment_id IS NOT NULL THEN 'purchase' ELSE 'bonus' END;

  INSERT INTO public.token_transactions
    (user_id, amount, balance_after, type, description, stripe_payment_id)
  VALUES
    (p_user_id, p_amount, v_balance, v_type, p_description, p_stripe_payment_id);

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. spend_tokens — debit the wallet + log the ledger ─────────────
-- Returns NULL on success, 'insufficient_tokens' if the user is broke.
--   spend_tokens(p_user_id, p_amount, p_description, p_reference_id)
CREATE OR REPLACE FUNCTION public.spend_tokens(
  p_user_id      UUID,
  p_amount       INT,
  p_description  TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE v_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'spend_tokens amount must be positive';
  END IF;

  -- Lock the row to prevent race conditions on concurrent sends
  SELECT token_balance INTO v_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN 'insufficient_tokens';
  END IF;

  UPDATE public.profiles
    SET token_balance = token_balance - p_amount
    WHERE id = p_user_id
    RETURNING token_balance INTO v_balance;

  INSERT INTO public.token_transactions
    (user_id, amount, balance_after, type, description, reference_id)
  VALUES
    (p_user_id, -p_amount, v_balance, 'spend', p_description, p_reference_id);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. refund_tokens — credit back on a failed/cancelled spend ──────
CREATE OR REPLACE FUNCTION public.refund_tokens(
  p_user_id      UUID,
  p_amount       INT,
  p_description  TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS INT AS $$
DECLARE v_balance INT;
BEGIN
  UPDATE public.profiles
    SET token_balance = token_balance + p_amount
    WHERE id = p_user_id
    RETURNING token_balance INTO v_balance;

  INSERT INTO public.token_transactions
    (user_id, amount, balance_after, type, description, reference_id)
  VALUES
    (p_user_id, p_amount, v_balance, 'refund', p_description, p_reference_id);

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. Backfill: migrate old token_purchases rows into the ledger ───
-- Only runs if the legacy table exists and rows aren't already migrated.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'token_purchases'
  ) THEN
    INSERT INTO public.token_transactions
      (user_id, amount, balance_after, type, description, stripe_payment_id, created_at)
    SELECT
      tp.user_id,
      tp.tokens,
      tp.tokens,                       -- balance_after unknown historically; best effort
      'purchase',
      'Legacy purchase (migrated)',
      tp.stripe_payment_id,
      tp.created_at
    FROM public.token_purchases tp
    WHERE tp.stripe_payment_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM public.token_transactions tt
         WHERE tt.stripe_payment_id = tp.stripe_payment_id
       );
  END IF;
END $$;

-- ── 7. Helper view: per-user token summary ──────────────────────────
CREATE OR REPLACE VIEW public.token_account_summary AS
SELECT
  p.id                                                       AS user_id,
  p.full_name,
  p.token_balance                                           AS current_balance,
  COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount END), 0) AS lifetime_credited,
  COALESCE(SUM(CASE WHEN t.amount < 0 THEN -t.amount END), 0) AS lifetime_spent,
  COUNT(t.id)                                               AS total_transactions
FROM public.profiles p
LEFT JOIN public.token_transactions t ON t.user_id = p.id
GROUP BY p.id, p.full_name, p.token_balance;

-- ════════════════════════════════════════════════════════════════════
-- Done. The $ProjectFlow token economy now has a full audit ledger.
-- ════════════════════════════════════════════════════════════════════
