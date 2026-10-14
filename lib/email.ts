// PPF Email via Resend — server-side only, never import in 'use client' files.
import { Resend } from 'resend'

const APP_URL   = process.env.NEXT_PUBLIC_APP_URL || 'https://precisionprojectflow.com'
// info@amarketology.com is the only domain verified in Resend right now.
// Keep PPF branding in the display name + body, but send from the verified addr.
const FROM_NAME = 'Precision Project Flow'
const FROM_ADDR = 'info@amarketology.com'

// Lazily construct the Resend client so importing this module never throws
// when RESEND_API_KEY is absent (e.g. tests, local builds without email).
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(key)
  }
  return _resend
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function emailBase(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>PPF</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#001f4d 0%,#003D82 60%,#005BB5 100%);border-radius:16px 16px 0 0;padding:32px 36px 28px;">
  <p style="margin:0;color:#93c5fd;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Precision Project Flow</p>
  <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;">Engineering Marketplace</p>
</td></tr>
<tr><td style="background:#ffffff;padding:32px 36px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">${body}</td></tr>
<tr><td style="background:#f1f5f9;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;padding:20px 36px;text-align:center;">
  <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; ${new Date().getFullYear()} Precision Project Flow &mdash; All rights reserved.<br/>
  <a href="${APP_URL}" style="color:#003D82;text-decoration:none;">precisionprojectflow.com</a> &middot;
  <a href="${APP_URL}/settings" style="color:#003D82;text-decoration:none;">Manage Notifications</a></p>
</td></tr>
</table></td></tr></table></body></html>`
}

function h1(t: string) { return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">${t}</h1>` }
function sub(t: string) { return `<p style="margin:0 0 24px;font-size:15px;color:#64748b;">${t}</p>` }
function pp(t: string) { return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">${t}</p>` }
function btn(label: string, href: string, accent = false) {
  const bg = accent ? '#FF6B35' : '#003D82'
  return `<a href="${href}" style="display:inline-block;margin:8px 0 24px;background:${bg};color:#fff;font-size:15px;font-weight:700;padding:13px 28px;border-radius:12px;text-decoration:none;">${label} &rarr;</a>`
}
function infoBox(lines: { label: string; value: string }[]) {
  const rows = lines.map(l =>
    `<tr><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#64748b;white-space:nowrap;">${l.label}</td>` +
    `<td style="padding:8px 12px;font-size:13px;color:#0f172a;font-weight:500;">${l.value}</td></tr>`
  ).join('')
  return `<table width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 24px;border-collapse:collapse;">${rows}</table>`
}
function divider() { return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>` }

// ── 1. Welcome ────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ to, name, userType }: {
  to: string; name: string; userType: 'engineer' | 'client'
}) {
  const isEng = userType === 'engineer'
  const dashUrl = isEng ? `${APP_URL}/admin` : `${APP_URL}/admin`
  const list = isEng
    ? `<li>Complete your public profile (avatar, bio, location)</li><li>Add your first service listing</li><li>Connect your Stripe account to receive payouts</li><li>Browse open RFQs and respond to relevant ones</li>`
    : `<li>Browse the marketplace and discover engineering services</li><li>Message a supplier about your project</li><li>Post an RFQ to get multiple quotes at once</li>`
  const body =
    h1(`Welcome to PPF, ${name}!`) +
    sub("Your account is live — here's how to get started.") +
    pp(isEng
      ? "You've joined as a <strong>supplier</strong>. List your services, respond to RFQs, and get paid directly."
      : "You've joined as a <strong>buyer</strong>. Browse services, post RFQs, and message suppliers directly.") +
    btn('Go to your Dashboard', dashUrl) +
    divider() +
    `<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0f172a;">Quick-start checklist</p>` +
    `<ul style="margin:0 0 24px;padding-left:20px;color:#334155;font-size:14px;line-height:2;">${list}</ul>` +
    pp(`Questions? Reply to this email or visit <a href="${APP_URL}/contact" style="color:#003D82;">our contact page</a>.`)
  return getResend().emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`, to,
    subject: `Welcome to Precision Project Flow, ${name}!`,
    html: emailBase(body),
  })
}

// ── 2. New message notification ───────────────────────────────────────────────

export async function sendNewMessageEmail({ to, recipientName, senderName, preview, conversationId }: {
  to: string; recipientName: string; senderName: string; preview: string; conversationId: string
}) {
  const truncated = preview.length > 120 ? preview.slice(0, 120) + '...' : preview
  const body =
    h1(`New message from ${senderName}`) +
    sub(`Hi ${recipientName}, you have a new message on PPF.`) +
    `<div style="background:#f8fafc;border-left:4px solid #003D82;padding:16px 20px;border-radius:0 10px 10px 0;margin:0 0 24px;">` +
    `<p style="margin:0;font-size:14px;color:#334155;font-style:italic;">"${truncated}"</p></div>` +
    btn('Reply in Messenger', `${APP_URL}/messages?conv=${conversationId}`) +
    pp('Replying within 24 hours keeps your response rate high and boosts your profile ranking.')
  return getResend().emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`, to,
    subject: `New message from ${senderName}`,
    html: emailBase(body),
  })
}

