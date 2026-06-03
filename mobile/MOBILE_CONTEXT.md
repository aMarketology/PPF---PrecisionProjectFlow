# 📱 PPF Mobile — App Store & Play Store Launch Context
> Last updated: June 2, 2026  
> Paste this file at the start of every mobile Copilot session.

---

## 🚀 Launch Status
- **Platform**: Expo SDK 54 + Expo Router 6 (file-based routing, typed routes)
- **Target**: iOS App Store + Google Play Store — **actively launching**
- **React Native**: 0.81.5 · React 19.1.0 · TypeScript 5.9
- **Architecture**: New Architecture enabled (`newArchEnabled: true`)
- **App scheme**: `ppf` (deep links: `ppf://`)
- **Bundle ID (iOS)**: needs to be set in app.json `ios.bundleIdentifier`
- **Package name (Android)**: needs to be set in app.json `android.package`

---

## 🏗️ Project Overview
**Precision Project Flow (PPF)** — B2B marketplace connecting engineers/vendors with clients for precision manufacturing and engineering services.  
**Upwork × Facebook for Engineering**: engineers have rich profiles, clients post RFQs, social feed surfaces activity across the network.

### Web companion
- **URL**: `https://www.precisionprojectflow.com`
- **Framework**: Next.js 14, Railway-deployed, auto-deploys from `main`
- **Repo**: `aMarketology/PPF---PrecisionProjectFlow`

---

## 📁 Mobile File Structure

```
mobile/
├── app.json                      # Expo config — name, version, icons, splash
├── package.json                  # Dependencies (see full list below)
├── App.tsx                       # Legacy entry (not used — expo-router takes over via index.ts)
├── index.ts                      # expo-router/entry
├── app/
│   ├── _layout.tsx               # Root layout — GestureHandlerRootView + SafeAreaProvider + Stack
│   ├── index.tsx                 # Redirects unauthenticated → /(auth)/welcome
│   ├── (auth)/
│   │   ├── _layout.tsx           # Auth stack (no header)
│   │   ├── welcome.tsx           # Onboarding/landing screen
│   │   ├── login.tsx             # Email + password login
│   │   └── signup.tsx            # Signup — collects name, email, password, user_type
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab bar (Feed, Marketplace, RFQ, Messages, Profile)
│   │   ├── index.tsx             # Feed tab — recent services + activity
│   │   ├── marketplace.tsx       # Browse all services — search, filter, sort
│   │   ├── rfq.tsx               # Post an RFQ form
│   │   ├── messages.tsx          # Conversations list (inbox)
│   │   └── profile.tsx           # User profile + dashboard (Overview/Services/Orders/RFQs tabs)
│   ├── engineer/
│   │   └── [id].tsx              # Public engineer profile (tappable from any card)
│   └── service/
│       └── [id].tsx              # Service detail + "Contact Engineer" CTA
├── components/
│   ├── Button.tsx                # Branded button (primary/accent/outline variants)
│   ├── EngineerCard.tsx          # Avatar + name + company + rating + location + DM button
│   └── ServiceCard.tsx           # Service listing card with price, category, delivery time
└── lib/
    ├── supabase.ts               # Supabase client (AsyncStorage session persistence)
    └── theme.ts                  # Design tokens (colors, spacing, radius, typography, shadows)
```

---

## 🎨 Design System (`lib/theme.ts`)

> ⚠️ Mobile uses a **green** palette — NOT the web's blue. This is intentional.

```ts
colors.primary        = '#16A34A'  // green-600 — tabs, buttons, pills
colors.primaryDark    = '#14532D'  // green-900
colors.gradientStart  = '#052e16'  // green-950 — hero gradient top
colors.gradientMid    = '#14532D'  // green-900
colors.gradientEnd    = '#166534'  // green-800
colors.accent         = '#F59E0B'  // amber-500 — accent buttons, stars
colors.background     = '#F0FDF4'  // green-50
colors.surface        = '#FFFFFF'
colors.text           = '#0F172A'  // slate-900
colors.textSecondary  = '#475569'  // slate-600
colors.textMuted      = '#94A3B8'  // slate-400
colors.border         = '#D1FAE5'  // green-100
colors.error          = '#EF4444'
```

