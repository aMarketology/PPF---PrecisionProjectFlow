# RFQ Offer Application Flow — Feature Spec for React Native

> **Source:** `app/rfq/[id]/submit/page.tsx`, `app/api/rfq/offer/route.ts`, `app/messages/page.tsx` (RFQ offer card section)
> **Status:** ✅ Production
> **Framework:** Next.js 14 → React Native (Expo)

---

## Overview

The RFQ offer flow is a **token-gated bidding system**. Engineers pay **50 tokens** to submit an offer on an RFQ. The client pays **50 tokens** to unlock each offer for review. The full lifecycle involves: browse → bid → chat offer card → client reviews → contract → meeting.

---

## Complete Flow Diagram

```
ENGINEER (Vendor)                          CLIENT (RFQ Owner)
─────────────────                          ────────────────────
                                           1. Post RFQ (free)
                                           
2. Browse RFQ marketplace
   └─ "For You" matching
   └─ Search/filter
   
3. Click "Bid" on RFQ card
   └─ Navigate to SubmitOfferScreen
   
4. Fill offer form
   ├─ Total amount ($)
   ├─ Delivery days
   ├─ Company name (auto-filled)
   ├─ Contact name (auto-filled)
   ├─ Phone number
   ├─ Per-part pricing (line items)
   └─ Additional notes
   
5. Submit → 50 tokens deducted
   ├─ POST /api/rfq/offer
   ├─ RPC: submit_rfq_offer()
   ├─ DM auto-created with client
   └─ RFQ offer message posted in chat
                                          6. Sees RFQ offer card in messages
                                             ├─ Locked: "Unlock for 50 tokens"
                                             └─ Click → 50 tokens deducted
                                          7. Reviews full application
                                             └─ Vendor details, pricing, notes
                                          8. Actions (after unlock):
                                             ├─ "Send Contract" (50 tokens)
                                             │  └─ Stripe Connect checkout
                                             │     → secure escrow payment
                                             └─ "Schedule Meeting" (50 tokens)
                                                └─ Sends invite to DM
```

---

## Step 1: Browse & Discovery

### Entry Points
1. **RFQ Marketplace** (`/rfq`) — LinearRFQCard "Bid" button
2. **RFQ Detail** (`/rfq/[id]`) — "Submit Offer" CTA
3. **Direct link** — `/rfq/[slug-or-id]/submit`

### Pre-checks (client-side on SubmitOfferPage mount)
```
✓ User is authenticated (else redirect to /login)
✓ User is not the RFQ owner (else redirect to /rfq/[id])
✓ User is not in same company as RFQ owner (else redirect)
✓ User doesn't already have a pending offer (else redirect)
✓ RFQ status is 'open' (else redirect)
✓ User has ≥ 50 tokens (warn if low)
```

---

## Step 2: Submit Offer Form (`/rfq/[id]/submit`)

### Form Fields

| Field | Type | Required | Source |
|-------|------|----------|--------|
| `offerAmount` | Number (USD) | ✅ Required | User input |
| `offerDelivery` | Number (days) | Optional | User input |
| `companyName` | Text | Optional | Auto-filled from `company_profiles` |
| `contactName` | Text | Optional | Auto-filled from `profiles.full_name` |
| `phoneNumber` | Text | Optional | User input |
| `lineItemPrices` | Record<index, string> | Optional | One per RFQ line item, per-part pricing |
| `offerNote` | Text (textarea) | Optional | Additional notes |

### RFQ Summary Display
Above the form, a summary card shows:
- Budget, Timeline, Category, Location
- Quantity, Material (if specified)
- Description excerpt
- **Line Items Table** (if RFQ has line items):
  - Part, Qty, Material, Tolerance
  - Shown as both table (tablet) and cards (mobile)

### Structured Note Format
All fields are concatenated into a structured note string:
```
Company: Acme Engineering
Contact: John Smith
Phone: +1 (555) 123-4567
Delivery: 14 days

Per-Part Pricing:
  Mounting Bracket: $12.50
  Support Plate: $8.75
  Pivot Arm: $22.00

Additional Notes:
All parts include material costs. Lead time is from PO receipt.
```

This structured note is stored in `rfq_offers.note`.

---

## Step 3: API Submission

### `POST /api/rfq/offer`

**Request:**
```json
{
  "rfqId": "uuid",
  "amount": 5000,
  "note": "Company: Acme...\nPer-Part Pricing:\n...",
  "deliveryDays": 14
}
```

