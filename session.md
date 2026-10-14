# Precision Project Flow — Session Tracker

**Last updated:** October 10, 2026
**Status:** ✅ LIVE · 💬 Channels + DMs · 🛡️ RBAC Permissions · 📨 Company Invites · 📋 RFQ Marketplace · 🏢 Company Teams · 💰 Token-Gated Bidding · 🚚 Shipping &amp; Tracking · 🤝 Contract-to-Unlock · 📦 Line Items · 🖥️ Admin CLI · 📊 Unified Ledger · 📇 Company Directory

---

## 📍 Current Focus
**Super-admin company directory workflow.** `/admin/directory` — browse all ~3,975 companies with filters, click into any company, edit its profile, and track outreach notes/status.

### ✅ Completed — /admin/directory detail page + notes + outreach status
- **`supabase/DIRECTORY_NOTES.sql`** (applied live): added `notes` (TEXT), `outreach_status` (TEXT default `'new'`, CHECK in new/contacted/replied/meeting/converted/dead), `last_contacted_at` (TIMESTAMPTZ) to `company_profiles` + index.
- **API:** `action=company-detail` (GET single company + owner profile + active member count) and `action=update-company` (POST with whitelisted columns incl. notes/outreach_status/last_contacted_at; validates status; never allows id/owner_id/claimed_by changes).
- **`/admin/directory/[id]`** — full company detail page:
  - Outreach status pill buttons (New/Contacted/Replied/Meeting/Converted/Dead) — one click updates status + stamps `last_contacted_at`
  - Ownership card (claimed/verified/team count/owner profile)
  - Primary contact card (email/phone/mobile/LinkedIn)
  - Full edit form: company info, contact details, specialties + certifications tag editors
  - **Internal Notes** textarea (super-admin only)
  - View Public Page link + Save Changes
- **`/admin/directory`** — rows are now clickable → detail page; new **Outreach** column (status pill, falls back to source badge); **Outreach: Any** filter dropdown; notes indicator (amber sticky-note icon) on rows with notes; CSV export includes `outreach_status` + `notes`.
- Verified: migration applied (3 columns live, default `'new'`), `tsc --noEmit` clean (only pre-existing webhooks error), payment-intent tests 10/10.

### 🔜 Next
- Configure Stripe Connect `payout`/`dispute`/`account` webhook events in the Stripe dashboard.
- Then: cold outreach dashboard (`/admin/outreach`) — add companies, contact status pipeline, outreach log.

### ✅ Completed — user detail page + account deactivation
- `supabase/USER_ACCOUNT_STATUS.sql` (needs paste): adds `account_status` (`active`/`suspended`/`deactivated`), `deactivated_reason`, `deactivated_at`, `deactivated_by` to `profiles` + `is_account_active()` RPC. KYC can layer on later.
- `app/api/admin/route.ts`: added `action=user-detail` (GET: profile + memberships + owned companies + auth data + recent RFQs/services + message count) and `action=set-account-status` (POST: status + reason, with super-admin guard).
- `app/admin/users/[id]/page.tsx`: now shows account-status badge, a moderation panel (Suspend / Deactivate with reason modal, or Reactivate), and the reason text when deactivated.
- The `user-detail` API action did NOT exist before — the detail page was a broken route.

### ✅ Completed — super admin RFQ delete
- `/admin/rfqs` now has a red `Trash2` button per row (Actions column). `handleDelete` confirms, calls `POST /api/admin?action=delete&tab=rfqs&id=`, toasts, and removes the row. The backend delete action already supported `tab=rfqs`, so this was UI-only.

### ✅ Completed — super admin product click-through + message
- `app/api/admin/route.ts`: `action=data&tab=products` now enriches each row with `company` (`company_name`, `owner_id`) resolved from `company_profiles`.
- `/admin/products` Actions column now has **View** (`/marketplace/product/{id}`) and **Message** (`/messages?with={owner_id}`, only when a company owner exists), alongside the existing Toggle + Delete.

