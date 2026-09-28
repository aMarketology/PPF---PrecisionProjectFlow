# Precision Project Flow - Session Tracker

**Last updated:** September 27, 2026
**Status:** ✅ LIVE · 💬 Channels + DMs · 🛡️ RBAC Permissions · 📨 Company Invites · 📋 RFQ Marketplace · 🏢 Company Teams · 💰 Token-Gated Bidding · 🚚 Shipping &amp; Tracking · 🤝 Contract-to-Unlock · 📦 Line Items · 🖥️ Admin CLI · 🔔 Personal Notifications

---

## 📍 Current Focus
**Real marketplace data + enhanced RFQ page + repo-wide no-em-dash policy.**

### ✅ Completed - real marketplace data (seed + store loaded)
- New `scripts/seed-real-marketplace.js` (`npm run db:seed:market`) loads real listings from the 4 seeded vendor companies:
  | Vendor | Company | Products | Services |
  |--------|---------|----------|----------|
  | Maya Chen | Northwind Precision Machining | 5 CNC/machining | 2 |
  | Diego Ramirez | Voltline Electrical Systems | 5 panels/automation | 2 |
  | Priya Nair | Meridian Structural Group | 5 structural | 2 |
  | Sam Okafor | Ironclad Fabrication Works | 5 fabrication | 2 |
- Loaded **20 products + 8 services + 6 RFQs** (open, across categories, real buyer accounts). Store now shows **76 products**.
- **`products.price` is DOLLARS** (confirmed via `/api/stripe/create-payment-intent`, which multiplies by 100 for Stripe). The live `products` table has **no `currency` column**.
- Fixed a pre-existing crash: `formatPrice(price, currency)` called `currency.toUpperCase()` on `undefined`, blanking `/marketplace/products`, `/marketplace/product/[id]`, `/products`, `/checkout/[id]`, `CheckoutForm`, `/checkout/success`. All now default to `'USD'`.
- **`/rfq` categories vs `services.category` mismatch:** the RFQ form allows 11 categories (incl. `HVAC Systems`, `Industrial Manufacturing`, `Controls & Automation`), while the marketplace filter uses 10 different ones. Seeded RFQs use the form's list.

### ✅ Completed - vendor -> public profile + real reviews
- New `supabase/VENDOR_REVIEWS.sql` (applied live): `vendor_reviews` table (rating 1-5, title, body, reviewer snapshot), self-only write RLS + admin manage, `vendor_rating()` RPC, realtime. Idempotent via `UNIQUE(vendor_id, reviewer_id)`.
- New `scripts/seed-vendor-reviews.js` (`npm run db:seed:reviews`) seeds 3-4 reviews per vendor across rotated reviewer accounts.
- `app/marketplace/page.tsx`: the outer card `Link` was **unwrapped**; the card links to the service, while the **vendor avatar/name links to `/profiles/[id]`** (hover underline). Star ratings are now **real** (aggregated per vendor; "No reviews yet" when none) instead of hardcoded 4.9 / (12 reviews).
- `app/marketplace/service/[id]/page.tsx`: "About the Vendor" block is now a link to `/profiles/[id]`; rating is real.
- `app/profiles/[id]/page.tsx`: added a **Reviews tab** (avg + count, review list with stars/dates/reviewer names).
- **Fixed a critical pre-existing bug:** `/profiles/[id]` selected `profiles.company_name`, which does not exist live, so `.single()` always errored and the page **redirected to `/profiles`** - breaking every vendor-click-to-profile. Company name is now resolved from `company_profiles` and merged in. Verified: `/profiles/<sam-okafor-id>` renders "Ironclad Fabrication Works" with Services/Reviews/About tabs.

### ✅ Completed - RFQ page enhancement + clickable buyers
- `app/rfq/page.tsx` hero upgraded: "Live Request Marketplace" badge, headline, subcopy, and a **4-tile stat strip** (Open RFQs, Total Posted, In Review, Top Budget).
- RFQ cards: the **buyer avatar and company/name now link to `/profiles/[id]`** (mock-free; the list API already exposes `client.id`/`avatar_url`/company name).

### ✅ Completed - em dash ban (site-wide)
- **Site rule: the em dash (U+2014 `—`) is not allowed anywhere.**
- `scripts/fix-em-dashes.mjs` sweeps the repo (source, docs, SQL, root config) and replaces every em dash with a hyphen. Applied: **734 em dashes across 144 files**. Re-runnable; `--dry` reports only. Verified **0 remaining**.
- `scripts/fix-em-dashes-db.js` scrubs em dashes from **stored content** (`products`, `services`, `rfqs`, `company_profiles`, `profiles`, `feed_posts`, `user_notifications`, `rfq_offers`; handles `text[]` columns in JS). Applied: **27 row updates**, then **0 remaining**.
- Both scripts are idempotent and safe to re-run. Keep this rule in mind for all future copy.

### ✅ Completed - personal notifications + bell dropdown
- The public `/activity` ledger (`site_activities`) now fans out into a **per-user inbox** table `user_notifications` (`supabase/USER_NOTIFICATIONS.sql`, applied live).
- `fanout_activity_notifications(p_activity site_activities)` decides recipients per event type:
  | Activity | Notified |
  |----------|----------|
  | `rfq_posted` | Vendors whose **active service category/title/description** matches the RFQ category |
  | `offer_submitted` | The RFQ owner (`rfqs.client_id`) |
  | `rfq_awarded` | Every vendor who bid (`rfq_offers`) |
  | `order_placed` | Seller company owner (`company_profiles.owner_id`) |
  | `order_completed` | The buyer (`product_orders.buyer_id`) |
  | `team_member_added` | Company owners/admins (`company_members`) |
  | `company_joined` | Platform admins (`profiles.is_admin`) |
