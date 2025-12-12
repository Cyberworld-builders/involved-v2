import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/signin
 * Sign in user with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message?.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to sign in' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Sign in successful',
        user: data.user,
        session: data.session,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