### ✅ Completed — super admin service click-through + message
- `/admin/services` Actions column now has **View** (`/marketplace/service/{id}`) and **Message** (`/messages?with={provider.id}`), reusing the already-enriched `provider` object.

### ✅ Completed — super admin messaging is free & open until closed
- `supabase/ADMIN_CHAT_MODERATION.sql` (needs running live): adds `is_closed` / `closed_at` to `user_conversations` + `conversation_involves_admin(p_conversation_id)` SECURITY DEFINER helper.
- `app/api/messages/send/route.ts`: a DM involving a super admin is now `isFree` automatically UNLESS `is_closed`; closed threads always 402.
- `app/api/messages/close/route.ts` (POST, admin-only): `{ conversationId, closed }` flips the gate on direct threads.
- `app/messages/page.tsx`: track `is_admin`, `isFreeConversation` treats open admin threads as free, and admins get an **Open - Close / Closed - Reopen** pill in the header.

### ✅ Completed — admin chats as support tickets with "End Chat"
- `supabase/ADMIN_CHAT_MODERATION.sql` extended: `is_support_ticket` / `ticket_opened_at` columns, `mark_support_ticket()` (auto-tag + unlock on any admin send), and `end_support_ticket(conversation_id, admin_id)` (closes + inserts system message). **Awaiting manual paste into Supabase SQL Editor** (direct PG + pg-meta endpoints are unreachable; DB password was rotated).
- `app/api/messages/send/route.ts`: auto-tags admin-backed direct threads via `mark_support_ticket`.
- `app/api/messages/close/route.ts`: `closed:true` now calls `end_support_ticket` (posts system msg); `closed:false` reopens.
- `app/messages/page.tsx`: `is_support_ticket` on the Conversation type, a violet **Support** badge on tagged threads, and the admin pill relabeled to **End Chat / Ended - Reopen** (Headset icon).

### 🔜 Next (super admin panel)
- Consider View/Message on orders/companies rows and a category-targeted admin broadcast.

### Current session — company and feed data model
- `/companies` is the claimable business directory backed by `company_profiles`; `/profiles` is the engineer/vendor account directory backed by `profiles`.
- `/admin/companies` reads and mutates `company_profiles` through the server-only service-role admin API. `/admin/claims` uses browser Supabase under admin RLS to approve/reject ownership claims.
- `/feed` redirects to `/activity`. Published `feed_posts` are converted by a database trigger into `site_activities` rows with activity type `social_post_created`.
- The checked-in admin API currently lacks the `admins`, `promote`, `demote`, and `invite-claim` actions used by `/admin/settings`; the session notes describing dual CLI/browser auth are stale relative to the current route.

### ✅ Completed — social test users + company pages
- Added `scripts/seed-social-test-users.js` (`npm run db:seed:social`). Idempotent: creates real auth users, `profiles`, claimed + verified `company_profiles`, `company_members` owners, General channels, and `feed_posts`.
- Seeded 4 accessible accounts (password in gitignored `seed-credentials.local.json`, or `TEST_ACCOUNT_PASSWORD`):
  | Email | Company | Company page |
  |-------|---------|--------------|
  | `maya.chen@ppf.test` | Northwind Precision Machining | `/companies/northwind-precision-machining` |
  | `diego.ramirez@ppf.test` | Voltline Electrical Systems | `/companies/voltline-electrical-systems` |
  | `priya.nair@ppf.test` | Meridian Structural Group | `/companies/meridian-structural-group` |
  | `sam.okafor@ppf.test` | Ironclad Fabrication Works | `/companies/ironclad-fabrication-works` |
- Live result: `feed_posts` 3 → 11, `social_post_created` ledger 1 → 10, claimed companies 0 → 4, active members 5 → 9. Membership trigger auto-set `profiles.company_id`.
- `app/profiles/[id]/page.tsx` now resolves the engineer's company slug and shows a **Company Page** button linking to `/companies/[slug]`.
- Live `profiles` has **no** `company_name` column — company name lives only on `company_profiles`. Seed payloads must not write `profiles.company_name`.

