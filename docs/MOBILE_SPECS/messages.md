# Messaging System — Feature Spec for React Native

> **Source:** `app/messages/page.tsx` + `app/api/messages/**`
> **Status:** ✅ Production
> **Framework:** Next.js 14 → React Native (Expo)

---

## Overview

PPF's messaging system is a Slack/Discord-style chat platform supporting **Direct Messages**, **Group Chats**, **Public/Private Channels**, and **Company Channels**. It's token-gated for DMs and deeply integrated with the RFQ offer lifecycle.

---

## Data Model

### Tables
| Table | Key Columns |
|-------|------------|
| `user_conversations` | `id`, `participant_one_id`, `participant_two_id`, `conversation_type` (`direct`/`group`/`channel`), `is_unlocked`, `name`, `description`, `is_public`, `company_id`, `last_message_at` |
| `user_messages` | `id`, `conversation_id`, `sender_id`, `content`, `is_read`, `read_at`, `is_system_message`, `is_paid`, `message_type` (`text`/`system`/`company_invite`/`rfq_offer`), `message_metadata` (JSONB), `attachment_url`, `attachment_name`, `attachment_type` |
| `conversation_participants` | `conversation_id`, `user_id`, `role` (`owner`/`admin`/`member`) |
| `message_reactions` | `message_id`, `user_id` (thumbs-up toggle) |

### Key RPCs
- `get_or_create_conversation(user_one_id, user_two_id)` → `conversation_id`
- `spend_tokens(p_user_id, p_amount, p_description, p_reference_id)` → `NULL` or `'insufficient_tokens'`

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│               MessagesPageInner                  │
│  ┌─────────────────────┐ ┌───────────────────┐  │
│  │    Sidebar (Left)     │ │  Chat Panel (Right)│  │
│  │  ┌─────────────────┐ │ │ ┌───────────────┐ │  │
│  │  │ Company Panel    │ │ │ │ Header Bar    │ │  │
│  │  │ Search + New DM  │ │ │ │ (name/status/ │ │  │
│  │  │ Section tabs     │ │ │ │  settings)    │ │  │
│  │  │ (all/channels/   │ │ │ ├───────────────┤ │  │
│  │  │  groups/dms)     │ │ │ │ Message List  │ │  │
│  │  ├─────────────────┤ │ │ │ (scrollable)  │ │  │
│  │  │ Conversation    │ │ │ ├───────────────┤ │  │
│  │  │ List             │ │ │ │ Compose Bar   │ │  │
│  │  │ (filtered)       │ │ │ │ + attachments │ │  │
│  │  └─────────────────┘ │ │ └───────────────┘ │  │
│  └─────────────────────┘ └───────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Feature Details

### 1. Conversation Types

| Type | Description | Creation | Free? |
|------|-------------|----------|-------|
| **Direct** | 1-on-1 DM | Via "New DM" search, `?with=` URL param, or auto-created from RFQ offers | Token-gated (100 tokens to unlock) |
| **Group** | Private multi-user chat | "Create Group" modal with member search | Always free |
| **Channel** | Public or private broadcast room | "Create Channel" modal | Always free |
| **Company Channel** | Auto-generated `#General` for company members | Automatic on company join | Always free |

### 2. Sidebar

The sidebar has 3 sections:
- **Company Panel** — Shows company name, team members list, pending invites (Accept/Decline), "Invite Member" action
- **Section Tabs** — Toggle between All / Channels / Groups / DMs
- **Conversation List** — Each item shows: avatar, name, last message preview, unread badge (red pill), timestamp. Sorted by `last_message_at` DESC.

**Unread badges** are computed via `SELECT count(*) FROM user_messages WHERE conversation_id = X AND is_read = false AND sender_id != currentUserId`.

**Search** — Filter conversations by `other_user.full_name`.

### 3. Chat Panel

#### Header Bar
- Back arrow (mobile), conversation name/other user name
- Active status indicator
- Settings gear icon (channels/groups only) → opens Channel Settings panel
- Channel Settings: rename (owner/admin), manage members (add/remove/role change), delete (owner only)

#### Message List
- Standard chat bubbles: own messages right-aligned (blue gradient `from-[#003D82]`), others left-aligned (white/gray)
- **System messages** rendered centered in gray
- **Company invites** shown as styled cards with Accept/Decline inline buttons
- **RFQ Offer cards** — special compact proposal cards (see §5)
- **Attachment display** — images rendered inline (signed URLs), files as download links
- **Mentions** (`@username`) rendered as highlighted spans
- **Thumbs-up reactions** — toggle on/off below each message, show count

#### Typing Indicators
- Uses **Supabase Realtime Broadcast** (`event: 'typing'`)
- Debounced: one broadcast per 2 seconds
- Shows "X is typing..." in the chat header footer
- Clears after 2.5s of no signal

#### Compose Bar
- Text input with Send button
- Paperclip button for file/image attachments (upload via `/api/messages/upload`)
- Free-text message with mentions

### 4. Token-Gated Unlock Flow

**DM Locking Logic:**
```typescript
isFree = isUnlocked || areFriends || isSameCompany || isRfqApplicant
```

- `isUnlocked` — conversation's `is_unlocked` column = true
- `areFriends` — `are_friends(user_a, user_b)` RPC returns true
- `isSameCompany` — `same_company(user_a, user_b)` RPC returns true
- `isRfqApplicant` — user has a `rfq_offers` row linked to this conversation

**If locked (402 response):**
- Show unlock modal with token pack options (Starter 100 tokens/$10, Pro 500/$45, Business 1200/$99)
- Stripe PaymentElement for token purchase
- Unlock costs **100 tokens**

### 5. RFQ Offer Cards (In-Chat Proposals)

