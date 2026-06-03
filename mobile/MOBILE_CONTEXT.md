# 📱 PPF Mobile App — Full Context Document
> Copy this file into the mobile Copilot session so it has full context.

---

## 🏗️ What Is PPF?
**Precision Project Flow (PPF)** — a B2B marketplace connecting engineers/vendors with clients for precision manufacturing and engineering services. Think **Upwork × LinkedIn for Engineering**.

- **Web app**: Next.js 14 (App Router), live at `https://www.precisionprojectflow.com`
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage) — project `ifrxzmemiihxfdimwvcw`
- **Payments**: Stripe (Connect for vendors, token packs for messaging)
- **Mobile**: Expo (React Native) with Expo Router, located in `/mobile`

---

## 🎨 Brand & Design System

| Token | Value |
|---|---|
| Primary blue | `#003D82` |
| Primary hover | `#002960` |
| Accent orange | `#FF6B35` |
| Background | `#F8FAFC` |
| Hero gradient | `from-[#001f4d] via-[#003D82] to-[#005BB5]` |
| Font | Plus Jakarta Sans (`@expo-google-fonts/plus-jakarta-sans`) |

**Mobile design rules:**
- Cards: white bg, rounded-2xl (16px), subtle shadow
- Primary buttons: `#003D82` bg, white text, semibold, 14px border-radius
- Accent CTA: `#FF6B35` bg, white text
- Status badges: amber=pending, blue=active, emerald=complete, red=cancelled
- Bottom tab bar with 5 tabs: Home, Marketplace, Post RFQ, Messages, Profile
- Safe area insets always respected

---

## 👤 User Types

| Type | Access |
|---|---|
| `engineer` | Has `company_name`, `bio`, `location`, `avatar_url`. Lists services. Receives RFQs & DMs. |
| `client` | Browses marketplace, sends RFQs, messages engineers, buys services. |

---

## 🗄️ Supabase Database Schema

### Core Tables

```sql
profiles (
  id UUID PK → auth.users.id
  full_name TEXT
  email TEXT
  avatar_url TEXT
  company_name TEXT
  bio TEXT
  location TEXT
  user_type TEXT  -- 'engineer' | 'client'
  token_balance INT DEFAULT 0  -- $ProjectFlow token wallet
  company_id UUID  -- for same-company free messaging
  is_admin BOOLEAN DEFAULT FALSE
  created_at TIMESTAMPTZ
)

services (
  id UUID PK
  provider_id UUID → profiles.id
  title TEXT
  description TEXT
  price NUMERIC
  category TEXT
  tags TEXT[]
  images TEXT[]  -- array of public storage URLs
  delivery_time TEXT
  service_area TEXT
  certifications TEXT[]
  active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ
)

rfqs (
  id UUID PK
  client_id UUID → profiles.id
  title TEXT
  category TEXT
  description TEXT
  budget TEXT
  timeline TEXT
  location TEXT
  status TEXT  -- 'open' | 'closed' | 'awarded'
  created_at TIMESTAMPTZ
)

user_conversations (
  id UUID PK
  participant_one_id UUID → profiles.id
  participant_two_id UUID → profiles.id
  is_unlocked BOOLEAN DEFAULT FALSE  -- 100 tokens to unlock
  last_message_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
)

user_messages (
  id UUID PK
  conversation_id UUID → user_conversations.id
  sender_id UUID → profiles.id
  content TEXT
  is_read BOOLEAN DEFAULT FALSE
  read_at TIMESTAMPTZ
  is_system_message BOOLEAN DEFAULT FALSE
  attachment_url TEXT   -- Supabase Storage path in 'message-attachments' bucket
  attachment_name TEXT
  attachment_type TEXT  -- 'image' | 'pdf' | 'file'
  created_at TIMESTAMPTZ
)

token_transactions (
  id UUID PK
  user_id UUID → profiles.id
  amount INT  -- positive = credit, negative = debit
  balance_after INT
  type TEXT  -- 'purchase' | 'spend' | 'bonus' | 'refund'
  description TEXT
  stripe_payment_id TEXT  -- unique index for idempotency
  reference_id UUID
  created_at TIMESTAMPTZ
)

product_orders (
  id UUID PK
  buyer_id UUID → profiles.id
  product_id UUID
  company_id UUID
  total_amount NUMERIC
  status TEXT  -- 'paid' | 'in_progress' | 'completed' | 'cancelled'
  created_at TIMESTAMPTZ
)
```

