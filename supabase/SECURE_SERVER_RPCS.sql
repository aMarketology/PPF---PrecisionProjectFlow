-- Restrict security-definer functions that accept user-controlled IDs to server-side calls.
-- Run in Supabase SQL Editor after confirming all application callers use createServiceClient().
-- The API routes authenticate and authorize the caller before using these RPCs.

-- Proposal and contract creation are server-owned workflows. Direct browser
-- writes would bypass the token charge and canonical RFQ-owner checks.
DROP POLICY IF EXISTS "Vendors can create their own offers" ON public.rfq_offers;
DROP POLICY IF EXISTS "Vendors can update their own pending offers" ON public.rfq_offers;
DROP POLICY IF EXISTS "Buyer can create contracts" ON public.contracts;

REVOKE EXECUTE ON FUNCTION public.add_tokens(UUID, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.spend_tokens(UUID, INT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_tokens(UUID, INT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_rfq_offer(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_contract_from_offer(UUID, UUID, UUID, TEXT, TEXT, DECIMAL) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.add_tokens(UUID, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_tokens(UUID, INT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_tokens(UUID, INT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_rfq_offer(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_contract_from_offer(UUID, UUID, UUID, TEXT, TEXT, DECIMAL) TO service_role;