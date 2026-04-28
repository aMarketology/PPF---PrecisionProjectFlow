# Precision Project Flow Mobile - Design System
## UI/UX Design Specifications

---

## 🎨 Design Philosophy

**Precision Project Flow Mobile** follows a professional, industrial B2B aesthetic that balances functionality with modern mobile UX patterns. The design emphasizes:

- **Trust & Professionalism** - Industrial blue palette, clean typography
- **Clarity & Efficiency** - Clear information hierarchy, minimal friction
- **Mobile-First** - Touch-optimized, thumb-friendly navigation
- **Consistency** - Matching web platform brand identity

---

## 🎨 Color System

### Primary Colors

```typescript
const Colors = {
  // Brand Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',   // Main brand blue
    600: '#2563eb',   // Primary actions
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Secondary Colors
  secondary: {
    500: '#7c3aed',   // Purple accent
    600: '#6d28d9',
  },
  
  // Status Colors
  success: '#10b981',   // Green - completed, verified
  warning: '#f59e0b',   // Orange - pending, in-progress
  danger: '#ef4444',    // Red - cancelled, error
  info: '#06b6d4',      // Cyan - informational
  
  // Neutral Grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Backgrounds
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    dark: '#111827',
  },
  
  // Text Colors
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    link: '#2563eb',
  },
  
  // Border Colors
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },
}
```

### Engineering Category Colors

```typescript
const CategoryColors = {
  civil: '#3b82f6',           // Blue
  mechanical: '#f97316',      // Orange
  electrical: '#eab308',      // Yellow
  automation: '#a855f7',      // Purple
  manufacturing: '#22c55e',   // Green
  construction: '#ef4444',    // Red
  materials: '#6366f1',       // Indigo
  logistics: '#06b6d4',       // Cyan
}
```

---

## 📝 Typography

### Font Family

**Primary Font:** SF Pro (iOS) / Roboto (Android)

```typescript
const FontFamily = {
  regular: 'System',      // 400
  medium: 'System',       // 500
  semibold: 'System',     // 600
  bold: 'System',         // 700
}
```

### Type Scale

```typescript
const Typography = {
  // Display (Hero text)
  display: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  
  // Headings
  h1: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0,
  },
  
  // Body Text
  bodyLarge: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '400',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  
  // UI Text
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    textTransform: 'none',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
}
```

---

## 📐 Spacing & Layout

### Spacing Scale (8px base)

```typescript
const Spacing = {
  xs: 4,      // 0.5x
  sm: 8,      // 1x
  md: 16,     // 2x
  lg: 24,     // 3x
  xl: 32,     // 4x
  xxl: 48,    // 6x
  xxxl: 64,   // 8x
}
```

### Grid & Containers

```typescript
const Layout = {
  // Screen padding
  screenPadding: 16,
  screenPaddingLarge: 24,
  
  // Card padding
  cardPadding: 16,
  cardPaddingLarge: 20,
  
  // Grid gaps
  gridGap: 16,
  gridGapSmall: 8,
  
  // Max widths
  maxContentWidth: 480,   // Single column max
  
  // Safe areas
  safeAreaTop: 44,        // Status bar
  safeAreaBottom: 34,     // Home indicator (iPhone X+)
}
```

### Border Radius

```typescript
const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
}
```

---

## 🎯 Components

### Buttons

#### Primary Button
```typescript
<Button
  variant="primary"
  style={{
    backgroundColor: Colors.primary[600],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.lg,
  }}
>
  <Text style={{
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  }}>
    Buy Now - $5,000
  </Text>
</Button>
```

#### Secondary Button
```typescript
<Button
  variant="secondary"
  style={{
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary[600],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.lg,
  }}
>
  <Text style={{
    color: Colors.primary[600],
    fontSize: 16,
    fontWeight: '600',
  }}>
    Message Vendor
  </Text>
</Button>
```

