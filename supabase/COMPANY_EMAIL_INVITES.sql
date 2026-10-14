-- ════════════════════════════════════════════════════════════════════
-- COMPANY_EMAIL_INVITES.sql
-- Email-based company invitations (no existing account required).
--
-- When an owner/admin invites someone by email:
--   1. A row is written here (status='pending') with a unique token.
--   2. An email is sent with a signup link carrying ?type=...&invite=token.
--   3. The invitee signs up (account type pre-selected), then accepts.
--   4. accept_email_invite() flips them into company_members as 'active'.
--
-- Run in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.company_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member'
                 CHECK (role IN ('owner', 'admin', 'member')),
  account_type TEXT NOT NULL DEFAULT 'engineer'
                 CHECK (account_type IN ('engineer', 'client')),
  token        TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_company_invitations_email
  ON public.company_invitations (email);

CREATE INDEX IF NOT EXISTS idx_company_invitations_company
  ON public.company_invitations (company_id);

-- ── Accept an email invite after the user has created their account ──
-- Verifies the token is pending and the caller's email matches, then
-- adds the caller to the company and marks the invite accepted.
CREATE OR REPLACE FUNCTION public.accept_email_invite(
  p_token UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_role       TEXT;
  v_email      TEXT;
  v_invited_by UUID;
  v_company_name TEXT;
  v_channel_id UUID;
  v_conversation_id UUID;
BEGIN
  SELECT company_id, role, email, invited_by
    INTO v_company_id, v_role, v_email, v_invited_by
  FROM public.company_invitations
  WHERE token = p_token::text AND status = 'pending';

  IF v_company_id IS NULL THEN
    RETURN 'error:invalid_invite';
  END IF;

  -- The signed-in user's email must match the invited email.
  IF LOWER((SELECT email FROM auth.users WHERE id = auth.uid())) <> LOWER(v_email) THEN
    RETURN 'error:email_mismatch';
  END IF;

  -- Remove them from other companies (one-company rule).
  UPDATE public.company_members
     SET status = 'removed', updated_at = NOW()
   WHERE user_id = auth.uid() AND status = 'active' AND company_id != v_company_id;

  -- Add as an active member (idempotent).
  INSERT INTO public.company_members (company_id, user_id, role, status, invited_by)
  VALUES (v_company_id, auth.uid(), v_role, 'active', v_invited_by)
  ON CONFLICT (company_id, user_id)
  DO UPDATE SET status = 'active', role = EXCLUDED.role, updated_at = NOW();

  -- Auto-join the company's General channel if the helper exists.
  BEGIN
    SELECT public.ensure_company_channel(v_company_id, auth.uid()) INTO v_channel_id;
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  -- Update the profile's company_id.
  UPDATE public.profiles SET company_id = v_company_id, updated_at = NOW()
   WHERE id = auth.uid();

  -- Mark the invite accepted.
  UPDATE public.company_invitations
     SET status = 'accepted', accepted_at = NOW()
   WHERE token = p_token::text;

  SELECT company_name INTO v_company_name FROM public.company_profiles WHERE id = v_company_id;

  RETURN 'active';
END;
$$;

-- RLS: only super admins (service role bypasses anyway) and the invitee
-- (by email) may read this table. Writes go through server routes.
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read company invitations" ON public.company_invitations;
CREATE POLICY "Admins can read company invitations"
  ON public.company_invitations FOR SELECT
  USING (public.is_admin(auth.uid()));
