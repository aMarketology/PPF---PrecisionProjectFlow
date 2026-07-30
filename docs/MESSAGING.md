# PPF Messaging System — Feature Spec (Updated July 25, 2026)# PPF Messaging System — Feature Spec



> **File**: `app/messages/page.tsx`  > **File**: `app/messages/page.tsx`  

> **API**: `app/api/messages/send/route.ts`, `app/api/messages/unlock/route.ts`  > **API**: `app/api/messages/send/route.ts`, `app/api/messages/credit-tokens/route.ts`  

> **DB tables**: `user_conversations`, `user_messages`, `conversation_participants`  > **DB tables**: `user_conversations`, `user_messages`  

> **Token RPCs**: `spend_tokens`, `add_tokens`, `refund_tokens`, `get_or_create_conversation`> **Token RPCs**: `spend_tokens`, `add_tokens`, `refund_tokens`



------



## 1. Architecture Overview## 1. Architecture Overview



``````

Client BrowserClient Browser

││

├── /messages (Next.js page)├── /messages (Next.js page)

│   ├── Left sidebar: Channels / Groups / DMs (collapsible)│   ├── Conversation list sidebar  (user_conversations)

│   ├── Center thread: messages + compose box│   └── Chat thread panel          (user_messages)

│   └── Right sidebar: company info + team members│

│├── /api/messages/send             (token gate + insert)

├── /api/messages/send             (token gate + insert + @mention parsing)├── /api/messages/credit-tokens    (post-payment credit)

├── /api/messages/unlock           (spend 100 tokens)├── /api/stripe/buy-tokens         (create PaymentIntent)

├── /api/messages/credit-tokens    (post-payment credit)└── /api/stripe/webhooks           (safety-net credit)

├── /api/stripe/buy-tokens         (create PaymentIntent)```

└── /api/stripe/webhooks           (safety-net credit)

```**Token Economy**:

- Message **#1** in any conversation = **free**

---- Messages **#2+** = **2 tokens** each (cold outreach)

- Once a conversation is **contracted** (`is_contracted = true`) → **all messages free**

## 2. Conversation Types- Token packs: Starter 10/$10 · Pro 50/$45 · Business 120/$99



| Type | Description | Participants | Token Cost |---

|---|---|---|---|

| `direct` | 1-on-1 DM | `participant_one_id` + `participant_two_id` | Free if same company or unlocked; otherwise 100 tokens |## 2. ✅ Features — Currently Built

| `group` | Private multi-person | `conversation_participants` | Always free |

| `channel` | Company-wide topic room | `conversation_participants` | Always free |### Core Messaging

| Feature | Notes |

### Company Channel|---|---|

- Auto-created via `ensure_company_channel()` RPC when a company is created| Conversation list sidebar | Sorted by `last_message_at` desc |

- Named "General" — company_id scoped| Load message thread on select | Full history, ascending order |

- All company members auto-joined via trigger| Send text messages | Via `/api/messages/send` (token-gated) |

| Unread badge on conversation | Count of unread messages from other user |

---| Mark as read on open | Updates `is_read + read_at` |

| Read receipts | ✓ = sent, ✓✓ (blue) = read |

## 3. Token Economy| Timestamps | `formatDistanceToNow` on each message |

| Auto-scroll to bottom | On new message |

- **Same-company DMs**: FREE (checked via `same_company()` RPC)| New Message modal | Search users by name, open/create thread |

- **Cross-company DMs**: 100 tokens (~$10) one-time unlock → free forever after| `?with=userId` deep link | Auto-creates convo from profile "Message" button |

- **Channels/Groups**: Always FREE| Contracted thread (free mode) | `is_contracted` flag unlocks free messaging |

- **Token packs**: Starter 100/$10 · Pro 500/$45 · Business 1,200/$99

### Token Paywall

---| Feature | Notes |

|---|---|

## 4. UI Structure (3-column layout)| First message free | Server checks message count in conversation |

| 2-token cost per message after first | `spend_tokens` RPC, race-safe with `SELECT FOR UPDATE` |

