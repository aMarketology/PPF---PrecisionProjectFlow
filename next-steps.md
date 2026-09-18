# Precision Project Flow - Next Steps

**Updated:** September 8, 2026  
**Current focus:** Test every desktop feature on mobile, one workflow at a time.

## P0 Security Gate

- [x] Remove plaintext credentials from session notes
- [x] Remove hardcoded credentials from verification, admin, and test scripts
- [x] Remove the hardcoded admin email allowlist
- [x] Load current administrators from `profiles.is_admin`
- [x] Remove the unauthenticated raw-SQL HTTP endpoint
- [x] Restrict admin mutations to explicit table allowlists
- [x] Confirm `.env.local` is ignored by Git
- [ ] Rotate the exposed Supabase service-role key in Supabase and deployment environments
- [ ] Rotate passwords for any accounts that used previously committed/shared passwords

Do not begin Stripe production testing until both rotation tasks are complete.

## P0 Supabase Readiness

- [x] Route authorization verifies the canonical RFQ owner before proposal unlock or contract creation.
- [x] Proposal UI fails closed: unlock controls render only for the canonical RFQ owner.
- [x] Added `supabase/SECURE_SERVER_RPCS.sql` to restrict sensitive token, offer, and contract RPCs to `service_role` and remove direct client offer/contract writes.
- [ ] Refresh `DATABASE_URL` locally with the current Supabase connection password; the configured direct connection was rejected during verification.
- [ ] Run `supabase/PROJECTFLOW_TOKENS.sql` and `supabase/SECURE_SERVER_RPCS.sql` in the target Supabase project only after desktop/mobile feature and design validation is complete.
- [ ] Query PostgreSQL catalogs to confirm `add_tokens`, `spend_tokens`, `refund_tokens`, `submit_rfq_offer`, and `create_contract_from_offer` exist and have the intended grants.
- [ ] Query `pg_policies` to confirm direct INSERT/UPDATE policies on `contracts` and `rfq_offers` are removed.
- [ ] Run an authenticated two-account test: bidder receives `403` from unlock/contract endpoints and sees no unlock/contract controls; RFQ owner can unlock.

**Decision:** Database permission hardening is staged, not deployed. Complete application and mobile validation first, then apply migrations in staging, rerun this verification, and promote only after the test suite passes.

## Platform Backend

PPF uses **Supabase** for:

- Authentication and sessions
- User and company profiles
- Marketplace listings
- RFQs and proposals
- Messages, channels, reactions, and Realtime updates
- File and avatar storage
- Token balances and transaction ledger
- Orders, contracts, and milestones
- Row Level Security and server RPCs

PPF uses **Stripe** for:

- Token purchases
- Product and service checkout
- Stripe Connect vendor onboarding and payouts
- RFQ contract payments
- Payment webhooks

## Testing Method

For each step:

1. Test the desktop workflow first.
2. Repeat it on a phone-sized viewport.
3. Check loading, empty, success, validation, and error states.
4. Confirm Supabase records and permissions are correct.
5. Confirm token or Stripe transactions when applicable.
6. Record failures under the issue log before continuing.

## Mobile Test Plan

### Step 1 - Authentication and Sessions (Active)

- [ ] Client signup
- [ ] Engineer/vendor signup
- [ ] Login
- [ ] Logout
- [ ] Forgot password
- [ ] Reset password
- [ ] Session survives refresh
- [ ] Protected pages redirect logged-out users
- [ ] Forms remain usable with the mobile keyboard open
- [ ] Validation and Supabase Auth errors are visible

### Step 2 - Profiles

- [ ] View public profile
- [ ] Edit profile
- [ ] Upload avatar
- [ ] Update bio, location, skills, and certifications
- [ ] View portfolio
- [ ] Search the engineer directory
- [ ] Start a message from a profile

### Step 3 - Companies and Teams

- [ ] Browse and view companies
- [ ] Create, edit, and claim a company
- [ ] Invite a team member
- [ ] Accept or decline an invite
- [ ] Manage roles and channel membership
- [ ] Remove a member
- [ ] Leave a company
- [ ] Use the company dashboard

### Step 4 - Marketplace Listings

- [ ] Browse, search, and filter services/products
- [ ] View service and product details
- [ ] Create and edit a service
- [ ] Create and edit a product
- [ ] View personal listings

### Step 5 - RFQ Creation and Discovery

