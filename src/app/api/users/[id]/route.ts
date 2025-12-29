import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'
import { isValidEmail } from '@/lib/utils/email-validation'
import { generateUsernameFromName, generateUniqueUsername } from '@/lib/utils/username-generation'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

const VALID_ROLES = ['admin', 'manager', 'client', 'user', 'unverified'] as const
type ValidRole = (typeof VALID_ROLES)[number]

const VALID_ACCESS_LEVELS = ['member', 'client_admin', 'super_admin'] as const
type ValidAccessLevel = (typeof VALID_ACCESS_LEVELS)[number]

function deriveAccessLevel(input: {
  access_level?: unknown
  role?: unknown
}): ValidAccessLevel {
  const accessLevel = input.access_level
  if (typeof accessLevel === 'string' && (VALID_ACCESS_LEVELS as readonly string[]).includes(accessLevel)) {
    return accessLevel as ValidAccessLevel
  }

  const role = input.role
  if (role === 'admin') return 'super_admin'
  if (role === 'manager' || role === 'client') return 'client_admin'
  return 'member'
}

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

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('access_level, role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    const actorAccessLevel = deriveAccessLevel({
      access_level: actorProfile?.access_level,
      role: actorProfile?.role,
    })
    const actorClientId = actorProfile?.client_id || null

    const isSuperAdmin = actorAccessLevel === 'super_admin'
    const isClientAdmin = actorAccessLevel === 'client_admin'

    if (!isSuperAdmin && !isClientAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (isClientAdmin && !actorClientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Client admins can only view users within their client scope
    if (isClientAdmin && actorClientId && userData.client_id !== actorClientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('access_level, role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    const actorAccessLevel = deriveAccessLevel({
      access_level: actorProfile?.access_level,
      role: actorProfile?.role,
    })
    const actorClientId = actorProfile?.client_id || null

    const isSuperAdmin = actorAccessLevel === 'super_admin'
    const isClientAdmin = actorAccessLevel === 'client_admin'

    if (!isSuperAdmin && !isClientAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (isClientAdmin && !actorClientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id, role, access_level, client_id')
      .eq('id', id)
      .single()

    if (targetProfileError || !targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetAccessLevel = deriveAccessLevel({
      access_level: targetProfile.access_level,
      role: targetProfile.role,
    })

    // Client admins can only manage users within their client scope
    if (isClientAdmin) {
      if (targetProfile.client_id !== actorClientId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Parse request body
    const body = await request.json()
    const { name, email, client_id, industry_id, completed_profile, role, access_level, status } = body

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
      
      // Auto-generate username when name changes
      const baseUsername = generateUsernameFromName(name.trim())
      const checkUsernameExists = async (username: string): Promise<boolean> => {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', id) // Exclude current user
          .single()
        return !!data
      }
      const finalUsername = await generateUniqueUsername(baseUsername, checkUsernameExists)
      updates.username = finalUsername
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

    if (client_id !== undefined) {
      // Client admins cannot move users between clients (or remove client) outside their scope
      if (isClientAdmin && actorClientId && client_id !== actorClientId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      updates.client_id = client_id
    }

    if (industry_id !== undefined) {
      updates.industry_id = industry_id
    }

    if (completed_profile !== undefined) {
      updates.completed_profile = completed_profile
    }

    if (access_level !== undefined) {
      if (typeof access_level !== 'string' || !VALID_ACCESS_LEVELS.includes(access_level as ValidAccessLevel)) {
        return NextResponse.json(
          { error: 'Invalid access_level. Must be one of: member, client_admin, super_admin' },
          { status: 400 }
        )
      }
      // Client admins cannot change a super_admin user’s access level.
      if (isClientAdmin && targetAccessLevel === 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Client admins can never assign super_admin.
      if (isClientAdmin && access_level === 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      updates.access_level = access_level as ValidAccessLevel
    }

    // Legacy role support (kept for backwards compatibility; not used for permissions)
    if (role !== undefined) {
      if (typeof role !== 'string' || !VALID_ROLES.includes(role as ValidRole)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be one of: admin, manager, client, user, unverified' },
          { status: 400 }
        )
      }
      // Client admins cannot change role for an admin user (legacy behavior).
      if (isClientAdmin && targetProfile.role === 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Client admins cannot assign admin role (legacy behavior).
      if (isClientAdmin && role === 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      updates.role = role as ValidRole
    }

    if (status !== undefined) {
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: active, inactive, suspended' },
          { status: 400 }
        )
      }
      updates.status = status
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

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('access_level, role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    const actorAccessLevel = deriveAccessLevel({
      access_level: actorProfile?.access_level,
      role: actorProfile?.role,
    })
    const actorClientId = actorProfile?.client_id || null

    const isSuperAdmin = actorAccessLevel === 'super_admin'
    const isClientAdmin = actorAccessLevel === 'client_admin'

    if (!isSuperAdmin && !isClientAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (isClientAdmin && !actorClientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user's auth_user_id before deleting profile
    const { data: userData } = await supabase
      .from('profiles')
      .select('auth_user_id, role, access_level, client_id')
      .eq('id', id)
      .single()

    const userAccessLevel = deriveAccessLevel({
      access_level: userData?.access_level,
      role: userData?.role,
    })

    if (isClientAdmin) {
      if (userData?.client_id !== actorClientId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (userAccessLevel === 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

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