#### Button Sizes
- **Large**: height 48px, fontSize 16
- **Medium**: height 40px, fontSize 14
- **Small**: height 32px, fontSize 12

#### Button States
- **Default**: Full color
- **Pressed**: 90% opacity
- **Disabled**: 40% opacity
- **Loading**: Spinner + disabled state

### Cards

#### Product Card
```
┌─────────────────────────┐
│  [Product Image]        │
│  185 x 185              │
├─────────────────────────┤
│  Company Logo (32x32)   │
│  Product Title          │
│  $5,000 · 14 days       │
│  ⭐ 4.8 (124)           │
└─────────────────────────┘
Shadow: 0 2 8 rgba(0,0,0,0.1)
Border Radius: 12px
Padding: 12px
```

#### Order Card
```
┌─────────────────────────────────┐
│  ORDER #1234                    │
│  ───────────────────────────    │
│  [Badge: In Progress]           │
│                                 │
│  Structural Engineering Design  │
│  AECOM                          │
│  $15,000 · Feb 20, 2026        │
│                                 │
│  [View Details →]               │
└─────────────────────────────────┘
```

#### Company Card
```
┌─────────────────────────────────┐
│  [Logo]  AECOM                  │
│          ⭐ 4.8 (203) ✓         │
│                                 │
│  Civil Engineering, Transport   │
│  📍 Dallas, TX                  │
│                                 │
│  [34 Services] [View Profile]   │
└─────────────────────────────────┘
```

### Form Inputs

#### Text Input
```typescript
<TextInput
  style={{
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text.primary,
  }}
  placeholderTextColor={Colors.text.tertiary}
  placeholder="Search products or companies..."
/>
```

**States:**
- **Default**: Border gray-300
- **Focus**: Border primary-600, shadow
- **Error**: Border danger, error message below
- **Disabled**: Background gray-100, text gray-400

#### Search Input
```
┌──────────────────────────────────┐
│  🔍  Search engineering services │
│  ✕                               │
└──────────────────────────────────┘
Height: 44px
Icons: 20x20
Clear button: on input
```

### Badges

```typescript
// Status Badges
<Badge variant="success">Completed</Badge>      // Green
<Badge variant="warning">In Progress</Badge>    // Orange
<Badge variant="danger">Cancelled</Badge>       // Red
<Badge variant="info">Pending</Badge>          // Blue

// Style
{
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
  fontSize: 12,
  fontWeight: '600',
}
```

### Bottom Navigation

```
┌─────────────────────────────────────────┐
│                                         │
│  [🏠]    [🔍]    [💬]    [📦]    [👤]  │
│  Home   Search  Messages Orders Profile │
└─────────────────────────────────────────┘
Height: 56px + safeArea
Icons: 24x24
Active: Primary color
Inactive: Gray-500
```

---

## 📱 Screen Designs

### 1. Home/Marketplace Screen

```
┌─────────────────────────────────────┐
│  [PPF Logo]         [🔔] [🛒]      │ Status Bar (44)
├─────────────────────────────────────┤
│                                     │
│  🔍 Search products or companies... │
│                                     │
│  ──── Engineering Categories ────   │
│                                     │
│  [🏗️]  [⚙️]  [⚡]  [🖥️]           │
│  Civil  Mech  Elec  Auto            │
│                                     │
│  [🔧]  [👷]  [📦]  [🚚]           │
│  Mfg   Const Matl  Logis            │
│                                     │
│  ──── Featured Companies ────────   │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ Bechtel │  │  AECOM  │          │
│  │ ⭐ 4.9  │  │ ⭐ 4.8  │  →       │
│  └─────────┘  └─────────┘          │
│                                     │
│  ──── Recent Products ───────────   │
│                                     │
│  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │ P1  │  │ P2  │  │ P3  │  →     │
│  └─────┘  └─────┘  └─────┘        │
│                                     │
│  [View All Products →]              │
│                                     │
└─────────────────────────────────────┘
  [🏠] [🔍] [💬] [📦] [👤]  Bottom Nav (56)
```

