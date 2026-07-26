# PPF Database Schema (Updated July 25, 2026)# 🚀 DATABASE RESET & SETUP GUIDE



> **Supabase Project:** `ifrxzmemiihxfdimwvcw`## Quick Setup (30 minutes)



---You have **4 SQL files** ready to run in order:



## Core Tables```

/sql/

### profiles  000_reset_database.sql    ← Clean slate

| Column | Type | Notes |  001_create_tables.sql     ← 6 core tables only

|---|---|---|  002_enable_rls.sql        ← Security policies

| id | UUID | PK, FK to auth.users |  003_seed_vendors.sql      ← 16 vendors, 56 products

| email | TEXT | Unique |```

| full_name | TEXT | |

| avatar_url | TEXT | |---

| phone | TEXT | |

| bio | TEXT | |## Step 1: Reset Database (2 min)

| user_type | TEXT | 'engineer' (vendor) or 'client' (supplier) |

| location | TEXT | |**⚠️ WARNING: This deletes ALL existing data!**

| company_id | UUID | FK to company_profiles |

| token_balance | INTEGER | $ProjectFlow token wallet |1. Go to Supabase Dashboard → SQL Editor

| is_admin | BOOLEAN | |2. Copy contents of `sql/000_reset_database.sql`

| created_at | TIMESTAMPTZ | |3. Paste and run

| updated_at | TIMESTAMPTZ | |

**Expected result:** All tables dropped cleanly

### company_profiles

| Column | Type | Notes |---

|---|---|---|

| id | UUID | PK |## Step 2: Create Tables (3 min)

| owner_id | UUID | FK to auth.users |

| company_name | TEXT | |**Two options:**

| slug | TEXT | Unique URL slug |

| description | TEXT | |### Option A: All at Once (Recommended)

| industry | TEXT | |1. Copy contents of `sql/001_create_all_tables.sql`

| email | TEXT | |2. Paste in SQL Editor and run

| phone | TEXT | |

| website | TEXT | |### Option B: One at a Time

| city | TEXT | |Run each file in `sql/tables/` in order:

| state | TEXT | |1. `001_profiles.sql`

| specialties | TEXT[] | Array of capability tags |2. `002_company_profiles.sql`

| is_verified | BOOLEAN | |3. `003_products.sql`

| logo_url | TEXT | |4. `004_product_orders.sql`

| created_at | TIMESTAMPTZ | |5. `005_stripe_connect_accounts.sql`

| updated_at | TIMESTAMPTZ | |6. `006_conversations.sql`

7. `007_conversation_participants.sql`

### company_members8. `008_messages.sql`

| Column | Type | Notes |

|---|---|---|**Expected result:** 8 tables created:

| id | UUID | PK |- ✅ profiles

| company_id | UUID | FK to company_profiles |- ✅ company_profiles

| user_id | UUID | FK to auth.users |- ✅ products

| role | TEXT | 'owner' / 'admin' / 'member' |- ✅ product_orders

| status | TEXT | 'active' / 'invited' / 'removed' |- ✅ stripe_connect_accounts

| invited_by | UUID | FK to auth.users |- ✅ conversations

| created_at | TIMESTAMPTZ | |- ✅ conversation_participants

| updated_at | TIMESTAMPTZ | |- ✅ messages



---**Verify:**

```sql

## Messaging TablesSELECT table_name FROM information_schema.tables 

WHERE table_schema = 'public' 

### user_conversationsORDER BY table_name;

| Column | Type | Notes |```

|---|---|---|

| id | UUID | PK |---

| participant_one_id | UUID | Nullable (direct only) |

| participant_two_id | UUID | Nullable (direct only) |## Step 3: Enable Security (5 min)

| conversation_type | TEXT | 'direct' / 'group' / 'channel' |

| name | TEXT | Channel/group name |1. Copy contents of `sql/002_enable_rls.sql`

| description | TEXT | |2. Paste and run

| is_public | BOOLEAN | |

| company_id | UUID | FK to company_profiles |**Expected result:** RLS enabled on all tables with policies

| is_unlocked | BOOLEAN | |

| created_by | UUID | |**Verify:**

| created_at | TIMESTAMPTZ | |```sql

| last_message_at | TIMESTAMPTZ | |SELECT tablename, rowsecurity 

FROM pg_tables 

### conversation_participantsWHERE schemaname = 'public';

| Column | Type | Notes |```

|---|---|---|All should show `rowsecurity = true`

| id | UUID | PK |

| conversation_id | UUID | FK |---

| user_id | UUID | FK |

| role | TEXT | 'owner' / 'admin' / 'member' |## Step 4: Load Vendors (10 min)

| joined_at | TIMESTAMPTZ | |

1. Copy contents of `sql/003_seed_vendors.sql`

### user_messages2. Paste and run

| Column | Type | Notes |

|---|---|---|**Expected result:** 16 companies + 56 products loaded

| id | UUID | PK |

| conversation_id | UUID | FK |**Verify:**

| sender_id | UUID | FK |```sql

| content | TEXT | |-- Should return 16

| is_read | BOOLEAN | |SELECT COUNT(*) as companies FROM public.company_profiles;

| is_system_message | BOOLEAN | |

| is_paid | BOOLEAN | |-- Should return 56

| payment_id | TEXT | |SELECT COUNT(*) as products FROM public.products WHERE is_active = true;

| read_at | TIMESTAMPTZ | |

| attachment_url | TEXT | |-- Check price range

| attachment_name | TEXT | |SELECT 

