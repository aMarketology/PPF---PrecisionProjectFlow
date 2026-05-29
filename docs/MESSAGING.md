# PPF Messaging System — Feature Spec

> **File**: `app/messages/page.tsx`  
> **API**: `app/api/messages/send/route.ts`, `app/api/messages/credit-tokens/route.ts`  
> **DB tables**: `user_conversations`, `user_messages`  
> **Token RPCs**: `spend_tokens`, `add_tokens`, `refund_tokens`

---

## 1. Architecture Overview

```
Client Browser
│
├── /messages (Next.js page)
│   ├── Conversation list sidebar  (user_conversations)
│   └── Chat thread panel          (user_messages)
│
├── /api/messages/send             (token gate + insert)
├── /api/messages/credit-tokens    (post-payment credit)
├── /api/stripe/buy-tokens         (create PaymentIntent)
└── /api/stripe/webhooks           (safety-net credit)
```

**Token Economy**:
- Message **#1** in any conversation = **free**
- Messages **#2+** = **2 tokens** each (cold outreach)
- Once a conversation is **contracted** (`is_contracted = true`) → **all messages free**
- Token packs: Starter 10/$10 · Pro 50/$45 · Business 120/$99

---

## 2. ✅ Features — Currently Built

### Core Messaging
| Feature | Notes |
|---|---|
| Conversation list sidebar | Sorted by `last_message_at` desc |
| Load message thread on select | Full history, ascending order |
| Send text messages | Via `/api/messages/send` (token-gated) |
| Unread badge on conversation | Count of unread messages from other user |
| Mark as read on open | Updates `is_read + read_at` |
| Read receipts | ✓ = sent, ✓✓ (blue) = read |
| Timestamps | `formatDistanceToNow` on each message |
| Auto-scroll to bottom | On new message |
| New Message modal | Search users by name, open/create thread |
| `?with=userId` deep link | Auto-creates convo from profile "Message" button |
| Contracted thread (free mode) | `is_contracted` flag unlocks free messaging |

### Token Paywall
| Feature | Notes |
|---|---|
| First message free | Server checks message count in conversation |
| 2-token cost per message after first | `spend_tokens` RPC, race-safe with `SELECT FOR UPDATE` |
| Insufficient tokens → paywall modal | Triggered by HTTP 402 response |
| Token purchase in-modal | 3 packs, Stripe `PaymentElement` |
| Auto-retry pending message after payment | `pendingMessage` state preserved |
| Auto-refund on message insert failure | `refund_tokens` called in send route |
| Webhook safety-net credit | If browser closed before `credit-tokens`, webhook credits |
| Idempotent token credit | `uniq_token_tx_stripe` index prevents double-credit |
| Live balance display | Updates after send + after purchase |

---

## 3. 🔴 High Priority — Build Next

### 3.1 Supabase Realtime (live messages)
**Problem**: Messages only appear after page refresh or re-selecting conversation.  
**Solution**: Subscribe to `user_messages` channel filtered by `conversation_id`.

```ts
// In loadMessages() — add after initial fetch:
const channel = supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'user_messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    setMessages(prev => [...prev, payload.new as Message]);
    if (payload.new.sender_id !== currentUserId) {
      markMessagesAsRead(conversationId);
    }
  })
  .subscribe();

// Return cleanup:
return () => supabase.removeChannel(channel);
```

Also subscribe to `user_conversations` to update sidebar unread badges in real time.

---

### 3.2 Real Avatar Images
**Problem**: Conversation list and chat header show initials only — no `avatar_url` from profiles.  
**Solution**: Include `avatar_url` in profile queries, show `<img>` with fallback to initials.

```ts
// Update select:
supabase.from('profiles').select('id, full_name, email, user_type, avatar_url')

// Render:
{avatarUrl
  ? <img src={avatarUrl} className="w-12 h-12 rounded-full object-cover" />
  : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">{initial}</div>
}
```

---

### 3.3 Email Notifications (Resend)
**Problem**: No notification when a new message arrives — users miss messages.  
**Solution**: In `app/api/messages/send/route.ts`, after successful insert, send an email to the recipient via Resend.

```ts
// After message insert:
if (!recipientProfile.is_online) { // optional online check
  await resend.emails.send({
    from: 'PPF <messages@precisionprojectflow.com>',
    to: recipientProfile.email,
    subject: `New message from ${senderProfile.full_name}`,
    html: `...`,
  });
}
```

- Only send if recipient hasn't been active in last 5 min (avoid spam)
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
  is_contracted BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
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
  created_at TIMESTAMPTZ
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

1. **Realtime** (3.1) — biggest UX gap, Supabase subscription ~50 lines
2. **Avatar images** (3.2) — quick wins, huge visual improvement
3. **Email notifications** (3.3) — drives re-engagement, Resend already wired
4. **Token balance in nav** (3.4) — reduces paywall surprise
5. **View Profile link** (4.1) — connects messaging to marketplace
6. **Conversation search** (4.2) — needed once users have many convos
7. **Typing indicator** (4.3) — feel premium
8. **System messages** (4.4) — milestone events, ties to orders
9. **File attachments** (4.5) — engineering use case, high value
