-- ════════════════════════════════════════════════════════════════════
-- COMPANY_INVITES.sql
-- Full invite/accept/decline flow for company membership.
-- Users can only be active in one company at a time.
--
-- Flow:
--   1. Admin invites user → system DM sent to invitee
--   2. Invitee clicks Accept → status='active', joins General channel
--   3. Invitee clicks Decline → status='declined', inviter notified
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Add 'declined' status to company_members ────────────────────
ALTER TABLE public.company_members
  DROP CONSTRAINT IF EXISTS company_members_status_check;

ALTER TABLE public.company_members
  ADD CONSTRAINT company_members_status_check
  CHECK (status IN ('active', 'invited', 'removed', 'declined'));

-- ── 2. send_company_invite RPC ──────────────────────────────────────
-- Creates an invited member row + sends a system DM to the invitee.
-- Only company owners/admins can invite.
CREATE OR REPLACE FUNCTION public.send_company_invite(
  p_company_id UUID,
  p_user_id    UUID,
  p_role       TEXT DEFAULT 'member'
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_company_name TEXT;
  v_inviter_name TEXT;
  v_conversation_id UUID;
  v_existing TEXT;
  v_has_other_company BOOLEAN;
BEGIN
  -- Verify caller is owner or admin of the company
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.company_profiles
    WHERE id = p_company_id AND owner_id = auth.uid()
  ) THEN
    RETURN 'error:not_admin';
  END IF;

  -- Check if user already has an active membership in another company
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = p_user_id AND status = 'active' AND company_id != p_company_id
  ) INTO v_has_other_company;

  -- Check existing status for this company
  SELECT status INTO v_existing FROM public.company_members
  WHERE company_id = p_company_id AND user_id = p_user_id;

  IF v_existing = 'active' THEN
    RETURN 'already_member';
  END IF;

  -- Upsert the membership row as 'invited'
  INSERT INTO public.company_members (company_id, user_id, role, status, invited_by)
  VALUES (p_company_id, p_user_id, p_role, 'invited', auth.uid())
  ON CONFLICT (company_id, user_id)
  DO UPDATE SET status = 'invited', role = p_role, invited_by = auth.uid(), updated_at = NOW();

  -- Get names
  SELECT company_name INTO v_company_name FROM public.company_profiles WHERE id = p_company_id;
  SELECT full_name INTO v_inviter_name FROM public.profiles WHERE id = auth.uid();

  -- Get or create a DM between inviter and invitee
  SELECT public.get_or_create_conversation(auth.uid(), p_user_id) INTO v_conversation_id;

  -- Insert system message with invite
  INSERT INTO public.user_messages (
    conversation_id, sender_id, content, is_system_message, is_read, created_at, is_paid
  ) VALUES (
    v_conversation_id, auth.uid(),
    CASE WHEN v_has_other_company THEN
      '📨 **INVITE:** You have been invited to join "' || v_company_name || '" by ' || COALESCE(v_inviter_name, 'Someone') ||
      '. Accepting will move you from your current company. **[Accept]** or **[Decline]**'
    ELSE
      '📨 **INVITE:** You have been invited to join "' || v_company_name || '" by ' || COALESCE(v_inviter_name, 'Someone') ||
      '. **[Accept]** or **[Decline]**'
    END,
    TRUE, TRUE, NOW(), TRUE
  );

  UPDATE public.user_conversations SET last_message_at = NOW() WHERE id = v_conversation_id;

  RETURN 'invited';
END;
$$;

-- ── 3. accept_company_invite RPC ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_company_invite(
  p_company_id UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_company_name TEXT;
  v_inviter_id UUID;
  v_inviter_name TEXT;
  v_conversation_id UUID;
  v_channel_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = p_company_id AND user_id = auth.uid() AND status = 'invited'
  ) THEN
    RETURN 'error:no_invite';
  END IF;

  -- Remove from other companies (one-company rule)
  UPDATE public.company_members
  SET status = 'removed', updated_at = NOW()
  WHERE user_id = auth.uid() AND status = 'active' AND company_id != p_company_id;

  SELECT company_name INTO v_company_name FROM public.company_profiles WHERE id = p_company_id;
  SELECT invited_by INTO v_inviter_id FROM public.company_members
  WHERE company_id = p_company_id AND user_id = auth.uid();

  -- Accept
  UPDATE public.company_members
  SET status = 'active', updated_at = NOW()
  WHERE company_id = p_company_id AND user_id = auth.uid();

  -- Join General channel
  SELECT ensure_company_channel(p_company_id, auth.uid()) INTO v_channel_id;

  -- Update profiles.company_id
  UPDATE public.profiles SET company_id = p_company_id, updated_at = NOW()
  WHERE id = auth.uid();

  -- Notify inviter
  SELECT full_name INTO v_inviter_name FROM public.profiles WHERE id = v_inviter_id;
  SELECT public.get_or_create_conversation(auth.uid(), v_inviter_id) INTO v_conversation_id;
  INSERT INTO public.user_messages (
    conversation_id, sender_id, content, is_system_message, is_read, created_at, is_paid
  ) VALUES (
    v_conversation_id, auth.uid(),
    '✅ **ACCEPTED:** ' || COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'User') ||
    ' has joined "' || v_company_name || '"!',
    TRUE, TRUE, NOW(), TRUE
  );
  UPDATE public.user_conversations SET last_message_at = NOW() WHERE id = v_conversation_id;

  RETURN 'active';
END;
$$;

-- ── 4. decline_company_invite RPC ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.decline_company_invite(
  p_company_id UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_company_name TEXT;
  v_inviter_id UUID;
  v_conversation_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = p_company_id AND user_id = auth.uid() AND status = 'invited'
  ) THEN
    RETURN 'error:no_invite';
  END IF;

  SELECT company_name INTO v_company_name FROM public.company_profiles WHERE id = p_company_id;
  SELECT invited_by INTO v_inviter_id FROM public.company_members
  WHERE company_id = p_company_id AND user_id = auth.uid();

  UPDATE public.company_members SET status = 'declined', updated_at = NOW()
  WHERE company_id = p_company_id AND user_id = auth.uid();

  IF v_inviter_id IS NOT NULL THEN
    SELECT public.get_or_create_conversation(auth.uid(), v_inviter_id) INTO v_conversation_id;
    INSERT INTO public.user_messages (
      conversation_id, sender_id, content, is_system_message, is_read, created_at, is_paid
    ) VALUES (
      v_conversation_id, auth.uid(),
      '❌ **DECLINED:** ' || COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'User') ||
      ' declined the invitation to join "' || v_company_name || '".',
      TRUE, TRUE, NOW(), TRUE
    );
    UPDATE public.user_conversations SET last_message_at = NOW() WHERE id = v_conversation_id;
  END IF;

  RETURN 'declined';
END;
$$;

-- ── 5. Get pending invites RPC ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pending_invites(
  p_user_id UUID
) RETURNS TABLE(
  company_id UUID,
  company_name TEXT,
  invited_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT
    cm.company_id,
    cp.company_name,
    p.full_name AS invited_by_name,
    cm.created_at
  FROM public.company_members cm
  JOIN public.company_profiles cp ON cp.id = cm.company_id
  LEFT JOIN public.profiles p ON p.id = cm.invited_by
  WHERE cm.user_id = p_user_id AND cm.status = 'invited'
  ORDER BY cm.created_at DESC;
$$;