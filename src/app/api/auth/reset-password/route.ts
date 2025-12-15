import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidEmail } from '@/lib/utils/email-validation'
import { sendEmail } from '@/lib/services/email-service'

/**
 * POST /api/auth/reset-password
 * Send password reset email using our custom email service.
 *
 * Why: Supabase's built-in auth emails depend on Supabase SMTP config/deliverability.
 * For Phase 1 we send the Supabase-generated recovery link via Resend/Mailpit.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const email =
      typeof body === 'object' && body !== null && 'email' in body
        ? (body as { email?: unknown }).email
        : undefined

    // Validation
    if (typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim()

    // Email validation
    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Do not reveal whether the account exists (security best practice).
    const okResponse = NextResponse.json(
      {
        message: 'If an account exists with this email, a password reset link has been sent.',
      },
      { status: 200 }
    )

    const greetingName = trimmedEmail.split('@')[0] || 'there'

    // Generate password reset token using Admin API
    const adminClient = createAdminClient()
    const origin = new URL(request.url).origin
    const redirectTo = `${origin}/auth/reset-password`

    // Generate password reset link
    const { data: resetData, error: resetError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: trimmedEmail,
      options: {
        redirectTo,
      },
    })

    if (resetError || !resetData) {
      console.error('Failed to generate password reset link:', resetError)
      return okResponse
    }

    // Send email using our custom email service
    // The generateLink response contains the action_link in properties
    const resetUrl = resetData.properties?.action_link

    if (!resetUrl) {
      console.error('No reset URL generated from Supabase:', resetData)
      return okResponse
    }

    const emailResult = await sendEmail(
      trimmedEmail,
      'Reset Your Password',
      `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2D2E30; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #FFBA00; color: #2D2E30; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${greetingName},</p>
              <p>You requested to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      `
Password Reset Request

Hello ${greetingName},

You requested to reset your password. Use the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

This is an automated message. Please do not reply to this email.
      `.trim()
    )

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      return okResponse
    }

    console.log('Password reset email sent successfully to:', trimmedEmail)

    return okResponse
  } catch (error) {
    console.error('Reset password error:', error)
    // Don't reveal the error to the user (security best practice)
    return NextResponse.json(
      {
        message: 'If an account exists with this email, a password reset link has been sent.',
      },
      { status: 200 }
    )
  }
}
