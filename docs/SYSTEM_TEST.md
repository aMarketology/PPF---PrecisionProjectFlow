# 🧪 PPF Full System Test

**Last updated:** May 29, 2026
**Environment:** Production — https://www.precisionprojectflow.com
**Stripe test card:** `4242 4242 4242 4242` · any future expiry · any CVC · any ZIP

> Run this top-to-bottom. Check each box as you go. If anything fails, note the
> step number and the observed behavior. This validates the full loop:
> **signup → list → discover → DM → tokens → quote → checkout → fulfillment.**

---

## ⚙️ Pre-Flight (one-time setup)

- [ ] **Run the token ledger migration**
  Open [Supabase SQL Editor](https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new)
  and run the entire contents of `supabase/PROJECTFLOW_TOKENS.sql`.
  Expected: `Success. No rows returned`.

- [ ] **Verify the ledger objects exist**
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'token_transactions';
  -- expect 1 row

  SELECT routine_name FROM information_schema.routines
  WHERE routine_name IN ('add_tokens','spend_tokens','refund_tokens');
  -- expect 3 rows
  ```

- [ ] **Confirm Railway env vars are present** (Settings → Variables): all 8 keys set.

---

## 1️⃣ Auth & Onboarding

### 1a. Engineer signup
- [ ] Go to `/signup`, choose **"I'm an engineer/vendor"**
- [ ] Complete Step 1 (name, email, password) — password strength meter works
- [ ] Complete Step 2 (company, category, location, bio, specialty chips)
- [ ] Redirects to `/dashboard/engineer`
- [ ] Welcome email arrives (check inbox / Resend logs)

### 1b. Client signup (use a different browser / incognito)
- [ ] Go to `/signup`, choose **"I'm a client"**
- [ ] Complete both steps → redirects to `/dashboard/client`
- [ ] Welcome email arrives

---

## 2️⃣ Engineer Lists a Service

- [ ] As the engineer, go to `/services/create`
- [ ] Fill title, description, category, price, delivery time, service area
- [ ] Add at least one certification chip + tag
- [ ] Save → redirects to dashboard, new service appears under **Services** tab
- [ ] **Edit:** click the pencil → change the price → save → price updates
- [ ] Visit `/marketplace` (logged out or as client) → the new service is visible
- [ ] Visit the category page (e.g. `/marketplace/structural-engineering`) → service appears there too

---

## 3️⃣ Discovery

- [ ] `/marketplace` shows all active services (no "0 listings")
- [ ] Search by keyword filters results
- [ ] Category filter works
- [ ] `/profiles` shows the engineer in the directory
- [ ] `/profiles/[id]` opens the engineer's public profile with the **Message** button

---

## 4️⃣ Messaging + $ProjectFlow Tokens  ⭐ (focus area)

### 4a. First message is FREE
- [ ] As the **client**, open the engineer profile → click **Message**
- [ ] Lands on `/messages` with the conversation open
- [ ] Send the first message → **sends free**, no paywall
- [ ] Engineer receives a "new message" email
- [ ] **Ledger check (SQL):**
  ```sql
  SELECT type, amount, balance_after, description
  FROM token_transactions
  WHERE user_id = '<client_user_id>'
  ORDER BY created_at DESC LIMIT 5;
  -- expect: NO 'spend' row yet (first message was free)
  ```

### 4b. Second message hits the paywall
- [ ] Client types a second message → button shows **"Send · 2 tokens"**
- [ ] Amber notice shows: *"Your first message was free. Each additional message costs 2 tokens…"*
- [ ] If balance is 0 → clicking send opens the **Buy Tokens** modal (HTTP 402 handled)

### 4c. Buy a token pack
- [ ] In the paywall modal, choose the **Starter** pack (10 tokens / $10)
- [ ] Pay with `4242 4242 4242 4242`
- [ ] Payment succeeds → balance updates to **10** in the UI
- [ ] **Ledger check:**
  ```sql
  SELECT type, amount, balance_after, stripe_payment_id
  FROM token_transactions
  WHERE user_id = '<client_user_id>' AND type = 'purchase'
  ORDER BY created_at DESC LIMIT 1;
  -- expect: amount = +10, balance_after = 10
  ```

### 4d. Spending tokens
- [ ] The pending second message now sends automatically after purchase
- [ ] Balance drops to **8** (2 tokens spent)
- [ ] **Ledger check:**
  ```sql
  SELECT type, amount, balance_after, reference_id
  FROM token_transactions
  WHERE user_id = '<client_user_id>' AND type = 'spend'
  ORDER BY created_at DESC LIMIT 1;
  -- expect: amount = -2, balance_after = 8, reference_id = conversation id
  ```

### 4e. Idempotency (no double-credit)
- [ ] In Stripe Dashboard → Webhooks → resend the `payment_intent.succeeded` event
      for the token purchase
- [ ] **Ledger check:** balance is STILL 8 — no duplicate `purchase` row
  ```sql
  SELECT COUNT(*) FROM token_transactions
  WHERE stripe_payment_id = '<the_payment_intent_id>';
  -- expect: 1  (not 2)
  ```

### 4f. Token account summary view
- [ ] ```sql
  SELECT * FROM token_account_summary WHERE user_id = '<client_user_id>';
  -- expect: current_balance = 8, lifetime_credited = 10, lifetime_spent = 2
  ```

---

## 5️⃣ Checkout & Orders

- [ ] As the client, open a service → **checkout** at `/checkout/service/[id]`
- [ ] Pay with the test card → redirect to `/checkout/success`
- [ ] **Vendor** receives "new order" email
- [ ] **Client** receives "order confirmation" email
- [ ] Order appears in client dashboard **Orders** tab
- [ ] Order appears in engineer dashboard **Orders** tab (as a sale)

### 5a. Order status → email
- [ ] As engineer, change order status to **in_progress** → client gets status email
- [ ] Change to **delivered** → client gets status email
- [ ] Change to **completed** → client gets status email

---

## 6️⃣ RFQ Flow

- [ ] As client, go to `/rfq/create` → complete the multi-step form → submit
- [ ] RFQ saved → appears in client dashboard **My RFQs**
- [ ] RFQ appears in engineer dashboard **Open RFQs** tab

---

## 7️⃣ Mobile App

- [ ] Open the published mobile app
- [ ] Log in with the client account
- [ ] Feed loads, Marketplace loads (services visible)
- [ ] Open a service detail → engineer info shows
- [ ] Messages tab loads existing conversations
- [ ] Profile tab shows the logged-in user

---

## 8️⃣ SEO / Infra Smoke Test

- [ ] `https://www.precisionprojectflow.com/sitemap.xml` lists services + profiles
- [ ] `https://www.precisionprojectflow.com/robots.txt` returns rules + sitemap line
- [ ] All 6 category pages load with listings + FAQ
- [ ] View page source on a category page → `application/ld+json` schema present

---

## 🐞 Issue Log

| Step | Expected | Observed | Severity | Fixed? |
|------|----------|----------|----------|--------|
|      |          |          |          |        |

---

## ✅ Sign-off

- [ ] All critical paths pass
- [ ] Token ledger balances reconcile (`token_account_summary` matches `profiles.token_balance`)
- [ ] No payment results in a missing token credit
- [ ] No message charge without a delivered message

**Tested by:** _______________  **Date:** _______________
