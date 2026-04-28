# 🧪 Precision Project Flow — Full Test Suite

> Comprehensive end-to-end test plan for the marketplace + social network for engineers.
> Spin up `npm run dev` then walk through this top-to-bottom. Tick each box ✅.

---

## 🚦 Pre-Flight

```bash
npm run dev
# App runs at http://localhost:3000
```

### Required SQL (run once if not already applied)
```sql
-- Allow parts_request post type
ALTER TABLE public.feed_posts DROP CONSTRAINT IF EXISTS feed_posts_post_type_check;
ALTER TABLE public.feed_posts ADD CONSTRAINT feed_posts_post_type_check
  CHECK (post_type IN ('update','project_showcase','job_post','milestone','parts_request'));
```

### Test Accounts
| Role     | Email               | Password   |
|----------|---------------------|------------|
| Engineer | `vendor@ppf.test`   | `123456md` |
| Engineer | `supplier@ppf.test` | `123456md` |
| Client   | (sign up fresh)     | `123456md` |

### Stripe Test Card
```
4242 4242 4242 4242   |   any future expiry   |   any CVC   |   any ZIP
```

---

## 1️⃣  Public Pages (no login required)

### 1.1 Home `/`
- [ ] Hero loads — Plus Jakarta Sans font visible
- [ ] Brand colors `#003D82` (deep blue) + `#FF6B35` (orange) present
- [ ] CTAs route correctly (Get Started → `/signup`, Browse → `/marketplace`)
- [ ] Footer links work (Privacy Policy, Terms of Service open PDFs)
- [ ] Navigation responsive on mobile (≤ 768px)

### 1.2 Marketplace `/marketplace`
- [ ] Real services load from Supabase (not mock data)
- [ ] Service cards show: image, title, price, category, provider name
- [ ] Category filter pills work (Structural, Mechanical, Electrical, etc.)
- [ ] Search box filters in real-time
- [ ] Click a service → navigates to `/marketplace/service/[id]`
- [ ] Empty state shows when no matches

### 1.3 Service Detail `/marketplace/service/[id]`
- [ ] Image gallery / carousel works (if multiple images)
- [ ] Falls back to category default when no `images[]`
- [ ] Title, full description, price, category, tags display
- [ ] `delivery_time`, `service_area`, `certifications[]` show if set
- [ ] Provider/company link → `/profiles/[providerId]`
- [ ] **"Buy Now"** button (logged-out) → redirects to `/login`
- [ ] **"Buy Now"** button (logged-in client) → routes to `/checkout/[id]`

### 1.4 Profiles Directory `/profiles`
- [ ] Hero loads with `font-jakarta` + dark blue gradient
- [ ] Real engineer profiles load from `profiles` table (not mockData)
- [ ] Cards show: avatar/initial, company_name (or full_name), location, bio, service count, top 3 categories
- [ ] **Search** filters by name/bio/location/category
- [ ] **Location filter** dropdown shows only locations that exist
- [ ] **Specialty filter** dropdown shows only categories with active services
- [ ] Active filter chips appear and individually removable (X button)
- [ ] "Clear all" link resets all filters
- [ ] Empty state shows when no matches → "Clear Filters" button works
- [ ] Card click → routes to `/profiles/[id]`

### 1.5 Company Profile `/profiles/[id]`
- [ ] Dark blue gradient hero with grid overlay
- [ ] Back button works
- [ ] Company avatar / fallback Building2 icon shows
- [ ] Company name, full_name, email, location, member-since, service count
- [ ] "Verified Engineer" badge present
- [ ] **Services tab** (default):
  - [ ] All active services list with image, price, category, description
  - [ ] Delivery time + service area badges show
  - [ ] "View & Book" → `/marketplace/service/[id]`
  - [ ] Empty state "No active services listed yet"
- [ ] **About tab**:
  - [ ] Bio paragraph shows (or italic fallback)
  - [ ] Certifications grid (aggregated from all services)
  - [ ] Specialties chips (unique categories)
- [ ] **Sidebar**:
  - [ ] **"Send a Message"** button → `/messages?with=[id]` (logged out → `/login`)
  - [ ] **"Request a Quote"** → `/rfq/create?engineer=[id]`
  - [ ] Email link opens mail client
  - [ ] Verified trust badge
  - [ ] Quick stats (services / certs / specialties / member since)
- [ ] **Share button** copies URL to clipboard + toast confirmation
- [ ] Visiting an invalid ID → toast "Company not found" + redirects to `/profiles`
- [ ] Visiting a `client` user's ID → also redirects (engineers only)

---

## 2️⃣  Authentication

### 2.1 Sign Up `/signup`
- [ ] Form renders with email, password, full_name, user_type (engineer/client)
- [ ] Password validation enforced (min length, etc.)
- [ ] Email confirmation flow (if enabled in Supabase)
- [ ] Successful signup → redirects to dashboard appropriate to user_type
- [ ] `profiles` row auto-created with correct `user_type`
- [ ] Duplicate email → friendly error toast

