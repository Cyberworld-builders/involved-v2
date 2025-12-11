/**
 * Email Service
 * 
 * Provides functions for generating and sending user invite emails.
 * Related to issue #45: Implement user invite email sending
 */

export interface InviteEmailData {
  recipientEmail: string
  recipientName: string
  inviteToken: string
  inviteUrl: string
  expirationDate: Date
  organizationName?: string
}

export interface EmailTemplate {
  subject: string
  htmlBody: string
  textBody: string
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Generate an invite email for a new user
 * 
 * @param data - The invite email data
 * @returns Email template with subject and body
 * 
 * @example
 * const email = generateInviteEmail({
 *   recipientEmail: 'user@example.com',
 *   recipientName: 'John Doe',
 *   inviteToken: 'abc123...',
 *   inviteUrl: 'https://example.com/invite?token=abc123',
 *   expirationDate: new Date('2024-01-15'),
 * })
 */
export function generateInviteEmail(data: InviteEmailData): EmailTemplate {
  // Validate required fields
  if (!data.recipientEmail || typeof data.recipientEmail !== 'string') {
    throw new Error('recipientEmail is required and must be a string')
  }
  
  if (!data.recipientName || typeof data.recipientName !== 'string') {
    throw new Error('recipientName is required and must be a string')
  }
  
  if (!data.inviteToken || typeof data.inviteToken !== 'string') {
    throw new Error('inviteToken is required and must be a string')
  }
  
  if (!data.inviteUrl || typeof data.inviteUrl !== 'string') {
    throw new Error('inviteUrl is required and must be a string')
  }
  
  if (!data.expirationDate || !(data.expirationDate instanceof Date) || isNaN(data.expirationDate.getTime())) {
    throw new Error('expirationDate is required and must be a valid Date')
  }
  
  const orgName = data.organizationName || 'our platform'
  const expirationStr = formatExpirationDate(data.expirationDate)
  
  // Generate subject
  const subject = `You're invited to join ${orgName}`
  
  // Generate HTML body
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2D2E30; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #FFBA00; color: #2D2E30; text-decoration: none; border-radius: 4px; font-weight: bold; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${orgName}!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>You've been invited to join ${orgName}. Click the button below to accept your invitation and set up your account.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${data.inviteUrl}</p>
      <p><strong>This invitation will expire on ${expirationStr}.</strong></p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim()
  
  // Generate plain text body
  const textBody = `
Hi ${data.recipientName},

You've been invited to join ${orgName}. Click the link below to accept your invitation and set up your account.

${data.inviteUrl}

This invitation will expire on ${expirationStr}.

If you didn't expect this invitation, you can safely ignore this email.

---
This is an automated message. Please do not reply to this email.
`.trim()
  
  return {
    subject,
    htmlBody,
    textBody,
  }
}

/**
 * Render an email template with custom data
 * 
 * @param template - The template string with placeholders
 * @param data - The data to replace placeholders with
 * @returns Rendered template string
 * 
 * @example
 * const rendered = renderEmailTemplate(
 *   'Hello {name}, your token is {token}',
 *   { name: 'John', token: 'abc123' }
 * )
 * // Returns: 'Hello John, your token is abc123'
 */
export function renderEmailTemplate(template: string, data: Record<string, string>): string {
  // Validate inputs
  if (!template || typeof template !== 'string') {
    throw new Error('template must be a non-empty string')
  }
  
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('data must be an object')
  }
  
  let rendered = template
  
  // Replace all placeholders in the format {key}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') {
      throw new Error(`data.${key} must be a string`)
    }
    const placeholder = `{${key}}`
    rendered = rendered.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
  }
  
  return rendered
}

/**
 * Format expiration date for display in emails
 * 
 * @param date - The date to format
 * @returns Formatted date string
 * 
 * @example
 * formatExpirationDate(new Date('2024-01-15'))
 * // Returns: 'Monday, January 15, 2024'
 */
export function formatExpirationDate(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('date must be a valid Date object')
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Send an email (mock-ready function for testing)
 * 
 * This function is designed to work with email service providers.
 * In tests, it can be easily mocked to verify email sending behavior.
 * 
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param htmlBody - HTML body content
 * @param textBody - Plain text body content
 * @returns Delivery result
 * 
 * @example
 * const result = await sendEmail(
 *   'user@example.com',
 *   'Welcome!',
 *   '<p>Hello</p>',
 *   'Hello'
 * )
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<EmailDeliveryResult> {
  // Validate inputs
  if (!to || typeof to !== 'string') {
    throw new Error('to must be a non-empty string')
  }
  
  if (!subject || typeof subject !== 'string') {
    throw new Error('subject must be a non-empty string')
  }
  
  if (!htmlBody || typeof htmlBody !== 'string') {
    throw new Error('htmlBody must be a non-empty string')
  }
  
  if (!textBody || typeof textBody !== 'string') {
    throw new Error('textBody must be a non-empty string')
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) {
    throw new Error('to must be a valid email address')
  }
  
  // TODO: Integrate with actual email service (Resend, SendGrid, AWS SES, etc.)
  // For now, this is a placeholder that logs the email and returns success
  console.log('📧 Email to send:')
  console.log('To:', to)
  console.log('Subject:', subject)
  console.log('HTML Body length:', htmlBody.length)
  console.log('Text Body length:', textBody.length)
  
  // Simulate successful delivery
  return {
    success: true,
    messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  }
}

/**
 * Send an invite email to a user
 * 
 * Combines email generation and sending into a single convenient function.
 * 
 * @param data - The invite email data
 * @returns Delivery result
 * 
 * @example
 * const result = await sendInviteEmail({
 *   recipientEmail: 'user@example.com',
 *   recipientName: 'John Doe',
 *   inviteToken: 'abc123...',
 *   inviteUrl: 'https://example.com/invite?token=abc123',
 *   expirationDate: new Date('2024-01-15'),
 * })
 */
export async function sendInviteEmail(data: InviteEmailData): Promise<EmailDeliveryResult> {
  // Generate the email template
  const template = generateInviteEmail(data)
  
  // Send the email
  return await sendEmail(
    data.recipientEmail,
    template.subject,
    template.htmlBody,
    template.textBody
  )
}
