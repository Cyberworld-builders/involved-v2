import { NextRequest, NextResponse } from 'next/server'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { logEmail } from '@/lib/email-log'

interface SendMagicLinkEmailRequest {
  to: string
  toName: string
  magicLink: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendMagicLinkEmailRequest = await request.json()
    const { to, toName, magicLink } = body

    if (!to || !magicLink) {
      return NextResponse.json(
        { error: 'Email and magicLink are required' },
        { status: 400 }
      )
    }

    const subject = 'Your Login Link'
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hello ${toName},</h2>
        <p>Click the button below to log in and access your assessment:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Log In
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 15 minutes. If the button doesn't work, copy and paste this URL into your browser:
        </p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">
          ${magicLink}
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't request this login link, you can safely ignore this email.
        </p>
      </div>
    `

    const textBody = `
Hello ${toName},

Click the link below to log in and access your assessment:

${magicLink}

This link will expire in 15 minutes.

If you didn't request this login link, you can safely ignore this email.
    `.trim()

    // Check if email service is configured
    const awsRoleArn = process.env.AWS_ROLE_ARN?.trim()
    const awsAccessKeyId = (process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID)?.trim()
    const awsSecretAccessKey = (process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)?.trim()
    const hasAwsSesOidc = !!awsRoleArn
    const hasAwsSesAccessKeys = !!(awsAccessKeyId && awsSecretAccessKey)
    const hasAwsSes = hasAwsSesOidc || hasAwsSesAccessKeys

    if (!hasAwsSes && !process.env.RESEND_API_KEY) {
      console.warn('⚠️ Email service not configured. Magic link:', magicLink)
      return NextResponse.json({
        success: false,
        error: 'Email service not configured',
      }, { status: 503 })
    }

    // Send via AWS SES
    if (hasAwsSes) {
      try {
        let credentials
        
        if (awsRoleArn) {
          try {
            const { awsCredentialsProvider } = await import('@vercel/functions/oidc')
            credentials = awsCredentialsProvider({
              roleArn: awsRoleArn,
            })
          } catch (_oidcError) {
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
          credentials = {
            accessKeyId: awsAccessKeyId!,
            secretAccessKey: awsSecretAccessKey!,
          }
        }

        const sesClient = new SESClient({
          region: (process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1').trim(),
          credentials,
        })

        const fromEmail = (process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@example.com').trim()

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
                Data: textBody,
                Charset: 'UTF-8',
              },
            },
          },
        })

        const response = await sesClient.send(sendCommand)
        console.log('✅ Magic link email sent via AWS SES. Message ID:', response.MessageId)

        await logEmail({
          emailType: 'magic_link',
          recipientEmail: to,
          subject: 'Your Login Link',
          providerMessageId: response.MessageId ?? undefined,
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

    // Fallback to Resend if configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { data, error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@example.com',
          to: to,
          subject: subject,
          html: htmlBody,
          text: textBody,
        })

        if (error) {
          throw new Error(`Failed to send email via Resend: ${error.message}`)
        }

        console.log('✅ Magic link email sent via Resend. Message ID:', data?.id)

        await logEmail({
          emailType: 'magic_link',
          recipientEmail: to,
          subject: 'Your Login Link',
          providerMessageId: data?.id ?? undefined,
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

    throw new Error('Email service configuration error')
  } catch (error) {
    console.error('Error sending magic link email:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      },
      { status: 500 }
    )
  }
}