- Idempotent via `UNIQUE(user_id, activity_id)` + `ON CONFLICT DO NOTHING`. RLS is self-only (SELECT/UPDATE/DELETE); inserts come only from the SECURITY DEFINER trigger. Realtime enabled. Historical ledger backfilled on migration (**21 rows across 7 users**).
- New API `app/api/notifications/route.ts`: `GET` (paginated + `unreadOnly`, returns `unreadCount`), `POST` (`{ids}` or `{all:true}` mark read), `DELETE` (`?id=` or `?all=true`).
- Shared visual map `lib/notifications.ts` (`notificationStyle`) mirrors the activity-feed icons/colors.
- `app/components/Navigation.tsx`: the top-right bell is now a **dropdown** - badge from `/api/notifications`, live via a `user_notifications` realtime channel, per-item + "Mark all read", and a "View all" footer. The bell count is fresh; the **Messages** menu item and its badge still use the separate DM unread counter.
- `app/notifications/page.tsx` rebuilt as a full inbox: All/Unread filters, mark-all, per-item delete, clear, pagination, empty states, and a link back to `/activity`.
- `app/activity/page.tsx`: added a **“My Notifications”** CTA showing the user's unread count, clarifying that the feed is platform-wide while the bell is personal.
- Verified in-browser as `maya.chen@ppf.test`: badge `2` → dropdown lists team notifications → page loads → mark-all clears badge + shows "You are all caught up" → delete removes row. Trigger verified by direct probes: `rfq_posted` (HVAC Systems) notified the matching vendor; `offer_submitted` notified the RFQ owner with resolved actor name + `$amount` and a working `/rfq/<slug>` link.
- **Note:** messages are intentionally NOT duplicated into the bell - the pre-existing `NavNotification`-independent DM badge/`/messages` flow is unchanged. No separate `notifications` table existed in the live DB (the earlier `notifications`/`user_notifications` probes returned empty schema-cache errors); this migration creates the real one.

### Current session - company and feed data model
- `/companies` is the claimable business directory backed by `company_profiles`; `/profiles` is the engineer/vendor account directory backed by `profiles`.
- `/admin/companies` reads and mutates `company_profiles` through the server-only service-role admin API. `/admin/claims` uses browser Supabase under admin RLS to approve/reject ownership claims.
- `/feed` redirects to `/activity`. Published `feed_posts` are converted by a database trigger into `site_activities` rows with activity type `social_post_created`.
- The checked-in admin API currently lacks the `admins`, `promote`, `demote`, and `invite-claim` actions used by `/admin/settings`; the session notes describing dual CLI/browser auth are stale relative to the current route.

### ✅ Completed - social test users + company pages
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
- Live `profiles` has **no** `company_name` column - company name lives only on `company_profiles`. Seed payloads must not write `profiles.company_name`.

### ✅ Completed - personal /admin panel for every user
- `/admin` is now a **personal account hub for every authenticated user**, not super-admin-only.
- New shared helper `lib/admin/context.ts` (`loadAdminContext`) resolves profile, `is_admin`, active company memberships, and per-company roles.
- `middleware.ts` now allows any authenticated user into `/admin`; only platform subpaths (`/admin/users`, `/companies`, `/claims`, `/products`, `/services`, `/orders`, `/rfqs`, `/reports`, `/settings`) require `is_admin`, redirecting others back to `/admin`.
- `app/admin/layout.tsx` is permission-aware: **My Account / My Companies / My Listings / My RFQs** for everyone; **Platform** sections only for super admins. Header shows a role badge (Super Admin / Company Manager / Engineer / Client).
- `app/admin/page.tsx` shows the user's account type, companies, personal activity counts, and (for super admins) platform stats + management links.
- New pages: `/admin/my-companies`, `/admin/my-listings` (products + services), `/admin/my-rfqs` (posted RFQs + offers sent).
- `app/login/page.tsx` now redirects to `/admin` (or an explicit `?redirect=` target) and the previous inverted engineer/client routing was removed.
- Verified in-browser: seeded `maya.chen@ppf.test` lands on `/admin` as **Company Manager** with her company; `/admin/users` correctly redirects non-admins back to `/admin`; super admin `precisionprojectflow@gmail.com` has `is_admin = true`.
- Known pre-existing issue (not introduced here): `app/admin/users/page.tsx` filters on `profiles.company_name`, which does not exist live.

### ✅ Completed - seeded credentials + super-admin company editing
- Added all seeded account credentials to `.env.local` (`TEST_ACCOUNT_PASSWORD`, `SEED_ACCOUNT_PASSWORD`, and `SEED_ACCOUNT_1..4_*` email/name/company/slug).
- Added `scripts/verify-seed-attachments.js` - read-only check that each seeded account has an active owner membership and a claimed company. Result: **4/4 fully attached** (all claimed + verified, `profiles.company_id` linked).
- **Super admins can now edit marketplace company profiles.** `app/companies/[slug]/edit/page.tsx` previously authorized only `owner_id`; it now also allows `profiles.is_admin` and active `company_members` with role owner/admin.
- `app/companies/[slug]/page.tsx` now shows the **Edit Company Profile** button to owners, super admins, and company managers (was owner-only).
- Fixed two pre-existing bugs that made the edit page unusable:
  1. It used React 19's `use()` hook while the project runs **React 18.3.1** → page 500'd. Switched to Next.js 14 `useParams()`.
  2. The save payload included a `country` field that does not exist on live `company_profiles` → 400 on save. Now strips non-column fields before update.
- Verified end-to-end in-browser as super admin `precisionprojectflow@gmail.com`: Edit button visible → edit page loads → save persists → redirects to profile. Test marker reverted afterward.

### ✅ Completed - admin panel redesign (company-profile design language)
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

### ✅ Completed - permission-derived header identity
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

### ✅ Completed - multi-role badge system
- `lib/admin/context.ts` now returns a `badges: AdminBadge[]` array covering **every** role/permission a user holds, not just one label.
- Badge sources: Super Admin, one per company membership (`Owner` / `Admin` / `Member`, with company name when not the primary), account type (Engineer/Client), `Manages N Companies`, `Team Member`, and `No Company`.
- Each badge has a `tone` (navy/orange/emerald/amber/purple/gray) and a `hint` tooltip.
- New component `app/admin/components/RoleBadges.tsx` with `RoleBadge`, `RoleBadgeOnDark`, and `RoleBadgeList` (collapses overflow into a `+N` chip).
- Header shows up to 3 badges on the gradient; the account card on `/admin` shows up to 6.
- Verified with a temporary second membership: header rendered `Owner`, `Admin · Voltline Electrical Systems`, `Engineer`, `+1`; card rendered all four including `Manages 2 Companies`. Test membership reverted afterward.
- The `+N` chip is now **clickable**: it opens a popover listing every badge with its explanation. Closes on outside click or Escape.

