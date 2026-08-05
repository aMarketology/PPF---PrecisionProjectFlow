require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Create each function individually via the REST API using SQL
async function createFunction(name, sql) {
  const body = JSON.stringify({ query: sql });
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body,
  });
  return res;
}

(async () => {
  // Create transfer_tokens
  console.log('Creating transfer_tokens...');
  const { data: d1, error: e1 } = await svc.rpc('exec_sql_create', { 
    sql_text: `
      CREATE OR REPLACE FUNCTION public.transfer_tokens(
        p_sender_id UUID, p_receiver_id UUID, p_amount INT, p_note TEXT DEFAULT NULL
      ) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $func$
      DECLARE
        v_sender_balance INT; v_receiver_balance INT;
        v_sender_company UUID; v_receiver_company UUID;
      BEGIN
        IF p_amount <= 0 THEN RETURN 'error:amount must be positive'; END IF;
        IF p_sender_id = p_receiver_id THEN RETURN 'error:cannot send to yourself'; END IF;
        SELECT company_id, token_balance INTO v_sender_company, v_sender_balance FROM public.profiles WHERE id = p_sender_id;
        IF v_sender_company IS NULL THEN RETURN 'error:sender has no company'; END IF;
        SELECT company_id INTO v_receiver_company FROM public.profiles WHERE id = p_receiver_id;
        IF v_receiver_company IS NULL THEN RETURN 'error:receiver has no company'; END IF;
        IF v_sender_company != v_receiver_company THEN RETURN 'error:not same company'; END IF;
        IF v_sender_balance < p_amount THEN RETURN 'error:insufficient_tokens'; END IF;
        UPDATE public.profiles SET token_balance = token_balance - p_amount WHERE id = p_sender_id RETURNING token_balance INTO v_sender_balance;
        INSERT INTO public.token_transactions (user_id, amount, balance_after, type, description, reference_id) VALUES (p_sender_id, -p_amount, v_sender_balance, 'transfer_out', 'Sent ' || p_amount || ' tokens', p_receiver_id);
        UPDATE public.profiles SET token_balance = token_balance + p_amount WHERE id = p_receiver_id RETURNING token_balance INTO v_receiver_balance;
        INSERT INTO public.token_transactions (user_id, amount, balance_after, type, description, reference_id) VALUES (p_receiver_id, p_amount, v_receiver_balance, 'transfer_in', 'Received ' || p_amount || ' tokens', p_sender_id);
        RETURN v_sender_balance::TEXT;
      END;
      $func$;
    `
  });
  console.log('transfer_tokens:', e1 ? e1.message : '✅');

  // Create get_company_balance
  const { error: e2 } = await svc.rpc('exec_sql_create', { 
    sql_text: `
      CREATE OR REPLACE FUNCTION public.get_company_balance(p_company_id UUID)
      RETURNS INT LANGUAGE sql SECURITY DEFINER STABLE AS $$
        SELECT COALESCE(SUM(p.token_balance), 0)
        FROM public.profiles p
        JOIN public.company_members cm ON cm.user_id = p.id
        WHERE cm.company_id = p_company_id AND cm.status = 'active';
      $$;
    `
  });
  console.log('get_company_balance:', e2 ? e2.message : '✅');

  // Create trigger function
  const { error: e3 } = await svc.rpc('exec_sql_create', { 
    sql_text: `
      CREATE OR REPLACE FUNCTION public.on_company_member_activated()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $func$
      DECLARE
        v_channel_id UUID; v_company_name TEXT; v_user_name TEXT;
      BEGIN
        IF NEW.status != 'active' THEN RETURN NEW; END IF;
        IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN RETURN NEW; END IF;
        SELECT company_name INTO v_company_name FROM public.company_profiles WHERE id = NEW.company_id;
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        SELECT ensure_company_channel(NEW.company_id, NEW.user_id) INTO v_channel_id;
        IF v_channel_id IS NOT NULL AND v_user_name IS NOT NULL THEN
          INSERT INTO public.user_messages (conversation_id, sender_id, content, is_system_message, is_read, created_at, is_paid)
          VALUES (v_channel_id, NEW.user_id, E'👋 ' || v_user_name || ' has joined ' || COALESCE(v_company_name, 'the company') || '!', TRUE, TRUE, NOW(), TRUE);
          UPDATE public.user_conversations SET last_message_at = NOW() WHERE id = v_channel_id;
        END IF;
        RETURN NEW;
      END;
      $func$;
    `
  });
  console.log('on_company_member_activated:', e3 ? e3.message : '✅');

  // Apply trigger
  const { error: e4 } = await svc.rpc('exec_sql_create', { 
    sql_text: `
      DROP TRIGGER IF EXISTS trg_on_company_member_activated ON public.company_members;
      CREATE TRIGGER trg_on_company_member_activated
        AFTER INSERT OR UPDATE OF status ON public.company_members
        FOR EACH ROW EXECUTE FUNCTION public.on_company_member_activated();
    `
  });
  console.log('trigger:', e4 ? e4.message : '✅');

  // Update ensure_company_channel
  const { error: e5 } = await svc.rpc('exec_sql_create', { 
    sql_text: `
      CREATE OR REPLACE FUNCTION public.ensure_company_channel(p_company_id UUID, p_user_id UUID DEFAULT auth.uid())
      RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $func$
      DECLARE
        v_conv_id UUID; v_is_owner BOOLEAN;
      BEGIN
        SELECT id INTO v_conv_id FROM public.user_conversations
        WHERE company_id = p_company_id AND conversation_type = 'channel' AND name = 'General' LIMIT 1;
        IF v_conv_id IS NULL THEN
          INSERT INTO public.user_conversations (conversation_type, name, description, is_public, company_id, created_by, last_message_at)
          VALUES ('channel', 'General', 'Company-wide announcements and discussion', TRUE, p_company_id, p_user_id, NOW()) RETURNING id INTO v_conv_id;
        END IF;
        SELECT EXISTS (SELECT 1 FROM public.company_profiles WHERE id = p_company_id AND owner_id = p_user_id) INTO v_is_owner;
        INSERT INTO public.conversation_participants (conversation_id, user_id, role)
        VALUES (v_conv_id, p_user_id, CASE WHEN v_is_owner THEN 'owner' ELSE 'member' END)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        RETURN v_conv_id;
      END;
      $func$;
    `
  });
  console.log('ensure_company_channel:', e5 ? e5.message : '✅');

  console.log('\nDone!');
})();