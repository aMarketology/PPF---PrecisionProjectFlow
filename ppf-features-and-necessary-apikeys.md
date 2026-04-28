# Precision Project Flow Mobile - Features & API Keys
## Complete Feature Specifications & Required APIs

---

## 📋 Table of Contents

1. [Feature Breakdown](#features)
2. [Required API Keys & Services](#api-keys)
3. [Supabase Database Schema](#database)
4. [Environment Configuration](#environment)
5. [Third-Party Integrations](#integrations)
6. [Security & Compliance](#security)

---

## 🎯 FEATURES

### Core Features (MVP - Phase 1)

#### 1. Authentication & User Management

**User Registration**
- Email/password signup
- User type selection (Client or Engineer/Vendor)
- Email verification
- Terms of service acceptance
- Privacy policy acceptance

**Login**
- Email/password login
- Remember me functionality
- Biometric authentication (Face ID / Touch ID)
- Session management
- Auto-logout after inactivity

**Password Management**
- Forgot password flow
- Reset password via email
- Change password in settings
- Password strength validation

**Profile Management**
- Edit profile information
- Upload avatar image
- Update company details (for vendors)
- Manage contact information
- Deactivate account

**Required APIs:**
- Supabase Auth
- Expo SecureStore (token storage)
- Expo LocalAuthentication (biometrics)

---

#### 2. Marketplace Browsing

**Product Discovery**
- Browse all products/services
- Featured products section
- Recently added products
- Popular products
- Product categories grid
- Infinite scroll pagination

**Product Details**
- Product images (swipeable gallery)
- Product title and description
- Pricing information
- Delivery time
- Company/vendor information
- Similar products
- Save to favorites

**Category Filtering**
- 8 main engineering categories:
  - Civil Engineering
  - Mechanical Engineering
  - Electrical Engineering
  - Controls & Automation
  - Manufacturing
  - Construction Services
  - Material Handling
  - Logistics & Supply Chain

**Company Profiles**
- Company overview
- Services offered
- Portfolio projects
- Team members
- Contact information
- Ratings and reviews
- Verification badges

**Required APIs:**
- Supabase (products, company_profiles tables)
- Image CDN / Supabase Storage

---

#### 3. Search & Filtering

**Search**
- Full-text search across products
- Search by company name
- Search suggestions/autocomplete
- Recent searches
- Search history

**Filters**
- Price range slider
- Delivery time
- Category selection
- Company location
- Rating filter
- Sort by:
  - Relevance
  - Price (low to high)
  - Price (high to low)
  - Rating
  - Recently added
  - Most popular

**Required APIs:**
- Supabase (full-text search)
- Elastic Search (optional, for advanced search)

---

#### 4. Shopping Cart & Checkout

**Cart Functionality**
- Add products to cart
- Remove items from cart
- Update quantities (if applicable)
- View cart total
- Cart persistence
- Cart badge count

**Checkout Process**
1. Review order summary
2. Enter/select delivery address
3. Add project details/notes
4. Select payment method
5. Review and confirm
6. Place order

**Payment Integration**
- Stripe Payment Sheet integration
- Save payment methods
- Multiple payment methods support
- Split payments (future)
- Payment confirmation
- Receipt generation

**Order Confirmation**
- Order number
- Order details
- Payment confirmation
- Next steps
- Track order link
- Contact vendor option

**Required APIs:**
- Stripe React Native SDK
- Stripe Payment Intents API
- Supabase (product_orders table)

---

#### 5. Order Management

**Client View**
- View all orders
- Filter by status:
  - Pending
  - In Progress
  - Completed
  - Cancelled
- Order details screen
- Order timeline
- Status updates
- Download invoices
- Reorder functionality

**Vendor View**
- View all sales
- Incoming orders
- Orders by status
- Accept/decline orders
- Update order status
- Mark as completed
- Issue refunds

**Order Statuses**
- Pending (awaiting vendor confirmation)
- Confirmed (vendor accepted)
- In Progress (work started)
- Completed (delivered)
- Cancelled (by either party)
- Refunded

**Required APIs:**
- Supabase (product_orders table)
- Supabase Realtime (status updates)
- Stripe (payment management)

---

#### 6. Messaging System

**Conversation Management**
- View all conversations
- Search conversations
- Unread message count
- Last message preview
- Timestamp
- Online status indicators

**Messaging Features**
- Send text messages
- Receive messages (real-time)
- Message timestamps
- Read receipts
- Typing indicators
- Message attachments (images, PDFs)
- Link conversations to orders/products
- System messages (automated)

**Message Context**
- Link to product (inquiry)
- Link to order (order discussion)
- Link to company
- General support messages

**Required APIs:**
- Supabase (conversations, messages tables)
- Supabase Realtime (live messages)
- Supabase Storage (attachments)
- Expo ImagePicker
- Expo DocumentPicker

---

### Enhanced Features (Phase 2)

#### 7. Push Notifications

**Notification Types**
- New message received
- Order status update
- Payment confirmation
- Order shipped
- Order delivered
- RFQ response received
- Review request
- Promotional (opt-in)

**Notification Settings**
- Enable/disable by type
- Quiet hours
- Sound preferences
- Badge count

**Required APIs:**
- Expo Notifications
- Expo Push Notification Service
- Supabase Functions (triggers)

---

#### 8. Reviews & Ratings

**Leave Reviews**
- Rate order (1-5 stars)
- Written review
- Upload photos
- Tag product qualities
- Edit/delete review

**View Reviews**
- Company overall rating
- Product ratings
- Review list
- Helpful votes
- Vendor responses
- Verified purchase badge

**Required APIs:**
- Supabase (reviews table)
- Supabase Storage (review photos)

---

#### 9. Saved Items & Wishlist

**Features**
- Save favorite products
- Create wishlists
- Share wishlists
- Move to cart
- Price drop alerts

**Required APIs:**
- Supabase (saved_products table)
- Push notifications (price alerts)

---

#### 10. Advanced Search

**Features**
- Filter combinations
- Location-based search
- Geolocation integration
- Map view of vendors
- Distance sorting

**Required APIs:**
- Expo Location
- Mapbox or Google Maps
- Supabase PostGIS

---

### Advanced Features (Phase 3)

#### 11. RFQ System (Request for Quote)

**Client Actions**
- Create custom RFQ
- Upload project drawings/specs
- Set project requirements
- Set budget range
- Set timeline
- Send to multiple vendors
- Compare received quotes

**Vendor Actions**
- Receive RFQ notifications
- View RFQ details
- Download attachments
- Submit custom quote
- Negotiate terms
- Convert to order

**Required APIs:**
- Supabase (rfqs, rfq_responses tables)
- Supabase Storage (RFQ files)
- Expo DocumentPicker

---

#### 12. Project Management

**Features**
- Create projects
- Add orders to projects
- Project timeline
- Milestones tracking
- Document library
- Team collaboration
- Budget tracking

**Required APIs:**
- Supabase (projects, project_orders tables)
- Gantt chart library

---

#### 13. Analytics Dashboard (Vendors)

**Metrics**
- Sales overview
- Revenue tracking
- Top products
- Customer insights
- Order trends
- Conversion rates
- Average order value

**Visualizations**
- Line charts (revenue over time)
- Pie charts (sales by category)
- Bar charts (top products)
- KPI cards

**Required APIs:**
- Supabase (complex queries)
- Chart library (Victory Native or similar)

---

#### 14. Video Consultations

**Features**
- Schedule video calls
- In-app video chat
- Screen sharing
- Recording (with consent)
- Calendar integration

**Required APIs:**
- Agora.io or Twilio Video
- Expo Calendar

---

#### 15. Offline Mode

**Features**
- Cache product data
- Queue messages
- Sync when online
- Offline indicators
- Local database

**Required APIs:**
- AsyncStorage
- SQLite (React Native)
- NetInfo (connection status)

---

## 🔑 REQUIRED API KEYS & SERVICES

### 1. Supabase (Database & Auth)

**What it does:**
- PostgreSQL database
- User authentication
- Real-time subscriptions
- File storage
- Edge functions

**Required Keys:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get:**
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Settings → API
4. Copy URL and anon/public key

**Cost:**
- Free tier: 500MB database, 1GB file storage, 2GB bandwidth
- Pro: $25/month (8GB database, 100GB storage)

**Documentation:**
- https://supabase.com/docs

---

### 2. Stripe (Payments)

**What it does:**
- Payment processing
- Stripe Connect (marketplace payments)
- Payment Intents
- Saved payment methods
- Webhooks for events

**Required Keys:**
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**How to get:**
1. Sign up at https://stripe.com
2. Go to Developers → API keys
3. Copy publishable key and secret key
4. Create webhook endpoint for events

**Cost:**
- 2.9% + $0.30 per successful transaction
- Stripe Connect: Additional 0.25% per transaction

**Required Setup:**
1. Enable Stripe Connect
2. Create connected accounts for vendors
3. Set up webhook endpoint
4. Configure payment intents

**Documentation:**
- https://stripe.com/docs/mobile/react-native
- https://stripe.com/docs/connect

---

### 3. Expo Push Notifications

**What it does:**
- Send push notifications to iOS and Android
- Device token management
- Notification scheduling
- Badge count management

**Required Keys:**
```env
# Expo handles this automatically
# No API key needed for Expo Go
```

**For Production:**
- iOS: Apple Developer account ($99/year)
- Android: Firebase Cloud Messaging (free)

**How to get:**
1. Configure in app.json/expo config
2. Request notification permissions
3. Get Expo Push Token
4. Store token in database

**Cost:**
- Free for Expo customers
- Apple Developer: $99/year (for production iOS)

**Documentation:**
- https://docs.expo.dev/push-notifications/overview/

---

### 4. Expo Image Picker & Document Picker

**What it does:**
- Access device camera
- Select photos from gallery
- Pick documents/files
- Compress images

**Required Keys:**
```env
# No API keys needed
# Just permissions in app.json
```

**Required Permissions (app.json):**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow PPF to access your photos",
          "cameraPermission": "Allow PPF to access your camera"
        }
      ]
    ]
  }
}
```

**Documentation:**
- https://docs.expo.dev/versions/latest/sdk/imagepicker/
- https://docs.expo.dev/versions/latest/sdk/document-picker/

---

### 5. Supabase Storage (File Uploads)

**What it does:**
- Store product images
- Store message attachments
- Store user avatars
- Store documents (PDFs, drawings)

**Required Keys:**
```env
# Same as Supabase keys above
```

**Buckets to Create:**
- `product-images` (public)
- `company-logos` (public)
- `avatars` (public)
- `message-attachments` (private)
- `rfq-documents` (private)

**Storage Policies:**
```sql
-- Allow public read for product images
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated users to upload attachments
CREATE POLICY "Authenticated users upload"
ON storage.objects FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'message-attachments');
```

**Documentation:**
- https://supabase.com/docs/guides/storage

---

### 6. Google Maps / Mapbox (Optional - Phase 2)

**What it does:**
- Display vendor locations on map
- Location-based search
- Distance calculations
- Geocoding addresses

**Required Keys:**
```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
# OR
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ...
```

**How to get Google Maps:**
1. Go to Google Cloud Console
2. Enable Maps SDK for iOS/Android
3. Create API key
4. Restrict key to your app bundle ID

**How to get Mapbox:**
1. Sign up at https://mapbox.com
2. Get access token from dashboard
3. Configure in app

**Cost:**
- Google Maps: $200 free credit/month, then pay-as-you-go
- Mapbox: 50,000 free requests/month

**Documentation:**
- Google: https://developers.google.com/maps
- Mapbox: https://docs.mapbox.com

---

### 7. Sentry (Error Tracking - Recommended)

**What it does:**
- Track crashes
- Monitor performance
- Log errors
- User feedback

**Required Keys:**
```env
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

