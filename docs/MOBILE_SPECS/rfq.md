# RFQ Marketplace — Feature Spec for React Native

> **Source:** `app/rfq/page.tsx`, `app/rfq/[id]/page.tsx`, `app/rfq/create/page.tsx`, `app/api/rfq/**`
> **Status:** ✅ Production
> **Framework:** Next.js 14 → React Native (Expo)

---

## Overview

The RFQ Marketplace is the core B2B workflow — clients post Requests for Quotes, engineers/vendors browse and bid. It follows an **Upwork job-board** pattern with engineering-specific fields (line items, materials, tolerances, shipping flags).

---

## Data Model

### `rfqs` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | TEXT | URL-friendly slug (`title-truncated-{uuid8}`) |
| `client_id` | UUID | FK → profiles |
| `title` | TEXT | Project title |
| `rfq_type` | `product` \| `service` | What's being sourced |
| `category` | TEXT | One of 19 engineering categories |
| `description` | TEXT | Full project description |
| `quantity` | TEXT | Quantity needed |
| `budget` | TEXT | Budget range (e.g. "$5,000 - $10,000") |
| `timeline` | TEXT | When needed (e.g. "2-4 weeks", "ASAP") |
| `location` | TEXT | Project location |
| `material` | TEXT | Required material |
| `attachment_urls` | JSONB | Array of file URLs |
| `inventory_status` | `in_stock` \| `out_of_stock` \| `back_order` | Parts availability |
| `lead_time_days` | INT | Manufacturing lead time |
| `estimated_ship_date` | DATE | Expected ship date |
| `nda_required` | BOOLEAN | NDA needed before details |
| `is_asap` | BOOLEAN | Expedited production |
| `is_next_day_air` | BOOLEAN | Next Day Air shipping |
| `line_items` | JSONB | Array of `{ part, qty, material, tolerance, finish, notes }` |
| `status` | `open` \| `in_review` \| `awarded` \| `closed` | Lifecycle state |
| `offers_count` | INT | Cached count of offers |
| `lowest_offer` | NUMERIC | Cached lowest bid |
| `my_offer` | NUMERIC | Cached current user's bid |

### `rfq_offers` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `rfq_id` | UUID | FK → rfqs |
| `vendor_id` | UUID | FK → profiles |
| `amount` | NUMERIC | Offer price |
| `note` | TEXT | Detailed notes (structured: company, contact, phone, per-part pricing) |
| `delivery_days` | INT | Delivery timeline |
| `status` | `pending` \| `accepted` \| `rejected` \| `withdrawn` | Offer state |
| `conversation_id` | UUID | Linked DM conversation |
| `message_id` | UUID | Linked RFQ offer message |

---

## Pages

### 1. RFQ Marketplace (`/rfq`)

**Layout:** Hero header + sticky filter bar + linear feed (left) + stats panel (right, desktop)

#### Filter Bar (sticky, top)
- **Status pills:** Open / In Review / Awarded / All
- **Type pills:** All / Product / Service
- **Category dropdown:** 19 categories, pill-style selectors
- **Search:** Text search across title, description, category, location, budget
- **Sort:** Newest / Budget (ascending)
- **"For You" toggle** (engineers only): Personalized matching based on vendor services

#### "For You" Algorithm
When an engineer has active services, the system scores each RFQ:

| Criteria | Points |
|----------|--------|
| Exact category match | +50 |
| Partial category match | +25 |
| Tag match in title/description | +15 each |
| Open status | +10 |

Results sorted by score DESC. Match badges shown on cards:
- **Strong Match** (50+ pts) — orange badge
- **Good Match** (25+ pts) — amber badge
- **Partial Match** (10+ pts) — blue badge

No services? Shows nudge banner: "Add services to your profile to see personalized recommendations"

#### LinearRFQCard Component
Each RFQ card shows:
- **Left column:** Client avatar initial, status pill, match badge (if "For You"), offer count badge
- **Center:** Client name, relative time, title (linked to detail), description (2-line clamp), meta tags (category, location, timeline, quantity, material), inventory/shipping row (stock status, lead time, ship date, NDA/ASAP/Next Day Air badges), offer pricing row (lowest offer, your offer)
- **Right column:** Budget amount, "Details" button, "Bid" button (if open and not own), "View/Hide offers" toggle
- **Expandable offers panel:** Lists all offers with vendor avatar, name, amount, note snippet, status

