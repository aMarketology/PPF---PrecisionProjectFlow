# Precision Project Flow Mobile App
## React Native Implementation Plan

---

## 📱 Overview

**Precision Project Flow Mobile** is the native iOS and Android companion app for the Engineering Marketplace platform. This app brings the full B2B marketplace experience to mobile devices, enabling clients and engineers to connect, transact, and manage projects on-the-go.

### Project Details
- **Platform**: React Native (Expo)
- **Target**: iOS (primary) | Android (future)
- **Backend**: Supabase (PostgreSQL)
- **Payments**: Stripe Connect
- **Launch**: Q2 2026
- **Current Web Version**: 85% Complete

---

## 🎯 App Purpose

The mobile app enables:
- **For Clients**: Browse engineering services, request quotes, track orders, message vendors
- **For Engineers/Companies**: Manage services, respond to inquiries, track sales, fulfill orders
- **For Both**: Real-time messaging, push notifications, profile management

---

## 🏗️ Architecture

### Tech Stack

```
┌─────────────────────────────────────────┐
│         React Native (Expo)             │
│  - TypeScript                           │
│  - React Navigation                     │
│  - Expo Router                          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│        State Management                 │
│  - React Context API                    │
│  - React Query (data fetching)          │
│  - Zustand (optional)                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│          Backend Services               │
│  - Supabase (Database + Auth)           │
│  - Supabase Realtime (messaging)        │
│  - Stripe SDK (payments)                │
│  - Expo Notifications (push)            │
└─────────────────────────────────────────┘
```

### Key Libraries

```json
{
  "dependencies": {
    "expo": "^50.0.0",
    "react-native": "0.73.0",
    "react-navigation": "^6.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "@stripe/stripe-react-native": "^0.37.0",
    "expo-notifications": "^0.27.0",
    "expo-image-picker": "^14.7.0",
    "expo-document-picker": "^11.10.0",
    "react-native-gifted-chat": "^2.4.0",
    "react-query": "^3.39.0",
    "zustand": "^4.5.0"
  }
}
```

---

## 📂 Project Structure

```
ppf-mobile/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Bottom tab navigation
│   │   ├── index.tsx            # Home/Marketplace
│   │   ├── search.tsx           # Search & Filters
│   │   ├── messages.tsx         # Conversations
│   │   ├── orders.tsx           # Order Management
│   │   └── profile.tsx          # User Profile
│   ├── (auth)/                  # Auth stack
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgot-password.tsx
│   ├── (modals)/                # Modal screens
│   │   ├── filters.tsx
│   │   └── notifications.tsx
│   ├── product/[id].tsx         # Product detail
│   ├── company/[id].tsx         # Company profile
│   ├── checkout/[id].tsx        # Checkout flow
│   └── conversation/[id].tsx    # Message thread
│
├── components/                   # Reusable components
│   ├── ui/                      # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Badge.tsx
│   ├── marketplace/             # Marketplace-specific
│   │   ├── ProductCard.tsx
│   │   ├── CompanyCard.tsx
│   │   └── CategoryGrid.tsx
│   ├── messaging/               # Chat components
│   │   ├── ConversationList.tsx
│   │   ├── MessageBubble.tsx
│   │   └── ChatInput.tsx
│   └── orders/                  # Order components
│       ├── OrderCard.tsx
│       ├── OrderTimeline.tsx
│       └── StatusBadge.tsx
│
├── lib/                         # Core utilities
│   ├── supabase.ts             # Supabase client
│   ├── stripe.ts               # Stripe configuration
│   ├── auth.ts                 # Auth helpers
│   └── api.ts                  # API functions
│
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts              # Authentication
│   ├── useProducts.ts          # Product queries
│   ├── useOrders.ts            # Order queries
│   ├── useMessages.ts          # Messaging
│   └── useNotifications.ts     # Push notifications
│
├── contexts/                    # React contexts
│   ├── AuthContext.tsx         # User auth state
│   ├── CartContext.tsx         # Shopping cart
│   └── NotificationContext.tsx # Notifications
│
├── types/                       # TypeScript definitions
│   ├── database.ts             # Supabase types
│   ├── models.ts               # App models
│   └── navigation.ts           # Navigation types
│
├── constants/                   # App constants
│   ├── Colors.ts               # Theme colors
│   ├── Categories.ts           # Engineering categories
│   └── Config.ts               # App configuration
│
└── assets/                      # Static assets
    ├── images/
    ├── icons/
    └── fonts/
```

