# 🛠️ Precision Project Flow — Session Tracker

## 📍 Current Focus
Feature-complete on core pages — ready for end-to-end testing.

## ✅ Completed This Session
- ✅ `supabase/MESSAGING_TABLES.sql` — created & run in Supabase (conversations, messages, RPC, trigger)
- ✅ Fixed `?with=` DM flow timing bug in `app/messages/page.tsx`
- ✅ Engineer dashboard fully redesigned (`app/dashboard/engineer/page.tsx`)
- ✅ Client dashboard fully redesigned (`app/dashboard/client/page.tsx`)
- ✅ Profiles directory (`app/profiles/page.tsx`) — loads from Supabase, search + location/category filters, CompanyCard grid
- ✅ Settings page fully rewritten (`app/settings/page.tsx`) — Profile / Security / Notifications / Privacy tabs, live Supabase save for `full_name`, `company_name`, `bio`, `location`, `avatar_url`, avatar upload to Storage
- ✅ Created `session.md` and `.github/copilot-instructions.md`

## 🔴 Action Required (YOU)
> Make sure the Supabase `avatars` storage bucket exists and has a public policy if you want avatar upload to work.
> Run `supabase/MESSAGING_PAYWALL.sql` if you haven't yet (for `spend_tokens`, `add_tokens`).

## 🟡 Up Next
| Priority | Task |
|----------|------|
| 🟡 | Create `avatars` Supabase Storage bucket (public, if not exists) |
| 🟡 | End-to-end test: signup → browse profiles → DM engineer → pay tokens → receive reply |
| � | RFQ flow (`/rfq`) — verify form submits to DB |
| 🟢 | Marketplace page — polish and verify services load from Supabase |
| 🟢 | Engineer individual profile page (`/profiles/[id]`) — review completeness |

## 🗄️ DB Tables We Depend On
| Table | Status |
|-------|--------|
| `profiles` | ✅ Exists |
| `services` | ✅ Exists |
| `user_conversations` | ✅ Created via MESSAGING_TABLES.sql |
| `user_messages` | ✅ Created via MESSAGING_TABLES.sql |
| `token_purchases` | 🟡 Run `MESSAGING_PAYWALL.sql` |

## 📁 Key Files
| File | Purpose |
|------|---------|
| `app/messages/page.tsx` | Main messaging UI (sidebar + chat + paywall) |
| `app/profiles/[id]/page.tsx` | Engineer profile — `handleDM()` → `/messages?with={id}` |
| `app/api/messages/send/route.ts` | Send message API (token gating) |
| `app/api/messages/credit-tokens/route.ts` | Credit tokens after Stripe payment |
| `supabase/MESSAGING_TABLES.sql` | 🆕 Creates all messaging DB objects |
| `supabase/MESSAGING_PAYWALL.sql` | Token balance + spend/add functions |
| `lib/supabase/client.ts` | Supabase browser client |
