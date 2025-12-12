import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'
import { isValidEmail } from '@/lib/utils/email-validation'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

/**
 * GET /api/users/[id]
 * Fetches a single user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user by ID
    const { data: userData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching user:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: userData })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/users/[id]
 * Updates a user's information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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
    const { name, email, username, client_id, industry_id, completed_profile, role } = body

    // Build update object
    const updates: ProfileUpdate = {
      updated_at: new Date().toISOString(),
    }

    // Validate and add fields if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'User name cannot be empty' },
          { status: 400 }
        )
      }
      updates.name = name.trim()
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim() === '') {
        return NextResponse.json(
          { error: 'User email cannot be empty' },
          { status: 400 }
        )
      }
      // Validate email format
      if (!isValidEmail(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
      updates.email = email.trim()
    }

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim() === '') {
        return NextResponse.json(
          { error: 'Username cannot be empty' },
          { status: 400 }
        )
      }
      updates.username = username.trim()
    }

    if (client_id !== undefined) {
      updates.client_id = client_id
    }

    if (industry_id !== undefined) {
      updates.industry_id = industry_id
    }

    if (completed_profile !== undefined) {
      updates.completed_profile = completed_profile
    }

    if (role !== undefined) {
      if (!['admin', 'client', 'user'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be one of: admin, client, user' },
          { status: 400 }
        )
      }
      updates.role = role
    }

    // Check if there are any fields to update besides updated_at
    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/[id]
 * Deletes a user from the database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's auth_user_id before deleting profile
    const { data: userData } = await supabase
      .from('profiles')
      .select('auth_user_id')
      .eq('id', id)
      .single()

    // Delete profile
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    // Try to delete auth user if we have the auth_user_id
    if (userData?.auth_user_id) {
      try {
        const adminClient = createAdminClient()
        await adminClient.auth.admin.deleteUser(userData.auth_user_id)
      } catch (deleteError) {
        console.error('Failed to delete auth user:', deleteError)
        // Don't fail the request if auth user deletion fails
      }
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