// ── 3a. New order — vendor ────────────────────────────────────────────────────

export async function sendNewOrderEmailVendor({ to, vendorName, clientName, serviceTitle, orderAmount, orderId }: {
  to: string; vendorName: string; clientName: string; serviceTitle: string; orderAmount: number; orderId: string
}) {
  const body =
    h1('You have a new order!') +
    sub(`${clientName} just purchased one of your services on PPF.`) +
    infoBox([
      { label: 'Service', value: serviceTitle },
      { label: 'Buyer',   value: clientName },
      { label: 'Amount',  value: `$${(orderAmount / 100).toFixed(2)}` },
      { label: 'Order',   value: orderId.slice(0, 8).toUpperCase() },
    ]) +
    btn('View Order Details', `${APP_URL}/orders/sales/${orderId}`) +
    pp('Please confirm the order and reach out to the buyer if you need any clarification.')
  return getResend().emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`, to,
    subject: `New order: ${serviceTitle}`,
    html: emailBase(body),
  })
}

// ── 3b. Order confirmation — client ──────────────────────────────────────────

export async function sendOrderConfirmationEmail({ to, clientName, vendorName, serviceTitle, orderAmount, orderId }: {
  to: string; clientName: string; vendorName: string; serviceTitle: string; orderAmount: number; orderId: string
}) {
  const body =
    h1('Order confirmed!') +
    sub(`Hi ${clientName}, your order is confirmed and the supplier has been notified.`) +
    infoBox([
      { label: 'Service',  value: serviceTitle },
      { label: 'Supplier', value: vendorName },
      { label: 'Amount',   value: `$${(orderAmount / 100).toFixed(2)}` },
      { label: 'Order',    value: orderId.slice(0, 8).toUpperCase() },
    ]) +
    btn('Track Your Order', `${APP_URL}/orders/${orderId}`) +
    pp('The supplier will typically confirm within 24 hours. You can message them directly if you have questions.') +
    pp('If anything goes wrong, reply to this email and our team will help.')
  return getResend().emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`, to,
    subject: `Order confirmed: ${serviceTitle}`,
    html: emailBase(body),
  })
}

// ── 5. Company claim invitation ──────────────────────────────────────────────