### ✅ Completed — personal /admin panel for every user
- `/admin` is now a **personal account hub for every authenticated user**, not super-admin-only.
- New shared helper `lib/admin/context.ts` (`loadAdminContext`) resolves profile, `is_admin`, active company memberships, and per-company roles.
- `middleware.ts` now allows any authenticated user into `/admin`; only platform subpaths (`/admin/users`, `/companies`, `/claims`, `/products`, `/services`, `/orders`, `/rfqs`, `/reports`, `/settings`) require `is_admin`, redirecting others back to `/admin`.
- `app/admin/layout.tsx` is permission-aware: **My Account / My Companies / My Listings / My RFQs** for everyone; **Platform** sections only for super admins. Header shows a role badge (Super Admin / Company Manager / Engineer / Client).
- `app/admin/page.tsx` shows the user's account type, companies, personal activity counts, and (for super admins) platform stats + management links.
- New pages: `/admin/my-companies`, `/admin/my-listings` (products + services), `/admin/my-rfqs` (posted RFQs + offers sent).
- `app/login/page.tsx` now redirects to `/admin` (or an explicit `?redirect=` target) and the previous inverted engineer/client routing was removed.
- Verified in-browser: seeded `maya.chen@ppf.test` lands on `/admin` as **Company Manager** with her company; `/admin/users` correctly redirects non-admins back to `/admin`; super admin `precisionprojectflow@gmail.com` has `is_admin = true`.
- Known pre-existing issue (not introduced here): `app/admin/users/page.tsx` filters on `profiles.company_name`, which does not exist live.

### ✅ Completed — seeded credentials + super-admin company editing
- Added all seeded account credentials to `.env.local` (`TEST_ACCOUNT_PASSWORD`, `SEED_ACCOUNT_PASSWORD`, and `SEED_ACCOUNT_1..4_*` email/name/company/slug).
- Added `scripts/verify-seed-attachments.js` — read-only check that each seeded account has an active owner membership and a claimed company. Result: **4/4 fully attached** (all claimed + verified, `profiles.company_id` linked).
- **Super admins can now edit marketplace company profiles.** `app/companies/[slug]/edit/page.tsx` previously authorized only `owner_id`; it now also allows `profiles.is_admin` and active `company_members` with role owner/admin.
- `app/companies/[slug]/page.tsx` now shows the **Edit Company Profile** button to owners, super admins, and company managers (was owner-only).
- Fixed two pre-existing bugs that made the edit page unusable:
  1. It used React 19's `use()` hook while the project runs **React 18.3.1** → page 500'd. Switched to Next.js 14 `useParams()`.
  2. The save payload included a `country` field that does not exist on live `company_profiles` → 400 on save. Now strips non-column fields before update.
- Verified end-to-end in-browser as super admin `precisionprojectflow@gmail.com`: Edit button visible → edit page loads → save persists → redirects to profile. Test marker reverted afterward.

### ✅ Completed — admin panel redesign (company-profile design language)
- Restyled the whole `/admin` area to match `/companies/[slug]`:
  - **Header**: brand gradient `from-[#001f4d] via-[#003D82] to-[#005BB5]` with the 40px grid overlay, white text, orange shield icon, role badge.
  - **Sidebar**: light white panel (was dark gray) with rounded-xl nav pills; active = solid `#003D82` with soft shadow, hover = navy tint.
  - **Cards**: `bg-white rounded-2xl border border-gray-100 shadow-sm` with `hover:border-[#003D82]/30`.
  - **Typography**: `font-jakarta`, `font-extrabold` headings, gray-500 secondary text.
  - **Buttons**: primary `bg-[#003D82] hover:bg-[#002960]`, secondary `border-2 border-[#003D82]` outline.
  - **Badges**: rounded-full pills (emerald=verified, amber=unclaimed, gray=role).
