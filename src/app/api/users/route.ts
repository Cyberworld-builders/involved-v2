import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'
import { generateUsernameFromName, generateUsernameFromEmail, generateUniqueUsername } from '@/lib/utils/username-generation'
import { isValidEmail } from '@/lib/utils/email-validation'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

const VALID_ROLES = ['admin', 'manager', 'client', 'user', 'unverified'] as const
type ValidRole = (typeof VALID_ROLES)[number]

function isManagerRole(role: string | null | undefined): boolean {
  return role === 'manager' || role === 'client'
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
      .select('role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    const actorRole = actorProfile?.role || null
    const actorClientId = actorProfile?.client_id || null

    const isAdmin = actorRole === 'admin'
    const isManager = isManagerRole(actorRole)

    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (isManager && !actorClientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all users
    let query = supabase
      .from('profiles')
      .select('*')

    if (isManager && actorClientId) {
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
      .select('role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    const actorRole = actorProfile?.role || null
    const actorClientId = actorProfile?.client_id || null

    const isAdmin = actorRole === 'admin'
    const isManager = isManagerRole(actorRole)

    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, email, username, client_id, industry_id, password, role, status } = body

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

    // Validate role if provided
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
      .single()

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

    // Create auth user
    const { data: authData, error: authError2 } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: password || 'temp123',
      email_confirm: true,
      user_metadata: {
        full_name: name.trim(),
        username: finalUsername
      }
    })

    if (authError2 || !authData.user) {
      console.error('Error creating auth user:', authError2)
      return NextResponse.json(
        { error: 'Failed to create auth user' },
        { status: 500 }
      )
    }

    // Prepare profile data
    const resolvedClientId =
      isManager ? actorClientId : (client_id || null)

    const resolvedRole =
      role || 'user'

    if (isManager && resolvedRole === 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const profileData: ProfileInsert = {
      auth_user_id: authData.user.id,
      username: finalUsername,
      name: name.trim(),
      email: email.trim(),
      client_id: resolvedClientId,
      industry_id: industry_id || null,
      role: resolvedRole,
      completed_profile: false,
      status: status || 'active',
    }

    // Create profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .insert(profileData)
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
      return NextResponse.json(
        { error: 'Failed to create user profile' },
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