### 2. Product Detail Screen

```
┌─────────────────────────────────────┐
│  [←]  Product Details        [❤️]  │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │     [Product Image]           │ │
│  │      Swipeable Gallery        │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│  ● ○ ○ ○                           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [Logo] AECOM                │   │
│  │        ⭐ 4.8 (203) ✓       │   │
│  └─────────────────────────────┘   │
│                                     │
│  Structural Engineering Analysis   │
│  $15,000 · 14 days                 │
│                                     │
│  Description                        │
│  ────────────────────────────────  │
│  Comprehensive structural analysis  │
│  including load calculations,       │
│  seismic analysis...                │
│                                     │
│  Includes                           │
│  ────────────────────────────────  │
│  ✓ 3D modeling                     │
│  ✓ Code compliance review          │
│  ✓ Final report                    │
│                                     │
│  Similar Products →                 │
│                                     │
│  [P1]  [P2]  [P3]  →               │
│                                     │
└─────────────────────────────────────┘
  ┌───────────────────────────────┐
  │  [Message Vendor]  [Buy Now]  │ Sticky Footer
  └───────────────────────────────┘
```

### 3. Checkout Screen

```
┌─────────────────────────────────────┐
│  [←]  Checkout                      │
├─────────────────────────────────────┤
│                                     │
│  Order Summary                      │
│  ────────────────────────────────  │
│  ┌─────────────────────────────┐   │
│  │ Structural Engineering      │   │
│  │ AECOM                       │   │
│  │ $15,000                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  Contact Information                │
│  ────────────────────────────────  │
│  John Doe                           │
│  john@company.com                   │
│  [Edit]                             │
│                                     │
│  Project Details (Optional)         │
│  ────────────────────────────────  │
│  [Text Area]                        │
│  Add any specific requirements...   │
│                                     │
│  Payment Method                     │
│  ────────────────────────────────  │
│  [💳 Add Payment Method]            │
│                                     │
│  ────────────────────────────────  │
│  Subtotal              $15,000      │
│  Service Fee (3%)      $450         │
│  ────────────────────────────────  │
│  Total                 $15,450      │
│                                     │
└─────────────────────────────────────┘
  ┌───────────────────────────────┐
  │  [Place Order - $15,450]      │ Sticky Footer
  └───────────────────────────────┘
```

### 4. Messages Screen

```
┌─────────────────────────────────────┐
│  Messages                [+]        │
├─────────────────────────────────────┤
│  🔍 Search conversations...         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [A] AECOM                   │   │
│  │     About Structural...      │   │
│  │     10:32 AM            [2] │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [B] Bechtel Corporation     │   │
│  │     Thanks! We'll start...   │   │
│  │     Yesterday                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [F] Fluor                   │   │
│  │     Project timeline looks... │   │
│  │     Feb 20                   │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
  [🏠] [🔍] [💬] [📦] [👤]
```

### 5. Conversation Detail Screen

```
┌─────────────────────────────────────┐
│  [←]  AECOM                  [⋯]   │
│       Online now                    │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────┐       │
│  │ About Order #1234       │       │
│  │ Structural Engineering  │       │
│  └─────────────────────────┘       │
│                                     │
│       ┌─────────────────┐          │
│       │ Hi! I have some │          │
│       │ questions about │          │
│       │ the timeline    │          │
│       └─────────────────┘          │
│       10:30 AM              You    │
│                                     │
│  ┌─────────────────┐               │
│  │ Of course! We   │               │
│  │ can complete it │               │
│  │ in 14 days      │               │
│  └─────────────────┘               │
│  AECOM    10:32 AM                 │
│                                     │
│       ┌─────────────────┐          │
│       │ Perfect! Let's  │          │
│       │ proceed         │          │
│       └─────────────────┘          │
│       10:35 AM              You    │
│                                     │
└─────────────────────────────────────┘
  ┌───────────────────────────────┐
  │ [📎] Type a message...   [>]  │
  └───────────────────────────────┘
```

