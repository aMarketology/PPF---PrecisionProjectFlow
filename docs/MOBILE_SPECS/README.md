# PPF Mobile — Feature Specs Index

> **Transfer target:** React Native (Expo) mobile app
> **Source codebase:** `PPF---PrecisionProjectFlow` (Next.js 14 + Supabase)
> **Date:** August 21, 2026

---

## Documents

| # | Document | Feature | Key Files |
|---|----------|---------|-----------|
| 1 | [messages.md](./messages.md) | Full messaging system (DMs, channels, groups, company chat, token-gated unlock, RFQ offer cards) | `app/messages/page.tsx`, `app/api/messages/**` |
| 2 | [rfq.md](./rfq.md) | RFQ Marketplace (browse, filter, "For You" matching, detail, create wizard) | `app/rfq/page.tsx`, `app/rfq/[id]/page.tsx`, `app/rfq/create/page.tsx` |
| 3 | [activity-feed.md](./activity-feed.md) | Blockchain activity feed + home page mini-feed (real-time, cryptographically chained, filterable) | `app/activity/page.tsx`, `app/page.tsx`, `app/api/activities/route.ts` |
| 4 | [rfq-application.md](./rfq-application.md) | RFQ offer submission flow (browse → bid → chat offer card → client unlock → contract → meeting) | `app/rfq/[id]/submit/page.tsx`, `app/api/rfq/offer/route.ts` |

---

## Shared Infrastructure

### Supabase Realtime
All features use Supabase Realtime subscriptions:
- **Messages:** `postgres_changes` on `user_messages` + `broadcast` for typing indicators
- **Activity Feed:** `postgres_changes` on `site_activities`
- **Sidebar:** `postgres_changes` on `user_messages` + `user_conversations`

### Token Economy
| Action | Cost | Doc |
|--------|------|-----|
| Unlock DM conversation | 100 | messages.md |
| Submit RFQ offer | 50 | rfq-application.md |
| Unlock RFQ application (client) | 50 | rfq-application.md |
| Send contract | 50 | rfq-application.md |
| Schedule meeting | 50 | rfq-application.md |

Token RPCs: `spend_tokens()`, `add_tokens()`, `refund_tokens()`

### Auth
All features use Supabase Auth (cookie-based on web, session-based on mobile). Service role key used server-side for operations that need to bypass RLS.

### Core Tables (shared across features)
| Table | Used By |
|-------|---------|
| `profiles` | All features |
| `user_conversations` | Messages, RFQ application |
| `user_messages` | Messages, RFQ application |
| `rfqs` | RFQ marketplace, RFQ application, Activity feed |
| `rfq_offers` | RFQ detail, RFQ application |
| `site_activities` | Activity feed, Home page |
| `services` | RFQ "For You" matching |

---

## Mobile Navigation Structure (Recommended)

```
Tab Navigator
├── Home Tab
│   ├── HomeScreen (search hero + activity strip)
│   └── ActivityFeedScreen (full activity feed)
├── RFQ Tab
│   ├── RFQMarketplaceScreen
│   ├── RFQDetailScreen
│   ├── CreateRFQScreen
│   └── SubmitOfferScreen
├── Messages Tab
│   └── MessagesScreen (sidebar + chat, all-in-one)
│       ├── NewDMModal
│       ├── CreateChannelModal
│       └── UnlockModal
├── Dashboard Tab
│   ├── EngineerDashboardScreen
│   └── ClientDashboardScreen
└── Profile Tab
    └── ProfileScreen
```

---

## Key Differences: Web → Mobile

| Pattern | Web (Next.js) | Mobile (React Native) |
|---------|--------------|----------------------|
| Navigation | `next/navigation` router | React Navigation (Stack + Tab) |
| Search params | `useSearchParams()` | Route params + local state |
| Real-time | Supabase JS client | Same SDK, add AppState management |
| Payments | Stripe Elements (web) | `@stripe/stripe-react-native` (PaymentSheet) |
| File uploads | `<input type="file">` | `react-native-image-picker` + `react-native-document-picker` |
| Animations | Framer Motion | `react-native-reanimated` + `LayoutAnimation` |
| Sticky headers | CSS `position: sticky` | `FlatList` `StickyHeaderComponent` or `SectionList` |
| Desktop sidebar | CSS flex layout | Bottom sheets / modals for secondary content |
| Infinite scroll | Scroll event | `FlatList.onEndReached` |
| Mentions in chat | Inline `<span>` highlight | Custom `Text` component with nested styles |
| Token gating (402) | API response + modal | Same API, native modal |
| Toast notifications | `react-hot-toast` | `react-native-toast-message` or similar |
| Optimistic updates | Set state before API | Same pattern, use React state |
| Typing indicators | Broadcast channel | Same Supabase broadcast API |

---

## Shared UI Components (Build Once)

These components appear across multiple features and should be built as shared primitives:

- **Avatar** — Profile image or initial letter (messages, RFQ, activity)
- **StatusBadge** — Colored pill (RFQ status, offer status)
- **CategoryIcon** — Maps 19 engineering categories to Lucide icons
- **TimeAgo** — `formatDistanceToNow` wrapper
- **TokenBalanceDisplay** — Token count with lightning icon
- **EmptyState** — Icon + message + optional CTA button
- **LoadingSpinner** — Consistent loading indicator
- **ErrorBanner** — Inline error display
- **RFQOfferCard** — Shared between messages and RFQ detail (3 viewer states)
- **ActivityCard** — Used in both activity feed and home page mini-feed