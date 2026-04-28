// PPF Email via Resend — server-side only, never import in 'use client' files.
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL || 'https://precisionprojectflow.com'
const FROM_NAME = 'Precision Project Flow'
const FROM_ADDR = 'no-reply@precisionprojectflow.com'

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
  const dashUrl = isEng ? `${APP_URL}/dashboard/engineer` : `${APP_URL}/dashboard/client`
  const list = isEng
    ? `<li>Complete your public profile (avatar, bio, location)</li><li>Add your first service listing</li><li>Connect your Stripe account to receive payouts</li><li>Browse open RFQs and respond to relevant ones</li>`
    : `<li>Browse the marketplace and discover engineering services</li><li>Message a vendor about your project</li><li>Post an RFQ to get multiple quotes at once</li>`
  const body =
    h1(`Welcome to PPF, ${name}!`) +
    sub("Your account is live — here's how to get started.") +
    pp(isEng
      ? "You've joined as an <strong>engineer / vendor</strong>. List your services, respond to RFQs, and get paid directly."
      : "You've joined as a <strong>client</strong>. Browse services, post RFQs, and message vendors directly.") +
    btn('Go to your Dashboard', dashUrl) +
    divider() +
    `<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0f172a;">Quick-start checklist</p>` +
    `<ul style="margin:0 0 24px;padding-left:20px;color:#334155;font-size:14px;line-height:2;">${list}</ul>` +
    pp(`Questions? Reply to this email or visit <a href="${APP_URL}/contact" style="color:#003D82;">our contact page</a>.`)
  return resend.emails.send({
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
  return resend.emails.send({
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
      { label: 'Client',  value: clientName },
      { label: 'Amount',  value: `$${(orderAmount / 100).toFixed(2)}` },
      { label: 'Order',   value: orderId.slice(0, 8).toUpperCase() },
    ]) +
    btn('View Order Details', `${APP_URL}/orders/sales/${orderId}`) +
    pp('Please confirm the order and reach out to the client if you need any clarification.')
  return resend.emails.send({
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
    sub(`Hi ${clientName}, your order is confirmed and the vendor has been notified.`) +
    infoBox([
      { label: 'Service', value: serviceTitle },
      { label: 'Vendor',  value: vendorName },
      { label: 'Amount',  value: `$${(orderAmount / 100).toFixed(2)}` },
      { label: 'Order',   value: orderId.slice(0, 8).toUpperCase() },
    ]) +
    btn('Track Your Order', `${APP_URL}/orders/${orderId}`) +
    pp('The vendor will typically confirm within 24 hours. You can message them directly if you have questions.') +
    pp('If anything goes wrong, reply to this email and our team will help.')
  return resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`, to,
    subject: `Order confirmed: ${serviceTitle}`,
    html: emailBase(body),
  })
}

// ── 4. RFQ alert — engineer ───────────────────────────────────────────────────

export async function sendRFQAlertEmail({ to, engineerName, rfqTitle, rfqCategory, budget, clientName }: {
  to: string; engineerName: string; rfqTitle: string; rfqCategory: string; budget: string | null; clientName: string
}) {
  const body =
    h1('New RFQ matching your expertise') +
    sub(`Hi ${engineerName}, a client just posted a request that fits your profile.`) +
    infoBox([
      { label: 'Title',     value: rfqTitle },
      { label: 'Category',  value: rfqCategory },
      { label: 'Budget',    value: budget || 'Not specified' },
      { label: 'Posted by', value: clientName },
    ]) +
    btn('View & Respond to RFQ', `${APP_URL}/dashboard/engineer`, true) +
    pp('Be one of the first to respond — early replies are 2x more likely to convert to a paid order.')
  return resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDR}>`, to,
    subject: `New RFQ: ${rfqTitle}`,
    html: emailBase(body),
  })
}
