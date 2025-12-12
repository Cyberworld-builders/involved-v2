import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/signout
 * Sign out the current user
 */
export async function POST() {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Sign out successful' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Signout error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