| attachment_type | TEXT | |    MIN(price)/100.0 as min_dollars,

| created_at | TIMESTAMPTZ | |    MAX(price)/100.0 as max_dollars,

    COUNT(*) as total_products

---FROM public.products;

```

## RFQ Tables

**Expected output:**

### rfqs```

| Column | Type | Notes |companies: 16

|---|---|---|products: 56

| id | UUID | PK |min_dollars: $55.00

| client_id | UUID | FK to profiles |max_dollars: $8,500.00

| title | TEXT | |```

| slug | TEXT | Clean URL (e.g. hvac-chiller-8ac9a281) |

| category | TEXT | Engineering discipline |---

| description | TEXT | |

| quantity | TEXT | |## Step 5: Test Marketplace (10 min)

| budget | TEXT | |

| timeline | TEXT | |1. **Start dev server:**

| location | TEXT | |   ```bash

| attachment_urls | TEXT[] | |   npm run dev

| status | TEXT | 'open' / 'in_review' / 'awarded' / 'closed' |   ```

| created_at | TIMESTAMPTZ | |

| updated_at | TIMESTAMPTZ | |2. **Visit marketplace:**

   ```

---   http://localhost:3000/marketplace

   ```

## Activity Ledger

3. **Expected:**

### site_activities   - ✅ 56 products displayed

| Column | Type | Notes |   - ✅ Prices showing correctly (e.g., "$459.00" not "45900")

|---|---|---|   - ✅ Categories: Motors & Drives, Pumps & Valves, HVAC, Electrical, etc.

| id | UUID | PK |   - ✅ Company names visible

| activity_type | TEXT | 'rfq_posted' / 'rfq_awarded' / 'social_post_created' / 'order_placed' / 'company_joined' / 'team_member_added' |   - ✅ Filter by category works

| actor_id | UUID | FK to auth.users |

| target_type | TEXT | 'rfq' / 'order' / 'feed_post' / 'company' |4. **Click on a product:**

| target_id | UUID | |   - Should navigate to `/profiles/[company_id]`

| summary | TEXT | Human-readable description |   - Company banner displays

| metadata | JSONB | Flexible payload |   - Product list shows

| previous_hash | TEXT | SHA256 of previous row |   - Contact sidebar visible

| row_hash | TEXT | SHA256(id + type + actor + previous_hash) |

| created_at | TIMESTAMPTZ | |---



---## Troubleshooting



## Token Tables### ❌ "Column does not exist" error

**Solution:** You didn't run scripts in order. Start over with 000_reset.

### token_transactions

| Column | Type | Notes |### ❌ Prices showing as "45900" instead of "$459.00"

|---|---|---|**Solution:** Check `app/marketplace/page.tsx` price display:

| id | UUID | PK |```typescript

| user_id | UUID | FK |// Should be:

| amount | INTEGER | Positive=credit, negative=debit |${(product.price / 100).toFixed(2)}

| description | TEXT | |

| reference_id | UUID | |// NOT:

| stripe_payment_id | TEXT | |${product.price}

| created_at | TIMESTAMPTZ | |```



---### ❌ No products showing

**Check:**

## Migration Files (in supabase/)```sql

SELECT COUNT(*) FROM products WHERE is_active = true;

