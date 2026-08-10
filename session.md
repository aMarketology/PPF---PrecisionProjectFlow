# Precision Project Flow — Session Tracker

**Last updated:** August 8, 2026
**Status:** ✅ LIVE · 💬 Messaging 🛡️ Permissions · 📨 Company Invites · 📋 RFQ Marketplace · 🏢 Company Teams · 🔓 Contract-to-Unlock · 🎨 Marketplace Redesign · 💰 Token-Gated Bidding

---

## 📍 Current Focus
**RFQ Offer Submission — token-gated + engineer-only.**

Fixed two bugs in the offer flow:
1. **Route `POST /api/rfq/[id]/offer` was un-gated**: It inserted offers raw into `rfq_offers` without checking engineer role or charging tokens. Rewritten to use `createServiceClient` + the `submit_rfq_offer` RPC (which spends 50 tokens atomically).
2. **Submit button appeared dead**: The modal's catch block silently swallowed HTTP errors. Now it shows the server's error message via toast, logs to console, and doesn't unset `submitting` until the toast is shown.
3. **Added `delivery_days` field** to the OfferModal, wired through to the RPC.
4. **Token cost notice** now visible in the modal (amber banner + button label "Submit Offer — 50 Tokens").

### ⚠️ Prerequisite before testing
The `submit_rfq_offer` RPC (in `supabase/RFQ_TOKEN_SYSTEM.sql`) must be deployed to the live Supabase DB. If it already exists, verify the `delivery_days` column exists on `rfq_offers` (both `RFQ_TOKEN_SYSTEM.sql` and `RFQ_OFFERS.sql` create it). Run one of those SQL files in the Supabase Dashboard if needed. The vendor account also needs ≥ 50 tokens.

---

## ✅ Just Shipped (Aug 1, 2026)

### Marketplace — Services Only
| Item | Detail |
|------|--------|
| Removed directory entries | No more `company_profiles` fetch, no `DirectoryCard` interface, no company cards |
| Removed tabs | No more All/Services/Companies tabs — page is services-only |
| Fixed hero counter | Now shows `"Browse 3 professional engineering services"` (accurate count) |
| Simplified code | Removed `_type` discriminator, `Card` union type, `industryToCategory` map, `activeTab` state |
| Cleaner filter bar | No conditional price/sort hiding — all filters always visible |
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
| Accept/Decline card | Rendered as styled cards in the DM thread — green Accept + gray Decline buttons |
| System message for accept | "✅ ACCEPTED: User has joined 'Company'!" sent to inviter |
| System message for decline | "❌ DECLINED: User declined the invitation" sent to inviter |
| API route | `POST /api/messages/send-invite` — validates admin/owner role, calls RPC |

### Channel/Project Permissions
| Item | Detail |
|------|--------|
| Admin actions | Add/remove members, rename channel, update description/settings |
| Member actions | Read and send messages only |
| `is_channel_owner()` helper | SECURITY DEFINER function to check owner role (bypasses RLS) |
| `is_channel_admin()` helper | SECURITY DEFINER function to check owner/admin role |
| `get_channel_role()` helper | Returns the user's role in a conversation |
| `update_channel_member_role()` RPC | Owner-only — promote/demote members |
| `remove_channel_member()` RPC | Admin+ — kick members from channel |
| `update_channel()` RPC | Admin+ — rename, change description, toggle public |
| `delete_channel()` RPC | Owner-only — permanently delete channel/project |
| `add_channel_member()` RPC | Admin+ — add new members |
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
1. **Run RFQ_OFFERS.sql in Supabase Dashboard** — Open https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new and paste the contents of `supabase/RFQ_OFFERS.sql`. This creates the `rfq_offers` table, RLS policies, and blockchain triggers. (The table was already created in a prior session, but verify it's there.)
2. **Run SITE_ACTIVITIES_LEDGER.sql if not already done** — Adds `offer_submitted` activity type for logging vendor offers to the blockchain.
3. **Recruit first 5 real vendors** — share `/get-started/vendors`
4. **Test flow** — Sign up as client → post RFQ → sign up as vendor → browse `/rfq` → submit offer → check activity on home page

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