**Server-side validation:**
1. Authenticate (cookie-based)
2. Verify RFQ exists
3. Block: owner can't bid on own RFQ
4. Block: same-company can't bid
5. Call `submit_rfq_offer(p_rfq_id, p_vendor_id, p_amount, p_notes, p_timeline, p_terms)` RPC
   - Checks token balance ≥ 50
   - Deducts 50 tokens via `spend_tokens()`
   - Inserts row into `rfq_offers`
   - Returns `{ success: true, offer_id: uuid }`
6. Create DM via `get_or_create_conversation(vendor_id, client_id)`
7. Post RFQ offer message to DM:
   ```json
   {
     "conversation_id": "...",
     "sender_id": "vendor_uuid",
     "content": "New RFQ offer received",
     "message_type": "rfq_offer",
     "message_metadata": {
       "rfqId": "...",
       "vendorId": "...",
       "ownerId": "...",
       "title": "CNC Parts",
       "vendorName": "Acme Engineering",
       "amount": 5000,
       "deliveryDays": 14,
       "note": "Company: Acme..."
     },
     "is_system_message": true
   }
   ```
8. Update `rfq_offers` with `conversation_id` and `message_id`
9. Update `user_conversations.last_message_at`

**Response:**
```json
{
  "success": true,
  "offerId": "uuid",
  "conversationId": "uuid"
}
```

### Error Handling
| HTTP Status | Error | Cause |
|-------------|-------|-------|
| 401 | Unauthorized | Not logged in |
| 403 | Cannot bid on own RFQ | Owner == bidder |
| 403 | Cannot bid on same company | same_company() = true |
| 400 | Insufficient tokens | < 50 tokens |
| 404 | RFQ not found | Invalid rfqId |
| 400 | Amount required | Missing amount |

---

## Step 4: Post-Submission

### Success Screen
- ✅ Checkmark animation
- Offer amount displayed prominently
- "50 tokens were deducted" notice
- Action buttons:
  - "Back to RFQ" → `/rfq/[id]`
  - "Go to Dashboard" → `/dashboard/engineer`

### What Happens in Background
- `rfq_offers` row created with `status = 'pending'`
- DM conversation opened between vendor and client
- RFQ offer message posted as system message in DM
- Client receives real-time notification (if subscribed)
- `rfqs.offers_count` updated
- Activity logged in `site_activities` (type: `offer_submitted`)

---

## Step 5: Client Reviews Offer (In Messages)

### In Chat — RFQ Offer Card

The client sees the offer as a styled card in their DM conversation:

```
┌─────────────────────────────────────────┐
│ 📄 New RFQ Offer                        │
│ Sent by Acme Engineering                │
├─────────────────────────────────────────┤
│ RFQ                                      │
│ CNC Machined Parts Assembly             │
│                                          │
│ ┌──────────────┬──────────────────────┐ │
│ │ Submitted by  │ Offer amount         │ │
│ │ Acme Eng.     │ $5,000              │ │
│ ├──────────────┼──────────────────────┤ │
│ │ Delivery      │                      │ │
│ │ 14 days      │                      │ │
│ └──────────────┴──────────────────────┘ │
│                                          │
│ Includes material costs. Lead time...   │
├─────────────────────────────────────────┤
│ 🔒 Unlock the complete RFQ application  │
│ [Unlock application for 50 tokens]      │
└─────────────────────────────────────────┘
```

### Unlock Flow
1. Client clicks "Unlock for 50"
2. `POST /api/rfq/offer/unlock` with `{ messageId }`
   - Server verifies caller is `rfqs.client_id`
   - Calls `spend_tokens()` for 50 tokens
   - Sets `user_messages.is_paid = true`
3. Card updates: lock icon → file icon, "Review full application"
4. Token balance decremented by 50

### After Unlock — Actions
Once unlocked, the card footer shows:

```
┌─────────────────────────────────────────┐
│ [Send Contract · 50]  [Schedule Meeting]│
└─────────────────────────────────────────┘
```

**Send Contract (50 tokens):**
- `POST /api/rfq/offer/action` with `{ messageId, action: 'send_contract' }`
- Server verifies caller is RFQ owner
- Creates Stripe Connect Checkout session (vendor gets paid via Connect)
- Redirects to Stripe checkout URL
- Returns `{ checkoutUrl, tokenBalance }`

