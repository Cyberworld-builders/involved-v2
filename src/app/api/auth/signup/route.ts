import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateUsernameFromFirstLast } from '@/lib/utils/username-generation'

/**
 * POST /api/auth/signup
 * Creates a new user account with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName } = body

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          username: generateUsernameFromFirstLast(firstName, lastName)
        },
      },
    })

    if (error) {
      if (error.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: data.user,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
