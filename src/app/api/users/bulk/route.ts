import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUsernameFromName, generateUsernameFromEmail, generateUniqueUsername } from '@/lib/utils/username-generation'
import { isValidEmail } from '@/lib/utils/email-validation'

/**
 * POST /api/users/bulk
 * Creates multiple users in bulk
 */
export async function POST(request: NextRequest) {
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

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('access_level, role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    const actorClientId = actorProfile?.client_id || null

    const VALID_ACCESS_LEVELS = ['member', 'client_admin', 'super_admin'] as const
    type ValidAccessLevel = (typeof VALID_ACCESS_LEVELS)[number]

    const deriveAccessLevel = (input: { access_level?: unknown; role?: unknown }): ValidAccessLevel => {
      const accessLevel = input.access_level
      if (typeof accessLevel === 'string' && (VALID_ACCESS_LEVELS as readonly string[]).includes(accessLevel)) {
        return accessLevel as ValidAccessLevel
      }
      const role = input.role
      if (role === 'admin') return 'super_admin'
      if (role === 'manager' || role === 'client') return 'client_admin'
      return 'member'
    }

    const actorAccessLevel = deriveAccessLevel({
      access_level: actorProfile?.access_level,
      role: actorProfile?.role,
    })

    const isSuperAdmin = actorAccessLevel === 'super_admin'
    const isClientAdmin = actorAccessLevel === 'client_admin'

    if (!isSuperAdmin && !isClientAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (isClientAdmin && !actorClientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { users } = body

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Users array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Create admin client for auth operations
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (error) {
      console.error('Failed to create admin client:', error)
      return NextResponse.json(
        {
          error: 'Failed to initialize admin client',
          details: 'Server configuration error',
        },
        { status: 500 }
      )
    }

    // Process each user
    const results = []

    for (const userData of users) {
      const { name, email, username, client_id, industry_id, password, role, access_level, status } = userData

      // Validate required fields for each user
      if (!name || typeof name !== 'string' || name.trim() === '') {
        results.push({
          user: email || 'unknown',
          success: false,
          error: 'User name is required',
        })
        continue
      }

      if (!email || typeof email !== 'string' || email.trim() === '') {
        results.push({
          user: name,
          success: false,
          error: 'User email is required',
        })
        continue
      }

      // Validate email format
      if (!isValidEmail(email)) {
        results.push({
          user: email,
          success: false,
          error: 'Invalid email format',
        })
        continue
      }

      // Validate access_level if provided
      if (access_level !== undefined && (typeof access_level !== 'string' || !VALID_ACCESS_LEVELS.includes(access_level as ValidAccessLevel))) {
        results.push({
          user: email,
          success: false,
          error: 'Invalid access_level. Must be one of: member, client_admin, super_admin',
        })
        continue
      }

      // Validate legacy role if provided (kept for backwards compatibility; not used for permissions)
      if (role !== undefined && !['admin', 'manager', 'client', 'user', 'unverified'].includes(role)) {
        results.push({
          user: email,
          success: false,
          error: 'Invalid role. Must be one of: admin, manager, client, user, unverified',
        })
        continue
      }

      // Validate status if provided
      if (status !== undefined && !['active', 'inactive', 'suspended'].includes(status)) {
        results.push({
          user: email,
          success: false,
          error: 'Invalid status. Must be one of: active, inactive, suspended',
        })
        continue
      }

      // Check if user with email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .single()

      if (existingUser) {
        results.push({
          user: email,
          success: false,
          error: 'User with this email already exists',
        })
        continue
      }

      // Generate username if not provided
      let baseUsername = username
      if (!baseUsername) {
        baseUsername = generateUsernameFromName(name)
        // If name generates an empty username, fall back to email
        if (!baseUsername || baseUsername.trim() === '') {
          baseUsername = generateUsernameFromEmail(email)
        }
      }

      // Check username uniqueness
      const checkUsernameExists = async (username: string): Promise<boolean> => {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single()
        return !!data
      }

      try {
        const finalUsername = await generateUniqueUsername(baseUsername, checkUsernameExists)

        const resolvedAccessLevel = deriveAccessLevel({ access_level, role })

        // Client admins: enforce client scope and block super_admin access assignment
        const resolvedClientId = isClientAdmin ? actorClientId : (client_id || null)
        if (isClientAdmin && resolvedAccessLevel === 'super_admin') {
          results.push({
            user: email,
            success: false,
            error: 'Forbidden',
          })
          continue
        }

        const resolvedRole = typeof role === 'string' ? role : (resolvedAccessLevel === 'super_admin' ? 'admin' : resolvedAccessLevel === 'client_admin' ? 'manager' : 'user')

        // Create auth user
        const { data: authData, error: authError2 } = await adminClient.auth.admin.createUser({
          email: email.trim(),
          password: password || 'temp123',
          email_confirm: true,
          user_metadata: {
            full_name: name.trim(),
            username: finalUsername,
          },
        })

        if (authError2 || !authData.user) {
          console.error('Error creating auth user:', authError2)
          results.push({
            user: email,
            success: false,
            error: 'Failed to create auth user',
          })
          continue
        }

        // Create profile
        const { data: profile, error: profileError } = await adminClient
          .from('profiles')
          .insert({
            auth_user_id: authData.user.id,
            username: finalUsername,
            name: name.trim(),
            email: email.trim(),
            client_id: resolvedClientId,
            industry_id: industry_id || null,
            role: resolvedRole,
            access_level: resolvedAccessLevel,
            completed_profile: false,
            status: status || 'active',
          })
          .select()
          .single()

        if (profileError) {
          console.error('Error creating profile:', profileError)
          // Try to clean up auth user
          try {
            await adminClient.auth.admin.deleteUser(authData.user.id)
          } catch (deleteError) {
            console.error('Failed to cleanup auth user:', deleteError)
          }
          results.push({
            user: email,
            success: false,
            error: 'Failed to create user profile',
          })
          continue
        }

        results.push({
          user: email,
          success: true,
          userId: profile.id,
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('Unexpected error creating user:', error)
        results.push({
          user: email,
          success: false,
          error: errorMsg,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      created: successCount,
      failed: failCount,
      results,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
