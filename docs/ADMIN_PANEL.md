# 🖥️ PPF Super Admin Panel

> **Status:** In active development (September 27, 2026).
> The super admin panel lives under `/admin/*` and is gated by `profiles.is_admin`.
> Regular users see only their **personal** sections; **platform** sections are super-admin only.

---

## 🎯 Current Focus

The current work stream has two goals:

1. **Moderation & messaging** — the super admin can click through **every listing** (products, services, RFQs), view it live, and **message the user who posted it** to ask questions.
2. **Destructive moderation** — super admin can **delete/remove** listings (RFQs, products, services) directly from the panel.

---

## 📁 Admin Routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/admin` | Everyone | Personal overview (account card, badges, stats) |
| `/admin/company` | Company users | My Company (profile, team, roles, invites) |
| `/admin/company-chat` | Company users | Deep-link into #General + job-title groups |
| `/admin/my-listings` | Everyone | Own services/products |
| `/admin/my-orders` | Everyone | Role-aware orders |
| `/admin/my-rfqs` | Everyone | Own RFQs |
| `/admin/earnings` | Engineers | Earnings overview |

### Super Admin only (`profiles.is_admin = true`)

| Route | Moderation Capabilities |
|-------|-------------------------|
| `/admin/users` | List/delete users, role demote/promote |
| `/admin/companies` | List companies, delete, reset claim |
| `/admin/claims` | Approve/reject company claims |
| `/admin/products` | **View live product, message vendor, toggle active, delete** |
| `/admin/services` | **View live service, message provider, toggle active, delete** |
| `/admin/orders` | List orders (buyer + company joined) |
| `/admin/rfqs` | **View RFQ, message requestor, delete** |
| `/admin/reports` | Real analytics (orders, products, RFQs, offers, users) |
| `/admin/settings` | Super-admin management, platform DMs, token grants |

---

## 🔗 Click-through + Messaging (the workflow)

Each marketplace listing in the panel now exposes **View** (`ExternalLink`) and **Message** (`MessageSquare`) actions:

- **View** opens the public detail page:
  - Products → `/marketplace/product/{id}`
  - Services → `/marketplace/service/{id}`
  - RFQs → `/rfq/{slug}`
- **Message** opens `/messages?with={user_id}`, which:
  - Reuses the existing `get_or_create_conversation` RPC to open/create a DM.
  - The admin writes into the normal token-gated send flow.

**Ownership resolution** (who gets messaged):

| Listing | Owner column | Resolution |
|---------|-------------|-----------|
| `products` | `company_id` | `company_profiles.owner_id` (admin API enriches `company` object) |
| `services` | `provider_id` | Direct profile id (admin API enriches `provider` object) |
| `rfqs` | `client_id` | Direct profile id (already embedded as `client` via FK) |

---

## 🗑️ Delete Capabilities

The admin API (`/api/admin`) exposes `action=delete` for:

| `tab` | Table | Notes |
|-------|-------|-------|
| `products` | `products` | on delete → cascade to `product_orders` is RESTRICT |
| `services` | `services` | |
| `rfqs` | `rfqs` | |
| `companies` | `company_profiles` | |
| `users` | `profiles` | |

Each page confirms first (`confirm()`) then calls the endpoint and optimistically removes the row, with `react-hot-toast` feedback.

---

## 💬 Super Admin Messaging (free & open until closed)

Super admin chats **open free** by default so the admin can monitor the marketplace. They re-gate only when explicitly closed.

- **DB**: `supabase/ADMIN_CHAT_MODERATION.sql` adds `is_closed` / `closed_at` + `is_support_ticket` / `ticket_opened_at` to `user_conversations`, a `conversation_involves_admin(p_conversation_id)` helper, and `mark_support_ticket` / `end_support_ticket` RPCs.
- **Support-ticket semantics:** a DM involving a super admin is treated as a support ticket. Sending any message auto-tags it via `mark_support_ticket` (free + open + unlocked).
- **Send route** (`app/api/messages/send/route.ts`): a DM involving a super admin is `isFree` automatically **unless** `is_closed` is true. Closed threads always return `402 conversation_locked` until reopened.
- **End chat** (`POST /api/messages/close`): super admin only. `{ conversationId, closed: true }` calls `end_support_ticket` (closes + posts a system message to both parties). `closed: false` reopens.
- **UI** (`app/messages`): super admins see a **Support** badge on tagged threads and an **End Chat / Ended - Reopen** pill on direct threads.

The recipient of an admin message never pays to reply while the thread is open.

## 🧠 API Surface (`app/api/admin/route.ts`)

- **GET** `action=check` → `{ isAdmin }`
- **GET** `action=stats` → table counts
- **GET** `action=data&tab=...` → paginated rows (50/page)
  - `tab=products` is enriched with `company` (`company_name`, `owner_id`)
  - `tab=services` is enriched with `provider` (`full_name`, `location`)
  - `tab=rfqs` embeds `client` via FK
- **POST** `action=delete&tab=...&id=...` → delete a row
- **POST** `action=toggle&tab=products|services&id=...` → flip active
- **POST** `action=promote|demote` → set `is_admin`
- **POST** `action=report-status|report-delete` → moderate `content_reports`

Auth: server client reads the cookie (`createClient()`), admin check reads `profiles.is_admin`, all DB writes use the **service client** (bypasses RLS).

---

## 📐 Conventions

- Card/table styling follows the design system (`bg-white rounded-xl border border-gray-200`).
- Action icons use the same 4-icon layout as Products/Services: **View · Message · Toggle · Delete**.
- Status pills use the color-coded pattern (emerald=active, amber=in_review, blue=awarded, gray=inactive/closed).
- All destructive actions require a `confirm()` prompt and surface a toast.

---

## ✅ Recently Shipped

- RFQ delete (`Trash2`) on `/admin/rfqs`.
- View + Message on `/admin/products` (resolves the vendor via company owner).
- Admin products API enrichment (`company` with `owner_id`).

## 🔜 Next

- Add View + Message to `/admin/services` (uses `provider_id` directly).
- Add View + Message to `/admin/orders`/`/admin/companies` rows where useful.
- Consider an admin "message broadcast" to all vendors posting in a category.