---

## 🎨 Screen Breakdown

### 1. Authentication Flow
```
├── Splash Screen
├── Onboarding (first launch)
├── Login
├── Signup
│   ├── Account Type Selection (Client/Engineer)
│   ├── Basic Info
│   └── Company Info (optional)
└── Password Reset
```

### 2. Main App (Client View)
```
Bottom Tabs:
├── Home/Marketplace
│   ├── Featured Companies
│   ├── Category Grid
│   ├── Recent Products
│   └── Search Bar
├── Search
│   ├── Search Input
│   ├── Filters
│   ├── Results Grid
│   └── Sort Options
├── Messages
│   ├── Conversation List
│   └── Unread Badge
├── Orders
│   ├── Active Orders
│   ├── Past Orders
│   └── Order Details
└── Profile
    ├── Account Info
    ├── Settings
    ├── Saved Products
    └── Payment Methods
```

### 3. Main App (Engineer/Vendor View)
```
Bottom Tabs:
├── Dashboard
│   ├── Sales Overview
│   ├── Recent Orders
│   └── Quick Actions
├── Products
│   ├── My Services
│   ├── Add/Edit Product
│   └── Product Analytics
├── Messages
│   └── (Same as client)
├── Orders (Sales)
│   ├── Pending Orders
│   ├── In Progress
│   └── Completed
└── Profile
    ├── Company Profile
    ├── Stripe Connect Status
    └── Settings
```

### 4. Product Flow
```
Product Detail Screen
├── Image Gallery
├── Title & Price
├── Company Info (clickable)
├── Description
├── Delivery Time
├── Reviews
├── Similar Products
└── Actions
    ├── Add to Cart
    ├── Buy Now
    └── Message Vendor
```

### 5. Checkout Flow
```
Checkout Screen
├── Order Summary
├── Delivery Address
├── Payment Method
│   └── Stripe Payment Sheet
├── Order Notes
└── Place Order Button
    ↓
Success Screen
├── Order Confirmation
├── Order Number
├── Next Steps
└── Actions
    ├── Track Order
    └── Message Vendor
```

### 6. Messaging Flow
```
Conversations List
├── Search Conversations
├── Conversation Items
│   ├── Avatar
│   ├── Name
│   ├── Last Message
│   ├── Timestamp
│   └── Unread Badge
    ↓
Conversation Detail
├── Header (participant info)
├── Message List
│   ├── Message Bubbles
│   ├── Timestamps
│   ├── Attachments
│   └── System Messages
├── Input Bar
│   ├── Text Input
│   ├── Attach Button
│   └── Send Button
└── Product/Order Context (if linked)
```

---

## 🔑 Core Features

### Phase 1: MVP (8 weeks)
**Essential features for launch**

1. **Authentication** ✓
   - Email/password signup/login
   - User profile creation
   - Account type selection (client/engineer)
   - Password reset

2. **Marketplace Browsing** ✓
   - Browse all products
   - Category filtering
   - Search functionality
   - Product detail view
   - Company profiles

3. **Checkout & Payments** ✓
   - Cart functionality
   - Stripe payment integration
   - Order creation
   - Payment confirmation

4. **Order Management** ✓
   - View orders (client side)
   - View sales (vendor side)
   - Order status updates
   - Order details

5. **Basic Messaging** ✓
   - Conversation list
   - Send/receive messages
   - Real-time updates via Supabase
   - Unread indicators

### Phase 2: Enhanced Features (4 weeks)
**Improved user experience**

6. **Push Notifications**
   - New message alerts
   - Order status updates
   - Payment confirmations
   - Marketing notifications (opt-in)

7. **Enhanced Search**
   - Advanced filters
   - Sort options
   - Saved searches
   - Search history