### Key RPCs (Supabase Functions)

| Function | Signature | Purpose |
|---|---|---|
| `get_or_create_conversation` | `(user_one_id UUID, user_two_id UUID) → UUID` | Returns conversation ID, creates if needed |
| `unlock_conversation` | `(p_conversation_id UUID, p_user_id UUID) → TEXT` | Charges 100 tokens, unlocks thread. Returns NULL \| 'not_participant' \| 'insufficient_tokens' |
| `spend_tokens` | `(p_user_id, p_amount, p_description, p_reference_id) → TEXT` | Deducts tokens. Returns NULL or 'insufficient_tokens' |
| `add_tokens` | `(p_user_id, p_amount, p_description, p_stripe_payment_id) → INT` | Credits tokens. Idempotent on stripe_payment_id. Returns new balance |
| `refund_tokens` | `(p_user_id, p_amount, p_description, p_reference_id) → INT` | Refunds tokens |
| `are_friends` | `(user_a UUID, user_b UUID) → BOOLEAN` | Stub — returns FALSE |
| `same_company` | `(user_a UUID, user_b UUID) → BOOLEAN` | TRUE if both share same non-null company_id |

### Storage Buckets

| Bucket | Access | Max Size | Used For |
|---|---|---|---|
| `avatars` | Public | 2 MB | Profile photos |
| `service-images` | Public | 5 MB | Service cover images |
| `message-attachments` | Private (signed URLs) | 25 MB | Files shared in DMs |

---

## 💰 Token Economy ($ProjectFlow Tokens)

- **100 tokens** = unlock a cold conversation thread (one-time, both parties free forever after)
- **FREE messaging**: when `is_unlocked=true`, or same company (`same_company()=true`)
- **No per-message cost** — only the one-time unlock fee

### Token Packs (via Stripe)
| Pack | Tokens | Price | Unlocks |
|---|---|---|---|
| Starter | 100 | $10 | 1 |
| Pro | 500 | $45 | 5 |
| Business | 1,200 | $99 | 12 |

### Stripe Flow
1. `POST /api/stripe/buy-tokens` — creates PaymentIntent with metadata `{type: 'token_purchase', user_id, tokens, pack_id}`
2. Client confirms payment with `stripe.confirmPayment()`
3. `POST /api/messages/credit-tokens` — verifies PI with Stripe, calls `add_tokens()` RPC
4. Stripe webhook `payment_intent.succeeded` → safety net, also calls `add_tokens()` (idempotent)

---

## 🌐 Web API Endpoints (used by mobile too)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/messages/send` | POST | Send a message (checks is_unlocked) |
| `/api/messages/unlock` | POST | Spend 100 tokens to unlock conversation |
| `/api/messages/upload` | POST | Upload file to message-attachments bucket |
| `/api/messages/credit-tokens` | POST | Credit tokens after Stripe payment |
| `/api/stripe/buy-tokens` | POST | Create Stripe PaymentIntent for token pack |
| `/api/stripe/webhooks` | POST | Stripe webhook handler |
| `/api/stripe/connect` | POST | Stripe Connect onboarding for engineers |

---

## 📱 Mobile App — Current State

### Tech Stack
```json
{
  "expo": "~54.0.33",
  "expo-router": "~6.0.23",
  "react-native": "0.81.5",
  "@supabase/supabase-js": "^2.105.1",
  "expo-linear-gradient": "~15.0.8",
  "lucide-react-native": "^1.12.0",
  "react-native-reanimated": "~4.1.1",
  "@expo-google-fonts/plus-jakarta-sans": "^0.4.2"
}
```

