import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEV_PASSWORD = 'DevLogin123!'

/**
 * POST /api/auth/dev-login
 * Development-only: resets a user's password to a known value for instant login.
 * If no auth account exists, creates one and links it to the existing profile.
 */
export async function POST(request: NextRequest) {
  const enabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'
  if (!enabled) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const { email } = await request.json()
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Check if auth user exists
  const { data: users } = await adminClient.auth.admin.listUsers()
  const authUser = users?.users?.find(u => u.email === email)

  if (authUser) {
    // Auth user exists — just reset password to known value
    const { error } = await adminClient.auth.admin.updateUserById(authUser.id, {
      password: DEV_PASSWORD,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ email, password: DEV_PASSWORD })
  }

  // No auth user — profile may exist without auth (e.g., imported data).
  // Get the existing profile so we can preserve its data.
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id, username, name, client_id, role, access_level, status, industry_id')
    .eq('email', email)
    .single()

  if (existingProfile) {
    // Temporarily remove profile to avoid trigger collision, then restore
    const saved = { ...existingProfile }
    await adminClient.from('profiles').delete().eq('id', saved.id)

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { username: saved.username, full_name: saved.name },
    })

    if (createError) {
      await adminClient.from('profiles').insert(saved as Record<string, unknown>)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Restore original fields onto the trigger-created profile
    if (newUser?.user) {
      await adminClient.from('profiles').update({
        client_id: saved.client_id,
        role: saved.role,
        access_level: saved.access_level,
        status: saved.status,
        industry_id: saved.industry_id,
        name: saved.name,
        username: saved.username,
      }).eq('auth_user_id', newUser.user.id)
    }

    return NextResponse.json({ email, password: DEV_PASSWORD })
  }

  // No profile at all — just create the auth user (trigger creates profile)
  const { error } = await adminClient.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ email, password: DEV_PASSWORD })
}

/**
 * GET /api/auth/dev-login
 * Returns list of all profiles for the user switcher.
 */
export async function GET() {
  const enabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'
  if (!enabled) {
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