**Schedule Meeting (50 tokens):**
- `POST /api/rfq/offer/action` with `{ messageId, action: 'schedule_meeting', meetingAt, durationMinutes, meetingNote }`
- Deducts 50 tokens
- Posts a system message to the conversation: "📅 Meeting invitation: [date] · [duration] min\nNote: [note]"
- Available to both parties (offer owner or offer sender)

---

## Token Economy Summary

| Action | Token Cost | Who Pays | RPC |
|--------|-----------|----------|-----|
| Submit offer | 50 | Vendor (engineer) | `submit_rfq_offer()` |
| Unlock offer for review | 50 | Client (RFQ owner) | `spend_tokens()` |
| Send contract | 50 | Client | `spend_tokens()` |
| Schedule meeting | 50 | Initiator (either party) | `spend_tokens()` |

---

## React Native Implementation Notes

### Screens
```
SubmitOfferScreen
├── ScrollView
│   ├── BackButton (→ RFQ detail)
│   ├── Header ("Submit Your Offer")
│   ├── RFQSummaryCard
│   │   ├── BudgetRow, TimelineRow, CategoryRow, LocationRow
│   │   ├── QuantityRow, MaterialRow (conditional)
│   │   └── DescriptionExcerpt (italic)
│   ├── LineItemsSection (conditional, if RFQ has line items)
│   │   ├── SectionHeader ("Parts to Quote")
│   │   └── LineItemTable (or cards on mobile)
│   │       └── LineItemRow (part, qty, material, tolerance, price input)
│   ├── OfferFormSection
│   │   ├── TotalAmountInput (numeric keyboard, $ prefix)
│   │   ├── DeliveryDaysInput (numeric)
│   │   ├── CompanyNameInput (pre-filled, editable)
│   │   ├── ContactNameInput (pre-filled, editable)
│   │   ├── PhoneNumberInput (phone keyboard)
│   │   └── AdditionalNotesInput (multiline textarea)
│   ├── TokenCostNotice ("50 tokens will be deducted")
│   ├── TokenBalanceDisplay (current balance)
│   └── SubmitButton (disabled during submission)
├── SuccessScreen
│   ├── CheckmarkAnimation (Lottie or Animated)
│   ├── OfferAmountDisplay
│   ├── TokenDeductionNotice
│   └── ActionButtons (Back to RFQ, Dashboard)
└── ErrorState (inline error banner)
```

### Key Interactions
- **Keyboard avoidance:** `KeyboardAvoidingView` wrapping the form
- **Numeric inputs:** `keyboardType="numeric"` for amount/delivery
- **Pre-fill:** Fetch company and profile data on mount, pre-populate fields
- **Token check:** Show warning if balance < 50, but allow submission (server will reject)
- **Loading state:** Disable submit button, show spinner

### Messaging Integration
The RFQ offer card component is shared between the Messages screen and needs to handle:
1. **Bidder view** — "Application sent. The RFQ owner can unlock and review it." (blue banner, no actions)
2. **Owner locked view** — "Unlock for 50 tokens" (amber banner, unlock button)
3. **Owner unlocked view** — "Send Contract" + "Schedule Meeting" buttons
4. **Meeting Scheduler Modal** — Date picker, duration selector, note input

### API Calls (Mobile)
| Endpoint | Method | Payload | Response |
|----------|--------|---------|----------|
| `/api/rfq/offer` | POST | `{ rfqId, amount, note, deliveryDays }` | `{ success, offerId, conversationId }` |
| `/api/rfq/offer/unlock` | POST | `{ messageId }` | `{ tokenBalance, tokensSpent }` |
| `/api/rfq/offer/action` | POST | `{ messageId, action }` (+ meeting params) | `{ checkoutUrl }` or `{ success }` |
| `/api/rfq/offer` | PATCH | `{ offerId, action: 'accept'\|'reject' }` | `{ success, conversationId }` |
| `/api/rfq/offer` | DELETE | `{ offerId }` (via query param) | `{ success }` |
| `/api/rfq/offer/action` | GET | `?conversationId=...` | `{ contexts: { [msgId]: { vendorId, ownerId } } }` |

### Validation Rules (Client-side)
- Amount > 0 and numeric
- At least one field filled beyond amount (encouraged but not enforced)
- If line items exist, at least total amount roughly matches per-part sum (soft warning)
- Token balance check with warning if insufficient