### File Structure
```
mobile/
├── app.json                    # Expo config (scheme: "ppf", slug: "mobile")
├── App.tsx                     # Root (placeholder — expo-router takes over)
├── app/
│   ├── _layout.tsx             # Root layout + auth gate
│   ├── index.tsx               # Entry redirect
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx         # Splash/landing screen
│   │   ├── login.tsx           # Email + password login
│   │   └── signup.tsx          # User type selection + registration
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Bottom tab navigator (5 tabs)
│   │   ├── index.tsx           # Home feed / dashboard
│   │   ├── marketplace.tsx     # Browse services
│   │   ├── rfq.tsx             # Post / browse RFQs
│   │   ├── messages.tsx        # Conversations list + chat
│   │   └── profile.tsx         # My profile + settings
│   ├── engineer/               # Engineer detail screen
│   └── service/                # Service detail screen
├── components/
│   ├── Button.tsx              # Primary/accent/outline button component
│   ├── EngineerCard.tsx        # Engineer listing card
│   └── ServiceCard.tsx         # Service listing card
└── lib/
    ├── supabase.ts             # Supabase client (uses AsyncStorage for sessions)
    └── theme.ts                # Colors, typography, spacing constants
```

### Supabase Client (mobile/lib/supabase.ts)
Uses `@react-native-async-storage/async-storage` for session persistence.
```typescript
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

### Environment Variables (mobile)
Create `mobile/.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://ifrxzmemiihxfdimwvcw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=<Stripe publishable key>
EXPO_PUBLIC_APP_URL=https://www.precisionprojectflow.com
```

---

## 🗺️ Screens To Build (Priority Order)

### ✅ Scaffolded (exist but need full implementation)
| Screen | File | Status |
|---|---|---|
| Welcome/splash | `(auth)/welcome.tsx` | Scaffold |
| Login | `(auth)/login.tsx` | Scaffold |
| Signup | `(auth)/signup.tsx` | Scaffold |
| Home feed | `(tabs)/index.tsx` | Scaffold |
| Marketplace | `(tabs)/marketplace.tsx` | Scaffold |
| RFQ | `(tabs)/rfq.tsx` | Scaffold |
| Messages | `(tabs)/messages.tsx` | Scaffold |
| Profile | `(tabs)/profile.tsx` | Scaffold |
| Engineer detail | `engineer/` | Scaffold |
| Service detail | `service/` | Scaffold |

### 🔴 Not yet built
| Screen | Priority | Notes |
|---|---|---|
| Chat thread | High | Full message thread with realtime + lock/unlock UI |
| Token purchase | High | Stripe token pack purchase flow |
| Service checkout | Medium | Buy a service directly |
| Order history | Medium | See past orders |
| Settings | Low | Edit profile, avatar upload |
| Notifications | Low | Push notifications |

---

## 🔐 Auth Flow

```
App launch
  → check supabase.auth.getSession()
  → if session: redirect to (tabs)/
  → if no session: redirect to (auth)/welcome
  
Login
  → supabase.auth.signInWithPassword({ email, password })
  → on success: router.replace('/(tabs)/')
  
Signup
  → supabase.auth.signUp({ email, password })
  → insert into profiles (id, full_name, email, user_type)
  → on success: router.replace('/(tabs)/')

Logout
  → supabase.auth.signOut()
  → router.replace('/(auth)/welcome')
```

---

## 🔄 Realtime Subscriptions

For the messages screen, subscribe to new messages:
```typescript
const channel = supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'user_messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    setMessages(prev => [...prev, payload.new as Message])
  })
  .subscribe()