8. **Media & Attachments**
   - Image upload
   - Document upload
   - Photo gallery
   - File preview

9. **User Profiles**
   - Edit profile
   - Avatar upload
   - Company details
   - Portfolio/past work

10. **Saved Items**
    - Save products
    - Wishlist
    - Compare products

### Phase 3: Advanced Features (6 weeks)
**Competitive differentiation**

11. **RFQ System** (Request for Quote)
    - Submit custom RFQ
    - Attach drawings/specs
    - Receive vendor quotes
    - Compare quotes

12. **Project Management**
    - Create projects
    - Attach orders to projects
    - Project timeline
    - Milestones

13. **Reviews & Ratings**
    - Rate completed orders
    - Leave reviews
    - View company ratings
    - Respond to reviews

14. **Analytics Dashboard** (Vendors)
    - Sales metrics
    - Product performance
    - Customer insights
    - Revenue tracking

15. **Offline Support**
    - Cache product data
    - Queue messages
    - Sync when online
    - Offline indicators

---

## 🗄️ Database Integration

### Supabase Connection

The mobile app connects to the same Supabase database as the web app:

```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### Key Database Tables Used

**Core Tables:**
- `profiles` - User accounts
- `company_profiles` - Vendor companies
- `products` - Services/products
- `product_orders` - Purchase orders
- `stripe_connect_accounts` - Payment accounts

**Messaging Tables:**
- `conversations` - Message threads
- `conversation_participants` - Who's in conversations
- `messages` - Individual messages

**Other Tables:**
- `portfolio_projects` - Company portfolios
- `team_members` - Company team info
- `company_messages` - Contact inquiries

### Real-time Subscriptions

```typescript
// Subscribe to new messages
const subscription = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      // Handle new message
      addMessage(payload.new)
    }
  )
  .subscribe()
```

---

## 💳 Payment Integration

### Stripe React Native

```typescript
// lib/stripe.ts
import { StripeProvider } from '@stripe/stripe-react-native'

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!

// In app root
export default function App() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <NavigationContainer>
        {/* App screens */}
      </NavigationContainer>
    </StripeProvider>
  )
}
```

### Payment Flow

```typescript
// Checkout screen
import { useStripe } from '@stripe/stripe-react-native'

const { initPaymentSheet, presentPaymentSheet } = useStripe()

// 1. Create payment intent on backend
const { clientSecret } = await fetch('/api/create-payment-intent', {
  method: 'POST',
  body: JSON.stringify({ amount, orderId })
})

// 2. Initialize payment sheet
await initPaymentSheet({
  paymentIntentClientSecret: clientSecret,
  merchantDisplayName: 'Precision Project Flow',
})

// 3. Present payment UI
const { error } = await presentPaymentSheet()

if (!error) {
  // Payment successful!
}
```

---

## 🔔 Push Notifications

### Expo Notifications Setup

```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// Request permissions
async function registerForPushNotificationsAsync() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    
    if (finalStatus !== 'granted') {
      return null
    }
    
    const token = await Notifications.getExpoPushTokenAsync()
    return token.data
  }
}