| File | Purpose |```

|---|---|If 0, re-run `003_seed_vendors.sql`

| `PROJECTFLOW_TOKENS.sql` | Token ledger + spend/add/refund RPCs |

| `CHANNELS_AND_GROUPS.sql` | conversation_type, conversation_participants, RLS |### ❌ "Table already exists" error

| `COMPANY_TEAMS.sql` | company_members, ensure_company_channel RPC |**Solution:** Run `000_reset_database.sql` first

| `FIX_MISSING_COLUMNS.sql` | is_unlocked, is_system_message, attachments |

| `RFQ_TABLE.sql` | rfqs table |---

| `SITE_ACTIVITIES_LEDGER.sql` | site_activities table + triggers + backfill |

| `FEED_AND_STORAGE.sql` | feed_posts, feed_likes, storage buckets |## What You Just Built

| `RFQ_SLUGS.sql` | Add slug column to rfqs |
### Database Schema (6 tables):
```
profiles              ← User accounts
company_profiles      ← Vendors (16 loaded)
products              ← Products/services (56 loaded)
product_orders        ← Purchase records
stripe_connect_accounts ← Payment integration
conversations/participants/messages ← Messaging
```

### Vendors Loaded:

**Emergency Vendors (Dallas, TX):**
1. ABC Motor Supply - Motors & drives
2. Industrial Parts Co - Motors & automation
3. Texas Equipment Supply - Power transmission
4. Dallas Pump & Supply - Pumps & repair
5. Industrial Valve Solutions - Valves & actuators
6. Dallas HVAC Wholesale - HVAC equipment
7. Texas Climate Control Parts - HVAC parts
8. DFW Electrical Supply - Electrical components
9. Industrial Controls & Drives - PLCs & automation

**Real Company Profiles:**
10. Minco - Thermal sensors (Minneapolis, MN)
11. PEKO Precision - CNC machining (Rochester, NY)
12. IDS Engineering - Civil engineering (Dallas, TX)
13. SmartFlow USA - Flow meters (Pittsburgh, PA)
14. Henderson Engineers - MEP/Code (Kansas City, KS)
15. Fishbeck - Water systems (Grand Rapids, MI)

**Plus 1 placeholder vendor ID**

### Products: 56 items
- Price range: $55 - $8,500
- Categories: Motors, Pumps, HVAC, Electrical, Engineering Services
- All have realistic descriptions
- Some require consultation

---

## Next Steps After Database Setup

### 🔥 IMMEDIATE (Today):
1. ✅ Complete database reset (you're here)
2. Test marketplace display
3. Test vendor profile pages
4. Sign up test user account

### 🚀 THIS WEEK:
1. **Stripe Connect Integration**
   - Add Stripe API keys to `.env.local`
   - Create `/api/stripe/connect` route
   - Test vendor onboarding flow
   - See `LOAD_VENDORS_TEST_STRIPE.md`

2. **Test Purchase Flow**
   - Sign up as vendor
   - Connect Stripe account
   - Sign up as buyer
   - Purchase product
   - Verify payment split

### 📈 NEXT 2 WEEKS (Supply-First):
1. **Vendor Recruitment** (see `SUPPLY-FIRST-ROADMAP.md`)
   - Post Upwork job listing
   - Create pitch deck
   - Contact first 10 vendors
   - Goal: 5 signed vendors

2. **Photo-to-Quote MVP**
   - Build image upload flow
   - Vendor notification system
   - Quote submission interface

---

## Support Files

- `SUPPLY-FIRST-ROADMAP.md` - 12-week execution plan
- `LOAD_VENDORS_TEST_STRIPE.md` - Comprehensive testing guide
- `QUICK_START_VENDORS.md` - Quick reference card
- `MANIFESTO.md` - Go-to-market strategy

---

## Success Criteria

After completing this setup:
- ✅ Clean database with 6 tables
- ✅ 16 verified vendors loaded
- ✅ 56 active products
- ✅ RLS security enabled
- ✅ Marketplace displays correctly
- ✅ Price format correct (dollars, not cents)
- ✅ Vendor profile pages work
- ⏳ Ready for Stripe Connect testing

**Time to complete:** ~30 minutes  
**Next milestone:** Stripe integration + first vendor signup
# 🎉 DATABASE SIMPLIFIED - READY TO LOAD

## What Just Happened

You requested: **"This is far too complicated. Let's completely reset and write all the tables that we need"**

I delivered: **Clean, minimal database schema ready to go**

---

## The Solution

### 📁 New Files in `/sql/`

```
/sql/
├── 000_reset_database.sql       ← Drops all tables cleanly
├── 001_create_tables.sql        ← Creates 6 core tables only
├── 002_enable_rls.sql           ← Security policies
└── 003_seed_vendors.sql         ← 16 vendors + 56 products
```

### 📚 Documentation Created

```
DATABASE_SETUP.md         ← Complete 30-min setup guide
SQL_QUICK_REFERENCE.md    ← Copy-paste queries & troubleshooting
LOAD_VENDORS_TEST_STRIPE.md  ← Comprehensive testing guide (already existed)
QUICK_START_VENDORS.md    ← Quick reference card (already existed)
```

---

## What Changed

### ❌ OLD (Complex):
- **9 migration files** scattered in `/supabase/migrations/`
- **13 tables** with many unused features
- **Column name conflicts** (`verified` vs `is_verified`)
- **510-line migration file** hard to debug
- **Features you don't need yet:** portfolio_projects, team_members, company_messages, payment_intents, reviews, company_claims

### ✅ NEW (Simple):
- **4 clean files** in `/sql/`
- **6 core tables** focused on marketplace essentials
- **Consistent naming** (`is_verified` everywhere)
- **Clear separation:** Reset → Tables → Security → Data
- **Focus on what matters:** Users, companies, products, orders, payments, messaging

---

## Database Schema

### 6 Core Tables:

1. **profiles** - User accounts
   - id, email, full_name, user_type, bio, location

2. **company_profiles** - Vendors
   - id, owner_id, company_name, description, contact info
   - specialties[], certifications[]
   - **is_verified**, is_claimed

3. **products** - Products/services
   - id, company_id, name, description
   - **price (BIGINT cents)**, category
   - delivery_time_days, is_active, requires_consultation

4. **product_orders** - Purchase records
   - id, order_number, product_id, company_id, buyer_id
   - product_name, **product_price**, **platform_fee**, **total_amount**
   - status, stripe_payment_intent_id

5. **stripe_connect_accounts** - Payment integration
   - id, company_id, stripe_account_id
   - charges_enabled, payouts_enabled

6. **conversations/participants/messages** - Messaging
   - Standard 3-table messaging system

---

## Test Data Ready to Load

### 16 Vendors:

**Emergency Response (Dallas, TX):**
- ABC Motor Supply - Motors & drives
- Industrial Parts Co - Automation
- Texas Equipment Supply - Power transmission
- Dallas Pump & Supply - Pumps & repair
- Industrial Valve Solutions - Valves
- Dallas HVAC Wholesale - HVAC equipment
- Texas Climate Control Parts - HVAC parts
- DFW Electrical Supply - Electrical
- Industrial Controls & Drives - PLCs

**Real Company Profiles:**
- Minco (Minneapolis) - Thermal sensors
- PEKO Precision (Rochester) - CNC machining
- IDS Engineering (Dallas) - Civil engineering
- SmartFlow USA (Pittsburgh) - Flow meters
- Henderson Engineers (Kansas) - MEP/Code consulting
- Fishbeck (Grand Rapids) - Water systems

### 56 Products:
- **Price range:** $55 - $8,500
- **Categories:** Motors & Drives, Pumps & Valves, HVAC, Electrical, Engineering Services, Sensors, Manufacturing, Civil Engineering, Flow Meters
- **All prices in cents** (BIGINT format)
- **Realistic descriptions** based on actual vendor catalogs
- **Some require consultation** (engineering services)

---

## Your Next 30 Minutes

### Step 1: Open Supabase Dashboard (2 min)
- Go to SQL Editor
- Have all 4 SQL files ready

### Step 2: Reset Database (2 min)
- Copy/paste `000_reset_database.sql`
- Run it
- ⚠️ This deletes everything

### Step 3: Create Tables (3 min)
- Copy/paste `001_create_tables.sql`
- Run it
- Verify: 8 tables created

### Step 4: Enable Security (5 min)
- Copy/paste `002_enable_rls.sql`
- Run it
- Verify: RLS enabled on all tables

### Step 5: Load Vendors (10 min)
- Copy/paste `003_seed_vendors.sql`
- Run it
- Verify: 16 companies, 56 products

### Step 6: Test Marketplace (10 min)
- Visit http://localhost:3000/marketplace
- See 56 products
- Click vendor profiles
- Verify prices display correctly

**Total time:** ~30 minutes

---

## Success Criteria

After setup, you should have:

✅ **Clean database** with 6 tables  
✅ **16 verified vendors** loaded  
✅ **56 active products** ($55-$8,500)  
✅ **RLS security** enabled  
✅ **Marketplace displays** correctly  
✅ **Price format** correct ($459.00 not 45900)  
✅ **Vendor profiles** working  
✅ **Ready for Stripe Connect** testing  

---

## What This Enables

### Immediate:
- ✅ Test complete marketplace flow
- ✅ Integrate Stripe Connect
- ✅ Test purchase transactions
- ✅ Verify payment splits (5% platform fee)

### This Week:
- 📋 Start vendor recruitment
- 📋 Post Upwork job listing
- 📋 Create vendor pitch deck
- 📋 Contact first 10 Dallas vendors

### Next 2 Weeks:
- 📋 Build photo-to-quote MVP
- 📋 Recruit 20-50 vendors
- 📋 Set up vendor notification system

### 90 Days:
- 📋 50 active vendors
- 📋 500 technician users
- 📋 200+ successful quotes
- 📋 $50K GMV
- 📋 Ready for seed funding

---

## Support Resources

**Primary Guide:**
- `DATABASE_SETUP.md` - Step-by-step setup (30 min)

**Quick References:**
- `SQL_QUICK_REFERENCE.md` - Copy-paste queries
- `QUICK_START_VENDORS.md` - 4-step quick start

**Testing:**
- `LOAD_VENDORS_TEST_STRIPE.md` - Complete testing guide

**Strategy:**
- `SUPPLY-FIRST-ROADMAP.md` - 12-week execution plan
- `MANIFESTO.md` - Go-to-market strategy

---

## File Locations

### SQL Files:
```bash
/Users/thelegendofzjui/Documents/GitHub/Precision Project Flow/sql/
├── 000_reset_database.sql
├── 001_create_tables.sql
├── 002_enable_rls.sql
└── 003_seed_vendors.sql
```

### Documentation:
```bash
/Users/thelegendofzjui/Documents/GitHub/Precision Project Flow/
├── DATABASE_SETUP.md
├── SQL_QUICK_REFERENCE.md
├── LOAD_VENDORS_TEST_STRIPE.md
├── QUICK_START_VENDORS.md
├── SUPPLY-FIRST-ROADMAP.md
└── NEXT-STEPS.md (updated)
```

---

## Questions?

**Need help?** Check these first:
1. `DATABASE_SETUP.md` - Complete setup guide
2. `SQL_QUICK_REFERENCE.md` - Troubleshooting section
3. `LOAD_VENDORS_TEST_STRIPE.md` - Testing procedures

**Common issues:**
- "Table already exists" → Run 000_reset first
- "Column does not exist" → Run files in order
- No products showing → Re-run 003_seed_vendors
- Prices wrong format → Check marketplace display code

---

## Ready to Go! 🚀

**You now have:**
- ✅ Clean, minimal database schema
- ✅ 16 vendors ready to load
- ✅ 56 products ready to load
- ✅ Complete setup guide
- ✅ All documentation

**Next action:**
Open `DATABASE_SETUP.md` and follow the 30-minute setup guide.

Then test Stripe Connect integration and start recruiting vendors!

**Supply-First Strategy:** Build the vendor supply, then invite technicians to a thriving marketplace. 💪
# 🧪 ORDER MANAGEMENT TESTING GUIDE

**Created:** February 25, 2026  
**Purpose:** Test the complete order flow without Stripe integration  
**Duration:** ~30 minutes

---

## 🎯 **WHAT WE'RE TESTING**

This guide walks through testing the **complete order management system** using test orders (no payment processing). After this works, we'll add Stripe integration.

**Flow:**
1. Customer browses marketplace
2. Customer selects product & checks out
3. Order is created in database
4. Customer views order status
5. Vendor views incoming order
6. Vendor updates order status
7. Customer receives notification

---

## ✅ **PRE-REQUISITES**

Before starting, verify:
- [ ] Database setup complete (16 vendors, 56 products loaded)
- [ ] `npm run dev` is running
- [ ] You can access http://localhost:3000

---

## 📋 **TEST FLOW 1: CUSTOMER PURCHASE**

### **Step 1: Create Customer Account** (3 min)

1. Open **Incognito/Private Window** (to test as new user)
2. Go to http://localhost:3000/signup
3. Sign up with test credentials:
   ```
   Email: customer@test.com
   Password: TestPass123!
   Full Name: Test Customer
   User Type: Client
   ```
4. ✅ **Verify:** Redirected to dashboard after signup

---

### **Step 2: Browse Marketplace** (2 min)

1. Go to http://localhost:3000/marketplace/products
2. ✅ **Verify:** You see 56 products listed
3. ✅ **Verify:** Prices display correctly (e.g., "$459.00" not "45900")
4. ✅ **Verify:** Category filters work
5. ✅ **Verify:** Search works

---

### **Step 3: View Product Details** (2 min)

1. Click on any product (e.g., "Emergency Motor Repair - 1-10 HP")
2. ✅ **Verify:** Product page loads with:
   - Product name & description
   - Price displayed correctly
   - Vendor company name
   - "Buy Now" button

---

### **Step 4: Checkout** (3 min)

1. Click **"Buy Now"** button
2. ✅ **Verify:** Redirected to `/checkout/[productId]`
3. ✅ **Verify:** Page shows:
   - Product summary
   - Vendor information
   - Price breakdown (Product + 5% Platform Fee = Total)
   - Test mode notice (yellow banner)
   - Shipping information form

4. Fill in shipping information:
   ```
   Street Address: 123 Test Street
   City: Dallas
   State: TX
   ZIP Code: 75201
   Notes: (optional) "Test order - please rush"
   ```

5. Click **"Place Test Order"**

6. ✅ **Verify:** 
   - Button shows "Processing..." with spinner
   - Success toast appears: "Order placed successfully!"
   - Redirected to order confirmation page

---

### **Step 5: View Order Confirmation** (2 min)

After placing order, you should see:

1. ✅ **Verify:** Order confirmation page loads
2. ✅ **Verify:** Order number displayed (format: `ORD-XXXXX-XXXXX`)
3. ✅ **Verify:** Order details show:
   - Product name
   - Vendor company name
   - Total amount
   - Status: "Pending"
   - Shipping information
   - Order date/time

---

### **Step 6: View Customer Orders Dashboard** (2 min)

1. Go to http://localhost:3000/orders (or click "Orders" in nav)
2. ✅ **Verify:** Your test order appears in the list
3. ✅ **Verify:** Order shows:
   - Order number
   - Product name
   - Vendor name
   - Total amount
   - Status badge
   - Date created

4. Click on the order
5. ✅ **Verify:** Order detail page opens with full information

---

## 📋 **TEST FLOW 2: VENDOR ORDER MANAGEMENT**

### **Step 7: Create Vendor Account** (3 min)

1. Open **NEW Incognito Window** (separate from customer)
2. Go to http://localhost:3000/signup
3. Sign up as engineer:
   ```
   Email: vendor@dallasmotors.com
   Password: VendorPass123!
   Full Name: John Vendor
   User Type: Engineer
   ```
4. Complete company profile setup:
   ```
   Company Name: Dallas Motor & Drive Solutions
   Description: Emergency motor repair specialist
   City: Dallas
   State: TX
   Phone: (214) 555-0101
   ```

---

### **Step 8: View Vendor Orders Dashboard** (2 min)

1. Go to http://localhost:3000/orders/sales
2. ✅ **Verify:** Incoming orders appear (if your company was selected)
3. ✅ **Verify:** Each order shows:
   - Order number
   - Customer name
   - Product purchased
   - Amount
   - Status
   - Date received

---

### **Step 9: Update Order Status** (3 min)

1. Click on an order
2. ✅ **Verify:** Order detail page shows full information
3. Find **"Update Status"** button/dropdown
4. Change status: `Pending` → `In Progress`
5. ✅ **Verify:** 
   - Status updates successfully
   - Status badge changes color
   - Timestamp recorded

6. Update again: `In Progress` → `Completed`
7. ✅ **Verify:** Status updates to "Completed"

---

## 🔍 **VERIFY IN DATABASE**

Run these queries in **Supabase SQL Editor** to verify orders were created:

```sql
-- Check total orders
SELECT COUNT(*) FROM product_orders;

