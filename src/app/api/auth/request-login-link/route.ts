import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Ensure baseUrl has a protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`
    }
    
    // Ensure returnUrl is a relative path or same origin
    let redirectTo = returnUrl
    try {
      const returnUrlObj = new URL(returnUrl)
      const baseUrlObj = new URL(baseUrl)
      
      // If returnUrl is same origin, use it; otherwise use just the path
      if (returnUrlObj.origin === baseUrlObj.origin) {
        redirectTo = returnUrlObj.pathname + returnUrlObj.search
      } else {
        // Extract path from returnUrl if it's a full URL
        redirectTo = returnUrlObj.pathname + returnUrlObj.search
      }
    } catch {
      // If returnUrl is already a relative path, use it as-is
      redirectTo = returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`
    }

    const adminClient = createAdminClient()

    // Check if user exists
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      )
    }

    const user = users.find(u => u.email === email)
    
    if (!user) {
      // Don't reveal that user doesn't exist (security best practice)
      // Still return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a login link has been sent.',
      })
    }

    // Generate magic link with redirectTo parameter
    // Note: generateLink creates the link but doesn't send the email automatically
    // We need to use signInWithOtp which sends the email automatically
    // However, admin client doesn't have signInWithOtp, so we'll use generateLink
    // and then manually send the email via our email service
    
    // Magic links need to go through the auth callback route first
    // Build the callback URL with the final destination as a parameter
    const callbackUrl = new URL('/auth/callback', baseUrl)
    callbackUrl.searchParams.set('next', redirectTo)
    
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: callbackUrl.toString(),
      },
    })

    if (error) {
      console.error('Error generating magic link:', error)
      return NextResponse.json(
        { error: 'Failed to generate login link' },
        { status: 500 }
      )
    }

    // The magic link is in data.properties.action_link
    // We need to send this link via email
    const magicLink = data.properties.action_link

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
          toName: user.user_metadata?.name || email.split('@')[0],
          magicLink: magicLink,
          returnUrl: redirectTo,
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
