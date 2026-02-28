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
    const dashboardUrl = `${baseUrl}/dashboard`

    // Format assessments list as clear buttons (table-based for Outlook)
    const assessmentsList = assignments
      .map((a) => {
        if (a.url) {
          return `<tr><td style="padding: 8px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color: #4F46E5; border-radius: 4px;">
                  <a href="${a.url}" target="_blank" style="display: inline-block; padding: 10px 20px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px;">${a.assessmentTitle}</a>
                </td>
              </tr>
            </table>
          </td></tr>`
        }
        return `<tr><td style="padding: 8px 0;">${a.assessmentTitle}</td></tr>`
      })
      .join('\n')

    // Wrap in a table
    const assessmentsHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${assessmentsList}</table>`

    // Also create a plain text version for text/plain email body
    const assessmentsListText = assignments
      .map((a) => {
        if (a.url) {
          return `- ${a.assessmentTitle}: ${a.url}`
        }
        return `- ${a.assessmentTitle}`
      })
      .join('\n')

    // Create fallback plain text links at the bottom (in case HTML links are blocked)
    const fallbackLinks = assignments
      .filter((a) => a.url)
      .map((a) => `${a.assessmentTitle}: ${a.url}`)
      .join('\n')

    // Format expiration date
    const formattedExpiration = formatExpirationDate(expirationDate)

    // Use provided username or derive from email
    const username = providedUsername || to.split('@')[0]
    const year = new Date().getFullYear()

    // Replace shortcodes in email body (use HTML version for assessments)
    let processedBody = replaceShortcodes(
      emailBody,
      toName,
      username,
      to,
      assessmentsHtml,
      formattedExpiration,
      password,
      dashboardUrl,
      year
    )
    
    // Add fallback plain text links at the bottom of HTML body (in case HTML links are blocked)
    const fallbackInstruction = "If links don't work in your email client, copy and paste the link(s) below into your browser."
    if (fallbackLinks) {
      processedBody += `\n\n---\n\n${fallbackInstruction}\n\n${fallbackLinks}`
    }

    // Add dashboard link (secondary) so users can find all assignments
    processedBody += `\n\n---\n\nYou can also open your dashboard to see all your assignments: ${dashboardUrl}`
    
    // Create plain text version for text/plain email body
    let processedBodyText = replaceShortcodes(
      emailBody,
      toName,
      username,
      to,
      assessmentsListText,
      formattedExpiration,
      password,
      dashboardUrl,
      year
    )
    
    // Add fallback plain text links at the bottom of plain text body
    if (fallbackLinks) {
      processedBodyText += `\n\n---\n\n${fallbackInstruction}\n\n${fallbackLinks}`
    }
    processedBodyText += `\n\n---\n\nYou can also open your dashboard to see all your assignments: ${dashboardUrl}`

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
        // Convert newlines to <br> but preserve existing HTML structure
        // If the body already contains HTML tags (like <ul>), preserve them
        // Handle the fallback links section separately to preserve line breaks
        let htmlBody = processedBody
        // Convert newlines to <br> for the main body, but preserve the fallback links section formatting
        if (htmlBody.includes('---')) {
          const parts = htmlBody.split('---')
          const mainPart = parts[0].includes('<ul>') || parts[0].includes('<li>') || parts[0].includes('<a')
            ? parts[0].replace(/\n/g, '<br>')
            : `<p>${parts[0].replace(/\n/g, '<br>')}</p>`
          const fallbackPart = parts.slice(1).join('---').replace(/\n/g, '<br>')
          htmlBody = mainPart + '<br>---<br><br>' + fallbackPart
        } else {
          htmlBody = processedBody.includes('<ul>') || processedBody.includes('<li>') || processedBody.includes('<a')
            ? processedBody.replace(/\n/g, '<br>')
            : `<p>${processedBody.replace(/\n/g, '<br>')}</p>`
        }

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
        // Format HTML body similar to AWS SES
        let resendHtmlBody = processedBody
        if (resendHtmlBody.includes('---')) {
          const parts = resendHtmlBody.split('---')
          const mainPart = parts[0].includes('<ul>') || parts[0].includes('<li>') || parts[0].includes('<a')
            ? parts[0].replace(/\n/g, '<br>')
            : `<p>${parts[0].replace(/\n/g, '<br>')}</p>`
          const fallbackPart = parts.slice(1).join('---').replace(/\n/g, '<br>')
          resendHtmlBody = mainPart + '<br>---<br><br>' + fallbackPart
        } else {
          resendHtmlBody = processedBody.replace(/\n/g, '<br>')
        }
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

