import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/config'

interface RequestLoginLinkBody {
  email: string
  returnUrl: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestLoginLinkBody = await request.json()
    const { email, returnUrl } = body

    if (!email || !returnUrl) {
      return NextResponse.json(
        { error: 'Email and returnUrl are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Get the base URL for redirect
    const baseUrl = getAppUrl()

    // Use a clean callback URL without query parameters to avoid issues with Supabase redirect URL validation
    const callbackUrl = new URL('/auth/callback', baseUrl).toString()

    const adminClient = createAdminClient()

    // generateLink does the existence check atomically: it errors for unknown emails
    // and returns the user record for known ones. We deliberately avoid listUsers() —
    // it pages at 50 by default, so any user past the first page got silently dropped
    // (incident on 2026-05-12 during Frontier launch when total users crossed 50).
    // On any error we fall through to the generic no-enumeration success response.
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: callbackUrl,
      },
    })

    if (error || !data?.properties?.action_link) {
      if (error) {
        console.error('Error generating magic link:', error)
      }
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a login link has been sent.',
      })
    }

    const magicLink = data.properties.action_link
    const user = data.user

    // Send the magic link email
    try {
      // Construct the full URL for the email service endpoint
      const emailServiceUrl = new URL('/api/assignments/send-magic-link-email', baseUrl).toString()
      
      const emailResponse = await fetch(emailServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          toName: user?.user_metadata?.name || email.split('@')[0],
          magicLink: magicLink,
        }),
      })

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}))
        console.error('Failed to send magic link email:', errorData)
        // Still return success to user to prevent email enumeration, but log the error
      }
    } catch (emailError) {
      console.error('Error sending magic link email:', emailError)
      // Still return success to user to prevent email enumeration
    }

    return NextResponse.json({
      success: true,
      message: 'Login link sent successfully',
    })
  } catch (error) {
    console.error('Error in request-login-link:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send login link',
      },
      { status: 500 }
    )
  }
}