### ✅ Completed - single-company route rename
- Renamed `/admin/my-companies` → **`/admin/company`** (nav label "My Company") because accounts belong to one company at a time.
- `app/admin/company/page.tsx` now focuses on `ctx.primaryCompany` with a singular layout: company card, role/industry badges, and View Public Page / Edit Profile / Manage Team actions.
- Added a sidebar note explaining the one-company-per-account rule and how to switch companies.
- Updated nav + overview links; verified `/admin/company` renders correctly.

### ✅ Completed - /dashboard → /admin migration
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

### ✅ Completed - team management fix + Company Chat
- **Fixed a blocking RLS bug:** `company_members` UPDATE policy self-referenced the same table → `infinite recursion detected in policy` (HTTP 500) whenever an owner changed a role or removed a member. The earlier `FIX_COMPANY_MEMBERS_RLS.sql` only patched SELECT and INSERT.
  - Added `supabase/FIX_COMPANY_MEMBERS_UPDATE_RLS.sql` with `is_company_manager()` / `is_company_owner()` SECURITY DEFINER helpers and rebuilt SELECT/INSERT/UPDATE policies. **Must be run in the Supabase SQL Editor** (direct PG + pg-meta endpoints are unreachable from this environment).
  - Added `app/api/companies/[id]/members/route.ts` (PATCH role, DELETE member) that authorizes server-side (owner / super admin / active owner-admin) and uses the service client, so team management works regardless of the RLS policy state. Also removes the member from company channels.
  - `app/admin/company` now calls these API routes instead of writing directly.
- **New `/admin/company-chat` page** (nav: "Company Chat", shown when the user has a company):
  - Resolves (or creates via `ensure_company_channel`) the company's **General** channel and deep-links to `/messages?conversation=<id>`.
  - Shows member count, a "Free for team members" badge, and the token policy: team messaging/media is free and stored in Supabase up to 14 days; messaging outside the company costs tokens.
- **Verified in-browser:** owner can invite (Diego added), change role (member → admin), and remove; Company Chat resolves the real channel and the deep link opens General with team messages. Test membership reverted afterward.
- Added `scripts/create-member-test-account.js` to provision a plain `member@ppf.test` for permission testing.

### ✅ Completed - job-title group chats + company sync fix
- **`supabase/JOB_TITLE_GROUP_CHATS.sql`** (applied): adds `profiles.job_title`, `ensure_job_title_channel()` RPC, `sync_job_title_channel` trigger (auto-creates a group chat per title - any set title, even 1 person), `cleanup_company_channel_access` trigger (removes channel access when a member leaves), plus backfill and stale-participation cleanup.
- **`supabase/FIX_PROFILE_COMPANY_SYNC.sql`** (applied): rewrote `sync_profile_company_id()` - it previously **nulled `profiles.company_id` whenever any membership was removed**, even if the user still had another active membership. Removing a stale test membership wiped Maya's and Diego's real company links. Now recomputes from remaining active memberships.
- **Data repaired** via `scripts/repair-company-links.js` - all seeded profiles re-linked to their active company.
- **UI built:**
  - Job title inline input per member in `/admin/company` Team tab (owners/admins edit; members see a read-only badge).
  - `/admin/company-chat` now lists **#General** plus every **Job Title Group**, each deep-linking to `/messages?conversation=<id>`.
- **Verified end to end:** set Maya's title to "Shop Foreman" → group chat auto-created → appears on Company Chat with member count and a working deep link. Stale channel participations: 0.
- Helper scripts added: `verify-job-title-setup.js`, `check-company-linkage.js`, `repair-company-links.js`, `backfill-job-title-chats.js`, `diagnose-channels.js`.

### 🔍 Schema audit (live Supabase) - findings
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
- `orders` = **service** orders (`client_id`, `engineer_id`, `service_id`) - written by Stripe checkout, read by `/admin/my-orders` + `/admin/earnings`.
- `product_orders` = **product** orders (`buyer_id`, `company_id`, `product_id`) - read by `/admin/orders`.
- Two different order concepts with no unified view.

**3. Broken code referencing dead tables**
- `app/settings/company/page.tsx` - joins `company_team_members!inner` (empty table) → broken.
- `app/components/ContactCompanyForm.tsx` - writes to legacy `conversations` + `messages` → broken.
- `app/messages/page_company_old.tsx` - dead file.

**4. Column drift**
- `company_profiles` has BOTH `company_name` + `name`, and BOTH `address` + `street_address` (redundant aliases).
- Live column is `is_verified`; `verified` does **not** exist - but `app/admin/companies/page.tsx` reads `c.verified`, so the Verified badge never renders.

**5. Missing helper functions**
- `is_company_member` is referenced by migrations 002/009 RLS policies but **does not exist live**.
- `is_company_manager` / `is_company_owner` (from `FIX_COMPANY_MEMBERS_UPDATE_RLS.sql`) are **not applied** - team management works only because of the server API route.

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

### ✅ Completed - Phase 1: fix broken code (no schema change)
1. **`app/settings/company/page.tsx`** - replaced the dead `company_team_members!inner` join with a `company_members` lookup (active membership, `owner_id` fallback). Also corrected column names: `name` → `company_name`, `address` → `street_address`.
2. **`app/components/ContactCompanyForm.tsx`** - no longer writes to legacy `conversations` + `messages`. Now resolves the company owner (`owner_id` / `claimed_by`), opens a DM via `get_or_create_conversation`, and sends through the token-gated `/api/messages/send` API (handles 402 locked).
3. **`app/admin/companies/page.tsx`** - Verified badge now reads `is_verified` (was `verified`, which never rendered). Interface type updated.
4. **`app/admin/users/page.tsx`** - no longer filters on non-existent `profiles.company_name`. Now resolves company names from `company_profiles` via `company_id` in a second lookup.
5. **Deleted** `app/messages/page_company_old.tsx` (dead file) and the stale `.next/types/app/admin/my-companies` artifact.
- `npx tsc --noEmit` shows **no errors in any edited file**. Remaining errors are pre-existing (`__tests__/api-payment-intent.test.ts` Request/NextRequest, `sendRFQAlertEmail` missing export).