export async function sendClaimInviteEmail({ to, contactName, companyName, companyId, city, state }: {
  to: string; contactName: string; companyName: string; companyId: string; city?: string | null; state?: string | null
}) {
  const location = [city, state].filter(Boolean).join(', ')
  const claimUrl = `${APP_URL}/claim-company?id=${companyId}&name=${encodeURIComponent(companyName)}`
  const body =
    h1(`Claim your company page, ${contactName}`) +
    sub(`${companyName} already has a profile on Precision Project Flow. Claim it now — it's free and takes under 2 minutes.`) +
    infoBox([
      { label: 'Company', value: companyName },
      { label: 'Location', value: location || 'Nationwide' },
    ]) +
    pp('Once claimed, you can update company details, add team members, receive RFQ notifications, message buyers directly, and build your engineering marketplace presence.') +
    btn('Claim Your Company Now', claimUrl, true) +
    divider() +
    pp(`Didn't request this? No action needed — ${companyName}'s listing will remain as-is.`) +
    pp(`Questions? Reply to this email or reach us at <a href="${APP_URL}/contact" style="color:#003D82;">${APP_URL}/contact</a>.`)
  return getResend().emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`, to,
    subject: `${contactName}, claim ${companyName} on Precision Project Flow`,
    html: emailBase(body),
  })
}

// ── 6. RFQ alert ─────────────────────────────────────────────────────────────

// Sent to matching engineers when a new RFQ is posted, and to the RFQ owner
// when a new offer arrives.
export async function sendRFQAlertEmail({ to, engineerName, clientName, rfqTitle, rfqCategory, budget }: {
  to: string
  engineerName: string
  clientName?: string | null
  rfqTitle: string
  rfqCategory?: string | null
  budget?: number | string | null
}) {
  const budgetLabel = budget != null && budget !== ''
    ? (typeof budget === 'number' ? `$${budget.toLocaleString()}` : String(budget))
    : 'Not specified'
  const body =
    h1(`New RFQ: ${rfqTitle}`) +
    sub(`Hi ${engineerName}, a new request for quote matches your services on PPF.`) +
    infoBox([
      { label: 'Project',  value: rfqTitle },
      { label: 'Category', value: rfqCategory || 'General' },
      { label: 'Budget',   value: budgetLabel },
      { label: 'Buyer',    value: clientName || 'A buyer' },
    ]) +
    btn('View & Submit a Quote', `${APP_URL}/rfq`) +
    pp('Responding early improves your chances of winning the project. You can message the buyer directly from the RFQ page.')
  return getResend().emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`, to,
    subject: `New RFQ: ${rfqTitle}`,
    html: emailBase(body),
  })
}

// ── 7. Company team invitation (email, no account required) ────────────────

export async function sendCompanyInviteEmail({ to, inviteeName, companyName, accountType, inviteToken }: {
  to: string
  inviteeName: string
  companyName: string
  accountType: 'engineer' | 'client'
  inviteToken: string
}) {
  const isSupplier = accountType === 'engineer'
  const roleLabel = isSupplier ? 'Supplier' : 'Buyer'
  const signupUrl = `${APP_URL}/signup?type=${accountType}&invite=${inviteToken}`
  const body =
    h1(`You've been invited to join ${companyName}`) +
    sub(`Hi ${inviteeName}, a team member invited you to join "${companyName}" on Precision Project Flow.`) +
    pp(`You'll be joining as a <strong>${roleLabel}</strong> account. Your account type is pre-selected so you can get set up in minutes.`) +
    btn('Accept Invitation', signupUrl, true) +
    divider() +
    pp(`If you already have a Precision Project Flow account, sign in with this same email address and your invitation will be waiting for you.`) +
    pp(`Didn't expect this? You can ignore this email — no account will be created.`)
  return getResend().emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`,
    to,
    subject: `You're invited to join ${companyName} on Precision Project Flow`,
    html: emailBase(body),
  })
}

// ── 8. Ownership transfer notification ──────────────────────────────────────

export async function sendOwnershipTransferEmail({ to, recipientName, companyName }: {
  to: string
  recipientName: string
  companyName: string
}) {
  const body =
    h1(`You're now the owner of ${companyName}`) +
    sub(`Hi ${recipientName}, ownership of "${companyName}" has been transferred to you.`) +
    pp(`You now have full control over the company profile, team management, listings, and payouts.`) +
    btn('Go to your Company', `${APP_URL}/admin/company`) +
    pp(`If you weren't expecting this, contact support right away.`)
  return getResend().emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`,
    to,
    subject: `You're now the owner of ${companyName}`,
    html: emailBase(body),
  })
}

// ── 9. Cold outreach (plain-text for maximum deliverability) ───────────────

export async function sendColdOutreachEmail({ to, companyName, contactName, subject, message, signature }: {
  to: string | string[]
  companyName: string
  contactName: string | null
  subject: string
  message: string
  signature?: string
}) {
  const name = contactName || 'there'
  const sig = signature ?? `\n\n— The Precision Project Flow Team\ninfo@amarketology.com`

  // Plain-text body: no images, no links-heavy HTML — better inbox placement.
  const text = `Hi ${name},\n\n${message.trim()}\n\n${sig.trim()}\n`

  return getResend().emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`,
    to,
    subject,
    text,
    // Minimal fallback HTML (no styling) so non-plain-text clients still render.
    html: `<html><body style="font-family:Arial,sans-serif;color:#111;line-height:1.6;white-space:pre-wrap;">${text.replace(/\n/g, '<br/>')}</body></html>`,
  })
}