Font: `@expo-google-fonts/plus-jakarta-sans` (Plus Jakarta Sans) — same as web

---

## 📦 Dependencies

```json
"expo": "~54.0.33"
"expo-router": "~6.0.23"
"react-native": "0.81.5"
"react": "19.1.0"
"@supabase/supabase-js": "^2.105.1"
"@react-native-async-storage/async-storage": "2.2.0"
"expo-image": "~3.0.11"              // Fast image with blurhash support
"expo-linear-gradient": "~15.0.8"
"expo-font": "~14.0.11"
"expo-linking": "~8.0.12"           // Deep linking
"expo-constants": "~18.0.13"
"lucide-react-native": "^1.12.0"    // Icons
"react-native-gesture-handler": "~2.28.0"
"react-native-reanimated": "~4.1.1"
"react-native-safe-area-context": "~5.6.0"
"react-native-screens": "~4.16.0"
"react-native-svg": "15.12.1"
```

**NOT YET installed (needed for launch):**
- `expo-notifications` — push notifications
- `expo-image-picker` — avatar/portfolio photo upload
- `expo-secure-store` — secure token storage (upgrade from AsyncStorage)
- `@stripe/stripe-react-native` — in-app token purchases
- `date-fns` — already used in messages.tsx (confirm installed)

---

## 🔐 Authentication Flow

### Supabase client (`lib/supabase.ts`)
```ts
createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,       // Sessions persist across app restarts
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,   // MUST be false in React Native
  }
})
```

### Supabase project
- **URL**: `https://ifrxzmemiihxfdimwvcw.supabase.co`
- **Anon key**: hardcoded in `lib/supabase.ts` (safe — anon key is public)
- **Service role key**: NEVER use in mobile client

### Auth screens
| Screen | Route | Notes |
|--------|-------|-------|
| Welcome/Onboarding | `/(auth)/welcome` | Feature cards, stats strip, Get Started + Log In CTAs |
| Sign Up | `/(auth)/signup` | name, email, password, user_type (engineer/client) |
| Login | `/(auth)/login` | Email + password, forgot password link |

### Auth guard pattern
`app/index.tsx` — checks `supabase.auth.getUser()` on mount, redirects:
- No user → `router.replace('/(auth)/welcome')`
- Has user → `router.replace('/(tabs)')`

---

## 🗄️ Database (Supabase Postgres)

### Key tables used by mobile

#### `profiles`
```
id              uuid PK (= auth.users.id)
full_name       text
email           text
avatar_url      text
company_name    text
bio             text
location        text
user_type       text  -- 'engineer' | 'client'
token_balance   integer (default 0)
created_at      timestamptz
```

#### `services`
```
id              uuid PK
provider_id     uuid FK → profiles.id
title           text
description     text
price           numeric
category        text
tags            text[]
images          text[]  -- array of public storage URLs
delivery_time   text
service_area    text
certifications  text[]
active          boolean
created_at      timestamptz
```

#### `rfqs`
```
id              uuid PK
client_id       uuid FK → profiles.id
title           text
description     text
category        text
budget          numeric
timeline        text
location        text
status          text  -- 'open' | 'in_progress' | 'closed'
created_at      timestamptz
```

#### `user_conversations`
```
id                  uuid PK
participant_one_id  uuid FK → profiles.id
participant_two_id  uuid FK → profiles.id
last_message_at     timestamptz
is_contracted       boolean  (may not exist — check before using)
```

#### `user_messages`
```
id                uuid PK
conversation_id   uuid FK → user_conversations.id
sender_id         uuid FK → profiles.id
content           text
is_read           boolean
read_at           timestamptz
is_paid           boolean
is_system_message boolean
created_at        timestamptz
```

