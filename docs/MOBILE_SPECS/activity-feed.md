# Activity Feed — Feature Spec for React Native

> **Source:** `app/activity/page.tsx`, `app/api/activities/route.ts`
> **Status:** ✅ Production (formerly `/feed`, now 301 → `/activity`)
> **Framework:** Next.js 14 → React Native (Expo)

---

## Overview

The Activity Feed is a **real-time, cryptographically chained** event ledger of all platform actions. Every significant action (RFQ posted, offer submitted, order placed, company joined) is logged as an immutable, hash-linked row in the `site_activities` table — giving the platform a blockchain-style audit trail.

---

## Data Model

### `site_activities` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `activity_type` | TEXT | Event type (see below) |
| `actor_id` | UUID | FK → profiles (who performed the action) |
| `target_type` | TEXT | What was acted on (`rfq`, `offer`, `order`, `company`, `feed_post`, etc.) |
| `target_id` | UUID | FK to the target entity |
| `summary` | TEXT | Human-readable description (e.g., "Acme Corp posted a new RFQ: CNC Parts") |
| `metadata` | JSONB | Structured data (budget, location, category, offer amount, etc.) |
| `previous_hash` | TEXT | SHA256 hash of the previous activity row |
| `row_hash` | TEXT | SHA256(`id` + `activity_type` + `actor` + `previous_hash`) — immutable chain |
| `created_at` | TIMESTAMPTZ | When the event occurred |

### Activity Types
| Type | Icon | Color | Meaning |
|------|------|-------|---------|
| `rfq_posted` | FileText | Blue | New RFQ created |
| `rfq_awarded` | Award | Emerald | RFQ awarded to a vendor |
| `offer_submitted` | TrendingUp | Rose | Vendor submitted an offer |
| `social_post_created` | MessageCircle | Purple | User made a community/social post |
| `order_placed` | ShoppingCart | Amber | Order created |
| `order_completed` | CheckCircle2 | Green | Order fulfilled |
| `company_joined` | Building2 | Cyan | User joined a company |
| `team_member_added` | UserPlus | Rose | Member added to company team |

---

## API

### `GET /api/activities?page=0&type=all&search=`

- **Auth:** Public (uses service role key to bypass RLS)
- **Pagination:** 20 per page, offset-based
- **Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "activity_type": "rfq_posted",
      "actor_id": "uuid",
      "target_type": "rfq",
      "target_id": "uuid",
      "summary": "Acme Corp posted a new RFQ: CNC Parts",
      "metadata": { "budget": "$5,000", "location": "Dallas, TX", "category": "CNC Machining" },
      "previous_hash": "abc123...",
      "row_hash": "def456...",
      "created_at": "2026-08-21T12:00:00Z",
      "actor": { "id": "uuid", "full_name": "Acme Corp", "avatar_url": "...", "user_type": "client" }
    }
  ],
  "page": 0,
  "hasMore": true,
  "total": 3980
}
```

- **Filters:**
  - `type` — Filter by activity_type (default: `all`)
  - `search` — ILIKE search on `summary`
- **Enrichment:** Actor profiles fetched separately, joined client-side

---

## Page Layout (`/activity`)

```
┌─────────────────────────────────────────────┐
│  Hero (gradient + grid overlay)              │
│  "Blockchain Activity Feed" badge            │
│  "{total} total events on the ledger"        │
├─────────────────────────────────────────────┤
│  Sticky Filter Bar                           │
│  [All] [RFQs] [Offers] [Awarded] [Orders]   │
│  [New Companies] [Team Joins] [Posts]        │
│  🔍 Search button → expandable search bar    │
├─────────────────────────────────────────────┤
│  Activity Cards (linear, max-w-3xl)          │
│  ┌─────────────────────────────────────────┐│
│  │ [Icon] Actor Name · 2 hours ago         ││
│  │        Summary text                     ││
│  │        Budget: $5,000                   ││
│  │        📍 Dallas, TX                    ││
│  │        [Category badge]                 ││
│  │ ─────────────────────────────────────── ││
│  │ # def456...  [View RFQ →]              ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │ [Icon] Jane Smith · 3 hours ago         ││
│  │        Submitted an offer of $4,200...  ││
│  │ ─────────────────────────────────────── ││
│  │ # ghi789...  [See Bid →]               ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Load More] button                         │
│                                             │
│  ┌─ Hash Chain Info Box ──────────────────┐ │
│  │ 🔗 SHA256 Hash Chain Ledger            │ │
│  │ Every platform action is crypto-       │ │
│  │ graphically chained. row_hash =        │ │
│  │ SHA256(id+type+actor+previous_hash)    │ │
│  │ Immutable and verifiable.              │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  Footer                                      │
└─────────────────────────────────────────────┘
```

### Card Layout
Each activity card:
- **Top section (p-5):** Activity icon (colored pill) + actor name + relative time + summary text + metadata (budget, location, category badge)
- **Bottom section (gray bg):** Hash preview (first 16 chars) + "View RFQ"/"See Bid" link

### Real-time Updates
Supabase Realtime subscription on `site_activities`:
```javascript
supabase.channel('sa_live')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_activities' }, (payload) => {
    // Load actor profile, prepend to activities array
  })
  .subscribe()