-- View all orders with details
SELECT 
  order_number,
  product_name,
  status,
  (total_amount / 100.0) as total_usd,
  created_at
FROM product_orders
ORDER BY created_at DESC;

-- View order with buyer info
SELECT 
  po.order_number,
  po.product_name,
  po.status,
  p.full_name as buyer_name,
  p.email as buyer_email,
  cp.company_name as vendor_name
FROM product_orders po
LEFT JOIN profiles p ON po.buyer_id = p.id
LEFT JOIN company_profiles cp ON po.company_id = cp.id
ORDER BY po.created_at DESC;
```

✅ **Expected:** You should see your test order(s) in the database

---

## 🧪 **EDGE CASES TO TEST**

### **Test 1: Not Logged In**
1. Open incognito window (not logged in)
2. Go to any product page
3. Click "Buy Now"
4. ✅ **Verify:** Redirected to `/login` with redirect parameter
5. Log in
6. ✅ **Verify:** Redirected back to product page after login

### **Test 2: Invalid Product**
1. Go to http://localhost:3000/checkout/invalid-uuid
2. ✅ **Verify:** Error message appears
3. ✅ **Verify:** Redirected to marketplace

### **Test 3: Missing Shipping Info**
1. Start checkout process
2. Leave shipping fields empty
3. Click "Place Order"
4. ✅ **Verify:** Error message: "Please fill in all required shipping information"
5. ✅ **Verify:** Order NOT created

### **Test 4: Multiple Orders**
1. Place 3 different orders as same customer
2. Go to orders dashboard
3. ✅ **Verify:** All 3 orders appear
4. ✅ **Verify:** Orders sorted by date (newest first)

---

## 📊 **SUCCESS CRITERIA**

After completing all tests, you should have:

- [ ] ✅ Customer can browse products
- [ ] ✅ Customer can view product details
- [ ] ✅ Customer can checkout (with shipping info)
- [ ] ✅ Orders are created in database with correct data
- [ ] ✅ Order numbers are unique and formatted correctly
- [ ] ✅ Customer can view order history
- [ ] ✅ Customer can view order details
- [ ] ✅ Vendor can view incoming orders
- [ ] ✅ Vendor can update order status
- [ ] ✅ Status updates are reflected immediately
- [ ] ✅ Price calculations are correct (product + 5% fee)
- [ ] ✅ All data persists in Supabase

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue:** "Please login to continue"
**Fix:** Make sure you're logged in. Check auth status in browser dev tools.

### **Issue:** "Product not found"
**Fix:** Verify product exists in database. Check `is_active = true`.

### **Issue:** Orders not appearing in vendor dashboard
**Fix:** Make sure vendor's company_id matches the product's company_id in database.

### **Issue:** Price showing as large number (45900 instead of $459.00)
**Fix:** Prices are stored in cents. Divide by 100 and format: `(price / 100).toFixed(2)`

### **Issue:** RLS policy preventing access
**Fix:** Check RLS policies in Supabase. Buyer should only see their own orders.

---

## 📝 **TEST RESULTS TEMPLATE**

Copy this to track your testing:

```markdown
## Test Results - [Your Name] - [Date]