#### Stats Panel (desktop right sidebar)
- Total RFQs, Open count, In Review count, Highest budget
- Quick Actions: Post RFQ, View Activity Feed, View Messages

### 2. RFQ Detail (`/rfq/[slug-or-id]`)

**Layout:** Hero header + two-column body (main + sidebar)

#### Hero Header
- Back link to marketplace
- Status pill (color-coded: emerald=open, amber=review, blue=awarded, gray=closed)
- Relative time
- RFQ title, category icon, type badge (Product/Service), location
- Badge row: NDA Required, ASAP, Next Day Air
- "Submit Offer" CTA button (visible if: not owner, not same company, status=open, no pending offer)
- "Contact" CTA button (links to DM)

#### Main Body
- **Description section** — Full text
- **Line Items** — Table or card list with Part, Qty, Material, Tolerance, Finish, Notes
- **Attachments** — Downloadable files
- **Offer Form** (expandable) — Amount, delivery days, start date, note
- **Offers List** — Each offer card shows: vendor avatar, name, company, amount, delivery days, note, status badge, accept/reject buttons (owner only), withdraw button (vendor only)

#### Sidebar
- **RFQ Details card** — Budget, Timeline, Category, Quantity, Material, Location (icon-labeled rows)
- **Client Card** — Avatar, name, company, email
- **Inventory/Shipping card** — Stock status, lead time, ship date
- **Share card** — Copy link

#### Offer Status Flow
```
Pending → (client accepts) → Accepted → RFQ status = awarded
Pending → (client rejects) → Rejected
Pending → (vendor withdraws) → Withdrawn
```

On accept:
1. That offer → `status = 'accepted'`
2. All other pending → `status = 'rejected'`
3. RFQ → `status = 'awarded'`
4. Contract automatically created via `create_contract_from_offer()` RPC
5. Conversation auto-unlocked, user redirected to messages

### 3. Create RFQ (`/rfq/create`)

**Multi-step wizard (3 steps):**

#### Step 1 — Project Details
- Title (required)
- Category dropdown (19 options, required)
- RFQ Type (Product / Service)
- Description (required, textarea)
- Location (required)
- Timeline (select: ASAP, 1-2 weeks, 2-4 weeks, 1-3 months, 3+ months)
- Quantity & Material (optional)
- Shipping flags: ASAP, Next Day Air
- Attachments (optional, up to 5 files)