- [ ] Create an RFQ with multiple line items
- [ ] Test required-field validation
- [ ] Test ASAP and Next Day Air independently
- [ ] Confirm the RFQ immediately appears in the feed
- [ ] Search and filter the RFQ feed
- [ ] View RFQ details and structured line items
- [ ] Confirm owners and same-company members cannot bid

### Step 6 - RFQ Proposal Submission

- [ ] Submit amount, delivery estimate, and notes
- [ ] Submit optional contact and company details
- [ ] Add per-part pricing
- [ ] Confirm exactly 50 tokens are deducted
- [ ] Test insufficient tokens
- [ ] View and withdraw the proposal

### Step 7 - Proposal Messages and Unlocking

- [ ] Proposal opens the correct conversation
- [ ] Bidder avatar and name display correctly
- [ ] Bidder sees Application sent and no unlock button
- [ ] Only the RFQ owner sees Unlock Application
- [ ] Unlock deducts exactly 50 tokens
- [ ] Full proposal becomes reviewable
- [ ] Account switching preserves correct permissions

### Step 8 - Meetings and Contracts

- [ ] Both RFQ parties can schedule a meeting for 50 tokens
- [ ] Meeting date, time, duration, and agenda work
- [ ] Only the RFQ owner can send a contract
- [ ] Contract action costs 50 tokens
- [ ] Vendor Stripe Connect readiness is checked
- [ ] Stripe contract checkout completes
- [ ] Contract appears for both parties
- [ ] Duplicate or failed actions do not double-charge

### Step 9 - Messaging, Channels, and Realtime

- [ ] Send and receive direct messages
- [ ] Test unread counts, receipts, and typing indicators
- [ ] Upload images, PDFs, and files
- [ ] Add thumbs-up reactions
- [ ] Switch conversations quickly
- [ ] Use mobile list/thread navigation
- [ ] Create and manage channels/groups
- [ ] Test mentions, roles, and team membership

### Step 10 - Tokens and Payments

- [ ] View balance and transaction history
- [ ] Buy each token pack
- [ ] Confirm Stripe payment and immediate balance update
- [ ] Confirm Supabase ledger credits and debits
- [ ] Test insufficient balance and refunds
- [ ] Confirm webhook retries do not double-credit

### Step 11 - Orders and Fulfillment

- [ ] Purchase a service and product
- [ ] Complete checkout
- [ ] View client orders and vendor sales
- [ ] Update order status
- [ ] Test shipping and tracking
- [ ] Complete or cancel an order
- [ ] Confirm related emails and conversation unlocks

### Step 12 - Contracts and Milestones

- [ ] View contract details
- [ ] View milestones
- [ ] Vendor marks work delivered
- [ ] Buyer releases a milestone
- [ ] Final milestone completes the contract
- [ ] Confirm Stripe and Supabase contract states agree

### Step 13 - Dashboards and Notifications

- [ ] Client dashboard
- [ ] Engineer dashboard
- [ ] Company dashboard
- [ ] Counts, balances, tabs, and empty states
- [ ] Notification badge and inbox
- [ ] Message and RFQ notification deep links

### Step 14 - Settings and Admin

- [ ] Account and company settings
- [ ] Stripe Connect onboarding and status refresh
- [ ] Admin statistics and management pages
- [ ] Grant tokens
- [ ] Confirm non-admin users are rejected

### Step 15 - Public Site and Release Checks

- [ ] Homepage, navigation, and footer
- [ ] Features, Get Started, blog, and contact pages
- [ ] Privacy policy and terms
- [ ] Responsive layouts at phone and tablet widths
- [ ] No horizontal overflow or clipped controls
- [ ] `robots.txt`, `sitemap.xml`, metadata, and JSON-LD
- [ ] Production build succeeds

## Current Step

Start with **Step 1 - Authentication and Sessions** using:

- One new client account
- One new engineer/vendor account
- One logged-out/private browser session
- One phone-sized viewport

Do not move to Step 2 until every Step 1 checkbox passes or each failure is recorded below.

## Issue Log

| Step | Feature | Expected | Observed | Severity | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Forgot password | Local reset request sends a recovery link back to localhost | Fixed pending retest: requests were routed to production through `NEXT_PUBLIC_APP_URL` | Medium | Retest |
| 1 | Reset password | Local recovery link opens a password reset session | Pending a fresh local recovery link | Medium | Retest |
| | | | | | |