### Flow 1: Customer Purchase
- [ ] Signup: ✅ / ❌
- [ ] Browse marketplace: ✅ / ❌
- [ ] View product: ✅ / ❌
- [ ] Checkout: ✅ / ❌
- [ ] Order confirmation: ✅ / ❌
- [ ] View orders: ✅ / ❌

### Flow 2: Vendor Management
- [ ] Vendor signup: ✅ / ❌
- [ ] View incoming orders: ✅ / ❌
- [ ] Update order status: ✅ / ❌

### Edge Cases
- [ ] Not logged in: ✅ / ❌
- [ ] Invalid product: ✅ / ❌
- [ ] Missing shipping info: ✅ / ❌
- [ ] Multiple orders: ✅ / ❌

### Database Verification
- [ ] Orders created: ✅ / ❌
- [ ] Data accurate: ✅ / ❌

**Notes:**
[Add any issues or observations here]
```

---

## 🚀 **NEXT STEPS**

After all tests pass:

1. ✅ **Order management working** → Document any issues
2. 🔜 **Add Stripe Integration** → Real payment processing
3. 🔜 **Add Email Notifications** → Order confirmations, status updates
4. 🔜 **Add Messaging System** → Buyer ↔ Vendor communication

---

## 📞 **NEED HELP?**

If you encounter issues:
1. Check browser console for errors (F12)
2. Check Supabase logs in dashboard
3. Verify database data with SQL queries above
4. Check that all tables and RLS policies are set up correctly

---

**Last Updated:** February 25, 2026  
**Version:** 1.0  
**Status:** Ready for Testing
# 📋 SQL QUICK REFERENCE

## The 4 Files (Run in Order)

### 1️⃣ `000_reset_database.sql` (2 min)
```
⚠️ WARNING: DELETES ALL DATA
```
**What it does:** Drops all tables cleanly
**When to use:** Starting fresh, fixing schema errors
**Expected result:** Clean database

### 2️⃣ `001_create_tables.sql` (3 min)
**Creates 6 core tables:**
1. `profiles` - User accounts
2. `company_profiles` - Vendors (16 will be loaded)
3. `products` - Products/services (56 will be loaded)
4. `product_orders` - Purchase history
5. `stripe_connect_accounts` - Payment integration
6. `conversations/participants/messages` - Messaging system

**Key simplification:**
- ❌ REMOVED: portfolio_projects, team_members, company_messages, payment_intents, reviews, company_claims
- ✅ KEPT: Only essential marketplace tables
- ✅ FIXED: Single `is_verified` column (no confusion)

### 3️⃣ `002_enable_rls.sql` (5 min)
**Enables security:**
- Anyone can view profiles, companies, products
- Users can only edit their own data
- Buyers see their orders
- Sellers see their orders
- Only participants see messages
- Only owners see Stripe accounts

### 4️⃣ `003_seed_vendors.sql` (10 min)
**Loads test data:**

**Part 1 - Emergency Vendors (Dallas, TX):**
1. ABC Motor Supply - Motors & drives (4 products)
2. Industrial Parts Co - Motors & automation (3 products)
3. Texas Equipment Supply - Power transmission (2 products)
4. Dallas Pump & Supply - Pumps & repair (3 products)
5. Industrial Valve Solutions - Valves (3 products)
6. Dallas HVAC Wholesale - HVAC equipment (3 products)
7. Texas Climate Control Parts - HVAC parts (3 products)
8. DFW Electrical Supply - Electrical components (3 products)
9. Industrial Controls & Drives - PLCs & automation (3 products)
10. *(1 placeholder vendor)*

**Part 2 - Real Company Profiles:**
11. Minco (Minneapolis) - Thermal sensors (3 products)
12. PEKO Precision (Rochester) - CNC machining (3 products)
13. IDS Engineering (Dallas) - Civil engineering (4 products)
14. SmartFlow USA (Pittsburgh) - Flow meters w/ McMaster-level specs (4 products)
15. Henderson Engineers (Kansas) - MEP/Code consulting (4 products)
16. Fishbeck (Grand Rapids) - Water systems (4 products)

**Total:** 16 vendors, 56 products, $55-$8,500 range

---

## Quick Copy-Paste Commands

**Check if tables exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Verify data loaded:**
```sql
-- Should be 16
SELECT COUNT(*) as companies FROM public.company_profiles;

