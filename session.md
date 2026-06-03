# 🛠️ Precision Project Flow — Session Tracker

**Last updated:** June 2, 2026
**Status:** ✅ LIVE · 📱 Mobile app published · �️ Image uploads live · 🔐 Messaging + tokens hardened

---

## 📍 Current Focus
**PHASE 2 — Messaging & Token Hardening + Full System Test.**
Mobile app is published. Now making the token economy bulletproof, then running
the full end-to-end test in `docs/SYSTEM_TEST.md`.

## 🔴 Action Required (YOU)
1. **Run `supabase/PROJECTFLOW_TOKENS.sql`** in the Supabase SQL Editor — creates the
   unified `token_transactions` ledger + fixed `add_tokens` / `spend_tokens` / `refund_tokens`.
   URL: https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new
2. **Run the full system test** — follow `docs/SYSTEM_TEST.md` top to bottom.

## ✅ Just Shipped (May 29)
| Item | Detail |
|------|--------|
| $ProjectFlow Token Ledger | `supabase/PROJECTFLOW_TOKENS.sql` — append-only `token_transactions` audit table |
| Fixed code↔SQL drift | `credit-tokens` referenced a non-existent `token_transactions` table + wrong `add_tokens` signature — now both exist & match |
| Idempotent `add_tokens` | Unique index on `stripe_payment_id` — webhook + client can't double-credit |
| Race-safe `spend_tokens` | `SELECT … FOR UPDATE` lock prevents concurrent over-spend |
| New `refund_tokens` | Auto-refund if a message fails to save after charging |
| Webhook safety net | Token purchases now credited server-side too (survives browser close) |
| UI consistency | Messages UI now shows "2 tokens" everywhere (was mixing "$10") |
| `token_account_summary` view | Per-user lifetime credited/spent reconciliation |

## ✅ Production Infrastructure — COMPLETE
| Item | Status |
|------|--------|
| Railway deployment | ✅ Live |
| All 8 env vars in Railway | ✅ Done |
| Stripe webhook (`charming-voyage`) | ✅ Live → `https://www.precisionprojectflow.com/api/stripe/webhooks` |
| `STRIPE_WEBHOOK_SECRET` updated to prod secret | ✅ `whsec_0rmVM7aRsUMQo8fY8E8ZHyZbKhZ37IQz` |
| `RESEND_API_KEY` in Railway | ✅ Done |
| `NEXT_PUBLIC_APP_URL` in Railway | ✅ `https://www.precisionprojectflow.com` |
| Stripe Connect return URLs | ✅ Will use real domain |
| Order status emails wired | ✅ Done |
| Mobile app scaffold (`/mobile`) | ✅ Committed |

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

## 🔴 Action Required (YOU — manual steps)
1. **Run end-to-end dry-run on prod** using Stripe test card `4242 4242 4242 4242`:
   - Sign up as a new engineer → list a service → sign up as a new client → buy tokens → DM engineer → checkout → confirm order appears + emails fire
2. **Resend domain DNS** — go to [resend.com/domains](https://resend.com/domains) and add `precisionprojectflow.com` so branded emails work
3. **Recruit first 5 real vendors** — share `https://www.precisionprojectflow.com/get-started/vendors`

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
| 1 | Buy tokens → DM vendor → vendor replies → request quote → Stripe checkout → vendor sees order | � Never run as full dry-run — DO THIS FIRST |
| 2 | Smoke-test refund flow | 🔴 Not built |
| 3 | Order status updates wired to email | ✅ Done |

### Phase C — Polish (Post First User)
| # | Task |
|---|------|
| 1 | Resend domain verification — add DNS records for `precisionprojectflow.com` so emails come from branded address instead of `onboarding@resend.dev` |
| 2 | Marketplace card design audit (match service detail page) |
| 3 | Engineer profile portfolio gallery (`/dashboard/engineer/portfolio` — wire uploads) |
| 4 | Search bar in top nav (Upwork-style) |
| 5 | Notification bell + unread badge in nav (FB-style) |
| 6 | Vendor onboarding email sequence (welcome → "complete your profile" → "list your first service") |

### 🚀 Phase D — Growth (Next Sprint)
| # | Task |
|---|------|
| 1 | Public launch announcement (LinkedIn, email list, engineering communities) |
| 2 | Mobile app (Expo) — TestFlight beta for iOS |
| 3 | RFQ matching algorithm — auto-notify relevant vendors when a matching RFQ is posted |
| 4 | Reviews & ratings system post-order completion |
| 5 | Referral program — vendor invites another vendor, both get bonus tokens |

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
| `SERVICE_IMAGES_BUCKET.sql` | ✅ Live |
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
