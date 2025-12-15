import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MIN_PASSWORD_LENGTH } from '@/lib/utils/auth-constants'

/**
 * POST /api/users/[id]/reset-password
 * Reset a user's password (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: userId } = await params

    // Validate user ID format
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Get current user profile for authorization
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, access_level, role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (currentProfileError || !currentProfile) {
      return NextResponse.json(
        { error: 'Current user profile not found' },
        { status: 403 }
      )
    }

    // Derive access level
    const deriveAccessLevel = (input: { access_level?: unknown; role?: unknown }): 'member' | 'client_admin' | 'super_admin' => {
      const accessLevel = input.access_level
      if (typeof accessLevel === 'string' && ['member', 'client_admin', 'super_admin'].includes(accessLevel)) {
        return accessLevel as 'member' | 'client_admin' | 'super_admin'
      }
      const role = input.role
      if (role === 'admin') return 'super_admin'
      if (role === 'manager' || role === 'client') return 'client_admin'
      return 'member'
    }

    const actorAccessLevel = deriveAccessLevel({
      access_level: currentProfile.access_level,
      role: currentProfile.role,
    })

    const isSuperAdmin = actorAccessLevel === 'super_admin'
    const isClientAdmin = actorAccessLevel === 'client_admin'

    // Only admins can reset passwords
    if (!isSuperAdmin && !isClientAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can reset passwords' },
        { status: 403 }
      )
    }

    // Get target user profile
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, client_id, access_level, role')
      .eq('id', userId)
      .single()

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Client admins can only reset passwords for users in their client
    if (isClientAdmin) {
      if (targetProfile.client_id !== currentProfile.client_id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot reset password for users outside your organization' },
          { status: 403 }
        )
      }

      // Client admins cannot reset passwords for super admins
      const targetAccessLevel = deriveAccessLevel({
        access_level: targetProfile.access_level,
        role: targetProfile.role,
      })
      if (targetAccessLevel === 'super_admin') {
        return NextResponse.json(
          { error: 'Forbidden: Cannot reset password for super admins' },
          { status: 403 }
        )
      }
    }

    // Parse request body
    const body = await request.json()
    const { password } = body

    // Validate password
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Get auth_user_id from profile
    if (!targetProfile.auth_user_id) {
      return NextResponse.json(
        { error: 'User does not have an auth account' },
        { status: 400 }
      )
    }

    // Use admin client to reset password
    const adminClient = createAdminClient()

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetProfile.auth_user_id,
      {
        password: password,
      }
    )

    if (updateError) {
      console.error('Error resetting password:', updateError)
      return NextResponse.json(
        { error: `Failed to reset password: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