#### `token_transactions` (ledger)
```
id              uuid PK
user_id         uuid FK → profiles.id
amount          integer  (positive = credit, negative = debit)
description     text
reference_id    uuid
stripe_payment_id text
created_at      timestamptz
```

#### `product_orders`
```
id          uuid PK
buyer_id    uuid
vendor_id   uuid
created_at  timestamptz
(+ other order fields)
```

---

## 🔑 Supabase RPCs

| RPC | Signature | Purpose |
|-----|-----------|---------|
| `get_or_create_conversation` | `(user_one_id uuid, user_two_id uuid) → uuid` | Returns conversation ID |
| `spend_tokens` | `(p_user_id, p_amount, p_description, p_reference_id) → text\|null` | Debit wallet. Returns `'insufficient_tokens'` or `null` (success) |
| `add_tokens` | `(p_user_id, p_amount, p_description, p_stripe_payment_id) → void` | Credit wallet. Idempotent on stripe_payment_id |
| `refund_tokens` | `(p_user_id, p_amount, p_description, p_reference_id) → void` | Refund on failed spend |
| `are_friends` | `(user_a uuid, user_b uuid) → boolean` | Stub — always returns false |

### RPC call pattern
```ts
const { data, error } = await supabase.rpc('spend_tokens', {
  p_user_id: userId,
  p_amount: 5,
  p_description: 'Unlock conversation',
  p_reference_id: conversationId,
});
if (data === 'insufficient_tokens') { /* show paywall */ }
```

---

## 💬 Messaging (Token-Gated)

### Rules
- First message in a conversation costs **5 tokens**
- Subsequent messages in the same conversation are **free**
- Token balance is on `profiles.token_balance`
- Every spend/credit is logged to `token_transactions`

### Conversation flow
1. User taps "Message" on a service or engineer card
2. Call `get_or_create_conversation(myId, engineerId)` → get `conversationId`
3. Navigate to chat screen: `router.push(\`/messages/\${conversationId}\`)`
4. On send: call `spend_tokens` if first message → if insufficient, show paywall
5. Insert into `user_messages`

### Unread badge (web already done)
- Query `user_messages` where `conversation_id IN [my_convos]` AND `is_read = false` AND `sender_id != me`
- Display count on Messages tab icon

---

## 💰 Token Economy

| Action | Cost |
|--------|------|
| Unlock a new conversation (first message) | 5 tokens |
| Buy token pack (Stripe) | varies — see web `/buy-tokens` |

Token packs (web reference):
- Starter: 20 tokens — ~$4.99
- Pro: 50 tokens — ~$9.99  
- Business: 150 tokens — ~$24.99

---

## 📱 Screens — Current State

### ✅ Built & functional
| Screen | Route | Status |
|--------|-------|--------|
| Welcome/Onboarding | `/(auth)/welcome` | ✅ Full UI, feature cards, stats |
| Login | `/(auth)/login` | ✅ Supabase auth |
| Sign Up | `/(auth)/signup` | ✅ Creates profile row |
| Feed | `/(tabs)/index` | ✅ Recent services grid + category chips |
| Marketplace | `/(tabs)/marketplace` | ✅ Search + filter + sort + FlatList |
| Post RFQ | `/(tabs)/rfq` | ✅ Full form, inserts to `rfqs` table |
| Messages (inbox) | `/(tabs)/messages` | ✅ Conversations list + unread count |
| Profile / Dashboard | `/(tabs)/profile` | ✅ Overview/Services/Orders/RFQs tabs |
| Engineer profile | `/engineer/[id]` | ✅ Public profile page |
| Service detail | `/service/[id]` | ✅ Detail + Contact CTA |