### 6. Orders Screen

```
┌─────────────────────────────────────┐
│  Orders                  [Filter]   │
├─────────────────────────────────────┤
│  [Active]  [Completed]  [All]       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ORDER #1234                 │   │
│  │ [🟡 In Progress]            │   │
│  │                             │   │
│  │ Structural Engineering      │   │
│  │ AECOM                       │   │
│  │ $15,000 · Feb 20, 2026     │   │
│  │                             │   │
│  │ [Message] [View Details]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ORDER #1233                 │   │
│  │ [🟢 Completed]              │   │
│  │                             │   │
│  │ HVAC System Design          │   │
│  │ Bechtel                     │   │
│  │ $8,500 · Feb 15, 2026      │   │
│  │                             │   │
│  │ [Leave Review] [Reorder]   │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
  [🏠] [🔍] [💬] [📦] [👤]
```

### 7. Profile Screen

```
┌─────────────────────────────────────┐
│  Profile                  [Settings]│
├─────────────────────────────────────┤
│                                     │
│         ┌────────┐                  │
│         │  [JD]  │                  │
│         └────────┘                  │
│         John Doe                    │
│         Client Account              │
│         john@company.com            │
│                                     │
│  ────────────────────────────────  │
│                                     │
│  Account                            │
│  ┌─────────────────────────────┐   │
│  │ 👤  Edit Profile        →  │   │
│  │ 💳  Payment Methods     →  │   │
│  │ 📍  Saved Addresses     →  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Activity                           │
│  ┌─────────────────────────────┐   │
│  │ ❤️   Saved Products     →  │   │
│  │ ⭐  My Reviews          →  │   │
│  │ 📜  Order History       →  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Support                            │
│  ┌─────────────────────────────┐   │
│  │ 💬  Help Center         →  │   │
│  │ 📧  Contact Support     →  │   │
│  │ ℹ️   About PPF          →  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Sign Out]                         │
│                                     │
└─────────────────────────────────────┘
  [🏠] [🔍] [💬] [📦] [👤]
```

---

## 🎭 Animations & Interactions

### Transitions

```typescript
const Animations = {
  // Screen transitions
  screenTransition: {
    duration: 300,
    easing: 'ease-in-out',
  },
  
  // Modal animations
  modalSlideUp: {
    from: { translateY: '100%' },
    to: { translateY: 0 },
    duration: 300,
  },
  
  // Fade animations
  fade: {
    duration: 200,
  },
  
  // Button press
  buttonPress: {
    scale: 0.95,
    duration: 100,
  },
  
  // Card hover/press
  cardPress: {
    scale: 0.98,
    shadow: 'increase',
    duration: 150,
  },
}
```

### Micro-interactions

- **Button Press**: Scale down 5%
- **Card Tap**: Subtle shadow increase
- **Input Focus**: Border color transition
- **Loading**: Skeleton screens (not spinners)
- **Success**: Checkmark animation
- **Error**: Shake animation
- **Badge**: Pulse for new items

### Gestures

- **Swipe**: Navigate between tabs, dismiss modals
- **Pull to Refresh**: Reload lists
- **Long Press**: Show context menu
- **Pinch to Zoom**: Product images
- **Pan**: Image gallery, carousels

---

## 📊 Empty States

### No Products Found
```
      🔍
  No products found

  Try adjusting your search
  or browse categories

  [Browse Categories]
```

### No Orders Yet
```
      📦
  No orders yet

  Start by exploring our
  marketplace of engineering services

  [Browse Marketplace]
```

### No Messages
```
      💬
  No messages yet

  Start a conversation with
  a vendor about their services

  [Browse Products]
```

---

## 🚨 Error States

### Network Error
```
      ⚠️
  Connection Error

  Please check your internet
  connection and try again

  [Retry]
```

### Payment Failed
```
      ❌
  Payment Failed

  Your payment could not be processed.
  Please try another payment method.

  [Try Again]  [Cancel]
```

