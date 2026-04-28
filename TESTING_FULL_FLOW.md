# 🧪 COMPLETE APPLICATION FLOW TESTING GUIDE

**Date:** February 26, 2026  
**Goal:** Test end-to-end vendor signup → product listing → customer purchase

---

## ⚠️ IMPORTANT: Switch to Test Mode

**Current Status:** Using LIVE Stripe keys ❌  
**Action Needed:** Switch to TEST keys for safe testing

### Get Test Keys:
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Test Mode** keys (they start with `sk_test_` and `pk_test_`)
3. Update `.env.local`:

```env
# Replace LIVE keys with TEST keys:
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY_HERE
```

---

## 🎯 TESTING FLOW OVERVIEW

### **Phase 1: Vendor Setup** (15 min)
1. Sign up as vendor (engineer account)
2. Create company profile
3. Connect Stripe account
4. List a product

### **Phase 2: Customer Purchase** (10 min)
1. Sign up as customer (client account)
2. Browse marketplace
3. Find vendor's product
4. Complete purchase with test card
5. Verify order created

### **Phase 3: Verification** (5 min)
1. Check Stripe Dashboard
2. Verify platform fee (10%)
3. Check database records
4. Confirm order status

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### **SETUP: Start Development Server**

```bash
# 1. Start the dev server
npm run dev

# 2. Open in browser
open http://localhost:3000
```

---

### **PHASE 1: CREATE VENDOR ACCOUNT** 👷

#### **Step 1.1: Sign Up as Vendor** (3 min)
1. Go to: http://localhost:3000/get-started
2. Click **"I'm an Engineer/Company"**
3. Fill out form:
   - Email: `vendor1@test.com`
   - Password: `TestPassword123!`
   - Account Type: **Engineer**
4. Click **Sign Up**
5. ✅ Should redirect to `/dashboard` or `/profile`

#### **Step 1.2: Create Company Profile** (3 min)
1. You'll be prompted to create a company profile (Step 2.5)
2. Fill out company details:
   - Company Name: `Test Engineering Co`
   - Description: `Precision engineering services for testing`
   - Industry: `Manufacturing`
   - Location: `Dallas, TX`
   - Website: `https://test-eng.com`
3. Click **Create Company**
4. ✅ Should save and redirect to settings or dashboard

#### **Step 1.3: Connect Stripe Account** (5 min)
1. Navigate to: http://localhost:3000/settings/payments
2. Click **"Connect with Stripe"** button
3. **Stripe Onboarding Flow:**
   - Use test data (any business name, address)
   - Phone: Use any format (e.g., +1 555-123-4567)
   - DOB: Any date (e.g., 01/01/1990)
   - SSN (TEST MODE): Use `000-00-0000`
   - Bank Account: Use test routing `110000000`, account `000123456789`
4. Complete onboarding
5. Return to platform
6. ✅ Should see "Charges Enabled" and "Payouts Enabled" both ✓

#### **Step 1.4: List a Product** (4 min)
1. Navigate to: http://localhost:3000/products
2. Click **"Add New Product"** or **"List Product"**
3. Fill out product form:
   - Name: `Custom CNC Machining Service`
   - Description: `High-precision CNC machining for complex parts`
   - Price: `2500` (will be $25.00 - stored as cents in DB)
   - Currency: `USD`
   - Category: `Manufacturing`
   - Add specs/images if desired
4. Click **"Publish Product"** or **"Save"**
5. ✅ Product should appear in your products list
6. ✅ Product should be live on marketplace

---

### **PHASE 2: CREATE CUSTOMER & PURCHASE** 🛒

#### **Step 2.1: Sign Out & Sign Up as Customer** (2 min)
1. Sign out of vendor account
2. Go to: http://localhost:3000/get-started
3. Click **"I'm a Client"**
4. Fill out form:
   - Email: `customer1@test.com`
   - Password: `TestPassword123!`
   - Account Type: **Client**
5. Click **Sign Up**
6. ✅ Should redirect to client dashboard

#### **Step 2.2: Browse Marketplace** (2 min)
1. Go to: http://localhost:3000/marketplace
2. Search for your vendor's product
3. Click on **"Custom CNC Machining Service"**
4. ✅ Should see product detail page
5. ✅ Should see vendor company name
6. ✅ Should see **"Buy Now - $25.00"** button

#### **Step 2.3: Purchase Product** (6 min)
1. Click **"Buy Now"** button
2. Should redirect to: `/checkout/[product-id]`
3. ✅ Should see order summary with product details
4. ✅ Should see Stripe payment form