### ✅ Completed - Option (c): resolve the TypeScript compile blockers
- **Added `sendRFQAlertEmail` to `lib/email.ts`** - was imported by `app/api/rfq/notify/route.ts` and `app/api/rfq/[id]/notify-offer/route.ts` but never exported. New branded template (project, category, budget, client) with a "View & Submit a Quote" CTA.
- **Fixed implicit `any`** in `app/api/rfq/[id]/notify-offer/route.ts` (`.catch((e: unknown) => ...)`).
- **Made the Resend client lazy** in `lib/email.ts` - `new Resend(process.env.RESEND_API_KEY!)` threw at *import* time when the key was absent (tests, keyless builds). Now `getResend()` constructs on first send and throws a clear error only if actually used without a key. All 6 `resend.emails.send` calls updated.
- **Fixed the test file's type errors** - `__tests__/api-payment-intent.test.ts` built plain `Request` objects against a `NextRequest` handler. Added a thin wrapper (`POST = (r: Request) => POSTHandler(r as any)`) and `@jest-environment node` (jsdom has no `Request` global).
- **Result: `npx tsc --noEmit` → 0 errors** (was 10).
- ⚠️ **Note:** the payment-intent test suite now *runs* (10 tests) but all 10 **fail** because the test file is **stale** - it asserts an old contract (`products`/`company_profiles`/`stripe_connect_accounts`/`application_fee_amount`/`payment_intents` table) while the route now handles `services`/`profiles`/`orders` with no application fee. Rewriting these tests is a separate task.

### Completed - claimable company listings
- Created or updated free, unclaimed directory listings: Central Plains Steel Co. (Jeremy Will), Williams Valve Corp. (Ifeanyi Okpara), and Precision Project Flow (Josh / `precisionprojectflow@gmail.com`).
- `scripts/provision-claimable-companies.js` is idempotent and can reapply these three outreach listings without duplicates.
- Company Management (`/admin/companies`) now includes an admin-only reset control that clears company ownership, removes active team access, and closes pending claims so the listing can be claimed again.
- Verified the three live company rows as unclaimed. `npx tsc --noEmit` remains blocked only by 10 pre-existing `Request` vs `NextRequest` typing errors in `__tests__/api-payment-intent.test.ts`.
- Added and verified free, unclaimed listings for Equipment & Controls, Inc. (Piper McLaughlin) and Gritton & Associates (Mariah Woodfield).

### Company membership
- Users can now leave a company from `/dashboard/company/[id]` through `POST /api/companies/[id]/leave`.
- Leaving marks their membership removed, clears the linked profile company through the existing trigger, and removes them from company channels.
- Owners may also leave; the company record remains intact for later administration.

### RFQ proposal messages
- RFQ proposals now use `user_messages.message_type = 'rfq_offer'` with structured JSONB in `message_metadata`; ordinary `content` remains a readable fallback.
- `app/messages/page.tsx` renders RFQ offers as compact proposal cards rather than normal chat bubbles.
- Proposal cards show the sender's profile avatar. The bidder sees a sent confirmation, while only the receiving RFQ owner sees the 50-token unlock/review action.
- Existing and new proposal cards resolve the bidder from `rfq_offers.vendor_id` and the recipient from `rfqs.client_id`; unlock controls fail closed unless the current user is the confirmed RFQ owner.
- After unlock, only the RFQ poster can send a contract; the server verifies canonical `rfqs.client_id`, charges 50 tokens, and launches Stripe Connect Checkout to the vendor's payout-ready account.
- Either RFQ party can schedule a meeting from the proposal card for 50 tokens. The invitation is posted into their shared conversation.
- Run `supabase/RFQ_MESSAGE_TYPES.sql` to add the typed-message columns and convert existing `[RFQ_OFFER]...` messages.

### ✅ Just Completed - Admin CLI System
1. **`app/api/admin/route.ts`** - Dual-auth (Bearer JWT for CLI + cookie for browser), centralized `getAuthedAdmin()` helper, new `grant-tokens` POST action.
2. **`scripts/admin-cli.js`** - Unified CLI: `stats`, `list <tab>`, `delete <tab> <id>`, `grant-tokens <userId> <amount>`, `grant-tokens-by-email <email> <amount>`. Supports `--url` and `--prod` flags.
3. **`.env.local`** - Added `ADMIN_EMAIL=precisionprojectflow@gmail.com` + `ADMIN_PASSWORD=123456md`. Removed stale `PPF_ADMIN_*` vars and stray `ADMIN_API_TOKEN`.
4. **Verified**: `stats` → 1 RFQ, `list rfqs` → CNC RFQ, `grant-tokens-by-email vendor@ppf.test 500` → 720 tokens, non-admin JWT → 401.

### 🧪 Test Accounts
| Account | Type | Tokens | Admin |
|---------|------|--------|-------|
| `precisionprojectflow@gmail.com` (Project2Flow) | engineer | 10,000 | ✅ |
| `vendor@ppf.test` (Vendor) | engineer | 720 | ❌ |