### Left (272px): Conversation list| Insufficient tokens → paywall modal | Triggered by HTTP 402 response |

- Company channel pinned at top ("General" with company name)| Token purchase in-modal | 3 packs, Stripe `PaymentElement` |

- Channels section (collapsible)| Auto-retry pending message after payment | `pendingMessage` state preserved |

- Groups section (collapsible)| Auto-refund on message insert failure | `refund_tokens` called in send route |

- Direct Messages section (collapsible)| Webhook safety-net credit | If browser closed before `credit-tokens`, webhook credits |

- Filter input, "+" for new DM, "#" for create channel| Idempotent token credit | `uniq_token_tx_stripe` index prevents double-credit |

| Live balance display | Updates after send + after purchase |

### Center (flex): Thread view

- Header with avatar/icon, name, type badge---

- Message bubbles with timestamps, read receipts, attachments

- Compose box with file upload## 3. 🔴 High Priority — Build Next

- Locked state shows unlock prompt (for locked cross-company DMs)

### 3.1 Supabase Realtime (live messages)

### Right (256px): Company panel**Problem**: Messages only appear after page refresh or re-selecting conversation.  

- Company name + "Manage Company" link**Solution**: Subscribe to `user_messages` channel filtered by `conversation_id`.

- Team Channel shortcut

- Team Members list (avatars + roles)```ts

// In loadMessages() — add after initial fetch:

---const channel = supabase

  .channel(`messages:${conversationId}`)

## 5. Database Tables  .on('postgres_changes', {

    event: 'INSERT',

### user_conversations    schema: 'public',

| Column | Type | Notes |    table: 'user_messages',

|---|---|---|    filter: `conversation_id=eq.${conversationId}`,

| id | UUID | PK |  }, (payload) => {

| participant_one_id | UUID | Nullable (direct only) |    setMessages(prev => [...prev, payload.new as Message]);

| participant_two_id | UUID | Nullable (direct only) |    if (payload.new.sender_id !== currentUserId) {

| conversation_type | TEXT | 'direct' / 'group' / 'channel' |      markMessagesAsRead(conversationId);

| name | TEXT | Channel/group name |    }

| description | TEXT | Channel topic |  })

| is_public | BOOLEAN | Public channels visible to company |  .subscribe();

| company_id | UUID | FK to company_profiles |

| is_unlocked | BOOLEAN | DM unlock status |// Return cleanup:

| created_by | UUID | FK to auth.users |return () => supabase.removeChannel(channel);

| created_at | TIMESTAMPTZ | |```

| last_message_at | TIMESTAMPTZ | For sorting |

Also subscribe to `user_conversations` to update sidebar unread badges in real time.

### conversation_participants

| Column | Type | Notes |---

|---|---|---|

| id | UUID | PK |### 3.2 Real Avatar Images

| conversation_id | UUID | FK to user_conversations |**Problem**: Conversation list and chat header show initials only — no `avatar_url` from profiles.  

| user_id | UUID | FK to auth.users |**Solution**: Include `avatar_url` in profile queries, show `<img>` with fallback to initials.

| role | TEXT | 'owner' / 'admin' / 'member' |

| joined_at | TIMESTAMPTZ | |```ts

// Update select:

### user_messagessupabase.from('profiles').select('id, full_name, email, user_type, avatar_url')

| Column | Type | Notes |

|---|---|---|// Render:

| id | UUID | PK |{avatarUrl

| conversation_id | UUID | FK |  ? <img src={avatarUrl} className="w-12 h-12 rounded-full object-cover" />

| sender_id | UUID | FK |  : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">{initial}</div>

| content | TEXT | |}

| is_read | BOOLEAN | |```

| is_system_message | BOOLEAN | System-generated messages |

| attachment_url | TEXT | File path in storage |---

| attachment_name | TEXT | Original filename |

| attachment_type | TEXT | 'image' / 'pdf' / 'file' |### 3.3 Email Notifications (Resend)

| created_at | TIMESTAMPTZ | |**Problem**: No notification when a new message arrives — users miss messages.  

