import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'
import { generateInviteTokenWithExpiration } from '@/lib/utils/invite-token-generation'
import { sendInviteEmail } from '@/lib/services/email-service'
import { getAppUrl } from '@/lib/config'

type UserInviteInsert = Database['public']['Tables']['user_invites']['Insert']

/**
 * POST /api/users/[id]/invite
 * Send an invite email to a user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: userId } = await params

    // Validate user ID format
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, client_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get current user profile for authorization check
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (currentProfileError || !currentProfile) {
      console.error('Error fetching current user profile:', currentProfileError)
      return NextResponse.json(
        { error: 'Current user profile not found' },
        { status: 403 }
      )
    }

    // Authorization check: Users can only invite others in the same client
    // Users without client_id restrictions (e.g., admins) can invite anyone
    const currentHasClientRestriction = currentProfile.client_id !== null
    const targetHasClientRestriction = profile.client_id !== null
    
    if (
      currentHasClientRestriction &&
      targetHasClientRestriction &&
      profile.client_id !== currentProfile.client_id
    ) {
      return NextResponse.json(
        { error: 'Not authorized to invite users from other organizations' },
        { status: 403 }
      )
    }

    // Use admin client for inserting invite
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (error) {
      console.error('Failed to create admin client:', error)
      return NextResponse.json(
        {
          error: 'Failed to initialize admin client',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    // Check for existing pending invites for this user
    const { data: existingInvites } = await adminClient
      .from('user_invites')
      .select('id, status, expires_at')
      .eq('profile_id', profile.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    // If there's an active invite, we can either:
    // 1. Return the existing invite, or
    // 2. Revoke it and create a new one
    // For now, we'll create a new one (revoking old ones)
    if (existingInvites && existingInvites.length > 0) {
      // Revoke existing pending invites
      await adminClient
        .from('user_invites')
        .update({ status: 'revoked' })
        .in('id', existingInvites.map(inv => inv.id))
    }

    // Generate invite token with expiration
    const { token, expiresAt } = generateInviteTokenWithExpiration()

    // Create invite URL
    const appUrl = getAppUrl()
    const inviteUrl = `${appUrl}/auth/claim?token=${token}`

    // Store invite token in database
    const inviteData: UserInviteInsert = {
      profile_id: profile.id,
      token,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      invited_by: currentProfile.id,
    }

    const { data: invite, error: inviteError } = await adminClient
      .from('user_invites')
      .insert(inviteData)
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invite:', inviteError)
      // Provide more detailed error message
      const errorMessage = inviteError.message || 'Failed to create invite'
      const errorCode = inviteError.code || 'UNKNOWN'
      const errorDetails = inviteError.details || ''
      
      // Check for common constraint violations
      if (errorCode === '23505') {
        // Unique constraint violation - token collision (very rare)
        return NextResponse.json(
          { error: 'Invite token collision. Please try again.' },
          { status: 409 }
        )
      }
      
      // Check for foreign key violations
      if (errorCode === '23503') {
        return NextResponse.json(
          { error: 'Invalid user or inviter reference' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create invite',
          details: errorMessage,
          code: errorCode,
          hint: errorDetails
        },
        { status: 500 }
      )
    }

    // Send invite email
    try {
      const emailResult = await sendInviteEmail({
        recipientEmail: profile.email,
        recipientName: profile.name,
        inviteToken: token,
        inviteUrl,
        expirationDate: expiresAt,
        organizationName: process.env.NEXT_PUBLIC_APP_NAME || 'Involved Talent',
        userInviteId: invite.id,
      })

      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error)
        // Don't fail the request, as the invite is already created
        // Log the error and return success with a warning
        const warningMessage = emailResult.error?.includes('SMTP not configured')
          ? 'Invite created but email sending failed: SMTP not configured in Vercel. See docs/EMAIL_SETUP.md for setup instructions.'
          : `Invite created but email sending failed: ${emailResult.error || 'Unknown error'}`
        
        return NextResponse.json({
          success: true,
          invite,
          warning: warningMessage,
          error: emailResult.error, // Include error details for debugging
        }, { status: 201 })
      }

      return NextResponse.json({
        success: true,
        invite,
        messageId: emailResult.messageId,
      }, { status: 201 })
    } catch (emailError) {
      console.error('Error sending invite email:', emailError)
      // Don't fail the request, as the invite is already created
      return NextResponse.json({
        success: true,
        invite,
        warning: 'Invite created but email sending failed',
      }, { status: 201 })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/users/[id]/invite
 * Get invite details for a user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: userId } = await params

    // Validate user ID format
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Get current user profile for authorization
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (currentProfileError || !currentProfile) {
      return NextResponse.json(
        { error: 'Current user profile not found' },
        { status: 403 }
      )
    }

    // Get target user profile for authorization check
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id, client_id')
      .eq('id', userId)
      .single()

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Authorization check: Users can only view invites for:
    // 1. Their own invites
    // 2. Users in the same client (if both have client restrictions)
    // 3. Any user if current user has no client restriction (e.g., admins)
    const isOwnProfile = targetProfile.id === currentProfile.id
    const currentHasClientRestriction = currentProfile.client_id !== null
    const targetHasClientRestriction = targetProfile.client_id !== null
    const sameClient = targetProfile.client_id === currentProfile.client_id
    
    if (
      !isOwnProfile &&
      currentHasClientRestriction &&
      targetHasClientRestriction &&
      !sameClient
    ) {
      return NextResponse.json(
        { error: 'Not authorized to view invites for this user' },
        { status: 403 }
      )
    }

    // Get all invites for the user
    const { data: invites, error: invitesError } = await supabase
      .from('user_invites')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })

    if (invitesError) {
      console.error('Error fetching invites:', invitesError)
      return NextResponse.json(
        { error: 'Failed to fetch invites' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
