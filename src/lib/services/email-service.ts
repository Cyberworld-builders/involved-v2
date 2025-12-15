/**
 * Email Service
 * 
 * Provides functions for generating and sending user invite emails.
 * Related to issue #45: Implement user invite email sending
 * 
 * Local Development:
 * - Uses Mailpit SMTP server (localhost:1025) when running locally
 * - View emails at http://127.0.0.1:54324
 * 
 * Production:
 * - Uses AWS SES SDK (recommended for serverless/Vercel) or SMTP
 * - AWS SES SDK avoids DNS resolution issues in serverless environments
 */

import nodemailer from 'nodemailer'
import dns from 'dns'
import { promisify } from 'util'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const resolve4 = promisify(dns.resolve4)

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
    // Use simple string split/join for replacement to avoid regex complexity
    rendered = rendered.split(placeholder).join(value)
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
    // Force UTC to make formatting deterministic across environments/timezones.
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Create SMTP transporter based on environment
 * 
 * Local development: Uses Mailpit SMTP (localhost:1025)
 * Production: Uses configured SMTP server from environment variables
 */
function createTransporter() {
  const isLocal = process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST
  
  if (isLocal) {
    // Local development: Use Mailpit SMTP server
    // Mailpit runs on port 1025 for SMTP (web UI is on 54324)
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false, // Mailpit doesn't use TLS
      // No auth required for Mailpit
    })
  }
  
  // Production: Use SMTP (for Supabase compatibility)
  // Note: If you encounter DNS resolution errors in Vercel, consider using AWS SES SDK instead
  // by setting AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465
  
  if (!smtpHost) {
    throw new Error('SMTP_HOST environment variable is required in production (or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION to use AWS SES SDK)')
  }
  
  // Custom DNS lookup function to help with Vercel's serverless DNS issues
  // Pre-resolve hostname to IP to avoid DNS resolution problems
  // Skip custom lookup for localhost (used in tests/local dev)
  const customLookup = (
    hostname: string,
    options: dns.LookupOptions,
    callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family: number) => void
  ) => {
    // For localhost, use default lookup (no DNS resolution needed)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return dns.lookup(hostname, options, callback)
    }
    
    // For remote hosts, try to resolve using dns.resolve4 first
    // Use a timeout to prevent hanging in CI/test environments
    const timeout = setTimeout(() => {
      // If resolution takes too long, fallback to default lookup
      dns.lookup(hostname, options, callback)
    }, 2000) // 2 second timeout
    
    resolve4(hostname)
      .then((addresses) => {
        clearTimeout(timeout)
        if (addresses && addresses.length > 0) {
          // Use the first resolved IP address
          callback(null, addresses[0], 4)
        } else {
          // Fallback to default lookup
          dns.lookup(hostname, options, callback)
        }
      })
      .catch(() => {
        clearTimeout(timeout)
        // If DNS resolution fails, fallback to default lookup
        dns.lookup(hostname, options, callback)
      })
  }

  // Configure transporter with explicit DNS and connection settings
  // This helps with serverless environments like Vercel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transporterConfig: any = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser && smtpPass ? {
      user: smtpUser,
      pass: smtpPass,
    } : undefined,
    // Connection timeouts for serverless environments
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Use custom lookup to help with DNS resolution in serverless
    lookup: customLookup,
  }

  // Add TLS configuration if using secure connection
  if (smtpSecure || smtpPort === 587) {
    transporterConfig.tls = {
      rejectUnauthorized: true,
      // Explicitly set servername to help with DNS resolution
      servername: smtpHost,
      // Use system DNS
      minVersion: 'TLSv1.2',
    }
  }

  return nodemailer.createTransport(transporterConfig)
}

/**
 * Send an email using AWS SES SDK (preferred for serverless/Vercel)
 * 
 * This bypasses SMTP and DNS resolution issues in serverless environments.
 * 
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param htmlBody - HTML body content
 * @param textBody - Plain text body content
 * @returns Delivery result
 */