### 📋 Single RFQ in Marketplace
- **CNC Machined Parts Assembly - Custom Bracket Kit (250 Units)** - `0a1e8cf8-...`
- 5 line items (Mounting Bracket, Support Plate, Pivot Arm, Spacer Sleeve, Retaining Clip)
- Owner: `precisionprojectflow@gmail.com` · Status: `open` · 0 offers
4. **Auth fix** - `app/api/rfq/offer` PATCH/DELETE now use cookie-based `createClient()` for auth (was `createServiceClient`, which can't read cookies → 401).

### Milestone escrow flow
```
Contract created (active) → Vendor marks milestone delivered → Buyer releases funds → all released → contract completed
```

### ⚠️ Prerequisite
The `CONTRACTS_AND_ESCROW.sql` migration (contracts + contract_milestones tables + RPCs) must be run in Supabase if not already applied. It was authored earlier but verify the tables/RPCs exist live.

---

## 🗺️ Site Map (All Routes)

### Public Pages
| Route | Page | Status |
|-------|------|--------|
| `/` | Homepage | ✅ Live |
| `/features` | Platform guide / how-it-works | ✅ Live |
| `/get-started` | Onboarding landing | ✅ Live |
| `/blog` | SEO blog (3 posts) | ✅ Live |
| `/blog/[slug]` | Blog post detail | ✅ Live |
| `/contact` | Contact page | ✅ Live |
| `/about` | About page | ✅ Live |
| `/login` | Login | ✅ Live |
| `/signup` | Sign up | ✅ Live |
| `/forgot-password` | Password reset | ✅ Live |
| `/reset-password` | Set new password | ✅ Live |
| `/privacy-policy` | Privacy policy | ✅ Live |
| `/terms-of-service` | Terms of service | ✅ Live |
| `/marketplace` | Services marketplace | ✅ Live |
| `/marketplace/service/[id]` | Service detail | ✅ Live |
| `/marketplace/products` | Products listing | ✅ Live |
| `/profiles` | Engineer directory | ✅ Live |
| `/profiles/[id]` | Engineer profile | ✅ Live |
| `/companies` | Company directory | ✅ Live |
| `/companies/[slug]` | Company profile | ✅ Live |
| `/companies/create` | Create company | ✅ Live |
| `/claim-company` | Claim company | ✅ Live |
| `/rfq` | RFQ feed | ✅ Live |
| `/rfq/[slug]` | RFQ detail | ✅ Live |
| `/rfq/create` | Multi-step RFQ form | ✅ Live |
| `/feed` | Activity ledger (3,980+ events) | ✅ Live |
| `/activity` | Activity feed | ✅ Live |

### Authenticated Pages
| Route | Page | Status |
|-------|------|--------|
| `/messages` | Full messaging (channels + DMs + company panel) | ✅ Live |
| `/dashboard/engineer` | Vendor dashboard | ✅ Live |
| `/dashboard/client` | Client dashboard | ✅ Live |
| `/dashboard/company/[id]` | Company dashboard + team mgmt | ✅ Live |
| `/orders` | Order management | ✅ Live |
| `/orders/[id]` | Order detail | ✅ Live |
| `/orders/sales` | Sales management | ✅ Live |
| `/settings` | User settings | ✅ Live |
| `/profile` | Edit profile | ✅ Live |
| `/tokens` | Token store | ✅ Live |
| `/checkout/[id]` | Product checkout | ✅ Live |
| `/checkout/service/[id]` | Service checkout | ✅ Live |
| `/services/create` | Create service listing | ✅ Live |

### API Routes
| Route | Purpose |
|-------|---------|
| `/api/messages/send` | Send message (token-gated for cross-company) |
| `/api/messages/unlock` | Unlock DM (100 tokens) |
| `/api/messages/upload` | File upload |
| `/api/messages/credit-tokens` | Post-Stripe token credit |
| `/api/messages/add-member` | Add user to channel (also adds to company) |
| `/api/messages/remove-member` | Remove user from channel |
| `/api/messages/update-role` | Change member role (owner only) |
| `/api/messages/update-channel` | Rename/update channel (admin+) |
| `/api/messages/delete-channel` | Delete channel (owner only) |
| `/api/messages/send-invite` | Send company invite via DM |
| `/api/messages/transfer-tokens` | Peer-to-peer token transfer |
| `/api/rfq/[id]/offer` | Submit offer on RFQ (token-gated) |
| `/api/rfq/notify` | Notify matching engineers |
| `/api/rfq/list` | List RFQs with filters |
| `/api/orders/[id]/update-status` | Update order status (contract-to-unlock) |
| `/api/stripe/buy-tokens` | Stripe token purchase flow |
| `/api/stripe/webhooks` | Stripe webhook handler |

---

## 🗄️ DB Functions Deployed (Supabase)

| Function | Purpose |
|----------|---------|
| `get_or_create_conversation` | Find/create DM between two users |
| `spend_tokens` | Debit wallet + log ledger |
| `add_tokens` | Credit wallet + log ledger |
| `is_channel_owner` | Check if user owns a channel |
| `is_channel_admin` | Check if user is admin/owner of a channel |
| `is_conversation_member` | SECURITY DEFINER - check channel membership |
| `add_channel_member` | Add user to channel (admin+) |
| `remove_channel_member` | Remove user from channel (admin+) |
| `update_channel_member_role` | Change role (owner only) |
| `update_channel` | Rename/update channel (admin+) |
| `delete_channel` | Delete channel (owner only) |
| `send_company_invite` | Invite user to company via DM |
| `accept_company_invite` | Accept invite → join company + General channel |
| `decline_company_invite` | Decline invite → notify inviter |
| `get_pending_invites` | List pending invites for user |
| `transfer_tokens` | P2P token transfer (same company only) |
| `get_company_balance` | Total tokens across company |
| `ensure_company_channel` | Create/find General channel |
| `on_company_member_activated` | TRIGGER - auto-join General + welcome message |
| `auto_unlock_conversation_on_contract` | TRIGGER - unlock DM on in_progress order |
| `submit_rfq_offer` | Token-gated RFQ offer submission |
| `are_friends` | Check if two users are friends |
| `same_company` | Check if two users share a company |

---

## ⚠️ Pre-Launch Issues

### 🔴 Navigation - Too Crowded
Current desktop nav has **9 items**: Home, Activity, Features, Marketplace, Companies, Profiles, Blog, RFQ Feed, Contact. This is overwhelming.

**Proposed simplification (5-6 items):**
- Home
- Marketplace (services + products)
- RFQ Feed
- Companies
- Blog
- Contact

Move Features, Activity, Profiles into a "More" dropdown or consolidate.

### 🟡 Branding Inconsistency
Several pages need brand colors updated:
- Login/signup pages use generic `bg-blue-600` instead of `bg-[#003D82]`
- Password reset page uses `text-blue-600` instead of brand colors
- Checkout pages may have inconsistent styling
- Some pages use `bg-gray-50` instead of `bg-[#F8FAFC]`

### 🟢 RFQ Flow - Needs End-to-End Test
1. Project2Flow posts RFQ → MAXIMMILLION applies with offer
2. DM unlocks via token spend or contract
3. Order created → status to in_progress → DM auto-unlocks
4. System messages fire in General channel

### 🟢 Features Page - Dynamic Route Fix
Fixed 2026-08-10: `/dashboard/company/[id]` → `/dashboard/engineer`

---

## 🚀 Launch Readiness Checklist

### 🔴 Blockers
| # | Issue | Fix |
|---|-------|-----|
| 1 | Navigation too crowded (9 links) | Simplify to 5-6 items: Home, Marketplace, RFQ Feed, Companies, Blog, Contact |
| 2 | Branding inconsistency across pages | Sweep login, signup, reset-password, features, checkout for `bg-[#003D82]` / `bg-[#F8FAFC]` instead of generic Tailwind blues/grays |
| 3 | RFQ end-to-end flow not tested | Project2Flow posts RFQ → MAXIMMILLION submits offer → DM unlocks → order created |
| 4 | Features page needs `[id]` → real route fix (done Aug 10) | Verify deployed live |

### 🟡 Polish
| # | Issue |
|---|-------|
| 5 | Message avatars only show initials, not real `avatar_url` |
| 6 | No mobile-responsive messaging sidebar |
| 7 | No message search within conversations |
| 8 | No delete/edit message |
| 9 | No online/offline status indicators |
| 10 | No email notifications for new messages |
| 11 | Blog needs more SEO posts (5 planned) |
| 12 | "Projects" sidebar section still empty - needs contract/bid-auto-create trigger |

### 🟢 Done
| Feature | When |
|---------|------|
| Channel permissions (owner/admin/member) | Aug 1 |
| Company invite via DM w/ Accept/Decline | Aug 1 |
| Auto-join General + welcome message trigger | Aug 4 |
| Token transfers (P2P, same-company) | Aug 4 |
| Add-to-channel also adds to company | Aug 4 |
| Channel settings panel (rename, members, delete) | Aug 1 |
| Sender avatars + names in channel messages | Aug 4 |
| RFQ create form (material field, manifesto button, tips) | Aug 5 |
| Features page dynamic route fix | Aug 10 |

---

## 📋 Next Session Plan

1. **Simplify Navigation** - collapse 9 links to 5-6
2. **Branding Sweep** - fix generic colors on login/signup/reset-password/features pages
3. **End-to-End RFQ Test** - Project2Flow posts → MAXIMMILLION applies → DM → order
4. **Deploy all latest changes live**
|------|--------|
| Removed directory entries | No more `company_profiles` fetch, no `DirectoryCard` interface, no company cards |
| Removed tabs | No more All/Services/Companies tabs - page is services-only |
| Fixed hero counter | Now shows `"Browse 3 professional engineering services"` (accurate count) |
| Simplified code | Removed `_type` discriminator, `Card` union type, `industryToCategory` map, `activeTab` state |
| Cleaner filter bar | No conditional price/sort hiding - all filters always visible |
| Enhanced service cards | 48px tall images, "Starting at" label, provider info, description, badges, y-6 hover lift |

### Company Invite System
| Item | Detail |
|------|--------|
| `send_company_invite()` RPC | Owner/admin sends invite → creates `invited` row + system DM with Accept/Decline |
| `accept_company_invite()` RPC | User clicks Accept → status='active' → joins General channel → updates `profiles.company_id` |
| `decline_company_invite()` RPC | User clicks Decline → status='declined' → inviter notified |
| `get_pending_invites()` RPC | Returns all pending invites for a user |
| One-company rule | Accepting a new company auto-removes (`status='removed'`) from previous company |
| Invite badge in sidebar | "Invite" button (orange) next to "Manage" in company panel |
| Invite modal | Search users by name, send invite from messages page |
| Accept/Decline card | Rendered as styled cards in the DM thread - green Accept + gray Decline buttons |
| System message for accept | "✅ ACCEPTED: User has joined 'Company'!" sent to inviter |
| System message for decline | "❌ DECLINED: User declined the invitation" sent to inviter |
| API route | `POST /api/messages/send-invite` - validates admin/owner role, calls RPC |

### Channel/Project Permissions
| Item | Detail |
|------|--------|
| Admin actions | Add/remove members, rename channel, update description/settings |
| Member actions | Read and send messages only |
| `is_channel_owner()` helper | SECURITY DEFINER function to check owner role (bypasses RLS) |
| `is_channel_admin()` helper | SECURITY DEFINER function to check owner/admin role |
| `get_channel_role()` helper | Returns the user's role in a conversation |
| `update_channel_member_role()` RPC | Owner-only - promote/demote members |
| `remove_channel_member()` RPC | Admin+ - kick members from channel |
| `update_channel()` RPC | Admin+ - rename, change description, toggle public |
| `delete_channel()` RPC | Owner-only - permanently delete channel/project |
| `add_channel_member()` RPC | Admin+ - add new members |
| RLS: UPDATE on `user_conversations` | Only admins/owners can update channel settings |
| RLS: DELETE on `user_conversations` | Only owners can delete channels |
| RLS: UPDATE/DELETE on `conversation_participants` | Only admins/owners can manage members |
| General channel fix | Company owner now set as `owner` (was `member`) in General channel |

### UI: Channel Settings Panel
| Item | Detail |
|------|--------|
| Settings gear icon | Only appears for admins/owners on channel/project header |
| Rename field | Edit channel/project name inline |
| Member list | Shows all participants with role badges and crown icon for owner |
| Promote/Demote buttons | Owner sees shield icon to promote to admin, demote to member |
| Remove button | Owner/admin sees X to remove members |
| Delete button | Owner sees red "Danger Zone" with delete action |
| Add Member modal | Search users by name, add to channel |
| Realtime updates | Participant list refreshes live when members change |

### Sidebar Changes
| Item | Detail |
|------|--------|
| "Groups" → "Projects" | Renamed in sidebar with Briefcase icon |
| Project badge | Shows "Project" instead of "Group" in thread header |
| Empty state | Mentions accepting bids/projects |

### RFQ Feed & Offer System
| Item | Detail |
|------|--------|
| `rfq_offers` DB table | New table with `rfq_id`, `vendor_id`, `amount`, `note`, `status` (pending/accepted/rejected/withdrawn), + RLS + auto-hashing trigger |
| `RFQ_OFFERS.sql` migration | Creates table, indexes, RLS policies, auto-`updated_at` trigger, blockchain activity logger for `offer_submitted` |
| `GET /api/rfq/list` | Paginated endpoint returning open RFQs with client profiles, offer counts, lowest offer amount, and current user's own offer (my_offer) |
| `GET /api/rfq/[id]/offer` | Returns all pending offers for an RFQ, sorted by amount ascending |
| `POST /api/rfq/[id]/offer` | Vendors submit offers with amount + note; validates RFQ is open, prevents self-offers, dedupes existing pending offers |
| `POST /api/rfq/[id]/notify-offer` | Fire-and-forget email notification to client when new offer arrives |
| `/rfq` enhanced feed page | Full redesign with hero search, sticky category/tag filter bar, grid layout (1-2-3 cols), each card shows client avatar + title + description + budget + timeline + offer toggle |
| Offer Modal | Clean slide-in modal with budget hint, amount input, note textarea, and submit button |
| Offer Panel Accordion | Click "View offers" on any RFQ card to expand a live panel showing all offers with vendor avatars, lowest-bid highlighting |
| "For You" tab | Category-match scoring system that prioritizes RFQs matching the vendor's own service categories |
| Navigation | "RFQ Feed" link added to main nav bar (points to `/rfq`) |

### Home Page Blockchain Activity Feed
| Item | Detail |
|------|--------|
| Authenticated activity feed | When a user is logged in, the home page shows a "Live Activity Feed" section below the hero with the 6 most recent `site_activities` |
| Blockchain hash display | Each activity card shows the SHA256 `row_hash` (truncated) and links through to the full `/feed` page |
| Activity type icons | Color-coded icons for `rfq_posted`, `rfq_awarded`, `offer_submitted`, `order_placed`, `social_post_created`, `company_joined`, `team_member_added` |
| "View Full Feed" link | CTA button linking to `/feed` for the complete blockchain-verified activity log |
| `offer_submitted` added to `site_activities` | New activity type logged by DB trigger when a vendor submits an offer, includes RFQ title + amount in metadata |

---

## ✅ Just Shipped (Aug 1, 2026)

### Marketplace Redesign
| Item | Detail |
|------|--------|
| Fixed count mismatch | Header now shows `"300+ total results - 3 services · 303 companies"` instead of only `"3 listed services"` |
| Tabs (All / Services / Companies) | Toggle between all results, only services, or only directory companies; counts shown on each tab |
| Enhanced hero section | Added glow orbs, backdrop-blur pill badges for "Engineering Marketplace" + total listing count, better heading copy |
| Redesigned filter bar | Sticky with backdrop-blur; inline search input, category dropdown, conditional price range, improved sort options, result count pill, subtle "Clear" button |
| Upgraded service cards | 48px taller images (h-48), better gradient overlays, "Starting at" label + delivery time on image, provider info + location, description text, improved badges, y-6 hover lift |
| Upgraded directory cards | Same h-48 treatment, verified/unclaimed pill inline with name, rating placeholder, up to 3 specialties shown with "+N more" overflow, better CTA button with shadow |
| Unlock route rewritten | No longer calls broken `unlock_conversation` RPC - does everything inline in TypeScript using `spend_tokens` + direct `is_unlocked` update |
| Send route hardened | Removed all `is_contracted` references (column doesn't exist in live DB); RPC calls (`are_friends`, `same_company`) wrapped in try/catch |
| Messages page fixed | `isFreeConversation` uses only `is_unlocked`; `markMessagesAsRead` no longer writes to `read_at` |
| `is_contracted` purged | Removed from all interfaces, queries, and UI - only `is_unlocked` is used |

### Channels & Groups - Slack-Style Messaging
| Item | Detail |
|------|--------|
| `conversation_type` column | `'direct'` / `'group'` / `'channel'` on `user_conversations` |
| `conversation_participants` table | Junction table with roles (`owner`/`admin`/`member`) |
| `create_channel()` RPC | Creates channels/groups + adds creator as owner + initial members |
| `join_channel()` RPC | Users can join public channels |
| Updated RLS policies | Works for all 3 conversation types - direct, group, channel |
| Realtime on `conversation_participants` | Live member list updates |
| Backfill | All existing conversations marked as `conversation_type = 'direct'` |
| Slack-style sidebar | 3 sections (Channels, Groups, Direct Messages) with collapsible headers |
| Channel/group header | Shows `#channel-name` or group icon instead of user avatar |
| Create Channel modal | Name, description, public/private toggle, channel vs group type |
| Channels/groups always free | No token cost for channel/group messaging |
| Send API updated | Groups/channels check `conversation_participants` membership |

### Messaging Infrastructure
| Item | Detail |
|------|--------|
| New icons | `Hash`, `Users`, `ChevronDown`, `ChevronRight`, `Settings2` |
| `SidebarSection` component | Reusable collapsible section with unread badges |
| `fileInputRef` errors | Pre-existing (not from our changes - needs separate fix) |

### Dev Tooling
| Item | Detail |
|------|--------|
| `scripts/db.js` | Direct Postgres query runner via `DATABASE_URL` |
| `scripts/apply-schema-fix.js` | Schema migration via service role key |
| `npm run db` / `npm run db:fix` | Package.json shortcuts for DB operations |
| `DATABASE_URL` in `.env.local` | Direct Supabase Postgres connection configured |

### Token Operations
| Item | Detail |
|------|--------|
| Tokens minted | `jg.reinard@gmail.com` (Joshua) + `bootysweat.808@gmail.com` (MAXIMMILLION) - 500 tokens each via `scripts/mint-tokens.js` |

### Contract-to-Unlock Messaging (July 30, 2026) - NEW
| Item | Detail |
|------|--------|
| Architecture decision | **DB trigger (primary) + App layer (secondary)** - trigger guarantees consistency across webhook, API, admin; app layer adds realtime broadcast support |
| When unlock happens | Order moves to `in_progress` status (vendor accepted, work began) |
| Find-or-create convo | `get_or_create_conversation(buyer_id, vendor_owner_id)` RPC handles storefront purchases where no prior DM exists |
| Post-contract behavior | **Stay unlocked forever** - re-gating behind 100 tokens after a paid contract creates friction for revisions, support, repeat business |
| System message | `🤝 Contract started - you can now message freely` inserted into message thread |
| `in_progress_at` column | Added to `product_orders` (was referenced by code but missing from schema) |
| `CONTRACT_UNLOCK_TRIGGER.sql` | New migration - trigger function + trigger on `product_orders` |
| Update-status route enhanced | App-layer fallback in `app/api/orders/[id]/update-status/route.ts` |

---

## 🗄️ DB Schema - Current State (Verified July 23)

### `user_messages` columns
`id, conversation_id, sender_id, content, is_read, read_at, created_at, updated_at, attachment_url, attachment_name, attachment_type, is_system_message, is_paid, payment_id`

### `user_conversations` columns
`id, participant_one_id, participant_two_id, last_message_at, created_at, updated_at, is_unlocked`

### `token_transactions`
✅ Exists - append-only ledger for all credit/debit operations

### `spend_tokens` RPC
✅ Exists - used by unlock route for token deduction

---

## 🔴 Action Required (YOU)
1. **Run RFQ_OFFERS.sql in Supabase Dashboard** - Open https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new and paste the contents of `supabase/RFQ_OFFERS.sql`. This creates the `rfq_offers` table, RLS policies, and blockchain triggers. (The table was already created in a prior session, but verify it's there.)
2. **Run SITE_ACTIVITIES_LEDGER.sql if not already done** - Adds `offer_submitted` activity type for logging vendor offers to the blockchain.
3. **Recruit first 5 real vendors** - share `/get-started/vendors`
4. **Test flow** - Sign up as client → post RFQ → sign up as vendor → browse `/rfq` → submit offer → check activity on home page

---

## 🟡 Up Next - Messaging Deep Dive (THIS SESSION)

### Performance & Realtime
| # | Task | Status |
|---|------|--------|
| 1 | Verify Supabase Realtime is enabled on `user_messages` + `user_conversations` | 🔴 Audit needed |
| 2 | Optimistic UI - show sent message immediately before server confirms | 🔴 Not built |
| 3 | Typing indicators via Realtime presence | 🔴 Not built |
| 4 | Online/offline status for contacts | 🔴 Not built |
| 5 | Message pagination / infinite scroll (currently loads ALL messages) | 🔴 Not built |
| 6 | Conversation list polling → realtime subscription | 🔴 Partial (realtime on messages only) |

### UX Polish
| # | Task | Status |
|---|------|--------|
| 7 | Message search within a conversation | 🔴 Not built |
| 8 | Delete / edit message | 🔴 Not built |
| 9 | Conversation actions (mute, archive, block) | 🔴 Not built |
| 10 | Mobile-responsive sidebar (currently fixed 320px) | 🔴 Not built |
| 11 | Empty state improvements | 🟡 Basic |

### Reliability
| # | Task | Status |
|---|------|--------|
| 12 | Retry logic on failed sends | 🔴 Not built |
| 13 | Offline queue (IndexedDB) | 🔴 Not built |
| 14 | Connection status indicator | 🔴 Not built |
| 15 | Error boundary for chat panel | 🔴 Not built |

---

## 📝 Blog - Next Posts to Write
| Priority | Post | Keyword | Est. Impressions |
|---|---|---|---|
| 🔴 #1 | How to Find a Licensed Engineer in Your State | `how to find a licensed engineer` | 3,800 |
| 🔴 #2 | How to Hire a Civil Engineering Consultant | `civil engineering consultant` | 3,200 |
| 🔴 #3 | What is HVAC Load Calculation? Cost & Process | `HVAC load calculation service` | 2,800 |
| 🟡 #4 | When Do You Need a PE Stamp? | `when do you need a PE stamp` | 2,760 |
| 🟡 #5 | Freelance Engineer vs Engineering Firm | `freelance engineer for hire` | 2,200 |

---

## 📁 Key Files Quick Ref
| File | Purpose |
|------|---------|
| `app/messages/page.tsx` | Full messaging UI (605 lines) |
| `app/api/messages/send/route.ts` | Send message API (token-gated) |
| `app/api/messages/unlock/route.ts` | Unlock conversation API (100 tokens) |
| `app/api/messages/upload/route.ts` | File upload API (25MB limit) |
| `app/api/messages/credit-tokens/route.ts` | Post-Stripe token credit API |
| `lib/blog.ts` | Blog post registry |
| `app/blog/page.tsx` | Blog listing |
| `app/blog/[slug]/page.tsx` | Blog post detail |
| `scripts/mint-tokens.js` | Admin token minting |
| `scripts/db.js` | Direct DB query runner |
| `supabase/FIX_MISSING_COLUMNS.sql` | Schema patch (already applied) |

---

## 🏢 Company Teams & Scoped Messaging (July 24, 2026)
| Item | Detail |
|------|--------|
| `COMPANY_TEAMS.sql` | Migration: `company_members` table, `sync_profile_company_id` trigger, `ensure_company_channel` RPC, `invite_company_member` RPC |
| Create Company page | `/companies/create` - auto-creates company + General channel |
| Company Dashboard | `/dashboard/company/[id]` - overview + team management with invite modal |
| Messages 3-column layout | Left sidebar (channels/groups/DMs), center thread, right sidebar (company info + team members) |
| Login redirects | Engineer(vendor)→`/feed`, Client(supplier)→`/dashboard/engineer` |

### RFQ Marketplace (July 25, 2026)
| Item | Detail |
|------|--------|
| RFQ linear feed | `/rfq` - horizontal RFQ cards with full title, description, location, budget, Apply button |
| Right dashboard panel | Stats, quick actions, category filter on `/rfq` |
| RFQ detail page | `/rfq/[id]` - hero with budget/timeline bar, description, inline Apply CTA, client footer |
| RFQ slugs | Clean URLs like `/rfq/hvac-chiller-compressor-8ac9a281` |
| Apply via DM | "Apply" routes to `/messages?with={clientId}` - token-gated for cross-company |
| 8 seeded RFQs | Realistic industrial part requests and engineering services |

### Site Activities Ledger (July 25, 2026)
| Item | Detail |
|------|--------|
| `SITE_ACTIVITIES_LEDGER.sql` | Append-only SHA256 hash-chained ledger table |
| 5 DB triggers | Auto-log RFQs, feed posts, orders, companies joining, team members |
| Backfill | 8 RFQs + 3,968 companies + 4 team members logged (3,980 total) |
| `/feed` page | Unified activity stream with filter pills, search, real-time updates, hash chain display |
| `/api/activities` | Paginated ledger API with type/search filters |
| Realtime enabled | New activities appear instantly on `/feed` |

### Navigation & Branding (July 25, 2026)
| Item | Detail |
|------|--------|
| Slim nav | h-16 container, h-9 logo, compact link padding |
| Always grey links | `text-gray-600` - no more white text that changed on scroll |
| User dropdown | Nameplate with avatar, company name, email, role badge |
| Features page | `/features` - 9-section platform guide with links to every page |
| Get Started page | Updated stats (3,968 companies, 8 RFQs, 3,980 activities, 8 users) + 9 feature cards |

---

## 📋 Next Up (In Order)
1. **Contract-to-Unlock Integration** ✅ Just shipped (July 30)
2. **@ Mentions in Channels** - Type `@` to tag teammates, they get notified
3. **Formal Offer System** - Vendors submit structured offers (price, timeline, terms); clients accept/reject
4. **RFQ Tagging Algorithm** - Vendor profiles tagged with categories; RFQ feed filtered by relevance