5. **Fill Payment Details (TEST CARDS):**
   - **Card Number:** `4242 4242 4242 4242` (Success)
   - **Expiry:** Any future date (e.g., `12/28`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **ZIP:** Any 5 digits (e.g., `12345`)

6. Click **"Complete Purchase"** or **"Pay Now"**
7. ✅ Should process payment
8. ✅ Should redirect to `/checkout/success`
9. ✅ Should see success message with order details

---

### **PHASE 3: VERIFICATION** ✅

#### **Step 3.1: Check Stripe Dashboard** (2 min)
1. Go to: https://dashboard.stripe.com/test/payments
2. ✅ Should see payment for $25.00
3. Click on payment
4. ✅ Should see:
   - **Amount:** $25.00
   - **Application Fee:** $2.50 (10%)
   - **Transfer to Connect Account:** $22.50 (90%)
5. ✅ Status should be "Succeeded"

#### **Step 3.2: Check Database Records** (2 min)
1. Open Supabase Dashboard: https://vqmadoejowuyvdrisnyd.supabase.co
2. Go to **Table Editor**

**Check `payment_intents` table:**
```sql
SELECT * FROM payment_intents 
ORDER BY created_at DESC 
LIMIT 1;
```
✅ Should see record with:
- `amount`: 2500 (cents)
- `platform_fee`: 250 (10%)
- `status`: 'succeeded'

**Check `product_orders` table:**
```sql
SELECT * FROM product_orders 
ORDER BY created_at DESC 
LIMIT 1;
```
✅ Should see record with:
- `buyer_id`: customer's UUID
- `company_id`: vendor's company UUID
- `product_id`: product UUID
- `total_amount`: 2500 (cents)
- `status`: 'paid' or 'processing'

#### **Step 3.3: Check Vendor Dashboard** (1 min)
1. Sign back in as vendor (`vendor1@test.com`)
2. Go to: http://localhost:3000/orders/sales (or wherever sales dashboard is)
3. ✅ Should see new order
4. ✅ Should see order details and buyer info

---

## 🧪 TEST CARD NUMBERS

Use these Stripe test cards for different scenarios:

| Scenario | Card Number | Result |
|----------|------------|--------|
| ✅ **Success** | `4242 4242 4242 4242` | Payment succeeds |
| ❌ **Decline** | `4000 0000 0000 0002` | Card declined |
| 🔒 **3D Secure** | `4000 0025 0000 3155` | Requires authentication |
| 💳 **Insufficient Funds** | `4000 0000 0000 9995` | Insufficient funds error |

**For all test cards:**
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

---

## 🚨 TROUBLESHOOTING

### **Issue: "Company has not connected their Stripe account"**
- **Solution:** Complete Step 1.3 (Stripe Connect onboarding)
- Verify in `/settings/payments` that both "Charges Enabled" and "Payouts Enabled" are ✓

### **Issue: Payment fails with "API key error"**
- **Solution:** Verify `.env.local` has correct Stripe keys
- Restart dev server: `npm run dev`

### **Issue: "Product not found"**
- **Solution:** 
  - Check product is `is_active = true`
  - Verify product has `company_id` set correctly
  - Check in Supabase: `SELECT * FROM products WHERE is_active = true;`

### **Issue: Redirect loops or auth errors**
- **Solution:**
  - Clear browser cookies/localStorage
  - Sign out and sign back in
  - Try incognito/private browsing mode

### **Issue: Stripe Connect onboarding fails**
- **Solution:**
  - Use test data (SSN: `000-00-0000`)
  - Use test bank routing: `110000000`
  - Ensure using TEST mode keys

---

## 📊 SUCCESS CRITERIA

### ✅ **Vendor Flow Complete When:**
- [x] Vendor account created
- [x] Company profile created
- [x] Stripe Connect account linked
- [x] Charges & payouts enabled
- [x] Product listed and visible

### ✅ **Customer Flow Complete When:**
- [x] Customer account created
- [x] Product found in marketplace
- [x] Checkout initiated
- [x] Payment processed successfully
- [x] Redirected to success page

### ✅ **System Verification Complete When:**
- [x] Payment appears in Stripe Dashboard
- [x] Platform fee (10%) calculated correctly
- [x] Vendor receives 90% payout
- [x] `payment_intents` record created
- [x] `product_orders` record created
- [x] Order visible in vendor dashboard

---

## 🎯 NEXT STEPS AFTER SUCCESSFUL TEST

### **1. Create Order Management Dashboard**
Build pages for:
- Vendor: View incoming orders, update status
- Customer: View order history, track orders
- Admin: Monitor all transactions

### **2. Implement Webhooks**
Handle Stripe events:
- `payment_intent.succeeded` → Update order to "paid"
- `payment_intent.payment_failed` → Mark order as "failed"
- `account.updated` → Update Connect account status

### **3. Add Email Notifications**
Send emails on:
- Order placed (to vendor & customer)
- Payment succeeded
- Order status updates

### **4. Enhance Order Workflow**
Add statuses:
- `pending` → `paid` → `processing` → `shipped` → `completed`
- Allow vendors to update order status
- Allow customers to track orders

---

## 📝 TEST RESULTS LOG

**Date:** _______________  
**Tester:** _______________

| Test Phase | Status | Notes |
|------------|--------|-------|
| Vendor Signup | ⬜ Pass / ⬜ Fail | |
| Company Profile | ⬜ Pass / ⬜ Fail | |
| Stripe Connect | ⬜ Pass / ⬜ Fail | |
| Product Listing | ⬜ Pass / ⬜ Fail | |
| Customer Signup | ⬜ Pass / ⬜ Fail | |
| Product Search | ⬜ Pass / ⬜ Fail | |
| Checkout Flow | ⬜ Pass / ⬜ Fail | |
| Payment Success | ⬜ Pass / ⬜ Fail | |
| Stripe Dashboard | ⬜ Pass / ⬜ Fail | |
| Database Records | ⬜ Pass / ⬜ Fail | |

**Issues Found:**
- 
- 
- 

**Overall Result:** ⬜ PASS / ⬜ FAIL

---

## 🚀 QUICK START COMMANDS

```bash
# 1. Ensure dependencies installed
npm install

# 2. Verify Stripe keys are TEST mode
cat .env.local | grep STRIPE

# 3. Start dev server
npm run dev

# 4. Open application
open http://localhost:3000

# 5. Start testing!
```

---

**Happy Testing! 🎉**

*Last Updated: February 26, 2026*
