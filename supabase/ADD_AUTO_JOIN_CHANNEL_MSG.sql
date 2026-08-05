-- ════════════════════════════════════════════════════════════════════
-- ADD_AUTO_JOIN_CHANNEL_MSG.sql
-- When a user joins a company (accepted invite or direct add),
-- 1. Auto-add them to the General channel
-- 2. Post system message in General: "X has joined the company channel"
--
-- Run in: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Trigger: on company_members status change to 'active', ──────
-- auto-join General channel + post welcome message.
CREATE OR REPLACE FUNCTION public.on_company_member_activated()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_channel_id   UUID;
  v_company_name TEXT;
  v_user_name    TEXT;
BEGIN
  -- Only fire when status changed TO 'active' (from invited or new insert)
  IF NEW.status != 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN RETURN NEW; END IF;

  -- Get names
  SELECT company_name INTO v_company_name FROM public.company_profiles WHERE id = NEW.company_id;
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

  -- Auto-join the General channel
  SELECT ensure_company_channel(NEW.company_id, NEW.user_id) INTO v_channel_id;

  -- Post system message in General channel
  IF v_channel_id IS NOT NULL AND v_user_name IS NOT NULL THEN
    INSERT INTO public.user_messages (
      conversation_id, sender_id, content, is_system_message, is_read, created_at, is_paid
    ) VALUES (
      v_channel_id,
      NEW.user_id,
      '👋 ' || v_user_name || ' has joined ' || COALESCE(v_company_name, 'the company') || '!',
      TRUE, TRUE, NOW(), TRUE
    );

    -- Update last_message_at so the General channel bumps to top
    UPDATE public.user_conversations SET last_message_at = NOW() WHERE id = v_channel_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply the trigger
DROP TRIGGER IF EXISTS trg_on_company_member_activated ON public.company_members;
CREATE TRIGGER trg_on_company_member_activated
  AFTER INSERT OR UPDATE OF status ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.on_company_member_activated();

-- ── 2. Also update the accept_company_invite RPC to post in General ─
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
  v_user_name TEXT;
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
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = auth.uid();

  -- Accept
  UPDATE public.company_members
  SET status = 'active', updated_at = NOW()
  WHERE company_id = p_company_id AND user_id = auth.uid();

  -- Join General channel
  SELECT ensure_company_channel(p_company_id, auth.uid()) INTO v_channel_id;

  -- Update profiles.company_id
  UPDATE public.profiles SET company_id = p_company_id, updated_at = NOW()
  WHERE id = auth.uid();

  -- Post welcome in General channel
  IF v_channel_id IS NOT NULL THEN
    INSERT INTO public.user_messages (
      conversation_id, sender_id, content, is_system_message, is_read, created_at, is_paid
    ) VALUES (
      v_channel_id, auth.uid(),
      '👋 ' || v_user_name || ' has joined ' || v_company_name || '!',
      TRUE, TRUE, NOW(), TRUE
    );
    UPDATE public.user_conversations SET last_message_at = NOW() WHERE id = v_channel_id;
  END IF;

  -- Notify inviter via DM
  SELECT full_name INTO v_inviter_name FROM public.profiles WHERE id = v_inviter_id;
  SELECT public.get_or_create_conversation(auth.uid(), v_inviter_id) INTO v_conversation_id;
  INSERT INTO public.user_messages (
    conversation_id, sender_id, content, is_system_message, is_read, created_at, is_paid
  ) VALUES (
    v_conversation_id, auth.uid(),
    '✅ **ACCEPTED:** ' || v_user_name || ' has joined "' || v_company_name || '"!',
    TRUE, TRUE, NOW(), TRUE
  );
  UPDATE public.user_conversations SET last_message_at = NOW() WHERE id = v_conversation_id;

  RETURN 'active';
END;
$$;

-- ── 3. Update ensure_company_channel to set company owner as 'owner' ─
CREATE OR REPLACE FUNCTION public.ensure_company_channel(
  p_company_id UUID,
  p_user_id    UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_conv_id UUID;
  v_is_owner BOOLEAN;
BEGIN
  -- Check if company channel already exists
  SELECT id INTO v_conv_id
  FROM public.user_conversations
  WHERE company_id = p_company_id
    AND conversation_type = 'channel'
    AND name = 'General'
  LIMIT 1;

  -- Create if not exists
  IF v_conv_id IS NULL THEN
    INSERT INTO public.user_conversations
      (conversation_type, name, description, is_public, company_id, created_by, last_message_at)
    VALUES
      ('channel', 'General', 'Company-wide announcements and discussion', TRUE, p_company_id, p_user_id, NOW())
    RETURNING id INTO v_conv_id;
  END IF;

  -- Determine role: owner if user is the company owner, member otherwise
  SELECT EXISTS (
    SELECT 1 FROM public.company_profiles WHERE id = p_company_id AND owner_id = p_user_id
  ) INTO v_is_owner;

  -- Ensure the user is a participant
  INSERT INTO public.conversation_participants
    (conversation_id, user_id, role)
  VALUES
    (v_conv_id, p_user_id, CASE WHEN v_is_owner THEN 'owner' ELSE 'member' END)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN v_conv_id;
END;
$$;