-- Should be 56
SELECT COUNT(*) as products FROM public.products WHERE is_active = true;

-- Check price range ($55 to $8,500)
SELECT 
    MIN(price)/100.0 as min_dollars,
    MAX(price)/100.0 as max_dollars
FROM public.products;

-- View all companies
SELECT company_name, city, state 
FROM public.company_profiles 
ORDER BY state, city;

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

**Emergency reset (if something goes wrong):**
```sql
-- Start over from scratch
-- Run these 4 files in order:
-- 1. 000_reset_database.sql
-- 2. 001_create_tables.sql
-- 3. 002_enable_rls.sql
-- 4. 003_seed_vendors.sql
```

---

## Troubleshooting

### ❌ "relation already exists"
**Fix:** Run `000_reset_database.sql` first

### ❌ "column does not exist" 
**Fix:** You skipped a file. Start over with 000_reset.

### ❌ "permission denied"
**Fix:** Check RLS policies in 002_enable_rls.sql

### ❌ No data showing
**Check:**
```sql
SELECT COUNT(*) FROM company_profiles;  -- Expect 16
SELECT COUNT(*) FROM products;          -- Expect 56
```
If 0, re-run `003_seed_vendors.sql`

---

## What's Different from Before?

### ❌ OLD (Complex):
- 9 migration files
- 13 tables
- Column name conflicts (`verified` vs `is_verified`)
- 510-line migration files
- Portfolio projects, reviews, claims

