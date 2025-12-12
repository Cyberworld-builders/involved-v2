import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInviteToken } from '@/lib/utils/invite-token-generation'

/**
 * GET /api/auth/claim?token=xxx
 * Validate invite token and get user information
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Look up the invite by token
    const { data: invite, error: inviteError } = await adminClient
      .from('user_invites')
      .select('id, profile_id, expires_at, status')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid token' },
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
      // Update status to expired if it's not already
      if (invite.status === 'pending') {
        await adminClient
          .from('user_invites')
          .update({ status: 'expired' })
          .eq('id', invite.id)
      }

      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      )
    }

    // Get user profile information
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, name, email')
      .eq('id', invite.profile_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      valid: true,
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      },
    })
  } catch (error) {
    console.error('Error validating token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/claim
 * Claim account with token and set password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Look up the invite by token
    const { data: invite, error: inviteError } = await adminClient
      .from('user_invites')
      .select('id, profile_id, expires_at, status')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid token' },
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
        { error: 'Token has expired' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, auth_user_id')
      .eq('id', invite.profile_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user already has an auth account
    let authUserId = profile.auth_user_id

    if (!authUserId) {
      // Create Supabase auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: profile.email,
        password: password,
        email_confirm: true, // Auto-confirm email since they clicked the invite link
      })

      if (authError || !authData.user) {
        console.error('Error creating auth user:', authError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      authUserId = authData.user.id

      // Update profile with auth_user_id
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ auth_user_id: authUserId })
        .eq('id', profile.id)

      if (updateError) {
        console.error('Error updating profile with auth_user_id:', updateError)
        // Continue anyway, the auth user was created successfully
      }
    } else {
      // User already has an auth account, update password
      const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(
        authUserId,
        { password: password }
      )

      if (updatePasswordError) {
        console.error('Error updating user password:', updatePasswordError)
        return NextResponse.json(
          { error: 'Failed to update password' },
          { status: 500 }
        )
      }
    }

    // Update invite status to accepted
    const { error: updateInviteError } = await adminClient
      .from('user_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      console.error('Error updating invite status:', updateInviteError)
      // Continue anyway, the user account was created/updated successfully
    }

    // Sign in the user using the regular client
    const supabase = await createClient()
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: password,
    })

    if (signInError || !signInData.session) {
      console.error('Error signing in user:', signInError)
      return NextResponse.json(
        { error: 'Account created but failed to sign in. Please try signing in manually.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account claimed successfully',
      session: signInData.session,
    })
  } catch (error) {
    console.error('Error claiming account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
