# Precision Project Flow - Engineering Marketplace

A professional B2B marketplace connecting businesses with verified engineering companies across all disciplines.

**Status:** 85% Complete | **Launch Date:** February 28, 2026 | **Version:** 1.0-beta

## 🎯 What We've Built

### ✅ Core Platform (85% Complete)
- **10 Major Companies** - Bechtel, AECOM, Fluor, Jacobs, KBR, Black & Veatch, HDR, Parsons, WSP, Wood
- **34 Professional Services** - $5K to $120K engineering services ready to purchase
- **Company Claims System** - Companies can claim and manage their profiles
- **User Authentication** - Secure signup/login with Supabase (client & engineer roles)
- **User-to-User Messaging** - Direct communication between any users
- **Product Marketplace** - Search, filter, and browse engineering services
- **Company Profiles** - Complete company management system
- **Admin Tools** - Claim review and platform management

### 🔨 In Development (15% Remaining)
- **Payment Processing** - Stripe Connect integration (Week 1)
- **Order Management** - Complete fulfillment workflow (Week 2)
- **Email Notifications** - Automated emails via Resend (Week 3)
- **Production Deployment** - Final testing and launch (Week 3)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod

## 📦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/aMarketology/PPF---PrecisionProjectFlow.git
cd PPF---PrecisionProjectFlow
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

Run the migrations in your Supabase SQL Editor:
```bash
supabase/migrations/*.sql
```

## 📝 Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key

## 🚢 Deployment

The app is optimized for deployment on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aMarketology/PPF---PrecisionProjectFlow)

Make sure to add all environment variables in your deployment settings.

## 📄 License

This project is proprietary and confidential.

## 🤝 Support

For support, email support@precisionprojectflow.com
