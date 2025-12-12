import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInviteToken } from '@/lib/utils/invite-token-generation'
import { Database } from '@/types/database'

type UserInvite = Database['public']['Tables']['user_invites']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

/**
 * POST /api/auth/claim
 * Claim an account using an invite token and set password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    // Validate request body
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
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

    // Find invite by token
    const { data: invite, error: inviteError } = await adminClient
      .from('user_invites')
      .select('*')
      .eq('token', token)
      .single<UserInvite>()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation link' },
        { status: 404 }
      )
    }

    // Check if invite is already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      )
    }

    // Validate token expiration
    const expiresAt = new Date(invite.expires_at)
    const validation = validateInviteToken(token, expiresAt)

    if (!validation.valid) {
      // Update invite status to expired
      await adminClient
        .from('user_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Get the profile associated with this invite
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', invite.profile_id)
      .single<Profile>()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if profile already has an auth user
    if (profile.auth_user_id) {
      return NextResponse.json(
        { error: 'This account has already been claimed' },
        { status: 400 }
      )
    }

    // Create auth user in Supabase
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: profile.email,
      password: password,
      email_confirm: true, // Auto-confirm email since they were invited
      user_metadata: {
        name: profile.name,
        username: profile.username,
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
    const { error: updateProfileError } = await adminClient
      .from('profiles')
      .update({
        auth_user_id: authData.user.id,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError)
      // This is critical - we should clean up the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to link account. Please try again.' },
        { status: 500 }
      )
    }

    // Mark invite as accepted
    const { error: updateInviteError } = await adminClient
      .from('user_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      console.error('Error updating invite status:', updateInviteError)
      // Non-critical error, don't fail the request
    }

    // Return success - client will handle login
    return NextResponse.json({
      success: true,
      message: 'Account claimed successfully',
      email: profile.email,
    })
  } catch (error) {
    console.error('Unexpected error in claim route:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/claim?token=xxx
 * Validate a claim token without claiming the account
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Find invite by token
    const { data: invite, error: inviteError } = await adminClient
      .from('user_invites')
      .select('*, profiles!user_invites_profile_id_fkey(id, name, email, auth_user_id)')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { valid: false, error: 'Invalid invitation link' },
        { status: 404 }
      )
    }

    // Check if invite is already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { valid: false, error: 'This invitation has already been used' },
        { status: 400 }
      )
    }

    // Validate token expiration
    const expiresAt = new Date(invite.expires_at)
    const validation = validateInviteToken(token, expiresAt)

    if (!validation.valid) {
      // Update invite status to expired
      await adminClient
        .from('user_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      return NextResponse.json(
        { valid: false, error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if profile already has an auth user
    // Note: profiles is a join result, need to access it as a nested object
    const profileData = invite.profiles
    if (profileData && typeof profileData === 'object' && 'auth_user_id' in profileData) {
      const profile = profileData as Profile
      if (profile.auth_user_id) {
        return NextResponse.json(
          { valid: false, error: 'This account has already been claimed' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        valid: true,
        invite: {
          email: profile.email || '',
          name: profile.name || '',
          expiresAt: invite.expires_at,
        },
      })
    }

    // If profile data is not available or malformed
    return NextResponse.json(
      { valid: false, error: 'Invalid invitation data' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Unexpected error in claim validation:', error)
    return NextResponse.json(
      { valid: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
