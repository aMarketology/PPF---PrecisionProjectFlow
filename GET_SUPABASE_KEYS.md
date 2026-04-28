# 🔑 GET YOUR SUPABASE API KEYS

Your project ID is: **ifrxzmemiihxfdimwvcw**

---

## 📋 HOW TO GET THE CORRECT KEYS

### **Step 1: Go to Supabase Dashboard**
Visit: https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/settings/api

### **Step 2: Copy These Keys**

You'll see a page with several keys. You need **TWO** of them:

#### **1. Project URL**
- Should look like: `https://ifrxzmemiihxfdimwvcw.supabase.co`
- Copy this entire URL

#### **2. anon public key** 
- Look for: **"anon" or "anon public"**
- It's a **LONG** JWT token starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...`
- This is safe to expose in the browser

#### **3. service_role key** (OPTIONAL for now)
- Look for: **"service_role" or "service_role secret"**
- Also a LONG JWT token starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...`
- ⚠️ **KEEP THIS SECRET** - Never expose in browser code

---

## 🎯 WHAT TO PROVIDE

Please copy and paste:

1. **Project URL** (starts with `https://ifrxzmemiihxfdimwvcw.supabase.co`)
2. **anon public key** (the very long JWT token under "anon")
3. **service_role key** (the very long JWT token under "service_role") - if available

---

## 📸 WHERE TO FIND THEM

In your Supabase dashboard:
- Click your project: **ifrxzmemiihxfdimwvcw**
- Go to: **Settings** (gear icon) → **API**
- You'll see:
  ```
  Project URL: https://ifrxzmemiihxfdimwvcw.supabase.co
  
  Project API keys:
  - anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
  - service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
  ```

---

## ⚠️ NOTE

The key you provided (`sb_publishable_2xumdcv5T5PD8R1OJ2Z_pQ_7rseD5UT`) looks like it might be from a different service or an older Supabase format. 

Current Supabase API keys are JWT tokens that look like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmcnh6bWVtaWloeGZkaW13dmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1MDAwMDAsImV4cCI6MjAyNTA3NjAwMH0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

**Please provide the correct keys and I'll update your `.env.local` file!**
