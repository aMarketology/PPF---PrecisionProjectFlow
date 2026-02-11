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