**Solution**: In `app/api/messages/send/route.ts`, after successful insert, send an email to the recipient via Resend.

---

```ts

## 6. Key RPCs// After message insert:

if (!recipientProfile.is_online) { // optional online check

| Function | Purpose |  await resend.emails.send({

|---|---|    from: 'PPF <messages@precisionprojectflow.com>',

| `get_or_create_conversation(user_one, user_two)` | Returns existing DM or creates new |    to: recipientProfile.email,

| `spend_tokens(p_user_id, p_amount, p_description, p_reference_id)` | Debit wallet |    subject: `New message from ${senderProfile.full_name}`,

| `add_tokens(p_user_id, p_amount, p_description, p_stripe_payment_id)` | Credit wallet |    html: `...`,

| `refund_tokens(p_user_id, p_amount, p_description, p_reference_id)` | Refund on failed send |  });

| `are_friends(user_a, user_b)` | Returns false (stub) |}

| `same_company(user_a, user_b)` | True if both share company_id |```

| `ensure_company_channel(p_company_id, p_user_id)` | Create/get General channel |

| `invite_company_member(p_company_id, p_user_id, p_role)` | Add user to company |- Only send if recipient hasn't been active in last 5 min (avoid spam)
- Include a link: `https://www.precisionprojectflow.com/messages?with=${senderId}`
- Use email template consistent with PPF brand

---

### 3.4 Token Balance in Navigation
**Problem**: Users don't know their balance until they hit the paywall — bad UX.  
**Solution**: Show token balance in `<Navigation />` for logged-in users.

```tsx
// In Navigation.tsx, after auth check:
<div className="flex items-center gap-1 text-sm font-semibold text-[#003D82]">
  <Zap className="w-4 h-4 text-[#FF6B35]" />
  {tokenBalance} tokens
</div>
```

Fetch balance once on mount, store in context or pass as prop.

---

## 4. 🟡 Medium Priority — Enhance UX

### 4.1 "View Profile" Link in Chat Header
In the conversation header, add a link to the other user's engineer profile.

```tsx
<Link href={`/profiles/${selectedConversation.other_user.id}`}
  className="text-sm text-blue-600 hover:underline">
  View Profile →
</Link>
```

---

### 4.2 Conversation Search / Filter
Add a search input above the conversation list to filter by name or last message content.

```tsx
const filtered = conversations.filter(c =>
  c.other_user?.full_name?.toLowerCase().includes(filter.toLowerCase())
);
```

---

### 4.3 Typing Indicator
Use Supabase Realtime Broadcast (not DB) to send ephemeral "is typing" events.

```ts
// Sender broadcasts on keystroke (debounced):
channel.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId } });

// Recipient listens:
channel.on('broadcast', { event: 'typing' }, () => {
  setIsOtherTyping(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => setIsOtherTyping(false), 2000);
});
```

---

### 4.4 System Messages
Display milestone events inline in the message thread (styled differently from user messages).

Examples:
- `🤝 Contract started — all messages now free`
- `✅ Order #123 marked complete`
- `⭐ [Name] left a review`

These use `is_system_message = true` on `user_messages` — already in schema.

Render with center-aligned pill style:
```tsx
{msg.is_system_message && (
  <div className="flex justify-center my-2">
    <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{msg.content}</span>
  </div>
)}
```

---

### 4.5 File Attachments (Specs / Drawings)
Allow uploading PDFs, DXF, images via Supabase Storage.

**DB change needed**: Add `attachment_url TEXT, attachment_name TEXT` to `user_messages`.  
**Upload flow**: Supabase Storage bucket `message-attachments`, signed URL for display.  
**Token cost**: Attachments count as a message (2 tokens after first).

---

## 4.6 🔓 Contract-to-Unlock Integration (July 30, 2026)
**Automatically unlocks DMs when an order enters "in progress" status.**

