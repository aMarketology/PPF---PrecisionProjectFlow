// Email notification service
// Uses Resend for email delivery (https://resend.com)

export interface EmailTemplate {
  to: string
  subject: string
  html: string
}

export type NotificationType = 
  | 'welcome'
  | 'order_placed'
  | 'order_accepted'
  | 'order_completed'
  | 'order_cancelled'
  | 'proposal_received'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'payment_received'
  | 'new_message'
  | 'profile_claimed'

interface NotificationData {
  userName?: string
  orderId?: string
  orderTitle?: string
  amount?: number
  proposalId?: string
  projectTitle?: string
  engineerName?: string
  clientName?: string
  message?: string
}

// Email templates
export function getEmailTemplate(type: NotificationType, data: NotificationData): { subject: string; html: string } {
  const templates: Record<NotificationType, { subject: string; html: string }> = {
    welcome: {
      subject: 'Welcome to Precision Project Flow!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to Precision Project Flow!</h1>
          <p>Hi ${data.userName || 'there'},</p>
          <p>Thank you for joining Precision Project Flow - the premier marketplace connecting clients with skilled engineering professionals.</p>
          <p>Here's what you can do now:</p>
          <ul>
            <li>Complete your profile to stand out</li>
            <li>Browse available services and projects</li>
            <li>Start connecting with clients or engineers</li>
          </ul>
          <a href="https://precisionprojectflow.com/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Go to Dashboard</a>
          <p style="margin-top: 32px; color: #666;">Best regards,<br>The Precision Project Flow Team</p>
        </div>
      `,
    },
    
    order_placed: {
      subject: `New Order Received: ${data.orderTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Order Received!</h1>
          <p>Hi ${data.engineerName},</p>
          <p>Great news! You've received a new order:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Order:</strong> ${data.orderTitle}</p>
            <p style="margin: 8px 0 0;"><strong>Client:</strong> ${data.clientName}</p>
            <p style="margin: 8px 0 0;"><strong>Amount:</strong> $${data.amount?.toLocaleString()}</p>
          </div>
          <p>Please review and accept the order within 24 hours.</p>
          <a href="https://precisionprojectflow.com/orders/${data.orderId}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Order</a>
        </div>
      `,
    },

    order_accepted: {
      subject: `Order Accepted: ${data.orderTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Order Accepted!</h1>
          <p>Hi ${data.clientName},</p>
          <p>Your order has been accepted by ${data.engineerName}!</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Order:</strong> ${data.orderTitle}</p>
            <p style="margin: 8px 0 0;"><strong>Engineer:</strong> ${data.engineerName}</p>
          </div>
          <p>Work will begin shortly. You can track progress in your dashboard.</p>
          <a href="https://precisionprojectflow.com/orders/${data.orderId}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Track Order</a>
        </div>
      `,
    },

    order_completed: {
      subject: `Order Completed: ${data.orderTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Order Completed!</h1>
          <p>Hi ${data.clientName},</p>
          <p>Great news! Your order has been completed:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Order:</strong> ${data.orderTitle}</p>
            <p style="margin: 8px 0 0;"><strong>Engineer:</strong> ${data.engineerName}</p>
          </div>
          <p>Please review the deliverables and leave a review if satisfied.</p>
          <a href="https://precisionprojectflow.com/orders/${data.orderId}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Review Deliverables</a>
        </div>
      `,
    },

    order_cancelled: {
      subject: `Order Cancelled: ${data.orderTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Order Cancelled</h1>
          <p>Hi ${data.userName},</p>
          <p>Your order has been cancelled:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Order:</strong> ${data.orderTitle}</p>
          </div>
          <p>If you have any questions, please contact our support team.</p>
          <a href="https://precisionprojectflow.com/support" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Contact Support</a>
        </div>
      `,
    },

    proposal_received: {
      subject: `New Proposal: ${data.projectTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Proposal Received!</h1>
          <p>Hi ${data.clientName},</p>
          <p>You've received a new proposal for your project:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Project:</strong> ${data.projectTitle}</p>
            <p style="margin: 8px 0 0;"><strong>From:</strong> ${data.engineerName}</p>
            <p style="margin: 8px 0 0;"><strong>Bid:</strong> $${data.amount?.toLocaleString()}</p>
          </div>
          <a href="https://precisionprojectflow.com/projects/${data.proposalId}/proposals" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Review Proposal</a>
        </div>
      `,
    },

    proposal_accepted: {
      subject: `Proposal Accepted: ${data.projectTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Congratulations! Your Proposal Was Accepted!</h1>
          <p>Hi ${data.engineerName},</p>
          <p>Great news! Your proposal has been accepted:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Project:</strong> ${data.projectTitle}</p>
            <p style="margin: 8px 0 0;"><strong>Client:</strong> ${data.clientName}</p>
            <p style="margin: 8px 0 0;"><strong>Amount:</strong> $${data.amount?.toLocaleString()}</p>
          </div>
          <p>Please review the project details and begin work.</p>
          <a href="https://precisionprojectflow.com/orders/${data.orderId}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Project</a>
        </div>
      `,
    },

    proposal_rejected: {
      subject: `Proposal Update: ${data.projectTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #666;">Proposal Not Selected</h1>
          <p>Hi ${data.engineerName},</p>
          <p>Thank you for your proposal. Unfortunately, the client has selected another engineer for this project:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Project:</strong> ${data.projectTitle}</p>
          </div>
          <p>Don't be discouraged! Keep submitting proposals to find the right match.</p>
          <a href="https://precisionprojectflow.com/projects" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Browse Projects</a>
        </div>
      `,
    },

    payment_received: {
      subject: `Payment Received: $${data.amount?.toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Payment Received!</h1>
          <p>Hi ${data.engineerName},</p>
          <p>Great news! You've received a payment:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Amount:</strong> $${data.amount?.toLocaleString()}</p>
            <p style="margin: 8px 0 0;"><strong>From:</strong> ${data.clientName}</p>
            <p style="margin: 8px 0 0;"><strong>For:</strong> ${data.orderTitle}</p>
          </div>
          <p>Funds will be available for withdrawal in 7-14 days.</p>
          <a href="https://precisionprojectflow.com/dashboard/engineer?tab=earnings" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Earnings</a>
        </div>
      `,
    },

    new_message: {
      subject: `New Message from ${data.userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Message</h1>
          <p>You have a new message from ${data.userName}:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;">${data.message}</p>
          </div>
          <a href="https://precisionprojectflow.com/messages" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Reply Now</a>
        </div>
      `,
    },

    profile_claimed: {
      subject: 'Your Company Profile Has Been Claimed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Profile Claimed Successfully!</h1>
          <p>Hi ${data.userName},</p>
          <p>Congratulations! You've successfully claimed your company profile on Precision Project Flow.</p>
          <p>You can now:</p>
          <ul>
            <li>Update your company information</li>
            <li>Add services and portfolio items</li>
            <li>Respond to client inquiries</li>
            <li>Receive orders and proposals</li>
          </ul>
          <a href="https://precisionprojectflow.com/dashboard/engineer" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Go to Dashboard</a>
        </div>
      `,
    },
  }

  return templates[type]
}

// Send email function (to be implemented with Resend)
export async function sendEmail(template: EmailTemplate): Promise<{ success: boolean; error?: string }> {
  // Check if Resend API key is configured
  const RESEND_API_KEY = process.env.RESEND_API_KEY

  if (!RESEND_API_KEY) {
    console.log('[Email] Resend API key not configured. Email not sent:', template.subject)
    return { success: true } // Return success in development
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Precision Project Flow <onboarding@resend.dev>',
        to: template.to,
        subject: template.subject,
        html: template.html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Email] Failed to send:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('[Email] Error:', error)
    return { success: false, error: String(error) }
  }
}

// Helper function to send notifications
export async function sendNotification(
  type: NotificationType,
  to: string,
  data: NotificationData
): Promise<{ success: boolean; error?: string }> {
  const template = getEmailTemplate(type, data)
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
  })
}
