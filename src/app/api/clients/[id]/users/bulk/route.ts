import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateUsernameFromName, generateUniqueUsername } from '@/lib/utils/username-generation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { users } = body

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'Users array is required' }, { status: 400 })
    }

    // Get industries for mapping
    const { data: industries, error: industriesError } = await supabase
      .from('industries')
      .select('id, name')

    if (industriesError) {
      return NextResponse.json({ error: industriesError.message }, { status: 500 })
    }

    // Create admin client for auth operations
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (error) {
      console.error('Failed to create admin client:', error)
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to initialize admin client',
          details: 'Make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables'
        },
        { status: 500 }
      )
    }

    // Create users
    const results = []
    
    for (const userData of users) {
      const industry = industries?.find(i => 
        i.name.toLowerCase() === userData.Industry.toLowerCase() || 
        userData.Industry === 'N/A'
      )

      // Check if profile already exists by email (case-insensitive)
      const { data: existingProfileByEmail } = await supabase
        .from('profiles')
        .select('id, auth_user_id, email')
        .eq('email', userData.Email.trim().toLowerCase())
        .maybeSingle()

      if (existingProfileByEmail) {
        results.push({ 
          user: userData.Email, 
          success: false, 
          error: 'User with this email already exists' 
        })
        continue
      }

      // Check if auth user already exists
      let existingAuthUser = null
      try {
        const { data: authUsers } = await adminClient.auth.admin.listUsers()
        existingAuthUser = authUsers?.users?.find(
          (u) => u.email?.toLowerCase() === userData.Email.trim().toLowerCase()
        )
      } catch (error) {
        console.warn('Could not check for existing auth user:', error)
      }

      if (existingAuthUser) {
        // Auth user exists - check if profile exists for this auth_user_id
        const { data: existingProfileByAuthId } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('auth_user_id', existingAuthUser.id)
          .maybeSingle()

        if (existingProfileByAuthId) {
          // Both auth user and profile exist
          results.push({ 
            user: userData.Email, 
            success: false, 
            error: 'User with this email already exists' 
          })
          continue
        }
        // Auth user exists but no profile - we'll create the profile below
      }

      // Generate username if not provided
      const baseUsername = userData.Username || generateUsernameFromName(userData.Name)

      // Generate unique username, checking for duplicates
      const checkUsernameExists = async (username: string): Promise<boolean> => {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single()
        return !!data
      }

      const finalUsername = await generateUniqueUsername(baseUsername, checkUsernameExists)

      try {
        // Create or get existing auth user
        let authData
        let authUserId: string
        let isNewAuthUser = false

        if (existingAuthUser) {
          // Auth user exists, use it
          authUserId = existingAuthUser.id
          authData = { user: existingAuthUser }
        } else {
          // Create new auth user
          const { data: newAuthData, error: authError } = await adminClient.auth.admin.createUser({
            email: userData.Email,
            password: 'temp123', // Default password - user should change on first login
            email_confirm: true,
            user_metadata: {
              full_name: userData.Name,
              username: finalUsername
            }
          })

          if (authError) {
            // Check if it's a duplicate user error
            const isDuplicateError =
              authError.message?.toLowerCase().includes('already registered') ||
              authError.message?.toLowerCase().includes('already exists') ||
              authError.message?.toLowerCase().includes('user already registered') ||
              authError.status === 422 ||
              authError.code === 'user_already_exists'

            if (isDuplicateError) {
              // User exists, try to find it
              const { data: authUsers } = await adminClient.auth.admin.listUsers()
              const foundUser = authUsers?.users?.find(
                (u) => u.email?.toLowerCase() === userData.Email.trim().toLowerCase()
              )
              if (foundUser) {
                authUserId = foundUser.id
                authData = { user: foundUser }
              } else {
                results.push({ 
                  user: userData.Email, 
                  success: false, 
                  error: 'User already exists but could not be retrieved'
                })
                continue
              }
            } else {
              const errorMsg = authError.message || 'Failed to create auth user'
              console.error(`[Bulk Create] Auth error for ${userData.Email}:`, errorMsg)
              results.push({ 
                user: userData.Email, 
                success: false, 
                error: errorMsg
              })
              continue
            }
          } else if (!newAuthData?.user) {
            results.push({ 
              user: userData.Email, 
              success: false, 
              error: 'Failed to create auth user'
            })
            continue
          } else {
            authData = newAuthData
            authUserId = newAuthData.user.id
            isNewAuthUser = true
          }
        }

        // Before creating profile, check if one already exists with this auth_user_id
        const { data: existingProfileByAuthId } = await adminClient
          .from('profiles')
          .select('id, email, auth_user_id')
          .eq('auth_user_id', authUserId)
          .maybeSingle()

        let profileError = null

        if (existingProfileByAuthId) {
          // Profile already exists for this auth_user_id - update it
          const { error: updateError } = await adminClient
            .from('profiles')
            .update({
              username: finalUsername,
              name: userData.Name,
              email: userData.Email,
              client_id: id,
              industry_id: industry?.id || null,
            })
            .eq('id', existingProfileByAuthId.id)

          profileError = updateError
        } else {
          // Create new profile
          const { error: createError } = await adminClient
            .from('profiles')
            .insert({
              auth_user_id: authUserId,
              username: finalUsername,
              name: userData.Name,
              email: userData.Email,
              client_id: id,
              industry_id: industry?.id || null,
              completed_profile: false,
            })

          profileError = createError
        }

        if (profileError) {
          // Check if it's a duplicate key error
          if (profileError.code === '23505' && profileError.message?.includes('auth_user_id')) {
            // Profile with this auth_user_id already exists - fetch and treat as success
            const { data: existingProfile } = await adminClient
              .from('profiles')
              .select('*')
              .eq('auth_user_id', authUserId)
              .single()

            if (existingProfile) {
              console.log(`[Bulk Create] User already exists: ${userData.Email}`)
              results.push({ 
                user: userData.Email, 
                success: true 
              })
              continue
            }
          }

          const errorMsg = `Profile ${existingProfileByAuthId ? 'update' : 'creation'} failed: ${profileError.message}`
          console.error(`[Bulk Create] Profile error for ${userData.Email}:`, profileError)
          results.push({ 
            user: userData.Email, 
            success: false, 
            error: errorMsg
          })
          // Try to clean up auth user if we created it and profile creation failed
          if (isNewAuthUser) {
            try {
              await adminClient.auth.admin.deleteUser(authUserId)
            } catch (deleteError) {
              console.error(`[Bulk Create] Failed to cleanup auth user for ${userData.Email}:`, deleteError)
            }
          }
        } else {
          console.log(`[Bulk Create] Successfully ${existingProfileByAuthId ? 'updated' : 'created'} user: ${userData.Email}`)
          results.push({ 
            user: userData.Email, 
            success: true 
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[Bulk Create] Unexpected error for ${userData.Email}:`, error)
        results.push({ 
          user: userData.Email, 
          success: false, 
          error: errorMsg
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    // Log summary for debugging
    console.log(`[Bulk Create] Summary: ${successCount} succeeded, ${failCount} failed`)
    if (failCount > 0) {
      console.log('[Bulk Create] First 5 failures:', results.filter(r => !r.success).slice(0, 5))
    }

    return NextResponse.json({
      success: true,
      created: successCount,
      failed: failCount,
      results: results.map(r => ({
        user: r.user,
        success: r.success,
        error: r.error || null,
        profileId: 'profileId' in r ? r.profileId || null : null
      }))
    })
  } catch (error) {
    console.error('Bulk user creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