### 2.2 Login `/login`
- [ ] Login with `vendor@ppf.test` / `123456md` succeeds
- [ ] Wrong password → error message
- [ ] After login, navigation shows user menu (not "Login")
- [ ] **"Forgot password?"** link → `/forgot-password`

### 2.3 Forgot/Reset Password
- [ ] `/forgot-password` accepts email
- [ ] Email sends (check Resend dashboard if configured)
- [ ] `/reset-password?token=...` accepts new password
- [ ] Login works with new password

### 2.4 Logout
- [ ] Logout button in nav clears session
- [ ] Protected pages redirect to `/login` after logout

---

## 3️⃣  Engineer Workflows (login as `vendor@ppf.test`)

### 3.1 Engineer Dashboard `/dashboard/engineer`
- [ ] Loads without errors
- [ ] Shows stat cards (active services, total orders, revenue, etc.)
- [ ] Recent orders list
- [ ] "Create Service" CTA → `/products/create`

### 3.2 Create Service `/products/create`
- [ ] Form renders with all fields:
  - [ ] Title, description, price, category, tags
  - [ ] **Photo upload** (drag-and-drop, multi-file)
  - [ ] Delivery time, service area (remote/on-site/both)
  - [ ] Certifications array
- [ ] Image upload to `service-images` bucket succeeds
- [ ] Image previews show before submit
- [ ] Can remove individual uploaded images
- [ ] Submit creates row in `services` table with `provider_id = auth.uid()`
- [ ] Auto-creates a `feed_post` of type `project_showcase` with the service
- [ ] Redirects to dashboard or service detail
- [ ] New service appears in `/marketplace`
- [ ] New service appears on engineer's `/profiles/[id]` page

### 3.3 Edit / Manage Services
- [ ] Engineer can see their own services in dashboard
- [ ] Edit existing service (if route exists) updates DB
- [ ] Toggle `active = false` removes from public marketplace

### 3.4 Receive Orders
- [ ] When a client buys, order appears in `/orders` (engineer view)
- [ ] Email notification received (via Resend)
- [ ] Order status updates work (pending → in_progress → completed)

---

## 4️⃣  Client Workflows (login as a fresh client account)

### 4.1 Client Dashboard `/dashboard/client`
- [ ] Loads without errors
- [ ] Shows recent orders, recommendations
- [ ] "Browse Marketplace" CTA → `/marketplace`

### 4.2 Purchase Flow
- [ ] Browse `/marketplace` → click any service
- [ ] Click **"Buy Now"** → routes to `/checkout/[id]`
- [ ] Stripe Payment Element loads
- [ ] Pay with `4242 4242 4242 4242`
- [ ] Success → redirects to `/checkout/success`
- [ ] Order created in `orders` table (status `pending` or `paid`)
- [ ] Auto-post to feed of type `update` ("Just purchased X")
- [ ] Confirmation email received
- [ ] Order visible in `/orders`

### 4.3 RFQ (Request for Quote) `/rfq/create`
- [ ] Form loads (with `?engineer=[id]` pre-fills target engineer)
- [ ] Submit creates RFQ record
- [ ] Engineer notified

---

## 5️⃣  Social Feed `/feed`

### 5.1 Feed View
- [ ] Page loads with dark blue gradient hero + `font-jakarta`
- [ ] Posts load from `feed_posts` table
- [ ] Filter tabs work: **All / Parts Requests / Showcases / Jobs / Milestones / Updates**
- [ ] Each post card shows: author avatar, name, timestamp, post type badge, content, media

### 5.2 Compose Post
- [ ] "What's happening?" compose prompt (logged-in only)
- [ ] Modal opens with type selector
- [ ] **Update / Showcase / Milestone**: text + optional media
- [ ] **Job Post**: text body
- [ ] **Parts Request**: text + **budget** + **deadline** fields
- [ ] Media upload to `post-media` bucket works
- [ ] Submit creates row + post appears at top with blue ring (realtime)
- [ ] Switch tabs → "X new posts" nudge banner appears for non-matching filter

### 5.3 Realtime Updates
- [ ] Open `/feed` in **two browser windows** with different accounts
- [ ] Post in Window A → appears instantly in Window B (with blue glow ~8s)
- [ ] Like in Window A → counter updates in Window B
- [ ] Comment in Window A → counter updates in Window B

### 5.4 Post Interactions
- [ ] **Like** button toggles + count updates immediately (optimistic)
- [ ] **Comment** opens panel, posts, displays
- [ ] **DM author** button → `/messages?with=[authorId]` ✅ (now works!)
- [ ] **Image lightbox** opens on media click + closes on backdrop/Esc

### 5.5 Parts Request — Bidding
- [ ] `parts_request` posts show red urgent banner + budget + deadline
- [ ] **"Place Bid" panel** expands inline
- [ ] Cannot bid on your own post (button disabled)
- [ ] Submit bid → creates `feed_bids` row
- [ ] Bid list displays sorted lowest-first
- [ ] Bidder's name + amount + note visible
- [ ] **Author** sees a "DM bidder" button next to each bid
- [ ] Bid count updates on the post card
- [ ] Re-bidding (same user) **upserts** instead of duplicating

---

## 6️⃣  Messaging `/messages`