### 🔴 Not yet built — needed for launch
| Screen | Route | Priority |
|--------|-------|----------|
| Chat / Conversation | `/messages/[id]` | 🔴 P0 — messages inbox links nowhere |
| Buy Tokens (in-app) | `/buy-tokens` | 🔴 P0 — needed for paywall |
| Settings / Edit Profile | `/settings` | 🔴 P1 |
| Create Service (engineer) | `/services/create` | 🔴 P1 |
| Push notification opt-in | (in root layout) | 🔴 P1 |
| Order detail | `/orders/[id]` | 🔴 P2 |
| Forgot Password | `/(auth)/forgot-password` | 🔴 P2 |

---

## 🏪 App Store Submission Checklist

### `app.json` — needs before building
```json
{
  "expo": {
    "name": "Precision Project Flow",
    "slug": "precision-project-flow",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.precisionprojectflow.app",   // ← SET THIS
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Upload profile photos and project images",
        "NSPhotoLibraryUsageDescription": "Select images for your profile and services"
      }
    },
    "android": {
      "package": "com.precisionprojectflow.app",            // ← SET THIS
      "adaptiveIcon": { ... },
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"]
    },
    "extra": {
      "eas": { "projectId": "YOUR_EAS_PROJECT_ID" }         // ← SET THIS after eas init
    }
  }
}
```

### Assets needed
| Asset | Size | Current state |
|-------|------|---------------|
| `assets/icon.png` | 1024×1024 | ✅ exists |
| `assets/splash-icon.png` | 1284×2778 (or contain) | ✅ exists |
| `assets/adaptive-icon.png` | 1024×1024 | ✅ exists |
| App Store screenshots | 6.7" + 6.1" + iPad | 🔴 needed |
| Google Play screenshots | phone + tablet | 🔴 needed |
| App Store description | 4000 chars | 🔴 needed |
| Privacy policy URL | public URL | ✅ `precisionprojectflow.com/privacy-policy` |

### EAS Build commands
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Initialize (first time)
eas init

# Build for iOS (TestFlight)
eas build --platform ios --profile preview

# Build for Android (APK test)
eas build --platform android --profile preview

# Production build
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### `eas.json` (create this)
```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./play-store-key.json",
        "track": "production"
      }
    }
  }
}
```

---

## 🔔 Push Notifications (not yet implemented)

```bash
npx expo install expo-notifications expo-device
```

### Setup pattern
```ts
// In root _layout.tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  // Save to profiles table: update profiles set push_token = token where id = userId
  await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
}
```

> ⚠️ Add `push_token text` column to `profiles` table in Supabase before implementing.

---

## 📸 Image Upload (not yet implemented in mobile)

Web uses `service-images` Supabase Storage bucket. Mobile needs `expo-image-picker`:

```bash
npx expo install expo-image-picker
```

```ts
import * as ImagePicker from 'expo-image-picker';

async function pickAndUploadAvatar(userId: string) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return;
  const file = result.assets[0];
  const ext = file.uri.split('.').pop();
  const path = `avatars/${userId}.${ext}`;
  const blob = await fetch(file.uri).then(r => r.blob());
  const { error } = await supabase.storage.from('service-images').upload(path, blob, { upsert: true });
  if (!error) {
    const { data: { publicUrl } } = supabase.storage.from('service-images').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
  }
}
```

---

## ⚡ Realtime (Supabase)

`user_messages` table has REPLICA IDENTITY FULL and is in `supabase_realtime` publication.

### Pattern for chat screen
```ts
useEffect(() => {
  const channel = supabase
    .channel(`chat-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'user_messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      setMessages(prev => [...prev, payload.new as Message]);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [conversationId]);
