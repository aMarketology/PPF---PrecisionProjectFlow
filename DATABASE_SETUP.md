# 🚀 DATABASE RESET & SETUP GUIDE

## Quick Setup (30 minutes)

You have **4 SQL files** ready to run in order:

```
/sql/
  000_reset_database.sql    ← Clean slate
  001_create_tables.sql     ← 6 core tables only
  002_enable_rls.sql        ← Security policies
  003_seed_vendors.sql      ← 16 vendors, 56 products
```

---

## Step 1: Reset Database (2 min)

**⚠️ WARNING: This deletes ALL existing data!**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `sql/000_reset_database.sql`
3. Paste and run

**Expected result:** All tables dropped cleanly

---

## Step 2: Create Tables (3 min)

**Two options:**

### Option A: All at Once (Recommended)
1. Copy contents of `sql/001_create_all_tables.sql`
2. Paste in SQL Editor and run

### Option B: One at a Time
Run each file in `sql/tables/` in order:
1. `001_profiles.sql`
2. `002_company_profiles.sql`
3. `003_products.sql`
4. `004_product_orders.sql`
5. `005_stripe_connect_accounts.sql`
6. `006_conversations.sql`
7. `007_conversation_participants.sql`
8. `008_messages.sql`

**Expected result:** 8 tables created:
- ✅ profiles
- ✅ company_profiles
- ✅ products
- ✅ product_orders
- ✅ stripe_connect_accounts
- ✅ conversations
- ✅ conversation_participants
- ✅ messages

**Verify:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

---

## Step 3: Enable Security (5 min)

1. Copy contents of `sql/002_enable_rls.sql`
2. Paste and run

**Expected result:** RLS enabled on all tables with policies

**Verify:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```
All should show `rowsecurity = true`

---

## Step 4: Load Vendors (10 min)

1. Copy contents of `sql/003_seed_vendors.sql`
2. Paste and run

**Expected result:** 16 companies + 56 products loaded

**Verify:**
```sql
-- Should return 16
SELECT COUNT(*) as companies FROM public.company_profiles;

-- Should return 56
SELECT COUNT(*) as products FROM public.products WHERE is_active = true;

-- Check price range
SELECT 
    MIN(price)/100.0 as min_dollars,
    MAX(price)/100.0 as max_dollars,
    COUNT(*) as total_products
FROM public.products;
```

**Expected output:**
```
companies: 16
products: 56
min_dollars: $55.00
max_dollars: $8,500.00
```

---

## Step 5: Test Marketplace (10 min)

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Visit marketplace:**
   ```
   http://localhost:3000/marketplace
   ```

3. **Expected:**
   - ✅ 56 products displayed
   - ✅ Prices showing correctly (e.g., "$459.00" not "45900")
   - ✅ Categories: Motors & Drives, Pumps & Valves, HVAC, Electrical, etc.
   - ✅ Company names visible
   - ✅ Filter by category works

4. **Click on a product:**
   - Should navigate to `/profiles/[company_id]`
   - Company banner displays
   - Product list shows
   - Contact sidebar visible

---

## Troubleshooting

### ❌ "Column does not exist" error
**Solution:** You didn't run scripts in order. Start over with 000_reset.

### ❌ Prices showing as "45900" instead of "$459.00"
**Solution:** Check `app/marketplace/page.tsx` price display:
```typescript
// Should be:
${(product.price / 100).toFixed(2)}

// NOT:
${product.price}
```

### ❌ No products showing
**Check:**
```sql
SELECT COUNT(*) FROM products WHERE is_active = true;
```
If 0, re-run `003_seed_vendors.sql`

### ❌ "Table already exists" error
**Solution:** Run `000_reset_database.sql` first

---

## What You Just Built

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