**How to get:**
1. Sign up at https://sentry.io
2. Create new project (React Native)
3. Copy DSN

**Cost:**
- Free: 5,000 events/month
- Team: $26/month (50,000 events)

**Documentation:**
- https://docs.sentry.io/platforms/react-native/

---

### 8. Analytics (Mixpanel, Amplitude, or Firebase)

**What it does:**
- Track user behavior
- Funnel analysis
- Retention metrics
- A/B testing

**Option 1: Mixpanel**
```env
EXPO_PUBLIC_MIXPANEL_TOKEN=xxxxx
```
- Free: 100,000 events/month
- Growth: $25/month

**Option 2: Amplitude**
```env
EXPO_PUBLIC_AMPLITUDE_API_KEY=xxxxx
```
- Free: 10M events/month
- Growth: $49/month

**Option 3: Firebase Analytics**
```env
# Configured via google-services.json
```
- Free: Unlimited events

**Documentation:**
- Mixpanel: https://developer.mixpanel.com/docs/react-native
- Amplitude: https://www.docs.developers.amplitude.com/data/sdks/react-native/
- Firebase: https://rnfirebase.io/analytics/usage

---

### 9. Email Service (Resend or SendGrid)

**What it does:**
- Transactional emails
- Password reset emails
- Order confirmations
- Marketing emails

