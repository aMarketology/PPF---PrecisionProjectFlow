# Precision Project Flow — Session Tracker

**Last updated:** August 1, 2026
**Status:** ✅ LIVE · 💬 Slack-style messaging · 📋 RFQ Marketplace · 🔗 Blockchain Ledger · 🏢 Company Teams · 🔓 Contract-to-Unlock · 🎨 Marketplace Redesign

---

## 📍 Current Focus
**Marketplace Page Redesign — Design & UX polish.**
Complete overhaul of `/marketplace` page: fixed count mismatch (was showing only 3 services but 300+ results), added Services/Companies tabs for filtering, enhanced hero with glow orbs + pill badges, redesigned filter bar with backdrop blur + inline search, and upgraded both service + directory cards with better hover effects, typography, and spacing.

---

## ✅ Just Shipped (Aug 1, 2026)

### Marketplace Redesign
| Item | Detail |
|------|--------|
| Fixed count mismatch | Header now shows `"300+ total results — 3 services · 303 companies"` instead of only `"3 listed services"` |
| Tabs (All / Services / Companies) | Toggle between all results, only services, or only directory companies; counts shown on each tab |
| Enhanced hero section | Added glow orbs, backdrop-blur pill badges for "Engineering Marketplace" + total listing count, better heading copy |
| Redesigned filter bar | Sticky with backdrop-blur; inline search input, category dropdown, conditional price range, improved sort options, result count pill, subtle "Clear" button |
| Upgraded service cards | 48px taller images (h-48), better gradient overlays, "Starting at" label + delivery time on image, provider info + location, description text, improved badges, y-6 hover lift |
| Upgraded directory cards | Same h-48 treatment, verified/unclaimed pill inline with name, rating placeholder, up to 3 specialties shown with "+N more" overflow, better CTA button with shadow |
| Unlock route rewritten | No longer calls broken `unlock_conversation` RPC — does everything inline in TypeScript using `spend_tokens` + direct `is_unlocked` update |
| Send route hardened | Removed all `is_contracted` references (column doesn't exist in live DB); RPC calls (`are_friends`, `same_company`) wrapped in try/catch |
| Messages page fixed | `isFreeConversation` uses only `is_unlocked`; `markMessagesAsRead` no longer writes to `read_at` |
| `is_contracted` purged | Removed from all interfaces, queries, and UI — only `is_unlocked` is used |

### Channels & Groups — Slack-Style Messaging
| Item | Detail |
|------|--------|
| `conversation_type` column | `'direct'` / `'group'` / `'channel'` on `user_conversations` |
| `conversation_participants` table | Junction table with roles (`owner`/`admin`/`member`) |
| `create_channel()` RPC | Creates channels/groups + adds creator as owner + initial members |
| `join_channel()` RPC | Users can join public channels |
| Updated RLS policies | Works for all 3 conversation types — direct, group, channel |
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
| `fileInputRef` errors | Pre-existing (not from our changes — needs separate fix) |

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
| Tokens minted | `jg.reinard@gmail.com` (Joshua) + `bootysweat.808@gmail.com` (MAXIMMILLION) — 500 tokens each via `scripts/mint-tokens.js` |

### Contract-to-Unlock Messaging (July 30, 2026) — NEW
| Item | Detail |
|------|--------|
| Architecture decision | **DB trigger (primary) + App layer (secondary)** — trigger guarantees consistency across webhook, API, admin; app layer adds realtime broadcast support |
| When unlock happens | Order moves to `in_progress` status (vendor accepted, work began) |
| Find-or-create convo | `get_or_create_conversation(buyer_id, vendor_owner_id)` RPC handles storefront purchases where no prior DM exists |
| Post-contract behavior | **Stay unlocked forever** — re-gating behind 100 tokens after a paid contract creates friction for revisions, support, repeat business |
| System message | `🤝 Contract started — you can now message freely` inserted into message thread |
| `in_progress_at` column | Added to `product_orders` (was referenced by code but missing from schema) |
| `CONTRACT_UNLOCK_TRIGGER.sql` | New migration — trigger function + trigger on `product_orders` |
| Update-status route enhanced | App-layer fallback in `app/api/orders/[id]/update-status/route.ts` |

---

## 🗄️ DB Schema — Current State (Verified July 23)

### `user_messages` columns
`id, conversation_id, sender_id, content, is_read, read_at, created_at, updated_at, attachment_url, attachment_name, attachment_type, is_system_message, is_paid, payment_id`

### `user_conversations` columns
`id, participant_one_id, participant_two_id, last_message_at, created_at, updated_at, is_unlocked`

### `token_transactions`
✅ Exists — append-only ledger for all credit/debit operations

### `spend_tokens` RPC
✅ Exists — used by unlock route for token deduction

---

## 🔴 Action Required (YOU)
1. **Run end-to-end dry-run** — sign up → list service → buy tokens → DM → unlock → send messages → checkout
2. **Resend domain DNS** — add `precisionprojectflow.com` at resend.com/domains
3. **Recruit first 5 real vendors** — share `/get-started/vendors`

---

## 🟡 Up Next — Messaging Deep Dive (THIS SESSION)

### Performance & Realtime
| # | Task | Status |
|---|------|--------|
| 1 | Verify Supabase Realtime is enabled on `user_messages` + `user_conversations` | 🔴 Audit needed |
| 2 | Optimistic UI — show sent message immediately before server confirms | 🔴 Not built |
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

## 📝 Blog — Next Posts to Write
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
| Create Company page | `/companies/create` — auto-creates company + General channel |
| Company Dashboard | `/dashboard/company/[id]` — overview + team management with invite modal |
| Messages 3-column layout | Left sidebar (channels/groups/DMs), center thread, right sidebar (company info + team members) |
| Login redirects | Engineer(vendor)→`/feed`, Client(supplier)→`/dashboard/engineer` |

### RFQ Marketplace (July 25, 2026)
| Item | Detail |
|------|--------|
| RFQ linear feed | `/rfq` — horizontal RFQ cards with full title, description, location, budget, Apply button |
| Right dashboard panel | Stats, quick actions, category filter on `/rfq` |
| RFQ detail page | `/rfq/[id]` — hero with budget/timeline bar, description, inline Apply CTA, client footer |
| RFQ slugs | Clean URLs like `/rfq/hvac-chiller-compressor-8ac9a281` |
| Apply via DM | "Apply" routes to `/messages?with={clientId}` — token-gated for cross-company |
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
| Always grey links | `text-gray-600` — no more white text that changed on scroll |
| User dropdown | Nameplate with avatar, company name, email, role badge |
| Features page | `/features` — 9-section platform guide with links to every page |
| Get Started page | Updated stats (3,968 companies, 8 RFQs, 3,980 activities, 8 users) + 9 feature cards |

---

## 📋 Next Up (In Order)
1. **Contract-to-Unlock Integration** ✅ Just shipped (July 30)
2. **@ Mentions in Channels** — Type `@` to tag teammates, they get notified
3. **Formal Offer System** — Vendors submit structured offers (price, timeline, terms); clients accept/reject
4. **RFQ Tagging Algorithm** — Vendor profiles tagged with categories; RFQ feed filtered by relevance
