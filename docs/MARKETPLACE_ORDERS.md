# 📊 Unified Financial Ledger & Stripe Connect

> **Status:** Implemented (Sep 27, 2026). Migration SQL authored; awaiting manual paste into Supabase SQL Editor.

---

## 🎯 Goal

A single authoritative transaction ledger — `marketplace_orders` — for **every** dollar that moves on PPF, whether it's a product, a service, or an approved RFQ contract. This eliminates the `orders` vs `product_orders` "split-brain" and lets product/service/RFQ flows share one set of Stripe primitives.

---

## 🗄️ `marketplace_orders` (the ledger)

| Column | Purpose |
|--------|---------|
| `id` | UUID PK |
| `order_number` | Human-readable (`PPF-PRD-…`, `PPF-SVC-…`, `PPF-CTR-…`) |
| `order_type` | `product` \| `service` \| `rfq_contract` |
| `buyer_id` / `seller_id` | → `profiles.id` |
| `seller_company_id` | → `company_profiles.id` (nullable) |
| `subtotal` / `tax` / `shipping` / `fee` / `total` | money in dollars |
| `stripe_payment_intent_id` / `stripe_charge_id` / `stripe_account_id` | Stripe refs |
| `status` | `pending_payment`, `paid`, `in_progress`, `shipped`, `delivered`, `completed`, `cancelled`, `refunded`, `disputed` |
| `payout_status` | `not_held`, `held`, `scheduled`, `paid_out`, `clawback` |
| `payout_id` | Stripe payout ref |
| `source_table` / `source_order_id` | lineage to legacy `orders` / `product_orders` |

Backfill is idempotent (guarded by `NOT EXISTS` on `source_table` + `source_order_id`).

---

## 🔁 Migration

1. **Run** `supabase/UNIFY_MARKETPLACE_ORDERS.sql` in the Supabase SQL Editor.
   - Creates `marketplace_orders`.
   - Backfills 6 `orders` rows (→ `order_type='service'`) and 1 `product_orders` row (→ `order_type='product'`).
   - Enables RLS (buyer/seller/admin read).
2. Legacy `orders` and `product_orders` are **left in place** as history; no code reads them anymore.

---

## 🔌 Stripe Connect wiring

### Flow A — Product/Service purchase (Direct Charge)

- `POST /api/stripe/create-payment-intent` now accepts `{ productId, type: 'product' | 'service' }`.
- Resolves the seller's connected account (`stripe_connect_accounts` via `company_id`).
- If Connect onboarding is complete → **Direct Charge** with `application_fee_amount = 10%` and `transfer_data.destination`.
- Otherwise → platform-direct charge (no fee captured; falls back gracefully).
- Writes a `pending_payment` `marketplace_orders` row immediately.

### Flow B — RFQ contract (Direct Charge + Manual Payout escrow)

- `POST /api/rfq/offer/action` (`send_contract`) now also inserts a `marketplace_orders` row (`order_type='rfq_contract'`, `payout_status='held'`).
- Webhook `payment_intent.succeeded` (`type='rfq_contract'`) marks it `paid` + `held`.
- `POST /api/contracts/[id]` (`release` action) → `release_milestone` RPC, then **creates a manual Stripe payout** (`stripe.payouts.create`) to the vendor's connected account; records `stripe_transfer_id` on the milestone and `payout_status='paid_out'` on the ledger.

---

## 🔔 Webhook (`/api/stripe/webhooks`)

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Reconstruct `marketplace_orders` from metadata (idempotent upsert), unlock buyer↔seller DM, send emails |
| `payment_intent.payment_failed` | Mark order `refunded` |
| `account.updated` | Sync `stripe_connect_accounts` (charges/payouts/onboarding) |
| `payout.paid` | Set `payout_status = 'paid_out'` |
| `charge.dispute.created` | Set `status = 'disputed'` |

> **Critical fix:** the old webhook wrote to a non-existent `payment_intents` table and `product_orders` with wrong columns. It now writes directly to `marketplace_orders` from Stripe metadata, so product purchases actually create orders.

---

## 🖥️ Admin surfaces

- `/admin/orders` reads `marketplace_orders` (all types; shows order-type, buyer, seller, amount, payout status, order status).
- `/admin/my-orders` and `/admin/earnings` read `marketplace_orders` by `seller_id` / `buyer_id`.
- `/api/admin` `stats` + `reports` now aggregate the unified ledger (single revenue figure, unified top-vendors/categories).

---

## ⚠️ Actions required

1. **Paste `supabase/UNIFY_MARKETPLACE_ORDERS.sql`** into the Supabase SQL Editor.
2. Confirm `marketplace_orders` appears and backfill counts match (7 rows expected: 6 service + 1 product).
3. Configure Stripe Connect keys + webhook endpoint for the `payout` / `dispute` / `account` events in the Stripe dashboard.