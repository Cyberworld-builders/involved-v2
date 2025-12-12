import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInviteToken } from '@/lib/utils/invite-token-generation'

/**
 * POST /api/auth/claim
 * Claim an account using an invite token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate token format
    if (token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Look up invite by token
    const { data: invite, error: inviteError } = await adminClient
      .from('user_invites')
      .select(`
        id,
        profile_id,
        token,
        expires_at,
        status,
        profiles:profile_id (
          id,
          email,
          name,
          auth_user_id
        )
      `)
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 404 }
      )
    }

    // Check if invite has already been accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invite has already been used' },
        { status: 400 }
      )
    }

    // Check if invite has been revoked
    if (invite.status === 'revoked') {
      return NextResponse.json(
        { error: 'This invite has been revoked' },
        { status: 400 }
      )
    }

    // Validate token expiration
    const expiresAt = new Date(invite.expires_at)
    const validation = validateInviteToken(token, expiresAt)

    if (!validation.valid) {
      // Update status to expired
      await adminClient
        .from('user_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 400 }
      )
    }

    const profile = invite.profiles as unknown as { id: string; email: string; name: string; auth_user_id: string | null }

    // Check if user already has an auth account
    if (profile.auth_user_id) {
      return NextResponse.json(
        { error: 'This account has already been claimed' },
        { status: 400 }
      )
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: profile.email,
      password: password,
      email_confirm: true, // Auto-confirm email since they were invited
      user_metadata: {
        name: profile.name,
      },
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Update profile with auth_user_id
    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({ auth_user_id: authData.user.id })
      .eq('id', profile.id)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
      // Clean up auth user if profile update fails
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to link account. Please try again.' },
        { status: 500 }
      )
    }

    // Update invite status to accepted
    const { error: inviteUpdateError } = await adminClient
      .from('user_invites')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id)

    if (inviteUpdateError) {
      console.error('Error updating invite status:', inviteUpdateError)
      // Don't fail the request, the account is already created
    }

    return NextResponse.json({
      success: true,
      message: 'Account claimed successfully',
    }, { status: 200 })
  } catch (error) {
    console.error('Account claim error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
