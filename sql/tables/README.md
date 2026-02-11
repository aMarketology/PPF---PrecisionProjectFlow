# SQL Tables - Individual Files

## 📁 Structure

Each database table has its own file for easy management:

```
/sql/
├── 000_reset_database.sql          ← Reset everything
├── 001_create_all_tables.sql       ← Create all tables (master file)
├── 002_enable_rls.sql              ← Security policies
├── 003_seed_vendors.sql            ← Load vendor data
│
└── tables/                         ← Individual table files
    ├── 001_profiles.sql
    ├── 002_company_profiles.sql
    ├── 003_products.sql
    ├── 004_product_orders.sql
    ├── 005_stripe_connect_accounts.sql
    ├── 006_conversations.sql
    ├── 007_conversation_participants.sql
    └── 008_messages.sql
```

---

## 🎯 Two Ways to Create Tables

### Option 1: All at Once (Recommended)
Run the master file that includes all tables:

```sql
-- Run in Supabase SQL Editor
sql/001_create_all_tables.sql
```

### Option 2: One at a Time
Run individual table files in order:

```sql
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

## 📋 Table Descriptions

### 1. **profiles** (`001_profiles.sql`)
- User accounts (customers & vendors)
- Auto-created when user signs up
- Links to Supabase Auth

### 2. **company_profiles** (`002_company_profiles.sql`)
- Vendor company information
- Contact details, specialties, certifications
- Tracks verification and claim status

### 3. **products** (`003_products.sql`)
- Products/services offered by vendors
- Prices stored in cents (BIGINT)
- Categories, delivery times, active status

### 4. **product_orders** (`004_product_orders.sql`)
- Purchase transactions
- Links buyers, vendors, and products
- Tracks payment status and Stripe integration

### 5. **stripe_connect_accounts** (`005_stripe_connect_accounts.sql`)
- Stripe Connect integration for vendor payments
- Tracks account verification status
- One account per company

### 6. **conversations** (`006_conversations.sql`)
- Message threads between users
- Can link to products/orders for context
- Tracks status (active/archived/resolved)

### 7. **conversation_participants** (`007_conversation_participants.sql`)
- Links users to conversations
- Tracks read status and mute preferences
- Prevents duplicate participants

### 8. **messages** (`008_messages.sql`)
- Individual messages within conversations
- Supports attachments (JSONB)
- Auto-updates conversation last_message_at
- Includes unread count function

---

## 🔧 Why Individual Files?

### Benefits:
✅ **Easy to find** - Each table in its own file  
✅ **Easy to modify** - Change one table without affecting others  
✅ **Easy to understand** - Clear, focused code  
✅ **Easy to review** - See exactly what each table does  
✅ **Easy to debug** - Run just the table you need  

### Use Cases:
- **Development:** Modify one table without running everything
- **Testing:** Test individual table creation
- **Debugging:** Isolate issues to specific tables
- **Learning:** Understand one table at a time

---

## 🚀 Complete Setup Flow

```sql
-- Step 1: Reset database (⚠️ deletes all data)
sql/000_reset_database.sql

-- Step 2: Create all tables
sql/001_create_all_tables.sql
-- OR run individual files in sql/tables/

-- Step 3: Enable security
sql/002_enable_rls.sql

-- Step 4: Load vendors
sql/003_seed_vendors.sql
```

---

## 📊 Table Dependencies

```
auth.users (Supabase Auth)
    ↓
profiles
    ↓
company_profiles
    ↓
├── products
│   ↓
│   product_orders
│
├── stripe_connect_accounts
│
└── conversations
    ↓
    ├── conversation_participants
    └── messages
```

**Key Points:**
- `profiles` depends on Supabase Auth users
- `company_profiles` depends on profiles
- `products` depends on company_profiles
- `conversations` can link to products/orders (optional)
- All messaging tables depend on conversations

---

## 🔍 Quick Verification

After creating tables, verify with:

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check table row counts
SELECT 
    'profiles' as table_name, COUNT(*) FROM profiles
UNION ALL
SELECT 'company_profiles', COUNT(*) FROM company_profiles
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'product_orders', COUNT(*) FROM product_orders
UNION ALL
SELECT 'stripe_connect_accounts', COUNT(*) FROM stripe_connect_accounts
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'conversation_participants', COUNT(*) FROM conversation_participants
UNION ALL
SELECT 'messages', COUNT(*) FROM messages;
```

---

## 🛠️ Modifying Tables

### To modify a single table:

1. **Drop the table:**
   ```sql
   DROP TABLE IF EXISTS public.products CASCADE;
   ```

2. **Run the table file:**
   ```sql
   -- Copy/paste from sql/tables/003_products.sql
   ```

3. **Re-enable RLS:**
   ```sql
   -- Run relevant section from 002_enable_rls.sql
   ```

### To rebuild everything:
```sql
sql/000_reset_database.sql
sql/001_create_all_tables.sql
sql/002_enable_rls.sql
sql/003_seed_vendors.sql
```

---

## 📚 Related Documentation

- `DATABASE_SETUP.md` - Complete setup guide
- `SQL_QUICK_REFERENCE.md` - Common queries
- `DATABASE_SIMPLIFIED.md` - Overview of changes

---

## ✨ Features

### Auto-created on signup:
- Profile created automatically when user signs up via Supabase Auth

### Messaging system:
- Full conversation threading
- Unread message counts
- Participant tracking
- System messages support

### Indexes:
- Performance indexes on all frequently queried columns
- Foreign key indexes for fast joins

### Functions:
- `handle_new_user()` - Auto-create profile
- `update_conversation_last_message()` - Track latest message
- `get_unread_count(user_uuid)` - Count unread messages per conversation