async function sendEmailViaSES(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<EmailDeliveryResult> {
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  // Trim whitespace from region to prevent SDK errors
  const awsRegion = (process.env.AWS_REGION || 'us-east-1').trim()
  const fromEmail = process.env.SMTP_FROM || process.env.AWS_SES_FROM_EMAIL || 'noreply@involvedtalent.com'
  
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS credentials not configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)')
  }
  
  const sesClient = new SESClient({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  })
  
  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
      },
    },
  })
  
  try {
    const response = await sesClient.send(command)
    return {
      success: true,
      messageId: response.MessageId || `ses-${Date.now()}-${crypto.randomUUID()}`,
    }
  } catch (error) {
    console.error('AWS SES error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email via AWS SES'
    throw new Error(`AWS SES failed: ${errorMessage}`)
  }
}

/**
 * Send an email using SMTP or AWS SES SDK
 * 
 * This function prefers AWS SES SDK (if credentials are available) to avoid DNS resolution
 * issues in serverless environments like Vercel. Falls back to SMTP for local development.
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
  
  // Validate email format - using a comprehensive regex pattern
  // This pattern handles most common email formats including international domains
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (!emailRegex.test(to)) {
    throw new Error('to must be a valid email address')
  }
  
  // Prefer AWS SES SDK if credentials are available (avoids DNS issues in serverless)
  // Always use AWS SES if credentials are available, regardless of environment
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const useAwsSes = !!(awsAccessKeyId && awsSecretAccessKey)
  const isLocal = process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST
  
  // Log for debugging - this will help us see what's happening in Vercel logs
  console.log('[Email Service] Configuration check:', {
    useAwsSes,
    hasAccessKey: !!awsAccessKeyId,
    hasSecretKey: !!awsSecretAccessKey,
    accessKeyPrefix: awsAccessKeyId ? awsAccessKeyId.substring(0, 8) + '...' : 'none',
      region: (process.env.AWS_REGION || 'us-east-1').trim(),
    nodeEnv: process.env.NODE_ENV,
    smtpHost: process.env.SMTP_HOST ? 'set' : 'not set',
  })
  
  // Use AWS SES if credentials are available (preferred method)
  if (useAwsSes) {
    console.log('[Email Service] Attempting to send via AWS SES SDK')
    try {
      const result = await sendEmailViaSES(to, subject, htmlBody, textBody)
      console.log('[Email Service] AWS SES send successful:', result.messageId)
      return result
    } catch (error) {
      console.error('[Email Service] AWS SES failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      // If AWS SES fails, don't fall back to SMTP - return the error
      // This prevents DNS issues from happening
      return {
        success: false,
        error: `AWS SES failed: ${errorMessage}. Please verify your email address (jay@cyberworldbuilders.com) in AWS SES and check IAM permissions.`,
      }
    }
  }
  
  // If we get here, AWS credentials are not available
  console.warn('[Email Service] AWS SES credentials not available, attempting SMTP fallback')
  
  // Use SMTP (local Mailpit or configured SMTP server)
  try {
    const transporter = createTransporter()
    const fromEmail = process.env.SMTP_FROM || process.env.NEXT_PUBLIC_APP_NAME || 'noreply@involvedtalent.com'
    const fromName = process.env.SMTP_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Involved Talent'
    
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    })
    
    if (isLocal) {
      console.log('📧 Email sent to Mailpit. View at http://127.0.0.1:54324')
    }
    
    return {
      success: true,
      messageId: info.messageId || `email-${Date.now()}-${crypto.randomUUID()}`,
    }
  } catch (error) {
    console.error('Error sending email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error('Email error details:', errorDetails)
    
    // Provide helpful error message if SMTP is not configured
    let userFriendlyError = errorMessage
    if (errorMessage.includes('SMTP_HOST') || errorMessage.includes('required in production')) {
      userFriendlyError = 'SMTP not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables, or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION to use AWS SES SDK.'
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect')) {
      userFriendlyError = 'Cannot connect to SMTP server. Please check SMTP_HOST and SMTP_PORT settings, or use AWS SES SDK by setting AWS credentials.'
    } else if (errorMessage.includes('authentication') || errorMessage.includes('auth')) {
      userFriendlyError = 'SMTP authentication failed. Please check SMTP_USER and SMTP_PASS credentials, or use AWS SES SDK by setting AWS credentials.'
    } else if (errorMessage.includes('EBADNAME') || errorMessage.includes('queryA')) {
      userFriendlyError = 'DNS resolution failed. Please use AWS SES SDK by setting AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables.'
    }
    
    return {
      success: false,
      error: userFriendlyError,
    }
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
