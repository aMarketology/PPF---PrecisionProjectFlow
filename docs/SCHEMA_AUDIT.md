# PPF - Live Database Schema Audit

> Generated from the live Supabase project (`ifrxzmemiihxfdimwvcw`) via PostgREST
> introspection. Read-only. Re-run with `node scripts/db-introspect.js`.

**29 tables · 35 RPCs**

---

## 1. Table inventory

### Identity & companies

| Table | Rows | Purpose |
|-------|------|---------|
| `profiles` | 20 | User profile, 1:1 with `auth.users`. Holds `token_balance`, `is_admin`, `company_id`, `job_title`. |
| `company_profiles` | 3,975 | Company directory. Claimable listings. |
| `company_members` | 10 | **Authoritative** company membership + role. |
| `company_claims` | 0 | Ownership claim requests. |

### Marketplace

| Table | Rows | Purpose |
|-------|------|---------|
| `services` | 3 | Engineer service listings. |
| `products` | 56 | Company product listings. |
| `orders` | 6 | **Service** orders (`client_id`, `engineer_id`, `service_id`). |
| `product_orders` | 1 | **Product** orders (`buyer_id`, `company_id`, `product_id`). |

### RFQ

| Table | Rows | Purpose |
|-------|------|---------|
| `rfqs` | 2 | Request for quote posts. |
| `rfq_offers` | 3 | Vendor bids on RFQs. |

### Messaging

| Table | Rows | Purpose |
|-------|------|---------|
| `user_conversations` | 18 | DMs, channels, groups. |
| `conversation_participants` | 11 | Membership in conversations. |
| `user_messages` | 46 | Messages. |
| `message_mentions` | - | @mentions. |

### Feed & activity

| Table | Rows | Purpose |
|-------|------|---------|
| `feed_posts` | 11 | Social posts. |
| `feed_likes` | 1 | Post likes. |
| `feed_comments` | 1 | Post comments. |
| `feed_bids` | - | Bids on `parts_request` posts. |
| `site_activities` | 4,001 | Hash-chained activity ledger. |

### Tokens & payments

| Table | Rows | Purpose |
|-------|------|---------|
| `token_transactions` | 18 | **Authoritative** token ledger. |
| `token_account_summary` | - | View: balance + lifetime totals. |
| `token_purchases` | 0 | **Legacy** receipt log. |
| `stripe_connect_accounts` | 0 | Vendor payout accounts. |
| `stripe_transfers` | - | Payout transfers. |
| `refunds` | - | Refund records. |

### Other

| Table | Rows | Purpose |
|-------|------|---------|
| `receipts` | - | Mobile receipt capture + OCR. |
| `friends` | - | Friend graph. |
| `conversations` | 1 | **Legacy** - superseded by `user_conversations`. |
| `messages` | 0 | **Legacy** - superseded by `user_messages`. |

---

## 2. ⚠️ Foreign-key inconsistency (most important finding)

**FKs are split between `profiles` and `auth.users` with no consistent rule.**

| Column | References |
|--------|-----------|
| `orders.client_id` | ✅ `profiles` |
| `orders.engineer_id` | ✅ `profiles` |
| `rfqs.client_id` | ✅ `profiles` |
| `services.provider_id` | ✅ `profiles` |
| `company_members.company_id` | ✅ `company_profiles` |
| `products.company_id` | ✅ `company_profiles` |
| `product_orders.company_id` | ✅ `company_profiles` |
| `company_claims.company_id` | ✅ `company_profiles` |
| `company_members.user_id` | ❌ `auth.users` |
| `company_profiles.owner_id` | ❌ `auth.users` |
| `product_orders.buyer_id` | ❌ `auth.users` |
| `rfq_offers.vendor_id` | ❌ `auth.users` |
| `conversation_participants.user_id` | ❌ `auth.users` |
| `user_messages.sender_id` | ❌ `auth.users` |
| `feed_posts.author_id` | ❌ `auth.users` |
| `site_activities.actor_id` | ❌ `auth.users` |
| `token_transactions.user_id` | ❌ `auth.users` |
| `company_claims.user_id` | ❌ `auth.users` |
| `user_conversations.company_id` | ❌ `company_profiles` (named `_fkey` but not resolvable) |

**Consequence:** PostgREST cannot embed profiles on the `auth.users`-linked tables, so the app does manual second queries. Example - `app/api/activities/route.ts`:

```ts
// Fetch actor profiles separately (FK is to auth.users, not profiles)
```