- Applied to `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/my-companies`, `app/admin/my-listings`, `app/admin/my-rfqs`.
- Logout button retained at sidebar bottom with red text (`rgb(239,68,68)`), now on a light background.
- Verified in-browser: overview, My Companies, and nav all render with the new theme.

### ✅ Completed — permission-derived header identity
- `lib/admin/context.ts` now derives `primaryCompany`, `roleLabel`, and `roleDescription` from **real** membership + `is_admin` (highest-privilege company wins: owner > admin > member).
- Added a centralized `can(ctx, action)` helper (`view_platform`, `manage_platform`, `manage_company`, `view_company`) so UI gating and enforcement share one source of truth.
- Admin header now shows the **company name as the title** and the **role as the badge**:
  - Super admin → `PPF Admin` / `Super Admin`
  - Company owner → `Northwind Precision Machining` / `Company Owner`
  - Company admin → `<Company>` / `Company Admin`
  - Plain member → `<Company>` / `Team Member`
  - No company → `My Account` / `Engineer` or `Client`
- Icon switches between Shield (super admin) and Building2 (company user).
- Sidebar hint now includes the user's `roleDescription`.
- Verified in-browser for both the super admin and a seeded company owner.
- **Security note:** these labels are presentation only. Real enforcement remains RLS + server-side checks; the badge is derived from the same membership data those checks use, so it cannot claim access the user does not have.

### ✅ Completed — multi-role badge system
- `lib/admin/context.ts` now returns a `badges: AdminBadge[]` array covering **every** role/permission a user holds, not just one label.
- Badge sources: Super Admin, one per company membership (`Owner` / `Admin` / `Member`, with company name when not the primary), account type (Engineer/Client), `Manages N Companies`, `Team Member`, and `No Company`.
- Each badge has a `tone` (navy/orange/emerald/amber/purple/gray) and a `hint` tooltip.
- New component `app/admin/components/RoleBadges.tsx` with `RoleBadge`, `RoleBadgeOnDark`, and `RoleBadgeList` (collapses overflow into a `+N` chip).
- Header shows up to 3 badges on the gradient; the account card on `/admin` shows up to 6.
- Verified with a temporary second membership: header rendered `Owner`, `Admin · Voltline Electrical Systems`, `Engineer`, `+1`; card rendered all four including `Manages 2 Companies`. Test membership reverted afterward.
- The `+N` chip is now **clickable**: it opens a popover listing every badge with its explanation. Closes on outside click or Escape.

### ✅ Completed — single-company route rename
- Renamed `/admin/my-companies` → **`/admin/company`** (nav label "My Company") because accounts belong to one company at a time.
- `app/admin/company/page.tsx` now focuses on `ctx.primaryCompany` with a singular layout: company card, role/industry badges, and View Public Page / Edit Profile / Manage Team actions.
- Added a sidebar note explaining the one-company-per-account rule and how to switch companies.
- Updated nav + overview links; verified `/admin/company` renders correctly.

### ✅ Completed — /dashboard → /admin migration
- **All `/dashboard/*` routes now permanently redirect to `/admin`:**
  | Old route | New route |
  |-----------|-----------|
  | `/dashboard/engineer` | `/admin` |
  | `/dashboard/client` | `/admin` |
  | `/dashboard/company/[id]` | `/admin/company` |
  | `/dashboard/engineer/portfolio` | `/admin/my-listings` |
- **New admin pages:** `/admin/my-orders` (role-aware: engineer sees client orders, client sees engineer orders) and `/admin/earnings` (engineer-only, shown conditionally in nav).
- **Team management ported** into `/admin/company` as a Team tab: member list, invite modal with user search, role changes, and removal. Gated by `can(ctx, 'manage_company')`.
- **Nav updated:** "My Dashboard" now points to `/admin`; personal nav includes My Orders and (for engineers) Earnings.
- **12 files updated** to replace `/dashboard/*` links with `/admin/*` equivalents (companies/create, features, marketplace service, messages, products/create, rfq create/submit, services create/edit, settings/company, signup, lib/email).
- `app/robots.ts` intentionally still excludes `/dashboard/` from crawling.
- Verified in-browser: all four old routes redirect correctly; `/admin/my-orders`, `/admin/earnings`, and the company Team tab all render.

