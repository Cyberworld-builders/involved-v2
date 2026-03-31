import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEV_PASSWORD = 'DevLogin123!'

/**
 * POST /api/auth/dev-login
 * Development-only: ensures an auth account exists for the given email
 * with a known password, handling the profile trigger gracefully.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const { email } = await request.json()
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Check if auth user already exists
  const { data: users } = await adminClient.auth.admin.listUsers()
  const authUser = users?.users?.find(u => u.email === email)

  if (authUser) {
    // Auth user exists — just reset password
    const { error } = await adminClient.auth.admin.updateUserById(authUser.id, {
      password: DEV_PASSWORD,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ email, password: DEV_PASSWORD })
  }

  // No auth user — check for existing profile
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id, username, name')
    .eq('email', email)
    .single()

  if (existingProfile) {
    // Profile exists without auth user. The auth trigger will INSERT a new
    // profile on auth.users creation, colliding with the existing one.
    // Save full profile, delete it, create auth user, then restore fields.
    const { data: fullProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', existingProfile.id)
      .single()

    await adminClient.from('profiles').delete().eq('id', existingProfile.id)

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: existingProfile.username,
        full_name: existingProfile.name,
      },
    })

    if (createError) {
      // Restore original profile on failure
      if (fullProfile) {
        await adminClient.from('profiles').insert(fullProfile)
      }
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Restore saved fields onto the trigger-created profile
    if (fullProfile && newUser?.user) {
      await adminClient
        .from('profiles')
        .update({
          client_id: fullProfile.client_id,
          role: fullProfile.role,
          access_level: fullProfile.access_level,
          name: fullProfile.name,
          username: fullProfile.username,
          industry_id: fullProfile.industry_id,
          status: fullProfile.status,
        })
        .eq('auth_user_id', newUser.user.id)
    }

    return NextResponse.json({ email, password: DEV_PASSWORD })
  }

  // No profile at all — just create the auth user
  const { error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  return NextResponse.json({ email, password: DEV_PASSWORD })
}

/**
 * GET /api/auth/dev-login
 * Returns list of all profiles for the user switcher.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const adminClient = createAdminClient()
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, email, name, role, access_level, client_id, client:clients(name)')
    .order('role')
    .order('name')

  return NextResponse.json({ profiles: profiles || [] })
}
