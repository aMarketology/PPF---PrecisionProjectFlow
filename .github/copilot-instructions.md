# GitHub Copilot Instructions — Precision Project Flow (PPF)

## 📋 Session Tracking
Always read and update `/session.md` at the start of every session to track what we are working on, what is done, and what is next.

## 🏗️ Project Overview
**Precision Project Flow (PPF)** — A B2B marketplace connecting engineers/vendors with clients for precision manufacturing and engineering services.

- **Framework**: Next.js 14 (App Router), TypeScript  
- **Styling**: Tailwind CSS, `font-jakarta` (`Plus Jakarta Sans`)  
- **Brand colors**: Primary `#003D82` / hover `#002960` · Accent orange `#FF6B35`  
- **Background**: `#F8FAFC`  
- **Backend**: Supabase (Auth, Postgres, Realtime)  
- **Payments**: Stripe (Connect for vendors, token packs for messaging)  
- **Animations**: Framer Motion  
- **Icons**: Lucide React  
- **Toasts**: react-hot-toast  

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
- Cards: `bg-white rounded-2xl border border-gray-100 shadow-sm`  
- Primary buttons: `bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl`  
- Accent buttons: `bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl`  
- Always use `<Navigation />` and `<Footer />` on full pages  
- Page wrapper: `min-h-screen bg-[#F8FAFC] font-jakarta`  

## 📁 Key Files
| File | Role |
|------|------|
| `app/messages/page.tsx` | Full messaging UI (sidebar + chat + paywall modal) |
| `app/profiles/[id]/page.tsx` | Engineer profile page with DM button |
| `app/api/messages/send/route.ts` | Token-gated send message API |
| `app/components/Navigation.tsx` | Global nav |
| `lib/supabase/client.ts` | Supabase browser client |
| `lib/supabase/server.ts` | Supabase server client (for API routes) |
| `supabase/MESSAGING_TABLES.sql` | Creates messaging DB schema |
| `supabase/MESSAGING_PAYWALL.sql` | Token balance functions |

## ⚠️ Common Pitfalls
- Always `await createClient()` on the server side (it's async).  
- The browser `createClient()` is NOT async.  
- Supabase `.or()` for compound filters: `and(sender_id.eq.X,receiver_id.eq.Y)` syntax.  
- Never expose service role key to the browser.  
