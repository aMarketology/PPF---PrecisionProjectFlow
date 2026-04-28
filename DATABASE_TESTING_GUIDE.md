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
