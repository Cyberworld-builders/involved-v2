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

      // Check if profile with email already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, auth_user_id, email, status')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle()

      // Check if profile with email exists (case-insensitive check)
      // Also check by auth_user_id if we have it from a previous attempt
      if (existingProfile) {
        results.push({
          user: email,
          success: false,
          error: 'User with this email already exists',
        })
        continue
      }

      // Try to get auth user by email using admin API
      // This is important to catch cases where auth user exists but profile doesn't
      let existingAuthUser = null
      try {
        const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers()
        if (!listError && authUsers?.users) {
          existingAuthUser = authUsers.users.find(
            (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
          )
        }
      } catch (error) {
        // If we can't list users, we'll handle it when trying to create
        console.warn('Could not check for existing auth user:', error)
      }

      // If auth user exists but profile doesn't, we'll create the profile
      // This handles the case where single user creation partially succeeded

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

        // Create or get existing auth user
        let authUserId: string
        let isNewAuthUser = false

        if (existingAuthUser) {
          // Auth user exists, use it
          authUserId = existingAuthUser.id
          // Optionally update password if provided
          if (password) {
            await adminClient.auth.admin.updateUserById(authUserId, {
              password: password,
            })
          }
        } else {
          // Create new auth user
          const { data: newAuthData, error: authError2 } = await adminClient.auth.admin.createUser({
            email: email.trim(),
            password: password || 'temp123',
            email_confirm: true,
            user_metadata: {
              full_name: name.trim(),
              username: finalUsername,
            },
          })

          // Check if error is due to user already existing
          if (authError2) {
            // Check if it's a duplicate user error
            const isDuplicateError =
              authError2.message?.toLowerCase().includes('already registered') ||
              authError2.message?.toLowerCase().includes('already exists') ||
              authError2.message?.toLowerCase().includes('user already registered') ||
              authError2.status === 422 ||
              authError2.code === 'user_already_exists'

            if (isDuplicateError) {
              // User exists, try to find it
              const { data: authUsers } = await adminClient.auth.admin.listUsers()
              const foundUser = authUsers?.users?.find(
                (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
              )
              if (foundUser) {
                authUserId = foundUser.id
                // Update password if provided
                if (password) {
                  await adminClient.auth.admin.updateUserById(authUserId, {
                    password: password,
                  })
                }
              } else {
                // User exists but we can't find it - this shouldn't happen but handle gracefully
                results.push({
                  user: email,
                  success: false,
                  error: 'User already exists but could not be retrieved. Please try single user creation.',
                })
                continue
              }
            } else {
              console.error('Error creating auth user:', authError2)
              results.push({
                user: email,
                success: false,
                error: authError2.message || 'Failed to create auth user',
              })
              continue
            }
          } else if (!newAuthData?.user) {
            results.push({
              user: email,
              success: false,
              error: 'Failed to create auth user',
            })
            continue
          } else {
            authUserId = newAuthData.user.id
            isNewAuthUser = true
          }
        }

        // Before creating profile, check if one already exists with this auth_user_id
        // This handles the case where profile exists but email check didn't find it
        const { data: existingProfileByAuthId } = await adminClient
          .from('profiles')
          .select('id, email, auth_user_id, status')
          .eq('auth_user_id', authUserId)
          .maybeSingle()

        // Create or update profile
        let profile
        let profileError

        if (existingProfileByAuthId) {
          // Profile already exists for this auth_user_id - update it
          const { data: updatedProfile, error: updateError } = await adminClient
            .from('profiles')
            .update({
              username: finalUsername,
              name: name.trim(),
              email: email.trim(), // Update email in case it changed
              client_id: resolvedClientId,
              industry_id: industry_id || null,
              role: resolvedRole,
              access_level: resolvedAccessLevel,
              status: status || existingProfileByAuthId.status || 'active',
            })
            .eq('id', existingProfileByAuthId.id)
            .select()
            .single()

          profile = updatedProfile
          profileError = updateError
        } else {
          // Create new profile
          const { data: newProfile, error: createError } = await adminClient
            .from('profiles')
            .insert({
              auth_user_id: authUserId,
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

          profile = newProfile
          profileError = createError
        }

        if (profileError) {
          console.error('Error creating/updating profile:', profileError)
          
          // Check if it's a duplicate key error for auth_user_id
          if (profileError.code === '23505' && profileError.message?.includes('auth_user_id')) {
            // Profile with this auth_user_id already exists
            // Try to fetch it and return success (user already exists)
            try {
              const { data: existingProfileByAuthId } = await adminClient
                .from('profiles')
                .select('*')
                .eq('auth_user_id', authUserId)
                .single()

              if (existingProfileByAuthId) {
                // User already fully exists, treat as success
                results.push({
                  user: email,
                  success: true,
                  userId: existingProfileByAuthId.id,
                })
                continue
              }
            } catch (fetchError) {
              console.error('Error fetching existing profile:', fetchError)
            }
          }

          // Only try to clean up auth user if we created it (not if it existed)
          if (isNewAuthUser) {
            try {
              await adminClient.auth.admin.deleteUser(authUserId)
            } catch (deleteError) {
              console.error('Failed to cleanup auth user:', deleteError)
            }
          }
          
          // Provide more helpful error message
          const errorMessage = profileError.message || 'Unknown error'
          results.push({
            user: email,
            success: false,
            error: `Profile ${existingProfileByAuthId ? 'update' : existingProfile ? 'update' : 'creation'} failed: ${errorMessage}`,
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