```

### Client-side Navigation Links
| Activity Type | target_type | Link Target |
|--------------|-------------|-------------|
| `rfq_posted` | `rfq` | `/rfq/{target_id}` |
| `rfq_awarded` | `rfq` | `/rfq/{target_id}` |
| `offer_submitted` | `rfq` | `/rfq/{target_id}` (link says "See Bid") |
| `order_placed` | `order` | N/A currently |
| `social_post_created` | `feed_post` | `/activity` |

---

## Home Page Activity Mini-Feed

The home page (`/`) also shows a condensed activity feed for authenticated users, fetched from the same API:

```javascript
// app/page.tsx — loadActivities()
const res = await fetch('/api/activities?page=0&type=all&search=')
setActivities(data.activities?.slice(0, 6) ?? [])
```

**Layout:** 3-column grid (md+) of compact activity cards, max 6 items, with a "View Full Activity" link.

---

## React Native Implementation Notes

### Screen
```
ActivityFeedScreen
├── HeroBanner
│   ├── "Blockchain Activity Feed" badge
│   ├── Title
│   └── Total events count
├── StickyFilterBar
│   ├── HorizontalScrollView of filter pills
│   │   └── FilterPill (icon + label, selected state)
│   └── SearchToggle → SearchBar (animated expand)
├── FlatList of ActivityCards
│   └── ActivityCard
│       ├── IconPill (colored by type)
│       ├── ActorAvatar + Name
│       ├── TimeAgo (relative)
│       ├── SummaryText
│       ├── MetadataRow (budget, location, category)
│       ├── HashPreview (monospace, 16 chars)
│       └── LinkButton (View RFQ / See Bid)
├── LoadMoreButton (or onEndReached)
├── EmptyState
└── HashChainInfoBox (explanatory footer)
```

### Home Page Mini-Feed Component
```
HomeActivityStrip
├── SectionHeader ("Live Activity Feed" + "View Full" link)
├── LoadingSpinner / EmptyState
└── 2-column FlatList (numColumns={2}) of ActivityMiniCard
    └── ActivityMiniCard (compact version)
```

### Key Libraries
- `@supabase/supabase-js` — realtime subscription
- `date-fns` — `formatDistanceToNow`
- `react-native-reanimated` — smooth card animations

### Real-time on Mobile
- Subscribe on mount, unsubscribe on unmount
- Use `AppState` to manage connection lifecycle
- Prepend new events with animation

### Pagination
- Load 20 per page
- `onEndReached` on FlatList triggers `loadMore`
- Track `page` state, increment on load
- Stop when `hasMore === false`