import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'
import { generateUsernameFromName, generateUniqueUsername } from '@/lib/utils/username-generation'
import { isValidEmail } from '@/lib/utils/email-validation'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

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

    // Fetch all users
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

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

    // Parse request body
    const body = await request.json()
    const { name, email, username, client_id, industry_id, password, status } = body

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
    const baseUsername = username || generateUsernameFromName(name)

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
    const profileData: ProfileInsert = {
      auth_user_id: authData.user.id,
      username: finalUsername,
      name: name.trim(),
      email: email.trim(),
      client_id: client_id || null,
      industry_id: industry_id || null,
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