### ✅ Completed — team management fix + Company Chat
- **Fixed a blocking RLS bug:** `company_members` UPDATE policy self-referenced the same table → `infinite recursion detected in policy` (HTTP 500) whenever an owner changed a role or removed a member. The earlier `FIX_COMPANY_MEMBERS_RLS.sql` only patched SELECT and INSERT.
  - Added `supabase/FIX_COMPANY_MEMBERS_UPDATE_RLS.sql` with `is_company_manager()` / `is_company_owner()` SECURITY DEFINER helpers and rebuilt SELECT/INSERT/UPDATE policies. **Must be run in the Supabase SQL Editor** (direct PG + pg-meta endpoints are unreachable from this environment).
  - Added `app/api/companies/[id]/members/route.ts` (PATCH role, DELETE member) that authorizes server-side (owner / super admin / active owner-admin) and uses the service client, so team management works regardless of the RLS policy state. Also removes the member from company channels.
  - `app/admin/company` now calls these API routes instead of writing directly.
- **New `/admin/company-chat` page** (nav: "Company Chat", shown when the user has a company):
  - Resolves (or creates via `ensure_company_channel`) the company's **General** channel and deep-links to `/messages?conversation=<id>`.
  - Shows member count, a "Free for team members" badge, and the token policy: team messaging/media is free and stored in Supabase up to 14 days; messaging outside the company costs tokens.
- **Verified in-browser:** owner can invite (Diego added), change role (member → admin), and remove; Company Chat resolves the real channel and the deep link opens General with team messages. Test membership reverted afterward.
- Added `scripts/create-member-test-account.js` to provision a plain `member@ppf.test` for permission testing.

### ✅ Completed — job-title group chats + company sync fix
- **`supabase/JOB_TITLE_GROUP_CHATS.sql`** (applied): adds `profiles.job_title`, `ensure_job_title_channel()` RPC, `sync_job_title_channel` trigger (auto-creates a group chat per title — any set title, even 1 person), `cleanup_company_channel_access` trigger (removes channel access when a member leaves), plus backfill and stale-participation cleanup.
- **`supabase/FIX_PROFILE_COMPANY_SYNC.sql`** (applied): rewrote `sync_profile_company_id()` — it previously **nulled `profiles.company_id` whenever any membership was removed**, even if the user still had another active membership. Removing a stale test membership wiped Maya's and Diego's real company links. Now recomputes from remaining active memberships.
- **Data repaired** via `scripts/repair-company-links.js` — all seeded profiles re-linked to their active company.
- **UI built:**
  - Job title inline input per member in `/admin/company` Team tab (owners/admins edit; members see a read-only badge).
  - `/admin/company-chat` now lists **#General** plus every **Job Title Group**, each deep-linking to `/messages?conversation=<id>`.
- **Verified end to end:** set Maya's title to "Shop Foreman" → group chat auto-created → appears on Company Chat with member count and a working deep link. Stale channel participations: 0.
- Helper scripts added: `verify-job-title-setup.js`, `check-company-linkage.js`, `repair-company-links.js`, `backfill-job-title-chats.js`, `diagnose-channels.js`.

### 🔍 Schema audit (live Supabase) — findings
Live: **30 exposed tables, 35 RPCs**. Audit scripts: `audit-schema.js`, `audit-rpcs.js`, `audit-legacy.js`, `audit-orders.js`, `inspect-profiles.js`.