### 6.1 Conversation List
- [ ] All your conversations load in left sidebar
- [ ] Each row shows: other user's name, last message preview, timestamp, unread badge
- [ ] Click row → opens conversation in right panel
- [ ] **"+ New Message"** button opens search modal

### 6.2 New Conversation Modal
- [ ] Search by name (≥ 2 chars triggers search)
- [ ] Click result → opens new conversation
- [ ] Existing conversations are reused (no duplicates)

### 6.3 ✨ Auto-Open via URL Param `?with=[userId]`
- [ ] From feed: click DM on a post → messages opens that conversation directly
- [ ] From profile: click "Send a Message" → messages opens that conversation directly
- [ ] From marketplace: contact engineer button → same
- [ ] Visiting `/messages?with=YOUR_OWN_ID` → does **not** open (silently ignored)
- [ ] Visiting `/messages?with=invalid-uuid` → toast "User not found"

### 6.4 Sending Messages
- [ ] Type + Enter or Send button posts message
- [ ] Message appears immediately
- [ ] Recipient sees message instantly (open in 2 windows to verify realtime)
- [ ] Read receipts (single check / double check) update
- [ ] Timestamp groups (Today, Yesterday, etc.)

### 6.5 Token Paywall
- [ ] After N free messages from your side, paywall modal appears
- [ ] Token packs display (Starter $10, Pro $45, Business $99)
- [ ] Click pack → Stripe Payment Element loads
- [ ] Pay with `4242 4242 4242 4242`
- [ ] Token balance updates in `profiles.token_balance`
- [ ] Can resume sending messages
- [ ] System message "Tokens purchased" appears in conversation

---

## 7️⃣  Orders `/orders`

- [ ] Loads list of orders for current user
- [ ] Filter by status (pending / in_progress / completed / cancelled)
- [ ] Click order → details page
- [ ] Engineer can update status
- [ ] Client can leave review (if completed)

---

## 8️⃣  Settings `/settings`

- [ ] Profile fields editable: full_name, **company_name**, **bio**, **location**, **avatar_url**
- [ ] Avatar upload to Supabase Storage works
- [ ] Save updates `profiles` row
- [ ] Changes reflect on `/profiles/[id]` and `/profiles` directory
- [ ] Password change works
- [ ] Notification preferences (if implemented)

---

## 9️⃣  Admin `/admin` (admin role only)

- [ ] `/admin` redirects non-admins
- [ ] Can view: users, companies, orders, claims, services, reports
- [ ] Can verify/unverify engineers
- [ ] Can deactivate fraudulent listings

---

## 🔟  Friends / Social Graph

- [ ] Send friend request from another user's profile
- [ ] Friend request appears in pending list
- [ ] Accept → both sides become friends in `friends` table
- [ ] Reject removes the request
- [ ] Friends visible in some "Friends" UI

---

## 1️⃣1️⃣  Cross-Cutting Concerns

### 11.1 Realtime
- [ ] Feed posts (insert/update/delete)
- [ ] Likes counter
- [ ] Comments counter
- [ ] Bids counter
- [ ] Direct messages

### 11.2 RLS (Row Level Security)
- [ ] Logged-out users cannot read private tables
- [ ] User A cannot read User B's `user_messages` they're not a participant of
- [ ] User A cannot edit User B's `feed_posts`
- [ ] User A cannot edit User B's `services`

### 11.3 Storage Buckets
- [ ] `service-images` — public read, owner-only write
- [ ] `post-media` — public read, owner-only write
- [ ] `avatars` (if exists) — public read, owner-only write

### 11.4 Email (Resend)
- [ ] New order confirmation
- [ ] New message notification (digest or instant)
- [ ] Password reset
- [ ] RFQ received

### 11.5 Mobile Responsiveness
- [ ] Test at 375px (iPhone SE), 768px (iPad), 1280px (desktop)
- [ ] No horizontal scroll
- [ ] Hamburger menu works on mobile
- [ ] Touch targets ≥ 44px

### 11.6 Performance
- [ ] Initial page loads < 3s
- [ ] No console errors on any page
- [ ] No 404s in network tab for static assets

---

## 1️⃣2️⃣  Edge Cases

- [ ] Empty marketplace (no services) → friendly empty state
- [ ] Empty feed → "Be the first to post" prompt
- [ ] Empty messages → "Start a conversation" prompt
- [ ] Service with no images → category fallback shows
- [ ] Engineer with no `company_name` → falls back to `full_name`
- [ ] Engineer with no `bio` → italic placeholder
- [ ] Slow network — loading spinners visible
- [ ] Stripe declined card `4000 0000 0000 0002` → friendly error

---

## 🐛 Bug Reporting Template

When you find a bug, log it like:

```
[ ] BUG: <title>
    Page:     /...
    Steps:    1. ... 2. ... 3. ...
    Expected: ...
    Actual:   ...
    Console:  <error message>
```

---

## ✅ Done When

- All checkboxes ticked OR
- Every failure has a corresponding bug entry above
- We can confidently say: **engineers can list, clients can buy, both can post & DM, bidding works, payments succeed**
