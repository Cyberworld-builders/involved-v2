import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MIN_TOKEN_LENGTH } from '@/lib/utils/auth-validation'
import { isValidEmail } from '@/lib/utils/email-validation'

/**
 * POST /api/auth/verify-email
 * Verify user email with OTP token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, email, type = 'email' } = body

    // Validation
    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Email validation
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Token validation
    if (token.length < MIN_TOKEN_LENGTH) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    })

    if (error) {
      if (error.message?.includes('expired')) {
        return NextResponse.json(
          { error: 'Verification token has expired' },
          { status: 410 }
        )
      }
      if (error.message?.includes('invalid')) {
        return NextResponse.json(
          { error: 'Invalid verification token' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        user: data.user,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