### ✅ NEW (Simple):
- 4 clean files
- 6 core tables only
- Consistent naming (`is_verified`)
- Clear separation of concerns
- Focus on marketplace essentials

---

## Database Schema Overview

```
profiles
├── id (UUID, primary key)
├── email
├── full_name
├── user_type (customer/vendor)
└── created_at

company_profiles
├── id (UUID, primary key)
├── owner_id → profiles.id
├── company_name
├── description
├── contact info (email, phone, website, address)
├── specialties (array)
├── certifications (array)
├── is_verified (boolean)
└── is_claimed (boolean)

products
├── id (UUID, primary key)
├── company_id → company_profiles.id
├── name
├── description
├── price (BIGINT cents)
├── category
├── delivery_time_days
├── is_active (boolean)
└── requires_consultation (boolean)

product_orders
├── id (UUID, primary key)
├── order_number
├── product_id → products.id
├── company_id → company_profiles.id
├── buyer_id → profiles.id
├── product_name
├── product_price (BIGINT cents)
├── platform_fee (BIGINT cents)
├── total_amount (BIGINT cents)
├── status (pending/completed/cancelled)
└── created_at

stripe_connect_accounts
├── id (UUID, primary key)
├── company_id → company_profiles.id
├── stripe_account_id
├── charges_enabled
└── payouts_enabled

conversations/participants/messages
└── (Standard messaging schema)
```

---

## Next Steps After Setup