---

## ⏳ Loading States

### Skeleton Screens
Use skeleton loaders instead of spinners for better UX

```
┌─────────────────────────┐
│  ▅▅▅▅▅▅▅▅▅▅▅▅▅         │
│  ▅▅▅▅▅▅▅▅▅▅▅▅▅         │
│                         │
│  ▅▅▅▅▅▅▅  ▅▅▅  ▅▅▅▅   │
│  ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅       │
└─────────────────────────┘
```

### Spinners
Only for short actions (< 2 seconds)
- Size: 24px (small), 40px (medium)
- Color: Primary brand color

---

## 🌐 Accessibility

### WCAG 2.1 Level AA

1. **Color Contrast**
   - Text: 4.5:1 minimum
   - Large text: 3:1 minimum
   - Interactive elements: 3:1

2. **Touch Targets**
   - Minimum: 44x44 pixels
   - Recommended: 48x48 pixels
   - Spacing: 8px between targets

3. **Screen Reader Support**
   - Semantic HTML elements
   - Alt text for images
   - ARIA labels for icons
   - Descriptive button labels

4. **Font Scaling**
   - Support system font scaling
   - Test up to 200% zoom
   - Use relative units (sp)

---

## 📐 Responsive Breakpoints

```typescript
const Breakpoints = {
  small: 375,      // iPhone SE
  medium: 390,     // iPhone 13/14/15
  large: 414,      // iPhone Plus
  xlarge: 428,     // iPhone Pro Max
  tablet: 768,     // iPad Mini
}
```

---

## 🎨 Icon System

**Library:** Lucide React Native (or similar)

**Sizes:**
- Small: 16px (inline with text)
- Medium: 20px (buttons, inputs)
- Large: 24px (navigation, headers)
- XLarge: 32px (empty states, features)

**Common Icons:**
- Search: magnifying glass
- Messages: chat bubble
- Orders: package
- Profile: user circle
- Home: house
- Settings: gear
- Notifications: bell
- Cart: shopping cart
- Heart: bookmark/save
- Arrow: navigation
- Check: success
- X: close/error

---

## 🖼️ Imagery

### Product Images
- Aspect Ratio: 1:1 (square)
- Minimum: 400x400px
- Recommended: 800x800px
- Format: WebP (fallback JPEG)
- Compression: 80% quality

### Company Logos
- Aspect Ratio: 1:1 or 16:9
- Minimum: 200x200px
- Format: PNG (transparent) or SVG
- Background: White or transparent

### Avatars
- Aspect Ratio: 1:1
- Size: 32px, 48px, 64px, 96px
- Fallback: Initials with colored background

---

## 🎯 Design Checklist

### Before Development
- [ ] All screens designed
- [ ] Component library defined
- [ ] Color system finalized
- [ ] Typography scale set
- [ ] Spacing system established
- [ ] Icons selected
- [ ] Animations specified

### During Development
- [ ] Follow design specs exactly
- [ ] Test on multiple devices
- [ ] Verify color contrast
- [ ] Check touch target sizes
- [ ] Test with screen readers
- [ ] Validate form error states
- [ ] Test loading states
- [ ] Verify empty states

### Before Launch
- [ ] Design QA complete
- [ ] Accessibility audit passed
- [ ] Dark mode (optional)
- [ ] All assets optimized
- [ ] Screenshot templates ready
- [ ] App Store assets prepared

---

## 📚 Design Resources

1. **Figma Files** - Complete design system
2. **Style Guide** - This document
3. **Component Library** - Reusable components
4. **Asset Library** - Icons, images, logos
5. **Prototype** - Interactive clickthrough

---

## 🔄 Version History

- **v1.0** - Initial design system (Feb 2026)
- **v1.1** - Dark mode support (TBD)
- **v1.2** - Tablet optimization (TBD)

---

**Next:** Review `ppf-features-and-necessary-apikeys.md` for complete feature specifications and required API keys.
