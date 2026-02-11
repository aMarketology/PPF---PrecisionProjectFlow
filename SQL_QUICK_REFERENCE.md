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