**Option 1: Resend**
```env
RESEND_API_KEY=re_xxxxx
```
- Free: 3,000 emails/month
- Pro: $20/month (50,000 emails)

**Option 2: SendGrid**
```env
SENDGRID_API_KEY=SG.xxxxx
```
- Free: 100 emails/day
- Essentials: $19.95/month (50,000 emails)

**Email Templates Needed:**
- Welcome email
- Email verification
- Password reset
- Order confirmation
- Order status update
- New message notification
- Review request

**Documentation:**
- Resend: https://resend.com/docs
- SendGrid: https://docs.sendgrid.com

---

### 10. Video Calling (Optional - Phase 3)

**Option 1: Agora.io**
```env
AGORA_APP_ID=xxxxx
```
- Free: 10,000 minutes/month
- $0.99 per 1,000 minutes after

**Option 2: Twilio Video**
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_API_KEY=SKxxxxx
TWILIO_API_SECRET=xxxxx
```
- Pay as you go: $0.0015/participant/minute

**Documentation:**
- Agora: https://docs.agora.io/en/video-calling/get-started/get-started-sdk
- Twilio: https://www.twilio.com/docs/video

---

## 🗄️ SUPABASE DATABASE SCHEMA

### Database Overview

The mobile app uses the same database as the web application with 8 core tables:

### 1. profiles
**Purpose:** User accounts (clients and engineers/vendors)

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  user_type TEXT CHECK (user_type IN ('client', 'engineer')) DEFAULT 'client',
  company_name TEXT,
  bio TEXT,
  location TEXT,
  phone TEXT,
  push_token TEXT,  -- Expo push notification token
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Mobile Usage:**
- Store user profile data
- Differentiate between client and vendor accounts
- Store push notification tokens
- Link to all user activities

---

### 2. company_profiles
**Purpose:** Detailed vendor/company information

```sql
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id),
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  specialties TEXT[],
  certifications TEXT[],
  year_established INTEGER,
  employee_count TEXT,
  verified BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Mobile Usage:**