#### Step 2 — Line Items
- Dynamic form: Add/remove rows
- Each row: Part name, Quantity, Material, Tolerance (±0.005"), Finish, Notes
- Validation: if any field filled, part name required

#### Step 3 — Review & Submit
- Summary of all fields
- Submit → inserts into `rfqs` table
- Auto-generates slug: `title-slugified-{uuid8}`
- Fire-and-forget: `POST /api/rfq/notify` to notify matching engineers
- Success screen with next steps and links to Dashboard / Browse Engineers / View RFQ

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/rfq/list` | GET | Paginated RFQ list with filters, client profiles, offer counts |
| `/api/rfq/detail` | GET | Single RFQ by ID or slug (service role, bypasses RLS for unauthenticated visitors) |
| `/api/rfq/offer` | POST | Submit an offer (50 tokens, token-gated via `submit_rfq_offer` RPC, creates DM + RFQ offer message) |
| `/api/rfq/offer` | PATCH | Accept/reject offer (client only, creates contract on accept) |
| `/api/rfq/offer` | DELETE | Withdraw offer (vendor only) |
| `/api/rfq/offer/unlock` | POST | Unlock RFQ application in chat (50 tokens, sets `is_paid=true`) |
| `/api/rfq/offer/action?conversationId=...` | GET | Get RFQ offer contexts (vendorId, ownerId) for a conversation |
| `/api/rfq/offer/action` | POST | Send contract (Stripe Connect) or schedule meeting |
| `/api/rfq/notify` | POST | Notify matching engineers about new RFQ |

---

## React Native Implementation Notes

### Screens
```
RFQStack
├── RFQMarketplaceScreen (list + filters)
├── RFQDetailScreen (detail + offers + bid)
├── CreateRFQScreen (multi-step wizard)
│   ├── Step1ProjectDetails
│   ├── Step2LineItems
│   └── Step3Review
└── SubmitOfferScreen (dedicated bid page)
```

### UI Components Needed
```
RFQMarketplaceScreen
├── StickyFilterBar
│   ├── StatusPills (horizontal ScrollView)
│   ├── TypePills
│   ├── SearchBar
│   ├── SortToggle
│   └── ForYouToggle (conditional, engineers only)
├── FlatList of LinearRFQCards
│   └── LinearRFQCard
│       ├── ClientAvatar (initial letter)
│       ├── StatusBadge
│       ├── MatchBadge (For You mode)
│       ├── OfferCountBadge
│       ├── RFQTitle (tappable → detail)
│       ├── DescriptionPreview (2-line)
│       ├── MetaTagRow (category, location, timeline, qty, material)
│       ├── ShippingBadges (inventory, lead, NDA, ASAP, Next Day Air)
│       ├── OfferPricingRow
│       ├── BudgetAmount
│       ├── ActionButtons (Details, Bid)
│       └── ExpandableOffersPanel
├── EmptyState (no RFQs / no matches)
└── NudgeBanner (engineers without services)

RFQDetailScreen
├── ScrollView
│   ├── HeroHeader
│   │   ├── BackButton
│   │   ├── StatusPill + TimeAgo
│   │   ├── Title
│   │   ├── CategoryIcon + TypeBadge + Location
│   │   ├── BadgeRow (NDA, ASAP, Next Day Air)
│   │   └── SubmitOfferCTA / ContactCTA
│   ├── DescriptionSection
│   ├── LineItemsTable (or CardList)
│   ├── AttachmentsList
│   ├── OfferForm (expandable)
│   │   ├── AmountInput
│   │   ├── DeliveryDaysInput
│   │   ├── NoteTextArea
│   │   └── SubmitButton (50 tokens)
│   └── OffersList
│       └── OfferCard
│           ├── VendorInfo (avatar, name, company)
│           ├── Amount + Delivery
│           ├── Note
│           ├── StatusBadge
│           └── ActionButtons (Accept/Reject/Withdraw)
├── Sidebar (tablet/landscape)
│   ├── DetailCard (budget, timeline, etc.)
│   ├── ClientCard
│   └── ShippingCard
└── ShareAction

CreateRFQScreen
├── StepIndicator (3 steps, progress bar)
├── Step1 — ProjectDetails
│   ├── TitleInput
│   ├── CategoryPicker (BottomSheet or Picker)
│   ├── TypeToggle (Product/Service)
│   ├── DescriptionInput (multiline)
│   ├── LocationInput
│   ├── TimelinePicker
│   ├── QuantityInput
│   ├── MaterialInput
│   └── ShippingToggles (ASAP, Next Day Air)
├── Step2 — LineItems
│   ├── LineItemRow (repeating)
│   │   ├── PartNameInput
│   │   ├── QtyInput (numeric)
│   │   ├── MaterialInput
│   │   ├── ToleranceInput
│   │   ├── FinishInput
│   │   └── NotesInput
│   ├── AddItemButton
│   └── RemoveItemButton
├── Step3 — Review
│   ├── SummaryCard
│   └── SubmitButton
└── SuccessScreen
    ├── CheckmarkAnimation
    ├── NextStepsList
    └── ActionButtons (Dashboard, Browse, View RFQ)
```

### Key Mobile Patterns

**Infinite Scroll:** FlatList `onEndReached` for pagination (20 per page from API)

**Pull to Refresh:** Refresh the RFQ list / offers

**"For You" Scoring:** Fetch vendor's services from Supabase on mount, compute scores client-side. Cache services in local state / AsyncStorage.

**Offer Submission:** 50 tokens — deduct balance optimistically, roll back on API error

**Real-time Offers:** Subscribe to `rfq_offers` table changes on detail screen

### Categories (19)
```
CNC Machining, Industrial Parts & Replacement, Sheet Metal & Fabrication,
3D Printing / Additive Manufacturing, Injection Molding & Tooling,
Electrical & Controls, Welding & Assembly, Quality & Inspection,
Civil Engineering, Mechanical Engineering, Electrical Engineering,
Structural Engineering, HVAC Systems, Plumbing & Piping, Fire Protection,
Controls & Automation, Industrial Manufacturing, Material Handling, Other
```

### Status Colors
| Status | Color |
|--------|-------|
| `open` | Emerald green |
| `in_review` | Amber/yellow |
| `awarded` | Blue |
| `closed` | Gray |