When an engineer submits an RFQ offer, a special message is posted to the DM:

**Message structure:**
```json
{
  "message_type": "rfq_offer",
  "message_metadata": {
    "rfqId": "uuid",
    "vendorId": "uuid",
    "ownerId": "uuid",
    "title": "CNC Machined Parts...",
    "vendorName": "John's Machine Shop",
    "amount": 5000,
    "deliveryDays": 14,
    "note": "Includes material costs..."
  },
  "is_system_message": true
}
```

**Card rendering (3 states):**

| Viewer | State | Card shows |
|--------|-------|-----------|
| **Bidder** (vendor) | Sent confirmation | Blue banner: "Application sent. The RFQ owner can unlock and review it." |
| **RFQ Owner** (client) | Locked (not paid) | Amber banner with 🔒: "Unlock the complete RFQ application" → Unlock for 50 tokens |
| **RFQ Owner** | Unlocked (paid) | Show full details + action buttons: "Send Contract" (50 tokens, Stripe Connect), "Schedule Meeting" (50 tokens, posts invite to DM) |

**Card content:**
- RFQ title, vendor name, offer amount ($), delivery days
- Vendor's note (if provided)
- Per-part pricing (from `rfq.line_items`)

### 6. Company Invites

**Invite flow:**
1. Company member clicks "Invite Member" in company panel
2. Search for user by name
3. POST `/api/messages/send-invite` with `{ companyId, targetUserId }`
4. Target receives a system message: `"You've been invited to join [Company Name]!"` with Accept/Decline buttons
5. Accept → `accept_company_invite(p_company_id)` RPC → user joins company
6. Decline → `decline_company_invite(p_company_id)` RPC → invite dismissed

### 7. Realtime Subscriptions

**Message subscription** (per-conversation):
```javascript
supabase.channel(`messages:${conversationId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'user_messages' }, ...)
  .on('postgres_changes', { event: 'UPDATE', table: 'user_messages' }, ...)
  .on('broadcast', { event: 'typing' }, ...)
```

**Global sidebar subscription:**
```javascript
supabase.channel('sidebar:global')
  .on('postgres_changes', { event: 'INSERT', table: 'user_messages' }, reloadConversations)
  .on('postgres_changes', { event: 'UPDATE', table: 'user_conversations' }, updateInPlace)
  .on('postgres_changes', { event: '*', table: 'conversation_participants' }, reloadParticipants)
```

### 8. Optimistic Sending

Messages are inserted optimistically:
1. Create temp message with `id = temp-{timestamp}`
2. Immediately render in chat
3. POST to `/api/messages/send`
4. On success: replace temp with real message from API response
5. On 402 (locked): remove temp, restore text, show unlock modal
6. On error: remove temp, restore text, show error toast

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/messages/send` | POST | Send message (token-gated for locked DMs) |
| `/api/messages/unlock` | POST | Unlock a DM conversation (100 tokens) |
| `/api/messages/upload` | POST | Upload file attachment to Supabase Storage |
| `/api/messages/reactions` | GET/POST | Get or toggle thumbs-up reactions |
| `/api/messages/send-invite` | POST | Send company invite |
| `/api/messages/create-channel` | POST | Create group/channel |
| `/api/messages/update-channel` | POST | Rename channel (owner/admin) |
| `/api/messages/delete-channel` | POST | Delete channel (owner only) |
| `/api/messages/add-member` | POST | Add member to channel |
| `/api/messages/remove-member` | POST | Remove member from channel |
| `/api/messages/update-role` | POST | Change member role |
| `/api/messages/credit-tokens` | POST | Credit tokens (used after Stripe payment) |
| `/api/messages/transfer-tokens` | POST | Transfer tokens between users |

---

## React Native Implementation Notes

### State Management
- Use React Context or Zustand for: `currentUserId`, `tokenBalance`, `currentUserProfile`, `userCompanyId`
- Each conversation's messages in local state
- Conversations list in global state (updated by realtime)

### Real-time
- Use Supabase JS client for React Native (`@supabase/supabase-js`)
- Subscribe to Realtime channels on mount, unsubscribe on unmount
- Use `AppState` listener to reconnect on foreground

### UI Components Needed
```
ChatScreen
├── SidebarSheet (bottom sheet on mobile)
│   ├── CompanyPanel
│   ├── SectionTabs
│   └── ConversationList
│       └── ConversationItem (avatar, name, preview, unread badge)
├── ChatHeader
│   ├── BackButton, ConversationName, OnlineStatus
│   └── SettingsButton → ChannelSettingsSheet
├── MessageList (FlatList, inverted)
│   ├── ChatBubble (own/other)
│   ├── SystemMessage
│   ├── CompanyInviteCard
│   ├── RfqOfferCard (3 states)
│   ├── AttachmentDisplay
│   ├── MentionRenderer
│   └── ReactionButton (thumbs up)
├── TypingIndicator
├── ComposeBar
│   ├── TextInput
│   ├── AttachmentButton → ImagePicker
│   └── SendButton
├── NewDMModal (user search)
├── CreateChannelModal
├── UnlockModal (token packs + Stripe)
└── MeetingSchedulerModal (date/time picker)
```

### Key Libraries
- `@supabase/supabase-js` — realtime + DB
- `@stripe/stripe-react-native` — payments
- `react-native-image-picker` — attachments
- `react-native-document-picker` — file uploads
- `date-fns` — time formatting
- `react-native-gifted-chat` or custom FlatList — message list

### Token Unlock Flow (Mobile)
1. User sends message → 402 response
2. Show unlock modal with token pack options
3. User selects pack → Stripe PaymentSheet
4. On success → credit tokens, mark conversation unlocked, resend message
5. On failure → show error, let user retry