// Save token to database
async function savePushToken(userId: string, token: string) {
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId)
}
```

### Notification Types

1. **New Message** - "John Doe sent you a message"
2. **Order Update** - "Your order #1234 has been shipped"
3. **Payment Success** - "Payment received - $5,000"
4. **RFQ Response** - "You received a new quote"
5. **Review Request** - "How was your experience with AECOM?"

---

## 🎨 UI/UX Design

### Design System

**Colors** (matching web app)
```typescript
export const Colors = {
  primary: '#2563eb',      // Blue
  secondary: '#7c3aed',    // Purple
  success: '#10b981',      // Green
  warning: '#f59e0b',      // Orange
  danger: '#ef4444',       // Red
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
}
```

**Typography**
```typescript
export const Typography = {
  h1: { fontSize: 32, fontWeight: '700' },
  h2: { fontSize: 24, fontWeight: '600' },
  h3: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 14, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '400' },
}
```

**Components** (React Native Paper or custom)
- Buttons
- Cards
- Inputs
- Badges
- Modals
- Bottom sheets
- Loading states
- Empty states

---

## 🚀 Development Roadmap

### Week 1-2: Setup & Foundation
- [ ] Initialize Expo project
- [ ] Configure TypeScript
- [ ] Set up navigation (Expo Router)
- [ ] Configure Supabase client
- [ ] Set up authentication flow
- [ ] Create base UI components

### Week 3-4: Core Features
- [ ] Implement marketplace browsing
- [ ] Product detail screens
- [ ] Company profile screens
- [ ] Search & filters
- [ ] Shopping cart

### Week 5-6: Payments & Orders
- [ ] Integrate Stripe
- [ ] Checkout flow
- [ ] Order creation
- [ ] Order management (client)
- [ ] Order management (vendor)

### Week 7-8: Messaging
- [ ] Conversation list
- [ ] Message thread
- [ ] Real-time subscriptions
- [ ] Unread indicators
- [ ] Push notifications

### Week 9-10: Profile & Settings
- [ ] User profile screens
- [ ] Edit profile
- [ ] Settings screens
- [ ] Avatar upload
- [ ] Company management

### Week 11-12: Testing & Polish
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] App store preparation
- [ ] Beta testing

---

## 📱 Platform Considerations

### iOS First Approach
- Develop and test primarily on iOS
- Follow iOS Human Interface Guidelines
- Test on multiple iPhone sizes
- Optimize for iPhone 12-15 series
- Handle notch/dynamic island

### Android Future
- Plan for Android-specific features
- Material Design compliance
- Various screen sizes/ratios
- Back button handling
- Permission models

---

## 🔐 Security

1. **Authentication**
   - Secure token storage (AsyncStorage encrypted)
   - Automatic token refresh
   - Biometric login (Face ID/Touch ID)

2. **API Security**
   - Row Level Security (RLS) on Supabase
   - API key rotation
   - SSL/TLS encryption

3. **Payment Security**
   - PCI DSS compliance via Stripe
   - No card data stored locally
   - Secure payment tokenization

4. **Data Privacy**
   - GDPR compliance
   - Privacy policy
   - Data deletion options
   - Opt-out of marketing

---

## 📊 Analytics & Monitoring

- **Expo Analytics** - User engagement
- **Sentry** - Error tracking
- **Mixpanel** - User behavior
- **Supabase Logs** - Database queries

---

## 🧪 Testing Strategy

1. **Unit Tests** - Jest
2. **Component Tests** - React Native Testing Library
3. **Integration Tests** - Detox
4. **Manual Testing** - TestFlight (iOS)
5. **Beta Testing** - Closed group of users

---

## 📦 Deployment

### iOS (App Store)
1. Developer account required ($99/year)
2. App Store Connect setup
3. TestFlight for beta testing
4. App Review submission
5. Release to production

### Android (Future - Google Play)
1. Google Play Console account ($25 one-time)
2. Internal testing
3. Closed/Open testing
4. Production release

---

## 📖 Documentation Needed

1. **Developer Docs** - Setup, architecture, contributing
2. **API Docs** - Supabase queries, Stripe integration
3. **User Guide** - How to use the app
4. **Release Notes** - Version history

---

## 🎯 Success Metrics

1. **Downloads** - Target: 1,000 in first month
2. **Active Users** - Target: 500 DAU
3. **Order Completion Rate** - Target: 60%
4. **App Store Rating** - Target: 4.5+ stars
5. **Session Duration** - Target: 8+ minutes

---

## 🔄 Maintenance Plan

1. **Weekly** - Monitor crashes, fix critical bugs
2. **Bi-weekly** - Feature updates, minor improvements
3. **Monthly** - Analytics review, user feedback
4. **Quarterly** - Major feature releases, redesigns

---

## 📞 Support Channels

1. **In-app** - Help center, FAQs
2. **Email** - support@precisionprojectflow.com
3. **Website** - Contact form
4. **Social Media** - Twitter, LinkedIn

---

**Next Steps:** Review `ppf-design.md` for detailed UI/UX designs and `ppf-features-and-necessary-apikeys.md` for feature specifications and API configuration.
