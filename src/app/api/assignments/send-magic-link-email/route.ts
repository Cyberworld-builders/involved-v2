import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/services/email-service'

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

    const result = await sendEmail(to, subject, htmlBody, textBody, {
      logMetadata: {
        emailType: 'magic_link',
      },
    })

    if (!result.success) {
      console.error('Failed to send magic link email:', result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    console.log('Magic link email sent. Message ID:', result.messageId)
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
    })
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
