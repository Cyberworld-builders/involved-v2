import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInviteToken } from '@/lib/utils/invite-token-generation'

/**
 * GET /api/auth/claim/validate
 * Validate an invite token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'Token is required' },
        { status: 400 }
      )
    }

    // Validate token format
    if (token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)) {
      return NextResponse.json(
        { valid: false, message: 'Invalid token format' },
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
        { valid: false, message: 'Invalid or expired invite link' },
        { status: 404 }
      )
    }

    // Check if invite has already been accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { valid: false, message: 'This invite has already been used' },
        { status: 400 }
      )
    }

    // Check if invite has been revoked
    if (invite.status === 'revoked') {
      return NextResponse.json(
        { valid: false, message: 'This invite has been revoked' },
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
        { valid: false, message: 'This invite link has expired' },
        { status: 400 }
      )
    }

    // Check if user already has an auth account
    const profile = invite.profiles as unknown as { id: string; email: string; name: string; auth_user_id: string | null }
    
    if (profile.auth_user_id) {
      return NextResponse.json(
        { valid: false, message: 'This account has already been claimed' },
        { status: 400 }
      )
    }

    // Token is valid
    return NextResponse.json({
      valid: true,
      email: profile.email,
      name: profile.name,
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { valid: false, message: 'An error occurred while validating the token' },
      { status: 500 }
    )
  }
}