**Recommendation:** standardize all user FKs on `profiles(id)`. Since `profiles.id = auth.users.id`, this is a metadata-only change (drop + recreate the constraint) with no data migration.

---

## 3. Duplicate / legacy tables

| Legacy | Rows | Current | Rows | Action |
|--------|------|---------|------|--------|
| `conversations` | 1 | `user_conversations` | 18 | Drop after migrating the 1 row |
| `messages` | 0 | `user_messages` | 46 | Drop |
| `token_purchases` | 0 | `token_transactions` | 18 | Drop |
| `company_team_members` | 0 | `company_members` | 10 | Drop |

---

## 4. Column drift

### `company_profiles` (31 columns - several redundant)

| Redundant pair | Notes |
|----------------|-------|
| `company_name` + `name` | `company_name` is NOT NULL and canonical; `name` is an unused alias |
| `address` + `street_address` | Both present; `street_address` is used by the app |
| `is_verified` | Live column. **`verified` does not exist** |

**Bug:** `app/admin/companies/page.tsx` reads `c.verified`, which is always `undefined` - the Verified badge never renders.

### `orders` vs `product_orders`

Two distinct concepts, no unified view:

- `orders` - service orders. Written by Stripe checkout (`app/api/stripe/create-payment-intent/route.ts`), read by `/admin/my-orders` and `/admin/earnings`.
- `product_orders` - product orders. Read by `/admin/orders`.

---

## 5. Missing helper functions

| Function | Status |
|----------|--------|
| `is_admin` | ✅ exists |
| `same_company` | ✅ exists |
| `is_company_member` | ❌ **missing** - referenced by migrations 002/009 RLS policies |
| `is_company_manager` | ❌ **missing** - from `FIX_COMPANY_MEMBERS_UPDATE_RLS.sql`, not applied |
| `is_company_owner` | ❌ **missing** - same |

Team management currently works only because `app/api/companies/[id]/members/route.ts` authorizes server-side and uses the service client.

---

## 6. Live RPCs (35)

```
accept_company_invite      get_channel_role           remove_channel_member
accept_rfq_offer           get_company_balance        same_company
add_channel_member         get_or_create_conversation send_company_invite
add_tokens                 get_pending_invites        spend_tokens
are_friends                get_unread_count           submit_rfq_offer
create_channel             get_unread_message_count   transfer_tokens
decline_company_invite     insert_activity            unlock_conversation
delete_channel             invite_company_member      unread_mentions_count
ensure_company_channel     is_admin                   update_channel
ensure_job_title_channel   is_channel_admin           update_channel_member_role
generate_activity_hash     is_channel_owner
                           is_conversation_member
                           join_channel
                           refund_tokens
```

---

## 7. Broken code referencing dead schema

| File | Problem |
|------|---------|
| `app/settings/company/page.tsx` | Joins `company_team_members!inner` (empty table) → company settings fail to load |
| `app/components/ContactCompanyForm.tsx` | Writes to legacy `conversations` + `messages` → submissions go nowhere |
| `app/messages/page_company_old.tsx` | Dead file |
| `app/admin/companies/page.tsx` | Reads non-existent `verified` column |
| `app/admin/users/page.tsx` | Searches non-existent `profiles.company_name` |

---

## 8. SQL file sprawl

**69 SQL files** - 51 in `supabase/`, 12 in `supabase/migrations/`, 6 in `supabase/seed/`.

**Six different files** define the `profiles` table:
`COMPLETE_SETUP.sql`, `PATCH_EXISTING_DB.sql`, `schema.sql`, `SEED_COMPANIES_MIGRATION.sql`, `migrations/001_create_profiles.sql`, `migrations/002_company_profiles_and_projects.sql`.

---

## 9. Recommended streamline

### Phase 1 - fix broken code (no schema change)
1. `settings/company` → use `company_members`
2. `ContactCompanyForm` → use `user_conversations` + `user_messages`
3. `admin/companies` → read `is_verified`
4. `admin/users` → drop the `company_name` search
5. Delete `page_company_old.tsx`

### Phase 2 - schema consolidation
6. Standardize all user FKs on `profiles(id)`
7. Drop the 4 legacy tables
8. Drop redundant `name` / `address` columns
9. Decide `orders` vs `product_orders` (unify or document)

### Phase 3 - SQL hygiene
10. Collapse 69 files into one ordered migration history
11. Apply `is_company_member` / `is_company_manager` / `is_company_owner`
