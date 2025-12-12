import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { isValidEmail } from '@/lib/utils/email-validation'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

/**
 * GET /api/profile
 * Fetches the current user's profile
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile
 * Updates the current user's profile information
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { name, email, username } = body

    // Build update object
    const updates: ProfileUpdate = {
      updated_at: new Date().toISOString(),
    }

    // Validate and add fields if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        )
      }
      updates.name = name.trim()
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim() === '') {
        return NextResponse.json(
          { error: 'Email cannot be empty' },
          { status: 400 }
        )
      }
      
      const trimmedEmail = email.trim()
      
      // Validate email format
      if (!isValidEmail(trimmedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check if email is already taken by another user
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, auth_user_id')
        .eq('email', trimmedEmail)
        .single()

      if (existingProfile && existingProfile.auth_user_id !== user.id) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 409 }
        )
      }

      updates.email = trimmedEmail
    }

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim() === '') {
        return NextResponse.json(
          { error: 'Username cannot be empty' },
          { status: 400 }
        )
      }

      const trimmedUsername = username.trim()

      // Check if username is already taken by another user
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, auth_user_id')
        .eq('username', trimmedUsername)
        .single()

      if (existingProfile && existingProfile.auth_user_id !== user.id) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 409 }
        )
      }

      updates.username = trimmedUsername
    }

    // Check if there are any fields to update besides updated_at
    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update profile
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('auth_user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }
      console.error('Error updating profile:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile: updatedProfile })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
