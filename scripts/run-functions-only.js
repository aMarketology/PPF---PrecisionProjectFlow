require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Run SQL via the Supabase REST API raw query endpoint
async function runRawSql(sqlStatement) {
  // Strip comments and whitespace
  const clean = sqlStatement.trim();
  if (!clean) return true;
  
  // Use the fetch API with PostgREST function execution
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'params=single-object',
    },
  });
  return false; // This won't work for raw SQL
}

// Instead, let's create the functions one by one using RPC
async function createFunctions() {
  // Create the trigger function
  const triggerFunc = `
    CREATE OR REPLACE FUNCTION public.on_company_member_activated()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE
      v_channel_id UUID;
      v_company_name TEXT;
      v_user_name TEXT;
    BEGIN
      IF NEW.status != 'active' THEN RETURN NEW; END IF;
      IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN RETURN NEW; END IF;
      SELECT company_name INTO v_company_name FROM public.company_profiles WHERE id = NEW.company_id;
      SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
      SELECT ensure_company_channel(NEW.company_id, NEW.user_id) INTO v_channel_id;
      IF v_channel_id IS NOT NULL AND v_user_name IS NOT NULL THEN
        INSERT INTO public.user_messages (conversation_id, sender_id, content, is_system_message, is_read, created_at, is_paid)
        VALUES (v_channel_id, NEW.user_id, '👋 ' || v_user_name || ' has joined ' || COALESCE(v_company_name, 'the company') || '!', TRUE, TRUE, NOW(), TRUE);
        UPDATE public.user_conversations SET last_message_at = NOW() WHERE id = v_channel_id;
      END IF;
      RETURN NEW;
    END;
    $$;
  `;

  // Create transfer_tokens function
  const transferFunc = `
    CREATE OR REPLACE FUNCTION public.transfer_tokens(
      p_sender_id UUID, p_receiver_id UUID, p_amount INT, p_note TEXT DEFAULT NULL
    ) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE
      v_sender_balance INT;
      v_receiver_balance INT;
      v_sender_company UUID;
      v_receiver_company UUID;
    BEGIN
      IF p_amount <= 0 THEN RETURN 'error:amount must be positive'; END IF;
      IF p_sender_id = p_receiver_id THEN RETURN 'error:cannot send to yourself'; END IF;
      SELECT company_id, token_balance INTO v_sender_company, v_sender_balance FROM public.profiles WHERE id = p_sender_id;
      IF v_sender_company IS NULL THEN RETURN 'error:sender has no company'; END IF;
      SELECT company_id INTO v_receiver_company FROM public.profiles WHERE id = p_receiver_id;
      IF v_receiver_company IS NULL THEN RETURN 'error:receiver has no company'; END IF;
      IF v_sender_company != v_receiver_company THEN RETURN 'error:not same company'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = v_sender_company AND user_id = p_sender_id AND status = 'active') THEN RETURN 'error:sender not active member'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = v_receiver_company AND user_id = p_receiver_id AND status = 'active') THEN RETURN 'error:receiver not active member'; END IF;
      IF v_sender_balance < p_amount THEN RETURN 'error:insufficient_tokens'; END IF;
      UPDATE public.profiles SET token_balance = token_balance - p_amount WHERE id = p_sender_id RETURNING token_balance INTO v_sender_balance;
      INSERT INTO public.token_transactions (user_id, amount, balance_after, type, description, reference_id) VALUES (p_sender_id, -p_amount, v_sender_balance, 'transfer_out', 'Sent ' || p_amount || ' tokens to team member' || CASE WHEN p_note IS NOT NULL THEN ': ' || p_note ELSE '' END, p_receiver_id);
      UPDATE public.profiles SET token_balance = token_balance + p_amount WHERE id = p_receiver_id RETURNING token_balance INTO v_receiver_balance;
      INSERT INTO public.token_transactions (user_id, amount, balance_after, type, description, reference_id) VALUES (p_receiver_id, p_amount, v_receiver_balance, 'transfer_in', 'Received ' || p_amount || ' tokens from team member' || CASE WHEN p_note IS NOT NULL THEN ': ' || p_note ELSE '' END, p_sender_id);
      RETURN v_sender_balance::TEXT;
    END;
    $$;
  `;

  // Create get_company_balance function
  const balanceFunc = `
    CREATE OR REPLACE FUNCTION public.get_company_balance(p_company_id UUID)
    RETURNS INT LANGUAGE sql SECURITY DEFINER STABLE AS $$
      SELECT COALESCE(SUM(p.token_balance), 0)
      FROM public.profiles p
      JOIN public.company_members cm ON cm.user_id = p.id
      WHERE cm.company_id = p_company_id AND cm.status = 'active';
    $$;
  `;

  // Run each via SQL API
  const baseUrl = 'https://ifrxzmemiihxfdimwvcw.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  async function runSql(description, sql) {
    const res = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql_select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log(`✅ ${description}`);
      return true;
    }
    console.log(`❌ ${description}: ${text.substring(0, 150)}`);
    return false;
  }

  // Try the functions
  await runSql('trigger function', triggerFunc);
  await runSql('transfer_tokens', transferFunc);
  await runSql('get_company_balance', balanceFunc);

  // Try creating the trigger
  const createTrigger = `
    DROP TRIGGER IF EXISTS trg_on_company_member_activated ON public.company_members;
    CREATE TRIGGER trg_on_company_member_activated
      AFTER INSERT OR UPDATE OF status ON public.company_members
      FOR EACH ROW EXECUTE FUNCTION public.on_company_member_activated();
  `;
  await runSql('trigger', createTrigger);
}

createFunctions().catch(console.error);