1. ✅ Database reset & loaded (you're here)
2. Test marketplace display
3. Stripe Connect integration
4. Test purchase flow
5. Start vendor recruitment

**Full guide:** See `DATABASE_SETUP.md`
# ✅ SQL Structure - Individual Table Files

## What Changed

You asked for **individual table files** instead of one big combined file. Done! ✅

---

## 📁 New Structure

```
/sql/
├── 000_reset_database.sql          ← Reset everything
├── 001_create_all_tables.sql       ← Master file (all tables)
├── 002_enable_rls.sql              ← Security policies
├── 003_seed_vendors.sql            ← Load 16 vendors + 56 products
│
└── tables/                         ← ⭐ NEW: Individual table files
    ├── README.md                   ← Documentation
    ├── 001_profiles.sql            ← User accounts
    ├── 002_company_profiles.sql    ← Vendor companies
    ├── 003_products.sql            ← Products/services
    ├── 004_product_orders.sql      ← Purchase orders
    ├── 005_stripe_connect_accounts.sql ← Payment integration
    ├── 006_conversations.sql       ← Message threads
    ├── 007_conversation_participants.sql ← Conversation members
    └── 008_messages.sql            ← Individual messages
```

---

## 🎯 8 Tables Created

### Core Marketplace:
1. **profiles** - User accounts
2. **company_profiles** - Vendor companies (16 ready to load)
3. **products** - Products/services (56 ready to load)
4. **product_orders** - Purchases & transactions

### Integrations:
5. **stripe_connect_accounts** - Payment accounts

### Messaging System:
6. **conversations** - Message threads (with product/order context)
7. **conversation_participants** - Who's in each conversation
8. **messages** - Individual messages (with attachments, unread counts)

---

## 🚀 Two Ways to Use

### Option 1: Run Master File (Easiest)
Perfect for initial setup or complete rebuild:

```sql
-- In Supabase SQL Editor:
sql/001_create_all_tables.sql
```

This creates **all 8 tables at once**.

### Option 2: Run Individual Files (Flexible)
Perfect for modifying one table or debugging:

```sql
-- Run in order:
sql/tables/001_profiles.sql
sql/tables/002_company_profiles.sql
sql/tables/003_products.sql
sql/tables/004_product_orders.sql
sql/tables/005_stripe_connect_accounts.sql
sql/tables/006_conversations.sql
sql/tables/007_conversation_participants.sql
sql/tables/008_messages.sql
```

---

## ✨ Benefits

### Why Individual Files?

| Benefit | Example |
|---------|---------|
| **Easy to find** | Need to see products table? Open `003_products.sql` |
| **Easy to modify** | Want to add a column to products? Edit just that file |
| **Easy to understand** | Each file is 15-40 lines, not 200+ |
| **Easy to debug** | Problem with orders? Focus on `004_product_orders.sql` |
| **Easy to review** | See exactly what changed in git diffs |

### Real-World Use Cases:

**Scenario 1: Add a field to products**
```sql
-- Before: Edit 200-line file, find the right section
-- After: Edit 003_products.sql (20 lines total)
```

**Scenario 2: Rebuild just the messaging system**
```sql
-- Drop old tables
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Run individual files
sql/tables/006_conversations.sql
sql/tables/007_conversation_participants.sql
sql/tables/008_messages.sql
```

**Scenario 3: Review changes in pull request**
```
Modified: sql/tables/003_products.sql
+ Added: image_url TEXT column
```
Clear and focused!

---

## 📋 Complete Setup (30 minutes)

```sql
-- Step 1: Reset (2 min)
sql/000_reset_database.sql

-- Step 2: Create tables (3 min)
sql/001_create_all_tables.sql
-- OR run files in sql/tables/ one by one

-- Step 3: Security (5 min)
sql/002_enable_rls.sql

-- Step 4: Load data (10 min)
sql/003_seed_vendors.sql

-- Step 5: Verify (5 min)
SELECT COUNT(*) FROM company_profiles;  -- Expect 16
SELECT COUNT(*) FROM products;          -- Expect 56
```

**Test marketplace:** http://localhost:3000/marketplace

---

## 🔍 What's in Each File

### 001_profiles.sql (30 lines)
- User accounts table
- Auto-create function on signup
- Trigger for Supabase Auth integration
- Performance index

### 002_company_profiles.sql (25 lines)
- Vendor company details
- Contact info, specialties, certifications
- Verification and claim status
- 3 indexes for fast lookups

### 003_products.sql (20 lines)
- Products/services table
- Price in cents (BIGINT)
- Category, delivery time, active status
- 4 indexes (company, active, category, price)

### 004_product_orders.sql (30 lines)
- Purchase orders
- Links buyer, vendor, product
- Stripe payment tracking
- Status management
- 4 indexes for fast queries

### 005_stripe_connect_accounts.sql (15 lines)
- Stripe Connect integration
- One account per company
- Verification status tracking
- Company index

### 006_conversations.sql (25 lines)
- Message threads
- Optional product/order context
- Status tracking (active/archived/resolved)
- 5 indexes for fast lookups

### 007_conversation_participants.sql (20 lines)
- Links users to conversations
- Read status tracking
- Mute preferences
- Prevents duplicates
- 2 indexes

### 008_messages.sql (65 lines)
- Individual messages
- Attachment support (JSONB)
- System message flag
- **Includes functions:**
  - Auto-update conversation timestamp
  - Get unread message counts
- 3 indexes

---

## 📚 Documentation

Each component has its own docs:

- **`sql/tables/README.md`** - Detailed table documentation
- **`DATABASE_SETUP.md`** - Complete setup guide (updated)
- **`SQL_QUICK_REFERENCE.md`** - Common queries
- **`DATABASE_SIMPLIFIED.md`** - Overview

---

## 🎉 You're Ready!

### What you have now:
✅ Clean, organized SQL structure  
✅ Individual files for each table  
✅ Master file for easy setup  
✅ Complete documentation  
✅ 16 vendors + 56 products ready to load  
✅ Enhanced messaging system  

### Next steps:
1. **Run the setup** - Follow `DATABASE_SETUP.md`
2. **Load vendors** - 16 companies, 56 products
3. **Test marketplace** - http://localhost:3000/marketplace
4. **Integrate Stripe** - Connect payment system
5. **Start recruiting** - Supply-first strategy!

**Files are in:**
- `/sql/tables/` - Individual table files
- `/sql/001_create_all_tables.sql` - Master file
- `/sql/000_reset_database.sql` - Reset script
- `/sql/002_enable_rls.sql` - Security policies
- `/sql/003_seed_vendors.sql` - Vendor data

---

## 🤝 Enhanced Messaging Features

Your messaging system now includes:

### Core Features:
- ✅ Threaded conversations
- ✅ Multiple participants per conversation
- ✅ Read/unread tracking per user
- ✅ Mute notifications
- ✅ Message attachments (JSONB)
- ✅ System messages (automated)
- ✅ Edit tracking

### Context Linking:
- 💬 Link conversations to products
- 💬 Link conversations to orders
- 💬 Link conversations to companies
- 💬 Track conversation status

### Smart Functions:
- 📊 Auto-update last_message_at
- 📊 Get unread counts per conversation
- 📊 Performance indexes on all queries

### Use Cases:
1. **Product inquiries** - Customer asks vendor about product
2. **Order communication** - Discuss delivery, issues, feedback
3. **Quote discussions** - Photo-to-quote back-and-forth
4. **Support tickets** - General platform support
5. **System notifications** - "Order placed", "Quote received"

---

**Everything is ready to go!** 🚀