// Cleanup on unmount
return () => { supabase.removeChannel(channel) }
```

---

## 📦 SQL Migration Status (what's been run in Supabase)

| File | Status | Purpose |
|---|---|---|
| `schema.sql` | ✅ Run | Base schema |
| `COMPLETE_SETUP.sql` | ✅ Run | Full initial setup |
| `PATCH_EXISTING_DB.sql` | ✅ Run | Column patches |
| `ADD_PROFILE_COLUMNS.sql` | ✅ Run | Extra profile fields |
| `FIX_PROFILES_COLUMNS_AND_TRIGGER.sql` | ✅ Run | Profile trigger fix |
| `FIX_TRIGGER.sql` | ✅ Run | Trigger fix |
| `FIX_RLS_PROFILES.sql` | ✅ Run | RLS policies |
| `ADD_ADMIN_COLUMN.sql` | ✅ Run | is_admin on profiles |
| `FEED_AND_STORAGE.sql` | ✅ Run | Feed tables + avatars bucket |
| `RFQ_TABLE.sql` | ✅ Run | RFQ table + RLS |
| `MESSAGING_TABLES.sql` | ✅ Run | user_conversations + user_messages |
| `MESSAGING_PAYWALL.sql` | ✅ Run | Old paywall (superseded) |
| `PROJECTFLOW_TOKENS.sql` | ✅ Run | Token ledger + RPCs |
| `MESSAGING_ENHANCEMENTS.sql` | ✅ Run | is_unlocked, attachments, Realtime, unlock_conversation() |
| `SERVICE_IMAGES_BUCKET.sql` | 🔴 **NOT YET RUN** | service-images storage bucket |

---

## 🚀 Running the Mobile App Locally

```bash
cd mobile
npm install
npx expo start        # opens Expo DevTools
# Press i for iOS simulator, a for Android emulator
# Scan QR code with Expo Go app on physical device
```

**EAS Build (production):**
```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## 🔗 Web App Key Pages (for reference/parity)

| Web URL | Mobile Equivalent |
|---|---|
| `/` | Welcome screen |
| `/login` | `(auth)/login` |
| `/signup` | `(auth)/signup` |
| `/marketplace` | `(tabs)/marketplace` |
| `/messages` | `(tabs)/messages` |
| `/rfq/create` | `(tabs)/rfq` |
| `/profiles/[id]` | `engineer/[id]` |
| `/marketplace/service/[id]` | `service/[id]` |
| `/dashboard/engineer` | `(tabs)/profile` (engineer view) |
| `/dashboard/client` | `(tabs)/profile` (client view) |

---

## ⚠️ Known Gotchas

1. **Supabase client on mobile**: Must use `detectSessionInUrl: false` (no URL in RN)
2. **AsyncStorage**: Required for session persistence — already in `lib/supabase.ts`
3. **Expo Router file-based routing**: `(auth)` and `(tabs)` are route groups, not URL segments
4. **Token balance**: Read from `profiles.token_balance` — NOT from `token_transactions` (that's the audit log)
5. **Conversation unlock**: Call `supabase.rpc('unlock_conversation', { p_conversation_id, p_user_id })` — it's atomic
6. **File uploads in RN**: Use `expo-file-system` + `supabase.storage.from('message-attachments').upload()` with `ArrayBuffer`
7. **Stripe in RN**: Use `@stripe/stripe-react-native` package — NOT `@stripe/stripe-js` (that's web-only)
8. **Lucide icons**: Use `lucide-react-native` — NOT `lucide-react`
9. **Image component**: Use `expo-image` (`<Image>` from `expo-image`) for better caching, NOT `react-native`'s built-in
10. **Fonts**: `useFonts` from `@expo-google-fonts/plus-jakarta-sans` must be loaded in root `_layout.tsx`

---

## 🔑 Admin Info (DO NOT COMMIT)

- Admin email: `max@amarketology.com`
- Admin user ID: `7d23d34b-4ef8-40da-924d-658776f44047`
- Supabase project: `ifrxzmemiihxfdimwvcw`
- Supabase URL: `https://ifrxzmemiihxfdimwvcw.supabase.co`
- Production URL: `https://www.precisionprojectflow.com`
- Railway deployment: auto-deploys on push to `main`
- GitHub repo: `aMarketology/PPF---PrecisionProjectFlow`