**1. Duplicate / legacy tables (dead weight)**
| Legacy | Rows | Current | Rows |
|--------|------|---------|------|
| `conversations` | 1 | `user_conversations` | 18 |
| `messages` | 0 | `user_messages` | 46 |
| `company_team_members` | 0 | `company_members` | 10 |
| `token_purchases` | 0 | `token_transactions` | 18 |
| `orders` | 6 | `product_orders` | 1 |

**2. `orders` vs `product_orders` split-brain (most serious)**
- `orders` = **service** orders (`client_id`, `engineer_id`, `service_id`) — written by Stripe checkout, read by `/admin/my-orders` + `/admin/earnings`.
- `product_orders` = **product** orders (`buyer_id`, `company_id`, `product_id`) — read by `/admin/orders`.
- Two different order concepts with no unified view.

**3. Broken code referencing dead tables**
- `app/settings/company/page.tsx` — joins `company_team_members!inner` (empty table) → broken.
- `app/components/ContactCompanyForm.tsx` — writes to legacy `conversations` + `messages` → broken.
- `app/messages/page_company_old.tsx` — dead file.

**4. Column drift**
- `company_profiles` has BOTH `company_name` + `name`, and BOTH `address` + `street_address` (redundant aliases).
- Live column is `is_verified`; `verified` does **not** exist — but `app/admin/companies/page.tsx` reads `c.verified`, so the Verified badge never renders.

**5. Missing helper functions**
- `is_company_member` is referenced by migrations 002/009 RLS policies but **does not exist live**.
- `is_company_manager` / `is_company_owner` (from `FIX_COMPANY_MEMBERS_UPDATE_RLS.sql`) are **not applied** — team management works only because of the server API route.

**6. SQL file sprawl**
- **69 SQL files** (51 root + 12 migrations + 6 seed); **6 different files** define the `profiles` table.

**7. Foreign-key inconsistency (root cause of most manual joins)**
- FKs are split between `profiles` and `auth.users` with no consistent rule.
- ✅ Point at `profiles`: `orders.client_id`, `orders.engineer_id`, `rfqs.client_id`, `services.provider_id`.
- ❌ Point at `auth.users`: `company_members.user_id`, `company_profiles.owner_id`, `product_orders.buyer_id`, `rfq_offers.vendor_id`, `conversation_participants.user_id`, `user_messages.sender_id`, `feed_posts.author_id`, `site_activities.actor_id`, `token_transactions.user_id`, `company_claims.user_id`.
- Consequence: PostgREST cannot embed profiles on the `auth.users`-linked tables, so the app does manual second queries (e.g. `app/api/activities/route.ts`).
- Fix is metadata-only (drop + recreate constraint) since `profiles.id = auth.users.id`.

**8. Additional broken code**
- `app/admin/users/page.tsx` filters on `profiles.company_name`, which does not exist live.

📄 Full write-up: **`docs/SCHEMA_AUDIT.md`** (29 tables, 35 RPCs, FK map, streamline plan).

### ✅ Completed — Phase 1: fix broken code (no schema change)
1. **`app/settings/company/page.tsx`** — replaced the dead `company_team_members!inner` join with a `company_members` lookup (active membership, `owner_id` fallback). Also corrected column names: `name` → `company_name`, `address` → `street_address`.
2. **`app/components/ContactCompanyForm.tsx`** — no longer writes to legacy `conversations` + `messages`. Now resolves the company owner (`owner_id` / `claimed_by`), opens a DM via `get_or_create_conversation`, and sends through the token-gated `/api/messages/send` API (handles 402 locked).
3. **`app/admin/companies/page.tsx`** — Verified badge now reads `is_verified` (was `verified`, which never rendered). Interface type updated.
4. **`app/admin/users/page.tsx`** — no longer filters on non-existent `profiles.company_name`. Now resolves company names from `company_profiles` via `company_id` in a second lookup.
5. **Deleted** `app/messages/page_company_old.tsx` (dead file) and the stale `.next/types/app/admin/my-companies` artifact.
- `npx tsc --noEmit` shows **no errors in any edited file**. Remaining errors are pre-existing (`__tests__/api-payment-intent.test.ts` Request/NextRequest, `sendRFQAlertEmail` missing export).

