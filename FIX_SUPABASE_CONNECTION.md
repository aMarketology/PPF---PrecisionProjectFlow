# 🚨 SUPABASE CONNECTION ERROR - SOLUTION

**Error:** `net::ERR_NAME_NOT_RESOLVED` when trying to signup  
**Cause:** Supabase project URL does not exist or was deleted  
**Current URL:** `https://vqmadoejowuyvdrisnyd.supabase.co`

---

## 🔍 DIAGNOSIS

DNS lookup shows: **NXDOMAIN** (domain does not exist)

This means the Supabase project either:
- Was deleted
- Was paused due to inactivity
- Never existed at this URL
- Needs to be recreated

---

## ✅ SOLUTION: CREATE NEW SUPABASE PROJECT

### **Option 1: Check Existing Project (Recommended)**

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/projects
   - Login with your account

2. **Check if project exists:**
   - Look for project with ref: `vqmadoejowuyvdrisnyd`
   - If it exists but is paused, **restore it**
   - If it doesn't exist, go to Option 2

### **Option 2: Create New Supabase Project**

1. **Create New Project:**
   - Go to: https://supabase.com/dashboard/projects
   - Click **"New Project"**
   - Project Name: `Precision Project Flow`
   - Database Password: Create a strong password (save it!)
   - Region: Choose closest to you (e.g., `us-east-1`)
   - Plan: Free (sufficient for testing)
   - Click **"Create new project"**

2. **Wait for Project Setup:**
   - Takes 1-2 minutes to provision

3. **Get New Credentials:**
   - Go to **Project Settings** → **API**
   - Copy these values:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon public key** (starts with `eyJhbG...`)
     - **service_role key** (starts with `eyJhbG...`) - keep secret!

4. **Update `.env.local`:**
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_NEW_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...YOUR_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...YOUR_SERVICE_KEY
   ```

5. **Run Database Setup:**
   ```bash
   # Go to SQL Editor in Supabase Dashboard
   # Run each file in order:
   
   # 1. Create tables
   # Copy/paste: /sql/001_create_all_tables.sql
   
   # 2. Enable security
   # Copy/paste: /sql/002_enable_rls.sql
   
   # 3. Load vendor data
   # Copy/paste: /sql/003_seed_vendors.sql
   ```

6. **Restart Dev Server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

---

## 🎯 QUICK FIX STEPS

```bash
# 1. Create new Supabase project at supabase.com
# 2. Get Project URL and API keys
# 3. Update .env.local with new credentials
# 4. Restart dev server
npm run dev
# 5. Try signup again
```

---

## 🔄 ALTERNATIVE: Use Supabase Local

If you want to develop offline:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Start local Supabase
supabase start

# This will give you local credentials:
# API URL: http://localhost:54321
# anon key: eyJhbG... (provided in output)
```

---

## 📝 AFTER FIXING

Once you have new Supabase credentials:

1. Update `.env.local`
2. Restart dev server
3. Run database migrations in SQL Editor
4. Test signup again at http://localhost:3000/get-started

---

## ⚠️ IMPORTANT

**This is NOT a code issue** - it's a network/infrastructure issue. Your application code is correct, but the Supabase backend is unreachable.

---

**Next Steps:**
1. Go to https://supabase.com/dashboard/projects
2. Create or restore project
3. Update credentials
4. Restart and test

*Created: February 26, 2026*
