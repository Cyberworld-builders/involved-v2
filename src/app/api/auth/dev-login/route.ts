import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/auth/dev-login
 * Development-only endpoint: generates a magic link for any user by email,
 * returns the token so the client can exchange it for a session.
 *
 * ONLY available when NODE_ENV === 'development'.
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

  // Check if auth user exists for this email
  const { data: users } = await adminClient.auth.admin.listUsers()
  const authUser = users?.users?.find(u => u.email === email)

  if (!authUser) {
    // No auth user — create one with a temp password so we can sign in
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: 'DevLogin123!',
      email_confirm: true,
    })
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Link profile to the new auth user
    await adminClient
      .from('profiles')
      .update({ auth_user_id: newUser.user.id })
      .eq('email', email)

    return NextResponse.json({
      email,
      password: 'DevLogin123!',
      message: 'Auth user created. Use these credentials to sign in.',
    })
  }

  // Auth user exists — update password to known value for dev login
  const { error: updateError } = await adminClient.auth.admin.updateUserById(authUser.id, {
    password: 'DevLogin123!',
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    email,
    password: 'DevLogin123!',
    message: 'Password reset for dev login.',
  })
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