- Display company profiles
- Show company details in product listings
- Filter by specialties/location
- Verify company authenticity

---

### 3. products
**Purpose:** Services/products offered by companies

```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.company_profiles(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  price BIGINT NOT NULL,  -- Price in cents
  category TEXT NOT NULL,
  image_url TEXT,
  images TEXT[],  -- Multiple images
  delivery_days INTEGER,
  active BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Mobile Usage:**
- Browse marketplace
- Product detail screens
- Search and filter
- Add to cart
- Save favorites

---

### 4. product_orders
**Purpose:** Purchase orders and transactions

```sql
CREATE TABLE public.product_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id),
  vendor_id UUID REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id),
  company_id UUID REFERENCES public.company_profiles(id),
  
  -- Order details
  amount BIGINT NOT NULL,  -- Total amount in cents
  status TEXT CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded')),
  
  -- Payment info
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  payment_status TEXT,
  
  -- Order info
  project_notes TEXT,
  delivery_address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

**Mobile Usage:**
- Order management (client view)
- Sales management (vendor view)
- Order status tracking
- Payment processing
- Order history

---

### 5. stripe_connect_accounts
**Purpose:** Link vendors to Stripe Connect accounts

```sql
CREATE TABLE public.stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.company_profiles(id) UNIQUE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Mobile Usage:**
- Verify vendor can receive payments
- Process marketplace payments
- Split payments between platform and vendor

---

### 6. conversations
**Purpose:** Message thread containers

```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id),
  order_id UUID REFERENCES public.product_orders(id),
  company_id UUID REFERENCES public.company_profiles(id),
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Mobile Usage:**
- Group messages into threads
- Link conversations to products/orders
- Track conversation status
- Sort by last message

---

### 7. conversation_participants
**Purpose:** Link users to conversations

```sql
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id),
  user_id UUID REFERENCES public.profiles(id),
  last_read_at TIMESTAMPTZ,
  muted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);
```

**Mobile Usage:**
- Determine who's in each conversation
- Track read/unread status
- Calculate unread counts
- Mute notifications per conversation

---

### 8. messages
**Purpose:** Individual messages