```

---

## ⚠️ Critical Gotchas

1. **`detectSessionInUrl: false`** — must stay false in React Native, or auth breaks
2. **AsyncStorage vs SecureStore** — AsyncStorage is fine for dev; upgrade to `expo-secure-store` for production auth tokens
3. **`expo-image` not `Image` from RN** — all image rendering uses `expo-image` for performance/caching
4. **`SafeAreaView` from `react-native-safe-area-context`** — NOT from React Native core
5. **`edges={['top']}`** inside gradient headers — only apply top safe area inside LinearGradient headers; bottom is handled by tab bar
6. **`is_contracted` column** — may not exist on `user_conversations` in all environments; always check before using
7. **`date-fns` imported in messages.tsx** — confirm it's in package.json or add it
8. **Expo Router typed routes** — `experiments.typedRoutes: true` — use typed `Href` generics when navigating to dynamic routes
9. **New Architecture** — `newArchEnabled: true` means some older RN libraries may break; test all 3rd party libs
10. **EAS project ID** — must run `eas init` and add `extra.eas.projectId` to `app.json` before any cloud builds

---

## 🌐 Environment / Config

### Supabase (hardcoded in `lib/supabase.ts` — safe for anon key)
```
SUPABASE_URL  = https://ifrxzmemiihxfdimwvcw.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### For production builds, prefer `expo-constants` + `app.json extra`
```json
// app.json
"extra": {
  "supabaseUrl": "https://ifrxzmemiihxfdimwvcw.supabase.co",
  "supabaseAnonKey": "eyJ..."
}
```
```ts
import Constants from 'expo-constants';
const url = Constants.expoConfig?.extra?.supabaseUrl;
```

---

## 🗺️ Immediate Launch TODO (Priority Order)

### P0 — Blocker (app is unusable without these)
- [ ] **`/messages/[id]`** — Chat screen (real-time messaging, token paywall on first message)
- [ ] **`/buy-tokens`** — Token purchase screen (Stripe or redirect to web)
- [ ] **Add `date-fns` to package.json** — used in messages.tsx, may be missing

### P1 — Core experience
- [ ] **`/settings`** — Edit profile (name, bio, location, avatar upload)
- [ ] **Push notifications** — install `expo-notifications`, register token, save to DB
- [ ] **Unread badge on Messages tab** — query unread count, show on tab icon
- [ ] **`/services/create`** — Create service listing (engineers only)
- [ ] **`eas.json`** — Create for EAS Build
- [ ] **`app.json`** — Add `bundleIdentifier`, `android.package`, `eas.projectId`

### P2 — Polish before store review
- [ ] **`/(auth)/forgot-password`** — Password reset flow
- [ ] **`/orders/[id]`** — Order detail screen
- [ ] **Privacy policy URL in app.json** — `https://www.precisionprojectflow.com/privacy-policy`
- [ ] **App Store screenshots** — 6.7" + 6.1" iPhone, iPad
- [ ] **App Store description + keywords**
- [ ] **Age rating** — likely 4+ (no mature content)
- [ ] **Review `expo-secure-store`** — replace AsyncStorage for auth tokens in production

### P3 — Nice to have
- [ ] **Haptic feedback** on key actions (send message, post RFQ)
- [ ] **Skeleton loaders** while fetching
- [ ] **Empty states** on all FlatLists
- [ ] **Offline banner** using `@react-native-community/netinfo`
- [ ] **Deep links** — `ppf://messages/[id]`, `ppf://service/[id]`

---

## 🔗 Related Web Files (for reference)

| Web file | Mobile equivalent |
|----------|-------------------|
| `app/messages/page.tsx` | `app/(tabs)/messages.tsx` + `/messages/[id]` (TODO) |
| `app/marketplace/page.tsx` | `app/(tabs)/marketplace.tsx` |
| `app/rfq/create/page.tsx` | `app/(tabs)/rfq.tsx` |
| `app/profiles/[id]/page.tsx` | `app/engineer/[id].tsx` |
| `app/dashboard/engineer/page.tsx` | `app/(tabs)/profile.tsx` (engineer mode) |
| `app/dashboard/client/page.tsx` | `app/(tabs)/profile.tsx` (client mode) |
| `app/api/messages/send/route.ts` | Token logic — replicate client-side via `spend_tokens` RPC |
| `lib/supabase/client.ts` | `lib/supabase.ts` |

---

*Updated by GitHub Copilot — June 2, 2026*
