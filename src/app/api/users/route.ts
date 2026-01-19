import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'
import { generateUsernameFromName, generateUsernameFromEmail, generateUniqueUsername } from '@/lib/utils/username-generation'
import { isValidEmail } from '@/lib/utils/email-validation'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
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

function roleFromAccessLevel(accessLevel: ValidAccessLevel): ValidRole {
  switch (accessLevel) {
    case 'super_admin':
      return 'admin'
    case 'client_admin':
      return 'manager'
    case 'member':
    default:
      return 'user'
  }
}

/**
 * GET /api/users
 * Fetches all users from the database
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

    // Fetch all users
    let query = supabase
      .from('profiles')
      .select('*')

    if (isClientAdmin && actorClientId) {
      query = query.eq('client_id', actorClientId)
    }

    const { data: users, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * Creates a new user in the database
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

    // Parse request body
    const body = await request.json()
    const { name, email, username, client_id, industry_id, password, role, access_level, status } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'User email is required' },
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

    // Validate access_level if provided
    if (access_level !== undefined && (typeof access_level !== 'string' || !VALID_ACCESS_LEVELS.includes(access_level as ValidAccessLevel))) {
      return NextResponse.json(
        { error: 'Invalid access_level. Must be one of: member, client_admin, super_admin' },
        { status: 400 }
      )
    }

    // Validate legacy role if provided (kept for backwards compatibility; not used for permissions)
    if (role !== undefined && (typeof role !== 'string' || !VALID_ROLES.includes(role as ValidRole))) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: admin, manager, client, user, unverified' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status !== undefined && !['active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, inactive, suspended' },
        { status: 400 }
      )
    }

    // Check if user with email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
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

    const finalUsername = await generateUniqueUsername(baseUsername, checkUsernameExists)

    // Create admin client for auth operations
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (error) {
      console.error('Failed to create admin client:', error)
      return NextResponse.json(
        { 
          error: 'Failed to initialize admin client',
          details: 'Server configuration error'
        },
        { status: 500 }
      )
    }

    // Create auth user (we'll handle duplicates/errors below)
    let authData
    const { data: newAuthData, error: authError2 } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: password || 'temp123',
      email_confirm: true,
      user_metadata: {
        full_name: name.trim(),
        username: finalUsername
      }
    })

    if (authError2 || !newAuthData.user) {
      console.error('Error creating auth user:', authError2)
      
      // If it's a duplicate user error, the user already exists in auth
      // Check if profile exists - if so, return error; if not, we have an orphaned auth user
      if (
        authError2?.message?.includes('already registered') || 
        authError2?.status === 422 ||
        authError2?.code === 'user_already_exists'
      ) {
        // User exists in auth - check if profile exists via email (we already checked profiles table earlier)
        // Since we already checked profiles by email and didn't find one, this is an orphaned auth user
        // We can't easily get the auth user ID without listing all users, so we'll let the profile creation
        // handle the duplicate key error and clean up there
        return NextResponse.json(
          { 
            error: 'User with this email already exists in authentication system',
            details: 'Please contact support to resolve this issue'
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create auth user', details: authError2?.message },
        { status: 500 }
      )
    } else {
      authData = newAuthData
    }

    // Resolve access level for new user.
    // - super_admin can create any access_level
    // - client_admin can create member/client_admin but never super_admin
    const resolvedAccessLevel = deriveAccessLevel({
      access_level,
      role,
    })
    if (isClientAdmin && resolvedAccessLevel === 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Client scoping:
    // - client_admin can only create users under their own client_id
    // - super_admin can create users for any client (or none)
    // Handle empty strings, undefined, and null by converting them to null
    let clientIdValue: string | null = null
    if (client_id !== undefined && client_id !== null) {
      if (typeof client_id === 'string') {
        const trimmed = client_id.trim()
        if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
          clientIdValue = trimmed
        }
      }
    }
    const resolvedClientId =
      isClientAdmin ? actorClientId : clientIdValue
    
    // Debug logging
    console.log('[CREATE USER API] Raw client_id:', client_id, 'type:', typeof client_id)
    console.log('[CREATE USER API] Processed clientIdValue:', clientIdValue)
    console.log('[CREATE USER API] resolvedClientId:', resolvedClientId)
    console.log('[CREATE USER API] isClientAdmin:', isClientAdmin, 'actorClientId:', actorClientId)

    // Keep legacy role in sync (until we fully remove it from the product model)
    const resolvedRole: ValidRole =
      typeof role === 'string' && VALID_ROLES.includes(role as ValidRole)
        ? (role as ValidRole)
        : roleFromAccessLevel(resolvedAccessLevel)

    const profileData: ProfileInsert = {
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
    }
    
    // Debug logging
    console.log('[CREATE USER] profileData.client_id:', profileData.client_id)

    // Create profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      
      // If it's a duplicate key error for auth_user_id, check if profile exists
      if (profileError.code === '23505' && profileError.details?.includes('auth_user_id')) {
        // Profile might already exist - try to fetch it
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authData.user.id)
          .single()
        
        if (existingProfile) {
          // Profile exists - update it with the new client_id and other fields if provided
          const updateData: ProfileUpdate = {
            updated_at: new Date().toISOString(),
          }
          
          // Update client_id if provided and different
          if (resolvedClientId !== null && existingProfile.client_id !== resolvedClientId) {
            updateData.client_id = resolvedClientId
            console.log('[CREATE USER] Updating existing profile client_id from', existingProfile.client_id, 'to', resolvedClientId)
          }
          
          // Update industry_id if provided and different
          if (industry_id && existingProfile.industry_id !== industry_id) {
            updateData.industry_id = industry_id
          }
          
          // Update name if different
          if (name.trim() !== existingProfile.name) {
            updateData.name = name.trim()
          }
          
          // Update email if different
          if (email.trim() !== existingProfile.email) {
            updateData.email = email.trim()
          }
          
          // Only update if there are changes
          if (Object.keys(updateData).length > 1) { // More than just updated_at
            const { data: updatedProfile, error: updateError } = await adminClient
              .from('profiles')
              .update(updateData)
              .eq('id', existingProfile.id)
              .select()
              .single()
            
            if (updateError) {
              console.error('Error updating existing profile:', updateError)
              // Return existing profile even if update failed
              return NextResponse.json({ user: existingProfile }, { status: 200 })
            }
            
            return NextResponse.json({ user: updatedProfile }, { status: 200 })
          }
          
          // Profile exists and no updates needed - return it
          return NextResponse.json({ user: existingProfile }, { status: 200 })
        }
      }
      
      // Try to clean up auth user
      try {
        await adminClient.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.error('Failed to cleanup auth user:', deleteError)
      }
      return NextResponse.json(
        { 
          error: 'Failed to create user profile',
          details: profileError.message,
          code: profileError.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: profile }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