### Architecture
| Layer | Role |
|-------|------|
| **Postgres trigger** (source of truth) | Fires on `AFTER UPDATE OF status ON product_orders`. Calls `get_or_create_conversation()` → sets `is_unlocked = true` → inserts system message. Guarantees consistency from webhook, API, admin panel, or direct DB update. |
| **Application layer** (fallback) | In `app/api/orders/[id]/update-status/route.ts` after status update succeeds. Mirrors the trigger but enables future realtime broadcast. Non-blocking — trigger is the source of truth. |

### Flow
```
Order created (pending_payment) → Payment received (paid) → Vendor starts work (in_progress)
                                                                        │
                                                                        ▼
                                                      DB trigger fires:
                                                      1. get_or_create_conversation(buyer_id, vendor_id)
                                                      2. UPDATE user_conversations SET is_unlocked = true
                                                      3. INSERT system_message: "🤝 Contract started..."
```

### Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Unlock on `in_progress` | Not `paid` | `paid` = money moved but work hasn't started. `in_progress` = vendor accepted, work began = "under contract" |
| Stay unlocked forever | No re-lock | Re-gating behind 100 tokens after a paid contract creates friction for revisions, support, repeat business |
| Column used | `is_unlocked` | Already exists, already checked by send route. No need to wire up `is_contracted` separately |
| Find-or-create convo | `get_or_create_conversation` RPC | Handles storefront purchases where buyer never DM'd vendor before |

### Migration File
`supabase/CONTRACT_UNLOCK_TRIGGER.sql` — adds `in_progress_at` column, trigger function, and trigger on `product_orders`.

### System Message
Inserted with `is_system_message = true`:
```
🤝 Contract started — you can now message freely
```
Rendered as a centered gray pill (already supported in `app/messages/page.tsx`).

---

## 5. 🟠 Lower Priority — Polish

| Feature | Notes |
|---|---|
| Message reactions / emoji | Store in separate `message_reactions` table |
| Online / last-seen status | `last_seen_at` on `profiles`, update on activity |
| Conversation archive / mute | `is_archived`, `is_muted` flags on `user_conversations` |
| Message search by content | Full text search on `user_messages.content` |
| Token transaction history page | `token_account_summary` view → `/dashboard/tokens` |
| Push notifications (mobile) | Expo Push via edge function |

---

## 6. DB Schema Reference

```sql
-- Fast-read wallet
profiles.token_balance INT DEFAULT 0

-- Conversations
user_conversations (
  id UUID,
  participant_one_id UUID,
  participant_two_id UUID,
  conversation_type TEXT DEFAULT 'direct',  -- 'direct' | 'group' | 'channel'
  name TEXT,                                 -- channel/group name
  description TEXT,                          -- channel topic
  is_public BOOLEAN DEFAULT false,
  company_id UUID,
  created_by UUID,
  is_unlocked BOOLEAN DEFAULT false,        -- DM unlock status
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Messages
user_messages (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_paid BOOLEAN,
  is_system_message BOOLEAN DEFAULT false,
  payment_id TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Conversation participants (for groups/channels)
conversation_participants (
  id UUID,
  conversation_id UUID,
  user_id UUID,
  role TEXT DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
  joined_at TIMESTAMPTZ
)

-- Token ledger
token_transactions (
  id UUID,
  user_id UUID,
  amount INT,          -- + credit / - debit
  balance_after INT,
  type TEXT,           -- 'purchase' | 'spend' | 'refund' | 'bonus'
  description TEXT,
  stripe_payment_id TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ
)
```

---

## 7. Recommended Build Order

1. **Contract-to-Unlock** ✅ Shipped (July 30) — DB trigger auto-unlocks DM when order hits `in_progress`
2. **Realtime** (3.1) — biggest UX gap, Supabase subscription ~50 lines
3. **Avatar images** (3.2) — quick wins, huge visual improvement
4. **Email notifications** (3.3) — drives re-engagement, Resend already wired
5. **Token balance in nav** (3.4) — reduces paywall surprise
6. **View Profile link** (4.1) — connects messaging to marketplace
7. **Conversation search** (4.2) — needed once users have many convos
8. **Typing indicator** (4.3) — feel premium
9. **System messages** (4.4) — milestone events, ties to orders
10. **File attachments** (4.5) — engineering use case, high value
