# GitHub Copilot Instructions — Precision Project Flow (PPF)

## 📋 Session Tracking
Always read and update `/session.md` at the start of every session to track what we are working on, what is done, and what is next.

## 🏗️ Project Overview
**Precision Project Flow (PPF)** — A B2B marketplace connecting engineers/vendors with clients for precision manufacturing and engineering services.

**Design Vision: Upwork × Facebook for Engineering**
PPF should feel like a professional social marketplace — the trust, credibility, and job-posting flow of **Upwork** combined with the social feed, profiles, and community feel of **Facebook/LinkedIn**. Engineers have rich public profiles (like FB profiles), clients post RFQs (like Upwork job posts), and the feed surfaces activity across the network.

- **Framework**: Next.js 14 (App Router), TypeScript  
- **Styling**: Tailwind CSS, `font-jakarta` (`Plus Jakarta Sans`)  
- **Brand colors**: Primary `#003D82` / hover `#002960` · Accent orange `#FF6B35`  
- **Background**: `#F8FAFC`  
- **Backend**: Supabase (Auth, Postgres, Realtime)  
- **Payments**: Stripe (Connect for vendors, token packs for messaging)  
- **Animations**: Framer Motion  
- **Icons**: Lucide React  
- **Toasts**: react-hot-toast  

## 🎯 Platform Feel — Design Principles

### Upwork-Inspired (Professional Marketplace)
- RFQs are **job posts** — clients describe what they need, vendors respond
- Engineer profiles show **skills, certifications, portfolio, reviews, hourly/project rate**
- Trust signals everywhere: verified badge, response rate, completed jobs count
- Clear CTAs: "Hire This Engineer", "Submit Proposal", "Request Quote"
- Structured service listings with deliverables, pricing tiers, delivery time

### Facebook/LinkedIn-Inspired (Social Network)
- **Activity Feed** (`/feed`) — engineers post updates, completed projects, certifications earned
- **Rich profile pages** — avatar, cover photo area, bio, work history, portfolio gallery
- **Connection signals** — "X mutual connections", "Also worked with [Company]"
- **Social proof** — star ratings, review counts, endorsements displayed prominently
- **Notification-style UX** — unread badges, "X vendors responded to your RFQ"
- Dashboard feels like a **home feed** — recent activity, recommended engineers, trending RFQs

### Combined UX Patterns
- Navigation: persistent top bar with search (Upwork-style) + notification bell (FB-style)
- Cards: always show avatar + name + title + rating + key stat (like Upwork talent cards)
- Messaging: sidebar conversation list + main chat panel (like FB Messenger)
- Onboarding: step-by-step profile completion with progress bar (like LinkedIn)

## 👤 User Types
| Type | Description |
|------|-------------|
| `engineer` | Lists services, has `company_name`, `bio`, `location`, `avatar_url` on their `profiles` row |
| `client` | Browses marketplace, sends RFQs, messages engineers |

## 🗄️ Key DB Tables
| Table | Purpose |
|-------|---------|
| `profiles` | `id, full_name, email, avatar_url, company_name, bio, location, user_type, token_balance, created_at` |
| `services` | `id, provider_id, title, description, price, category, tags, images, delivery_time, service_area, certifications, active` |
| `rfqs` | `id, client_id, title, category, description, budget, timeline, location, status, created_at` |
| `user_conversations` | `id, participant_one_id, participant_two_id, is_contracted, last_message_at` |
| `user_messages` | `id, conversation_id, sender_id, content, is_read, read_at, is_paid, is_system_message, payment_id, created_at` |
| `token_purchases` | Receipt log for Stripe token purchases |

## 🔑 Key RPCs
| Function | Purpose |
|----------|---------|
| `get_or_create_conversation(user_one_id, user_two_id)` | Returns conversation UUID |
| `spend_tokens(p_user_id, p_amount, p_description)` | Returns `NULL` or `'insufficient_tokens'` |
| `add_tokens(p_user_id, p_amount, p_stripe_payment_id)` | Credits balance |
| `are_friends(user_a, user_b)` | Returns boolean (stub = false) |

## 🎨 Design Conventions

### Colors & Typography
- Background: `bg-[#F8FAFC]`
- Primary: `#003D82` / hover `#002960`
- Accent: `#FF6B35` / hover `#E55A2B`
- Hero gradient: `from-[#001f4d] via-[#003D82] to-[#005BB5]`
- Grid overlay on heroes: `repeating-linear-gradient` at 40px intervals, `opacity-10`
- Font: `font-jakarta` (Plus Jakarta Sans) on all pages

### Components
- Cards: `bg-white rounded-2xl border border-gray-100 shadow-sm`
- Profile/talent cards: always include avatar, name, role/company, star rating, location
- Primary buttons: `bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl`
- Accent buttons: `bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl`
- Badges/chips: `rounded-full px-2.5 py-1 text-xs font-semibold border`
- Status badges use color-coded pill pattern (amber=pending, blue=active, emerald=complete, red=cancelled)

### Layout Rules
- Always use `<Navigation />` and `<Footer />` on full pages
- Page wrapper: `min-h-screen bg-[#F8FAFC] font-jakarta`
- Max content width: `max-w-7xl mx-auto px-4 sm:px-6`
- Hero sections always use the gradient + grid overlay
- Dashboard pages use a tab bar below the hero for section switching

## 📁 Key Files
| File | Role |
|------|------|
| `app/messages/page.tsx` | Full messaging UI (sidebar + chat + paywall modal) |
| `app/profiles/[id]/page.tsx` | Engineer profile page with DM button |
| `app/dashboard/engineer/page.tsx` | Engineer dashboard (Overview, Orders, Services, Open RFQs, Earnings tabs) |
| `app/dashboard/client/page.tsx` | Client dashboard (Overview, Orders, My RFQs tabs) |
| `app/rfq/create/page.tsx` | Multi-step RFQ form → saves to `rfqs` table |
| `app/get-started/vendors/page.tsx` | Vendor landing page |
| `app/get-started/suppliers/page.tsx` | Supplier landing page |
| `app/api/messages/send/route.ts` | Token-gated send message API |
| `app/components/Navigation.tsx` | Global nav |
| `lib/supabase/client.ts` | Supabase browser client |
| `lib/supabase/server.ts` | Supabase server client (for API routes) |
| `supabase/MESSAGING_TABLES.sql` | Creates messaging DB schema |
| `supabase/MESSAGING_PAYWALL.sql` | Token balance functions |
| `supabase/RFQ_TABLE.sql` | RFQ table + RLS (already run) |

## ⚠️ Common Pitfalls
- Always `await createClient()` on the server side (it's async).  
- The browser `createClient()` is NOT async.  
- Supabase `.or()` for compound filters: `and(sender_id.eq.X,receiver_id.eq.Y)` syntax.  
- Never expose service role key to the browser.  
- `useSearchParams()` must be wrapped in `<Suspense>` for Next.js static export.  
- Never commit `.env.local`, `passwords.md`, or any file with real API keys.  
