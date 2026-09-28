# 🤝 Contracts & Escrow

> **Status:** Authored + tables/RPCs spec'd in `supabase/CONTRACTS_AND_ESCROW.sql`.
> Verify the migration has been applied in the live Supabase project before testing.

---

## 🏗️ Architecture

```
contract  → links buyer + vendor + payment intent
contract_milestones → partial deliverables with escrow releases
RPCs → get_contract_summary, can_release_milestone, mark_milestone_delivered,
       release_milestone, create_contract_from_offer
```

---

## 🗄️ Tables

### `contracts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `order_id` | UUID → `product_orders` | `ON DELETE SET NULL` |
| `buyer_id` | UUID → `profiles` | NOT NULL |
| `vendor_id` | UUID → `profiles` | NOT NULL |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | |
| `total_amount` | DECIMAL(10,2) | CHECK > 0 |
| `platform_fee` | DECIMAL(10,2) | default 0 (10% of amount) |
| `currency` | TEXT | default `usd` |
| `status` | TEXT | `draft / pending_payment / active / in_progress / completed / cancelled / disputed` |
| `stripe_payment_intent_id` | TEXT | |
| `accepted_at / started_at / completed_at / cancelled_at` | TIMESTAMPTZ | lifecycle |
| `cancelled_by` | UUID → `profiles` | |

### `contract_milestones`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `contract_id` | UUID → `contracts` | `ON DELETE CASCADE` |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | |
| `amount` | DECIMAL(10,2) | CHECK > 0 |
| `status` | TEXT | `pending / in_progress / delivered / released / disputed` |
| `due_date` | DATE | |
| `completed_at / released_at` | TIMESTAMPTZ | |
| `released_by` | UUID → `profiles` | |
| `stripe_transfer_id` | TEXT | |
| `sort_order` | INTEGER | default 0 |

---

## 🔒 RLS

- **Both parties + admin** can SELECT their own contracts.
- **Buyer or admin** can INSERT contracts.
- **Both parties + admin** can UPDATE (status transitions go through SECURITY DEFINER RPCs).
- Milestones: SELECT via contract membership; INSERT by buyer only.

---

## 🧩 RPCs

| RPC | Purpose | Auth rule |
|-----|---------|-----------|
| `get_contract_summary(p_contract_id)` | JSON: contract + milestones + totals (total/released/pending/disputed) | SECURITY DEFINER |
| `can_release_milestone(p_milestone_id)` | JSON `{can_release, reason}` | SECURITY DEFINER |
| `mark_milestone_delivered(milestone_id, user_id?)` | Vendor marks delivered | vendor only |
| `release_milestone(milestone_id, user_id?)` | Buyer releases funds | buyer only, must be `delivered` |
| `create_contract_from_offer(order_id, buyer_id, vendor_id, title, description?, total_amount?)` | Creates contract + single milestone | SECURITY DEFINER |

---

## 🔄 Lifecycle

```
Contract created (active)
  → Vendor marks milestone delivered
  → Buyer releases funds
  → all milestones released
  → contract completed
```

- `release_milestone` auto-completes the contract when no non-released milestones remain.
- `create_contract_from_offer` derives amount from `product_orders.total_amount` if not passed, sets `platform_fee = 10%`, and creates one full-amount milestone.

---

## 🧩 App Integration

| Route / API | Purpose |
|-------------|---------|
| `/contracts` | List current user's contracts (All/As Buyer/As Vendor) |
| `/contracts/[id]` | Contract detail + milestones |
| `GET /api/contracts?role=` | List contracts w/ milestone summaries |
| `POST /api/contracts` | Admin-only manual contract creation |

`/api/contracts` resolves `buyer` and `vendor` via `profiles!contracts_buyer_id_fkey` / `..._vendor_id_fkey` and embeds `milestones`.

---

## ⚠️ Prerequisite

Run `supabase/CONTRACTS_AND_ESCROW.sql` in Supabase SQL Editor (idempotent) if the `contracts` / `contract_milestones` tables and RPCs are not yet live.