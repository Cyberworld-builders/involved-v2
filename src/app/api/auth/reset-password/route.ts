import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/reset-password
 * Send password reset email to user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth/reset-password`,
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to send reset email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Password reset email sent' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
