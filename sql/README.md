# 📂 SQL FILES FOR SUPABASE

This folder contains all SQL files needed to set up the Precision Project Flow database in Supabase.

---

## 🗂️ FILE STRUCTURE

### Migration Files:

1. **`001_complete_migrations.sql`** ⭐ **START HERE**
   - Complete database schema (all migrations 001-009)
   - Creates all tables, policies, functions
   - Safe to run multiple times (uses `IF NOT EXISTS`)
   - **Run this FIRST before seed files**

### Seed Files:

2. **`002_seed_emergency_vendors.sql`**
   - 10 emergency response vendors (Dallas, TX)
   - 34 products (motors, pumps, HVAC, electrical)
   - Price range: $125 - $8,500
   - All vendors can be claimed later

3. **`003_seed_real_vendors.sql`**
   - 6 real company profiles
   - Minco, PEKO Precision, IDS Engineering, SmartFlow USA, Henderson Engineers, Fishbeck
   - 22 professional services & products
   - Price range: $55 - $4,250

---

## 🚀 QUICK START

### Step 1: Run Migrations (REQUIRED)

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in left sidebar

2. **Create New Query:**
   - Click "+ New query"

3. **Load Migration File:**
   - Open: `sql/001_complete_migrations.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **"Run"** button

4. **Verify Success:**
   ```sql
   -- Check tables were created:
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   
   -- Should see: profiles, company_profiles, products, etc.
   ```

### Step 2: Run Seed Files (OPTIONAL)

Only run these if you want pre-populated vendor data:

**Load Emergency Vendors:**
```sql
-- Open: sql/002_seed_emergency_vendors.sql
-- Copy contents → Paste → Run
```

**Load Real Vendor Profiles:**
```sql
-- Open: sql/003_seed_real_vendors.sql
-- Copy contents → Paste → Run
```

**Verify Data Loaded:**
```sql
-- Check companies:
SELECT company_name, city, state, is_verified
FROM company_profiles
ORDER BY created_at DESC;

-- Check products:
SELECT name, price / 100 as price_dollars, category
FROM products
ORDER BY created_at DESC;
```

---

## 📋 WHAT GETS CREATED

### Tables Created (001_complete_migrations.sql):

**User & Profile Tables:**
- `profiles` - User profiles (client/engineer)
- `company_profiles` - Company information
- `team_members` - Company team management
- `portfolio_projects` - Company portfolios

**Messaging Tables:**
- `company_messages` - Contact form messages
- `conversations` - User-to-user conversations
- `conversation_participants` - Conversation members
- `messages` - Chat messages

**Product & Payment Tables:**
- `products` - Services/products for sale
- `stripe_connect_accounts` - Vendor Stripe accounts
- `payment_intents` - Payment records
- `product_orders` - Order history

**Review & Claims:**
- `reviews` - Customer reviews
- `company_claims` - Company claim requests

### Security:

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Policies for secure data access
- ✅ Proper foreign key relationships
- ✅ Indexes for performance

---

## 🔧 TROUBLESHOOTING

### Error: "relation already exists"

**Solution:** Safe to ignore - means table already created. The migrations use `IF NOT EXISTS`.

### Error: "column does not exist"

**Solution:** You may have an older schema. Drop and recreate:

```sql
-- ⚠️ WARNING: This deletes all data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run: 001_complete_migrations.sql
```

### Error: "permission denied"

**Solution:** Make sure you're using the Supabase SQL Editor with your project admin credentials.

### Seed File Errors: "foreign key violation"

**Cause:** Migration file not run first.

**Solution:** Run `001_complete_migrations.sql` BEFORE any seed files.

---

## 📊 VENDOR DATA SUMMARY

After running all seed files:

**Total Companies:** 16
- Dallas Emergency Vendors: 10
- Real Company Profiles: 6

**Total Products:** 56
- Emergency Parts: 34
- Professional Services: 22

**Categories:**
- Motors & Drives
- Pumps & Valves
- HVAC
- Electrical
- Engineering Services
- Manufacturing Services

**Price Range:** $55 - $8,500

---

## 🔐 ENVIRONMENT VARIABLES

Your Supabase credentials are in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Never commit `.env.local` to git!** (Already in `.gitignore`)

---

## 📝 COLUMN NAME COMPATIBILITY

**Note:** The `company_profiles` table has BOTH `verified` and `is_verified` columns for compatibility:

- **`verified`** - Used by original migration
- **`is_verified`** - Used by seed files

Both columns work - they're kept in sync. This ensures:
- ✅ Old code using `verified` still works
- ✅ New seed files using `is_verified` work
- ✅ No breaking changes

---

## 🎯 NEXT STEPS AFTER LOADING

1. **Test Marketplace:**
   - Visit: http://localhost:3000/marketplace
   - Should see 56 products

2. **Test Vendor Profiles:**
   - Click any product → Click company name
   - Should go to: `/profiles/[company-id]`

3. **Set Up Stripe Connect:**
   - See: `LOAD_VENDORS_TEST_STRIPE.md`
   - Complete payment testing

4. **Start Vendor Outreach:**
   - Use loaded data as demo
   - Show working marketplace
   - Onboard real vendors

---

## 📚 RELATED DOCUMENTATION

- **`LOAD_VENDORS_TEST_STRIPE.md`** - Complete testing guide
- **`QUICK_START_VENDORS.md`** - Quick reference
- **`SUPPLY-FIRST-ROADMAP.md`** - 12-week execution plan
- **`VENDOR_CUSTOMER_TESTING_GUIDE.md`** - End-to-end testing

---

## 🆘 NEED HELP?

1. **Check Supabase Logs:**
   - Dashboard → Database → Logs

2. **Run Verification Queries:**
   ```sql
   -- Count tables:
   SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public';
   -- Should be ~15 tables
   
   -- Check RLS enabled:
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   -- All should have rowsecurity = true
   ```

3. **Re-run Migrations:**
   - Safe to run `001_complete_migrations.sql` multiple times
   - Uses `CREATE TABLE IF NOT EXISTS`
   - Won't duplicate data

---

**Last Updated:** February 11, 2026  
**Version:** 1.0
