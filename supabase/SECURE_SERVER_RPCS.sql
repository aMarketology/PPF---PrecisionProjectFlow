-- ════════════════════════════════════════════════════════════════════
-- SECURE_SERVER_RPCS.sql
-- Restrict security-definer functions that accept user-controlled IDs
-- to server-side (service_role) calls only.
--
-- Regenerated 2026-10-04 from LIVE pg_proc signatures (not stale).
--
-- WHY: These functions move money (tokens), create contracts, and submit
-- offers. If a browser could call them directly, a malicious client could
-- bypass the token charge, the canonical RFQ-owner check, and the
-- authorization logic that lives in the API routes.
--
-- The API routes authenticate + authorize the caller, then invoke these
-- RPCs using createServiceClient() (service_role). So restricting EXECUTE
-- to service_role is safe and does not break the app.
--
-- Run in: Supabase Dashboard → SQL Editor (staging first).
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Remove direct client write policies ─────────────────────────
-- Proposal and contract creation are server-owned workflows. Direct
-- browser writes would bypass the token charge and canonical RFQ-owner
-- checks. (Policy names match the LIVE database.)
DROP POLICY IF EXISTS "Vendors can submit offers"           ON public.rfq_offers;
DROP POLICY IF EXISTS "Clients can accept or reject offers" ON public.rfq_offers;
DROP POLICY IF EXISTS "Vendors can withdraw offers"         ON public.rfq_offers;
DROP POLICY IF EXISTS "Buyer can create contracts"          ON public.contracts;
DROP POLICY IF EXISTS "Parties can update contracts"        ON public.contracts;

-- ── 2. Revoke client EXECUTE on money/contract/offer RPCs ───────────
-- Signatures below are the EXACT live signatures (verified via pg_proc).

-- add_tokens (two overloads)
REVOKE EXECUTE ON FUNCTION public.add_tokens(UUID, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_tokens(UUID, INT, TEXT)       FROM PUBLIC, anon, authenticated;

-- spend_tokens (two overloads)
REVOKE EXECUTE ON FUNCTION public.spend_tokens(UUID, INT, TEXT)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.spend_tokens(UUID, INT, TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- refund_tokens
REVOKE EXECUTE ON FUNCTION public.refund_tokens(UUID, INT, TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- submit_rfq_offer (live signature: p_notes / p_timeline / p_terms)
REVOKE EXECUTE ON FUNCTION public.submit_rfq_offer(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- create_contract_from_offer
REVOKE EXECUTE ON FUNCTION public.create_contract_from_offer(UUID, UUID, UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;

-- transfer_tokens (P2P token transfer — server-only)
REVOKE EXECUTE ON FUNCTION public.transfer_tokens(UUID, UUID, INT, TEXT) FROM PUBLIC, anon, authenticated;

-- milestone lifecycle (server-only)
REVOKE EXECUTE ON FUNCTION public.release_milestone(UUID, UUID)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_milestone_delivered(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ── 3. Grant EXECUTE to service_role only ───────────────────────────

GRANT EXECUTE ON FUNCTION public.add_tokens(UUID, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_tokens(UUID, INT, TEXT)       TO service_role;

GRANT EXECUTE ON FUNCTION public.spend_tokens(UUID, INT, TEXT)     TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_tokens(UUID, INT, TEXT, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.refund_tokens(UUID, INT, TEXT, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.submit_rfq_offer(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.create_contract_from_offer(UUID, UUID, UUID, TEXT, TEXT, NUMERIC) TO service_role;

GRANT EXECUTE ON FUNCTION public.transfer_tokens(UUID, UUID, INT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.release_milestone(UUID, UUID)        TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_milestone_delivered(UUID, UUID) TO service_role;

-- ════════════════════════════════════════════════════════════════════
-- NOTE: The following security-definer functions are intentionally LEFT
-- client-accessible because the browser legitimately calls them:
--   get_or_create_conversation  (ContactCompanyForm, messages page)
--   ensure_company_channel      (company create, company-chat)
--   same_company                (RFQ detail/submit)
--   invite_company_member       (admin/company page)
--   get_pending_invites / accept_company_invite / decline_company_invite
--   are_friends                 (messages send)
--   is_channel_admin / is_channel_owner / is_conversation_member
--   get_channel_role / update_channel_member_role / add_channel_member
--   remove_channel_member / join_channel / create_channel / update_channel
--   delete_channel / end_support_ticket / mark_support_ticket
--   conversation_involves_admin / get_unread_message_count / get_unread_count
--   unread_mentions_count / is_account_active / is_admin
--   get_company_balance / get_contract_summary / can_release_milestone
--   send_company_invite / invite_company_member
--   handle_new_user / insert_activity / fanout_activity_notifications
--   sync_profile_company_id / sync_job_title_channel / ensure_job_title_channel
--   cleanup_company_channel_access / on_company_member_activated
--   auto_unlock_conversation_on_contract (trigger)
-- ════════════════════════════════════════════════════════════════════