```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id),
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  attachments JSONB,  -- Array of file URLs
  is_system_message BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Mobile Usage:**
- Display message threads
- Send/receive messages
- Real-time updates via Supabase Realtime
- Upload/download attachments
- System notifications

---

### Additional Tables (Optional - Phase 3)

#### reviews
```sql
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.product_orders(id),
  reviewer_id UUID REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.company_profiles(id),
  product_id UUID REFERENCES public.products(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  images TEXT[],
  verified_purchase BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### saved_products
```sql
CREATE TABLE public.saved_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

#### rfqs (Request for Quote)
```sql
CREATE TABLE public.rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  budget_min BIGINT,
  budget_max BIGINT,
  deadline DATE,
  attachments JSONB,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ⚙️ ENVIRONMENT CONFIGURATION

### Development (.env.development)
```env
# App Environment
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_APP_VERSION=1.0.0

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (Test Mode)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Feature Flags
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_VIDEO_CALLS=false

# API Endpoints
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### Production (.env.production)
```env
# App Environment
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_APP_VERSION=1.0.0

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://production.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (Live Mode)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Sentry
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Analytics
EXPO_PUBLIC_MIXPANEL_TOKEN=xxxxx

# Feature Flags
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_VIDEO_CALLS=false

# API Endpoints
EXPO_PUBLIC_API_URL=https://api.precisionprojectflow.com
```

### app.json / app.config.js
```json
{
  "expo": {
    "name": "Precision Project Flow",
    "slug": "ppf-marketplace",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#2563eb"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.ppf.marketplace",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSCameraUsageDescription": "Allow PPF to access your camera to upload photos",
        "NSPhotoLibraryUsageDescription": "Allow PPF to access your photos",
        "NSFaceIDUsageDescription": "Use Face ID to sign in quickly"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2563eb"
      },
      "package": "com.ppf.marketplace",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "USE_BIOMETRIC"
      ]
    },
    "plugins": [
      "expo-secure-store",
      "expo-local-authentication",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow PPF to access your photos",
          "cameraPermission": "Allow PPF to access your camera"
        }
      ]
    ]
  }
}
```

---

## 🔗 THIRD-PARTY INTEGRATIONS

### Priority Order

**Phase 1 (MVP):**
1. ✅ Supabase (Database + Auth)
2. ✅ Stripe (Payments)
3. ✅ Expo Notifications (Push)
4. ✅ Expo ImagePicker (Photos)

**Phase 2 (Enhanced):**
5. Sentry (Error tracking)
6. Mixpanel/Amplitude (Analytics)
7. Resend/SendGrid (Email)
8. Google Maps/Mapbox (Location)

**Phase 3 (Advanced):**
9. Agora/Twilio (Video calls)
10. Algolia (Advanced search)
11. OneSignal (Advanced notifications)

---

## 🔐 SECURITY & COMPLIANCE

### Security Best Practices

1. **Authentication**
   - JWT tokens stored in Expo SecureStore
   - Auto-refresh tokens
   - Biometric authentication
   - Session timeout after 30 days

2. **API Security**
   - Row Level Security (RLS) on all Supabase tables
   - API key rotation
   - Rate limiting
   - Input validation

3. **Payment Security**
   - PCI DSS compliance via Stripe
   - No card data stored locally
   - Secure payment tokenization
   - Stripe Connect for marketplace payments

4. **Data Privacy**
   - GDPR compliance
   - CCPA compliance
   - Privacy policy
   - Data deletion on request
   - Opt-out of marketing

### Required Legal Documents

1. Privacy Policy
2. Terms of Service
3. Cookie Policy (web only)
4. GDPR Data Processing Agreement
5. Return/Refund Policy

---

## 📊 API Rate Limits

### Supabase
- Free tier: 500 requests/second
- Pro tier: Unlimited

### Stripe
- Test mode: No limits
- Live mode: 100 requests/second

### Expo Push Notifications
- 600 messages/minute

### Google Maps
- 50,000 requests/month (free tier)

---

## ✅ Setup Checklist

### Before Development
- [ ] Create Supabase project
- [ ] Set up Supabase database tables
- [ ] Configure Row Level Security policies
- [ ] Create Stripe account
- [ ] Enable Stripe Connect
- [ ] Configure Stripe webhook
- [ ] Set up development environment variables
- [ ] Create app.json configuration

### During Development
- [ ] Implement authentication flow
- [ ] Connect to Supabase database
- [ ] Integrate Stripe payments
- [ ] Set up push notifications
- [ ] Implement real-time messaging
- [ ] Add error tracking (Sentry)
- [ ] Add analytics tracking

### Before Launch
- [ ] Set up production environment variables
- [ ] Configure production Supabase
- [ ] Switch to Stripe live mode
- [ ] Set up error monitoring
- [ ] Create App Store assets
- [ ] Prepare marketing materials
- [ ] Legal document review
- [ ] Security audit
- [ ] Performance testing
- [ ] Beta testing

---

## 📚 Additional Resources

### Documentation
- Supabase: https://supabase.com/docs
- Stripe: https://stripe.com/docs
- Expo: https://docs.expo.dev
- React Native: https://reactnative.dev/docs

### Community
- Expo Discord: https://chat.expo.dev
- React Native Discord: https://www.reactiflux.com
- Stack Overflow: react-native tag

### Tools
- Expo Snack: https://snack.expo.dev (live playground)
- Postman: API testing
- React Native Debugger: Debugging tool

---

**Status:** Ready to begin development 🚀

**Next Steps:**
1. Set up Expo project
2. Configure Supabase connection
3. Implement authentication
4. Build marketplace screens
5. Integrate Stripe payments
