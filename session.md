# 🛠️ Precision Project Flow — Session Tracker

**Last updated:** May 3, 2026  
**Status:** ✅ Build passing (47 routes) · 🚀 Deploying to production

---

## 📍 Current Focus
Onboarding the first cohort of real vendors & suppliers. Validating the end-to-end loop:
**Sign up → List service/product → Get DM → Pay tokens → Quote → Stripe checkout → Order fulfilled.**

---

## ✅ Completed (Cumulative)

### Auth & Profiles
- ✅ Multi-step signup (`/signup`) with visual user-type cards (vendor vs client), password strength, terms gate
- ✅ Engineer Step 2: company, category, location, bio, specialty chips, optional phone/rate/website
- ✅ Client Step 2: company, size, location, primary need
- ✅ Correct post-signup redirects (`/dashboard/engineer` or `/dashboard/client`)
- ✅ Settings page (`/settings`) — Profile / Security / Notifications / Privacy with live Supabase save + avatar upload
- ✅ Public engineer directory (`/profiles`) with search + filters
- ✅ Engineer detail page (`/profiles/[id]`) with DM button → `/messages?with={id}`

### Marketplace
- ✅ Marketplace listing page (`/marketplace`)
- ✅ Service detail page (`/marketplace/service/[id]`) — full PPF rebrand, hero banner, "What's Included", certifications, share button
- ✅ Product detail page (`/marketplace/product/[id]`)
- ✅ 16 real engineering services seeded under `max@amarketology.com` (PPF Marketplace admin)
- ✅ Old `dealer@precisionprojectflow.com` ghost account deleted

### Messaging
- ✅ `user_conversations` + `user_messages` tables live
- ✅ `/messages` UI: sidebar conversation list + chat panel + token paywall modal
- ✅ Token-gated send API (`/api/messages/send`) with `spend_tokens` RPC
- ✅ DM deep-link `?with={userId}` opens conversation directly

### Stripe
- ✅ Token packs purchase (`/api/stripe/buy-tokens`)
- ✅ Stripe Connect onboarding endpoint (`/api/stripe/connect`)
- ✅ Webhook handler (`/api/stripe/webhooks`)
- ✅ Service checkout (`/checkout/service/[id]`) + product checkout (`/checkout/[id]`)
- ✅ Payment intent creation (`/api/stripe/create-payment-intent`)
- ✅ Checkout success page

### Dashboards
- ✅ Engineer dashboard (`/dashboard/engineer`) — Overview, Orders, Services, Open RFQs, Earnings tabs
- ✅ Client dashboard (`/dashboard/client`) — Overview, Orders, My RFQs tabs

### RFQs
- ✅ RFQ create flow (`/rfq/create`) → writes to `rfqs` table

### Feed
- ✅ Activity feed (`/feed`) with API routes for like/bid/auto-post

### Admin
- ✅ Admin shell (`/admin`) with claims, companies, orders, reports, services, settings, users
- ✅ Max Real (`max@amarketology.com`) is platform admin owner

---

## 🔴 Action Required (YOU — manual Supabase steps)
1. **Run `supabase/ADD_ADMIN_COLUMN.sql`** in the Supabase SQL Editor → adds `is_admin` to `profiles` and stamps Max as admin.  
   URL: https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new
2. Confirm `avatars` storage bucket exists (public) for avatar upload.

---

## 🟡 Up Next — Onboarding-Ready Checklist

### Phase A — Real Vendor/Supplier Onboarding (THIS WEEK)
| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | "Add Service" UI in engineer dashboard (no more SQL seeds) | Dev | ✅ Done — `/services/create` |
| 2 | "Edit Service" page (`/services/edit/[id]`) — deactivate already works in dashboard | Dev | ✅ Done — pencil icon on each service card; supports edit + delete |
| 3 | Vendor onboarding email sequence (Resend) | Dev | 🔴 Not started |
| 4 | Stripe Connect onboarding flow surfaced in dashboard (banner if not connected) | Dev | ✅ Done — `<StripeConnectBanner />` auto-detects no_company / not_connected / incomplete states with 24h dismiss |
| 5 | Recruit & invite first 5 real vendors | You | 🔴 Not started |
| 6 | `is_admin` column added to profiles | You | ✅ Done |
| 7 | Lightweight badges/achievements system | Dev | ✅ Done — `lib/badges.ts` + `<BadgeList />`. Wired into engineer dashboard, client dashboard, public profile |

### Phase B — End-to-End Sale Validation
| # | Task | Status |
|---|------|--------|
| 1 | Buy tokens → DM vendor → vendor replies → request quote → Stripe checkout → vendor sees order | 🟡 Each piece works, never run as a single dry-run |
| 2 | Smoke-test refund flow | 🔴 Not built |
| 3 | Order status updates wired to email | 🔴 Not built |

### Phase C — Polish
| # | Task |
|---|------|
| 1 | Marketplace card design audit (match service detail page) |
| 2 | Email notifications: new message / new order / new RFQ response (Resend — key in `.env.local`) |
| 3 | Engineer profile portfolio gallery (`/dashboard/engineer/portfolio` exists — wire uploads) |
| 4 | Search bar in top nav (Upwork-style) |
| 5 | Notification bell + unread badge in nav (FB-style) |

---

## 🗄️ DB Tables — Status
| Table | Status |
|-------|--------|
| `profiles` | ✅ Live · 🟡 needs `is_admin` column |
| `services` | ✅ Live (16 rows) |
| `products` | ✅ Live |
| `product_orders` | ✅ Live |
| `rfqs` | ✅ Live |
| `user_conversations` | ✅ Live |
| `user_messages` | ✅ Live |
| `token_purchases` | ✅ Live |
| `stripe_connect_accounts` | ✅ Live |
| `company_profiles` | ✅ Live |
| `company_claims` | ✅ Live |

---

## 🔑 Admin Credentials (in `.env.local`)
- `PPF_ADMIN_EMAIL=max@amarketology.com`
- `PPF_ADMIN_USER_ID=7d23d34b-4ef8-40da-924d-658776f44047`
- Supabase project: `ifrxzmemiihxfdimwvcw`

---

## 📁 Key Files Quick Ref
| File | Purpose |
|------|---------|
| `app/signup/page.tsx` | Multi-step signup |
| `app/dashboard/engineer/page.tsx` | Vendor home |
| `app/dashboard/client/page.tsx` | Client home |
| `app/marketplace/page.tsx` | Marketplace listings |
| `app/marketplace/service/[id]/page.tsx` | Service detail |
| `app/messages/page.tsx` | DM UI + paywall |
| `app/checkout/service/[id]/page.tsx` | Stripe checkout |
| `app/api/stripe/webhooks/route.ts` | Stripe events |
| `supabase/ADD_ADMIN_COLUMN.sql` | 🟡 Run me |
| `scripts/seed-dealer.js` | Marketplace seed |
| `scripts/setup-admin.js` | Admin migration (already run) |
