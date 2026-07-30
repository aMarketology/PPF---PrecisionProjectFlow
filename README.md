# Precision Project Flow (PPF)

A B2B marketplace connecting engineers, vendors, and suppliers with clients for precision manufacturing and engineering services.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Stripe · Framer Motion

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_APP_URL=https://precisionprojectflow.com
```

### 3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Run a production build check
```bash
npm run build
```

---

## 🗄️ Database Setup

All SQL migrations live in `supabase/`. Run them in order in your Supabase SQL Editor:

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Core tables (profiles, services, orders) |
| `supabase/MESSAGING_TABLES.sql` | Conversations + messages |
| `supabase/MESSAGING_PAYWALL.sql` | Token balance RPCs |
| `supabase/FEED_AND_STORAGE.sql` | Feed + Storage bucket setup |
| `supabase/COMPLETE_SETUP.sql` | All-in-one setup script |

See `docs/DATABASE.md` for full schema reference.

---

## 👤 User Types

| Type | Description |
|------|-------------|
| `client` | Browses marketplace, sends RFQs, messages engineers |
| `engineer` | Lists services, receives leads, manages orders (also used for suppliers/vendors) |

---

## 📁 Project Structure

```
app/
├── api/              # API routes (messages, stripe, feed)
├── components/       # Shared components (Navigation, Footer, etc.)
├── dashboard/        # Client + Engineer dashboards
├── get-started/      # Onboarding pages (clients, vendors, suppliers)
├── marketplace/      # Service listings
├── messages/         # Messaging UI
├── profiles/         # Engineer/vendor profiles
├── rfq/              # RFQ landing + creation
└── settings/         # Profile + account settings
lib/
├── supabase/         # Browser + server Supabase clients
└── stripe/           # Stripe helpers
supabase/             # SQL migrations
docs/                 # Extended documentation
```

---

## 📚 Documentation

| File | Contents |
|------|---------|
| `docs/DATABASE.md` | Schema, tables, RLS, RPCs |
| `docs/SETUP.md` | Supabase + Stripe setup guides |
| `docs/DESIGN.md` | Brand colors, component conventions |
| `docs/FEATURES.md` | Feature list + required API keys |
| `docs/ROADMAP.md` | Next steps + integration plans |
| `docs/MOBILE.md` | Mobile app plan |
| `docs/MANIFESTO.md` | Product vision |
| `session.md` | Current session progress tracker |

---

## 🚢 Deployment

Optimized for [Vercel](https://vercel.com). Add all environment variables in your Vercel project settings before deploying.

---

## 📄 License

Proprietary and confidential. © Precision Project Flow.
