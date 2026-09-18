# 🎨 Precision Project Flow — Branding Guide

> **Version 1.0** — Last updated: August 2026

---

## 📖 Table of Contents

1. [Brand Philosophy](#-brand-philosophy)
2. [Color System](#-color-system)
3. [Typography](#-typography)
4. [Component Patterns](#-component-patterns)
5. [Usage Guidelines](#-usage-guidelines)
6. [Do's & Don'ts](#-dos--donts)

---

## 🧠 Brand Philosophy

**Precision Project Flow (PPF)** is a B2B marketplace connecting engineers and vendors with clients for precision manufacturing and engineering services. The brand identity is inspired by the intersection of **Upwork's professional marketplace trust** and **Facebook/LinkedIn's social community feel**.

### Brand Pillars

| Pillar | Meaning |
|--------|---------|
| **Trust** | Deep blue conveys stability, reliability, and institutional credibility |
| **Energy** | Vibrant orange signals action, innovation, and the spark of engineering creativity |
| **Clarity** | Clean typography and generous whitespace keep complex engineering content scannable |
| **Community** | Warm, approachable design patterns borrowed from social platforms |

---

## 🎨 Color System

### Primary Blue — Trust & Authority

The backbone of the PPF brand. Blue anchors the interface, appearing on navigation, primary CTAs, links, and hero sections.

| Swatch | Name | Hex | Tailwind | Usage |
|--------|------|-----|----------|-------|
| ██████ | **Primary** | `#003D82` | `bg-[#003D82]` | Main buttons, nav bar, active states, links |
| ██████ | **Primary Hover** | `#002960` | `hover:bg-[#002960]` | Button hover, link hover |
| ██████ | **Primary Light** | `#0052A3` | `bg-[#0052A3]` | Lighter accents, focus rings, selected states |
| ██████ | **Hero Start** | `#001F4D` | — | Hero gradient start |
| ██████ | **Hero End** | `#005BB5` | — | Hero gradient end |

**Hero Gradient:**
```
background: linear-gradient(135deg, #001f4d 0%, #003D82 50%, #005BB5 100%);
```
Always pair the hero gradient with a subtle grid overlay:
```css
background-image: repeating-linear-gradient(
  0deg, transparent, transparent 40px,
  rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px
),
repeating-linear-gradient(
  90deg, transparent, transparent 40px,
  rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px
);
```

---

### Accent Orange — Energy & Action

Orange is the **call-to-action color**. It draws the eye to the most important conversion points on any page. Use it sparingly — when everything is orange, nothing is.

| Swatch | Name | Hex | Tailwind | Usage |
|--------|------|-----|----------|-------|
| ██████ | **Accent** | `#FF6B35` | `bg-[#FF6B35]` | Primary CTA buttons, "Hire", "Submit Proposal", "Get Started" |
| ██████ | **Accent Hover** | `#E55A2B` | `hover:bg-[#E55A2B]` | CTA hover state |
| ██████ | **Accent Light** | `#FF8555` | `bg-[#FF8555]` | Subtle accent backgrounds, badges |

**The Orange Rule:** Orange should appear on **at most one primary action per screen**. If there are two orange buttons, neither stands out.

---

### Supporting Palette

| Swatch | Name | Hex | Tailwind | Usage |
|--------|------|-----|----------|-------|
| ██████ | **Secondary Blue** | `#60A5FA` | `bg-secondary` | Secondary highlights, info badges |
| ██████ | **Blue Grey** | `#64748B` | `text-blueGrey` | Secondary text, muted labels |
| ██████ | **Light Grey** | `#F1F5F9` | `bg-lightGrey` | Section backgrounds, disabled states |
| ██████ | **Medium Grey** | `#E2E8F0` | `bg-mediumGrey` | Borders, dividers |
| ██████ | **Dark** | `#0F172A` | `text-dark` | Primary body text |
| ██████ | **Dark Alt** | `#1E293B` | `bg-darkAlt` | Dark surfaces, footer |
| ██████ | **Page BG** | `#F8FAFC` | `bg-[#F8FAFC]` | Default page background |

---

### Status Colors

Used for badges, alerts, and state indicators. Always use the **pill pattern** (`rounded-full px-2.5 py-1 text-xs font-semibold`).

| Status | Color | Tailwind Class Pattern |
|--------|-------|----------------------|
| 🟢 **Active / Complete / Verified** | Emerald `#10B981` | `bg-emerald-100 text-emerald-800 border-emerald-200` |
| 🟡 **Pending / In Progress** | Amber `#F59E0B` | `bg-amber-100 text-amber-800 border-amber-200` |
| 🔵 **Info / Draft** | Blue `#3B82F6` | `bg-blue-100 text-blue-800 border-blue-200` |
| 🔴 **Cancelled / Error / Disputed** | Red `#EF4444` | `bg-red-100 text-red-800 border-red-200` |

---

## 🔤 Typography

### Font Family

**Plus Jakarta Sans** is the single typeface for all PPF surfaces — web, mobile, and marketing.

```css
font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', 
             'Helvetica Neue', Arial, sans-serif;
```

**Why Plus Jakarta Sans?**
- Geometric, modern, and highly legible at small sizes
- Wide weight range (300–800) gives us flexibility without loading multiple fonts
- Friendly but professional — bridges the "social" and "marketplace" feel
- Excellent number rendering for pricing, ratings, and engineering specs

### Available Weights

| Weight | Name | Usage |
|--------|------|-------|
| **300** | Light | Large display numbers, subtle captions |
| **400** | Regular | Body text, descriptions, form labels |
| **500** | Medium | Emphasized body, card titles, navigation links |
| **600** | Semibold | **Primary weight for headings**, button text, CTAs |
| **700** | Bold | Hero headlines, section titles, strong emphasis |
| **800** | Extra Bold | Landing page hero text, major stat numbers |

### Type Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| **Hero** | `text-5xl` / `text-6xl` (mobile/desktop) | 700–800 | 1.1 | Landing page headlines |
| **H1** | `text-3xl` / `text-4xl` | 700 | 1.2 | Page titles |
| **H2** | `text-2xl` / `text-3xl` | 600 | 1.3 | Section headers |
| **H3** | `text-xl` | 600 | 1.4 | Card titles, subsection headers |
| **H4** | `text-lg` | 600 | 1.4 | Small card titles, sidebar headers |
| **Body Lg** | `text-lg` | 400 | 1.6 | Lead paragraphs, featured descriptions |
| **Body** | `text-base` | 400 | 1.6 | Default body text |
| **Body Sm** | `text-sm` | 400 | 1.5 | Secondary info, metadata, timestamps |
| **Caption** | `text-xs` | 400–500 | 1.4 | Badges, labels, fine print |
| **Stat** | `text-2xl`–`text-4xl` | 700 | 1.2 | Dashboard KPIs, rating numbers |

### Text Colors

| Role | Class | Hex |
|------|-------|-----|
| Primary text | `text-dark` | `#0F172A` |
| Secondary text | `text-blueGrey` | `#64748B` |
| Tertiary / placeholder | `text-gray-400` | `#9CA3AF` |
| Inverse (on dark) | `text-white` | `#FFFFFF` |
| Link text | `text-[#003D82]` | `#003D82` |

---

## 🧩 Component Patterns

### Buttons

```html
<!-- Primary Button (Blue) — Default action -->
<button class="bg-[#003D82] hover:bg-[#002960] text-white font-semibold 
               rounded-xl px-6 py-3 transition-colors">
  Save Changes
</button>

<!-- Accent Button (Orange) — Main CTA, one per screen max -->
<button class="bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold 
               rounded-xl px-6 py-3 transition-colors">
  Hire This Engineer
</button>

<!-- Outline Button — Secondary actions -->
<button class="border-2 border-[#003D82] text-[#003D82] font-semibold 
               rounded-xl px-6 py-3 hover:bg-[#003D82] hover:text-white 
               transition-colors">
  View Profile
</button>

<!-- Ghost Button — Tertiary / low emphasis -->
<button class="text-[#003D82] font-medium hover:text-[#002960] 
               transition-colors">
  Learn More →
</button>
```

### Cards

All cards follow this base pattern:
```html
<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
  <!-- Card content -->
</div>
```

**Talent/Profile Cards** must always include:
- Avatar (rounded, 48–64px)
- Full name (semibold)
- Role / Company name (secondary text)
- Star rating with count
- Location
- One key stat (e.g., "142 jobs completed")

### Badges & Chips

```html
<!-- Standard badge -->
<span class="rounded-full px-2.5 py-1 text-xs font-semibold border 
             bg-blue-100 text-blue-800 border-blue-200">
  Verified
</span>

<!-- Status badge (pending example) -->
<span class="rounded-full px-2.5 py-1 text-xs font-semibold border 
             bg-amber-100 text-amber-800 border-amber-200">
  Pending Review
</span>
```

### Page Layout

Every full page follows this wrapper:
```html
<div class="min-h-screen bg-[#F8FAFC] font-jakarta">
  <Navigation />
  <main class="max-w-7xl mx-auto px-4 sm:px-6">
    <!-- Page content -->
  </main>
  <Footer />
</div>
```

---

## 📐 Usage Guidelines

### The 80/20 Color Rule

- **80% Blue & Neutrals** — Navigation, text, backgrounds, secondary buttons, links, icons
- **15% Supporting Colors** — Status badges, category tags, success/error states
- **5% Orange** — The single most important action on the page

### When to Use Orange

✅ **DO use orange for:**
- The primary CTA on a landing page ("Get Started", "Join Now")
- The main conversion action ("Hire This Engineer", "Submit Proposal")
- "Post an RFQ" button
- Checkout / payment confirmation button

❌ **DON'T use orange for:**
- Navigation links
- Secondary or tertiary buttons
- Multiple buttons on the same screen
- Text links
- Decorative elements

### When to Use Blue

✅ **DO use blue for:**
- Navigation bar background
- All secondary and default buttons
- Text links
- Active/selected states
- Hero section backgrounds
- Icons and interactive elements
- Progress bars and loading states

### Typography Rules

1. **One font, many weights.** Never introduce a second typeface.
2. **Semibold (600) is the default heading weight.** Reserve Bold (700) for heroes and major sections.
3. **Body text is always Regular (400) at `text-base`.**
4. **Line height never goes below 1.4** for readability.
5. **Use `font-jakarta` class** on every page wrapper — it's configured as a Tailwind utility.

---

## ✅ Do's & Don'ts

### Color

| ✅ Do | ❌ Don't |
|------|---------|
| Use `#003D82` for all primary UI elements | Use a different shade of blue — stick to the defined palette |
| Use `#FF6B35` for exactly one CTA per screen | Make two things orange on the same page |
| Use the hero gradient + grid overlay on all hero sections | Use a flat color for heroes |
| Use `#F8FAFC` as the default page background | Use pure white `#FFFFFF` as page background (reserve for cards) |

### Typography

| ✅ Do | ❌ Don't |
|------|---------|
| Use Plus Jakarta Sans everywhere | Mix in other fonts (Roboto, Inter, etc.) |
| Use weight 600 for headings | Use weight 700 for body text |
| Keep line height ≥ 1.4 | Squeeze text with tight line heights |
| Use the defined type scale | Invent new font sizes ad-hoc |

### Components

| ✅ Do | ❌ Don't |
|------|---------|
| Use `rounded-2xl` for cards | Use sharp corners (`rounded-none`) |
| Use `rounded-xl` for buttons | Mix border radius styles arbitrarily |
| Include avatar + name + rating on talent cards | Omit trust signals from profile cards |
| Use status pill pattern for all states | Use plain text for status indicators |

---

## 📁 Related Files

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Tailwind color/font configuration |
| `app/globals.css` | Global CSS, font-face, base styles |
| `app/layout.tsx` | Next.js font loading (Plus Jakarta Sans) |
| `docs/DESIGN.md` | Mobile design system (React Native) |
| `.github/copilot-instructions.md` | AI coding conventions for the project |

---

> **"Blue builds trust. Orange drives action. Jakarta Sans ties it all together."**