import { NextRequest, NextResponse } from 'next/server'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { logEmail } from '@/lib/email-log'
import { getAppUrl } from '@/lib/config'

interface SendEmailRequest {
  to: string
  toName: string
  username?: string
  subject: string
  body: string
  assignments: Array<{
    assessmentTitle: string
    url?: string | null
  }>
  expirationDate: string
  password?: string
  /** Optional first assignment id for email_logs related_entity_id */
  assignmentId?: string
}

/**
 * Replace shortcodes in email body with actual values
 */
function replaceShortcodes(
  body: string,
  name: string,
  username: string,
  email: string,
  assessments: string,
  expirationDate: string,
  password: string | undefined,
  dashboardLink: string,
  year: number
): string {
  let processed = body
    .replace(/{name}/g, name)
    .replace(/{username}/g, username)
    .replace(/{email}/g, email)
    .replace(/{assessments}/g, assessments)
    .replace(/{expiration-date}/g, expirationDate)
    .replace(/{dashboard-link}/g, dashboardLink)
    .replace(/{year}/g, String(year))

  // Replace password if provided
  if (password) {
    processed = processed.replace(/{password}/g, password)
  } else {
    // Remove password placeholder if no password provided
    processed = processed.replace(/{password}/g, '')
  }

  return processed
}

/**
 * Format expiration date for display
 */
function formatExpirationDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Send assignment email via API route
 * This is a placeholder - you'll need to integrate with an email service
 * like Resend, SendGrid, AWS SES, or similar
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json()
    const { to, toName, username: providedUsername, subject, body: emailBody, assignments, expirationDate, password, assignmentId } = body

    const baseUrl = getAppUrl()
    const loginLink = `${baseUrl}/auth/forgot-password?email=${encodeURIComponent(to)}`

    // Format assessments as a simple list of names with a single dashboard button
    const assessmentNames = assignments.map((a) => a.assessmentTitle)
    const assessmentNamesList = assessmentNames
      .map((name) => `<li style="padding: 2px 0;">${name}</li>`)
      .join('')
    const assessmentsHtml = `<ul style="margin: 8px 0; padding-left: 20px;">${assessmentNamesList}</ul><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;"><tr><td align="center" style="background-color: #4F46E5; border-radius: 4px;"><a href="${loginLink}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Go to Dashboard</a></td></tr></table>`

    // Also create a plain text version for text/plain email body
    const assessmentsListText = assessmentNames
      .map((name) => `- ${name}`)
      .join('\n')

    // Format expiration date
    const formattedExpiration = formatExpirationDate(expirationDate)

    // Use provided username or derive from email
    const username = providedUsername || to.split('@')[0]
    const year = new Date().getFullYear()

    // The {assessments} shortcode produces block-level HTML (ul + table button),
    // so break out of any surrounding <p> tag to avoid invalid nesting.
    let processedBody = emailBody
      .replace(/<p>\s*\{assessments\}\s*<\/p>/g, assessmentsHtml)
      .replace(/{assessments}/g, assessmentsHtml)
    processedBody = replaceShortcodes(
      processedBody,
      toName,
      username,
      to,
      assessmentsHtml,
      formattedExpiration,
      password,
      loginLink,
      year
    )

    // Create plain text version for text/plain email body
    const processedBodyText = replaceShortcodes(
      emailBody,
      toName,
      username,
      to,
      assessmentsListText,
      formattedExpiration,
      password,
      loginLink,
      year
    )

    // Check if email service is configured
    // Priority: AWS SES with OIDC (AWS_ROLE_ARN) > AWS SES with access keys > Resend > SendGrid > SMTP
    // OIDC is preferred for production (Vercel deployments) as it follows AWS security best practices
    const awsRoleArn = process.env.AWS_ROLE_ARN?.trim()
    const awsAccessKeyId = (process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID)?.trim()
    const awsSecretAccessKey = (process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)?.trim()
    const hasAwsSesOidc = !!awsRoleArn
    const hasAwsSesAccessKeys = !!(awsAccessKeyId && awsSecretAccessKey)
    const hasAwsSes = hasAwsSesOidc || hasAwsSesAccessKeys
    
    const emailServiceConfigured = !!(
      hasAwsSes ||
      process.env.RESEND_API_KEY ||
      process.env.SENDGRID_API_KEY ||
      process.env.SMTP_HOST
    )

    if (!emailServiceConfigured) {
      console.warn('⚠️ Email service not configured. Email would be sent to:', to)
      console.warn('Subject:', subject)
      console.warn('Body preview:', processedBody.substring(0, 200) + '...')
      console.warn('To configure email sending, set one of: AWS_ROLE_ARN (preferred), AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST')
      
      return NextResponse.json(
        {
          success: false,
          error: 'Email service not configured. Please configure an email service (AWS SES with OIDC preferred, Resend, SendGrid, or SMTP) in environment variables.',
          message: 'Email service not configured',
        },
        { status: 503 }
      )
    }
    
    console.log('📧 Sending email:')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Email service priority check:', {
      hasAwsSesOidc,
      hasAwsSesAccessKeys,
      hasResend: !!process.env.RESEND_API_KEY,
      hasSendGrid: !!process.env.SENDGRID_API_KEY,
      hasSmtp: !!process.env.SMTP_HOST,
    })

    // Priority 1: AWS SES with OIDC (best practice for production)
    // Priority 2: AWS SES with access keys (fallback for local dev)
    if (hasAwsSes) {
      try {
        let credentials
        
        // Use OIDC if AWS_ROLE_ARN is set (Vercel deployments - best practice)
        if (awsRoleArn) {
          try {
            // Dynamic import to avoid errors in non-Vercel environments
            const { awsCredentialsProvider } = await import('@vercel/functions/oidc')
            credentials = awsCredentialsProvider({
              roleArn: awsRoleArn,
            })
            console.log('✅ Using OIDC credentials (AWS_ROLE_ARN)')
          } catch (oidcError) {
            console.warn('⚠️ OIDC provider not available, falling back to access keys:', oidcError)
            // Fallback to access keys if OIDC fails (e.g., local development)
            if (awsAccessKeyId && awsSecretAccessKey) {
              credentials = {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
              }
            } else {
              throw new Error('OIDC failed and no access keys available')
            }
          }
        } else {
          // Use access keys (fallback for local development)
          credentials = {
            accessKeyId: awsAccessKeyId!,
            secretAccessKey: awsSecretAccessKey!,
          }
          console.log('⚠️ Using access keys (consider using AWS_ROLE_ARN for production)')
        }

        const sesClient = new SESClient({
          region: (process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1').trim(),
          credentials,
        })

        const fromEmail = (process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@example.com').trim()
        // The body is already HTML from RichTextEditor (<p> tags handle spacing).
        // Strip stray newlines instead of converting to <br> to avoid extra whitespace.
        const htmlBody = processedBody.replace(/\n+/g, '')

        const sendCommand = new SendEmailCommand({
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
                Data: processedBodyText,
                Charset: 'UTF-8',
              },
            },
          },
        })

        const response = await sesClient.send(sendCommand)
        console.log('✅ Email sent via AWS SES. Message ID:', response.MessageId)

        await logEmail({
          emailType: 'assignment',
          recipientEmail: to,
          subject,
          providerMessageId: response.MessageId ?? undefined,
          relatedEntityType: assignmentId ? 'assignment' : null,
          relatedEntityId: assignmentId ?? null,
        })

        return NextResponse.json({
          success: true,
          message: 'Email sent successfully',
          messageId: response.MessageId,
        })
      } catch (sesError) {
        console.error('❌ AWS SES error:', sesError)
        throw new Error(`Failed to send email via AWS SES: ${sesError instanceof Error ? sesError.message : 'Unknown error'}`)
      }
    }

    // Priority 3: Try Resend if configured (only if AWS SES is not available)
    if (process.env.RESEND_API_KEY && !hasAwsSes) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        // The body is already HTML; strip stray newlines to avoid extra whitespace
        const resendHtmlBody = processedBody.replace(/\n+/g, '')
        const { data, error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@example.com',
          to: to,
          subject: subject,
          html: resendHtmlBody,
          text: processedBodyText,
        })

        if (error) {
          throw new Error(`Failed to send email via Resend: ${error.message}`)
        }

        console.log('✅ Email sent via Resend. Message ID:', data?.id)

        await logEmail({
          emailType: 'assignment',
          recipientEmail: to,
          subject,
          providerMessageId: data?.id ?? undefined,
          relatedEntityType: assignmentId ? 'assignment' : null,
          relatedEntityId: assignmentId ?? null,
        })

        return NextResponse.json({
          success: true,
          message: 'Email sent successfully',
          messageId: data?.id,
        })
      } catch (resendError) {
        console.error('❌ Resend error:', resendError)
        throw new Error(`Failed to send email via Resend: ${resendError instanceof Error ? resendError.message : 'Unknown error'}`)
      }
    }

    // If we get here, no email service was actually configured despite the check
    throw new Error('Email service configuration error')
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      },
      { status: 500 }
    )
  }
}

