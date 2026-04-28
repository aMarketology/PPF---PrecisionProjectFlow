-- TOKENS.sql — dead simple token system
-- token_balance lives on profiles. That's it.
-- ─────────────────────────────────────────

-- 1. token_balance column on profiles (the only "wallet")
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS token_balance INT NOT NULL DEFAULT 0;

-- 2. Purchase log (for receipts only — not required for balance logic)
CREATE TABLE IF NOT EXISTS public.token_purchases (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens            INT         NOT NULL,
  stripe_payment_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own purchases" ON public.token_purchases;
CREATE POLICY "Users see own purchases" ON public.token_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- 3. add_tokens — call after Stripe payment succeeds
CREATE OR REPLACE FUNCTION public.add_tokens(
  p_user_id UUID, p_amount INT, p_stripe_payment_id TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE v_balance INT;
BEGIN
  UPDATE public.profiles
    SET token_balance = token_balance + p_amount
    WHERE id = p_user_id
    RETURNING token_balance INTO v_balance;
  INSERT INTO public.token_purchases (user_id, tokens, stripe_payment_id)
    VALUES (p_user_id, p_amount, p_stripe_payment_id);
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. spend_tokens — returns NULL on success, 'insufficient_tokens' if broke
CREATE OR REPLACE FUNCTION public.spend_tokens(
  p_user_id UUID, p_amount INT, p_description TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE v_balance INT;
BEGIN
  SELECT token_balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
  IF v_balance IS NULL OR v_balance < p_amount THEN RETURN 'insufficient_tokens'; END IF;
  UPDATE public.profiles SET token_balance = token_balance - p_amount WHERE id = p_user_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