### ✅ Completed — Option (c): resolve the TypeScript compile blockers
- **Added `sendRFQAlertEmail` to `lib/email.ts`** — was imported by `app/api/rfq/notify/route.ts` and `app/api/rfq/[id]/notify-offer/route.ts` but never exported. New branded template (project, category, budget, client) with a "View & Submit a Quote" CTA.
- **Fixed implicit `any`** in `app/api/rfq/[id]/notify-offer/route.ts` (`.catch((e: unknown) => ...)`).
- **Made the Resend client lazy** in `lib/email.ts` — `new Resend(process.env.RESEND_API_KEY!)` threw at *import* time when the key was absent (tests, keyless builds). Now `getResend()` constructs on first send and throws a clear error only if actually used without a key. All 6 `resend.emails.send` calls updated.
- **Fixed the test file's type errors** — `__tests__/api-payment-intent.test.ts` built plain `Request` objects against a `NextRequest` handler. Added a thin wrapper (`POST = (r: Request) => POSTHandler(r as any)`) and `@jest-environment node` (jsdom has no `Request` global).
- **Result: `npx tsc --noEmit` → 0 errors** (was 10).
- ⚠️ **Note:** the payment-intent test suite now *runs* (10 tests) but all 10 **fail** because the test file is **stale** — it asserts an old contract (`products`/`company_profiles`/`stripe_connect_accounts`/`application_fee_amount`/`payment_intents` table) while the route now handles `services`/`profiles`/`orders` with no application fee. Rewriting these tests is a separate task.

### ✅ Completed — payment-intent test suite rewritten (10/10 passing)
- `__tests__/api-payment-intent.test.ts` was stale — it asserted the old contract (`products`/`company_profiles`/`payment_intents` table/always-on fee) and all 10 tests failed.
- Rewritten against the **current** route contract: products (`type='product'`) + services (default), seller resolution via `company:company_profiles(id, owner_id)` / `provider:profiles(...)`, Direct Charge + 10% fee **only** when Connect is charges-enabled (platform-direct fallback otherwise), `marketplace_orders` `pending_payment` ledger write, and the `{ clientSecret, paymentIntentId, amount, currency, directCharge }` response shape.
- **Result: 10/10 passing.** Full suite went from 27 failed → 17 failed (the remaining 4 failing suites — `supabase-mock.ts`, `product-detail`, `marketplace-products`, `ContactCompanyForm` — are pre-existing and unrelated).
- Note: `app/api/stripe/webhooks/route.ts` has a pre-existing TS1005 `'}' expected` at EOF (present before this change, untouched).

### ✅ Completed — /admin/directory (Company Directory with filters)
- New super-admin page `/admin/directory` — a full directory of all ~3,975 `company_profiles` rows.
- **Server-side filtering** in `/api/admin?action=data&tab=directory` (Postgres-side so pagination stays correct at scale):
  - Search across `company_name`, `city`, `state`, `industry`, `contact_name`, `contact_email`, `contact_title` (`.or()` ilike)
  - Industry / State / Source dropdowns (facets from new `directory-facets` action, with live counts)
  - Claimed / Verified / Has-Contact-Email toggles
  - Sort: newest / oldest / name A–Z
  - Pagination (50/page) + **CSV export** (up to 2,000 rows, respects active filters)
- Wired into middleware super-admin list, admin sidebar ("Directory"), and admin overview card.
- Verified the `.or()` search + filter query pattern against live Supabase (74 matches for "steel" + Mechanical Engineering).
- `tsc --noEmit` clean (only pre-existing webhooks error); payment-intent tests still 10/10.

### 🔜 Next
- Configure Stripe Connect `payout`/`dispute`/`account` webhook events in the Stripe dashboard.
- Then: cold outreach dashboard (`/admin/outreach`) — add companies, contact status pipeline, outreach log.
