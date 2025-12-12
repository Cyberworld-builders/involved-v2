import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'
import { generateInviteTokenWithExpiration } from '@/lib/utils/invite-token-generation'
import { sendInviteEmail } from '@/lib/services/email-service'

type UserInviteInsert = Database['public']['Tables']['user_invites']['Insert']

/**
 * POST /api/users/[id]/invite
 * Send an invite email to a user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const userId = params.id

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
      .select('id, name, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate invite token with expiration
    const { token, expiresAt } = generateInviteTokenWithExpiration()

    // Create invite URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/auth/invite?token=${token}`

    // Get current user profile for invited_by field
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (currentProfileError) {
      console.error('Error fetching current user profile:', currentProfileError)
    }

    // Use admin client for inserting invite
    const adminClient = createAdminClient()

    // Store invite token in database
    const inviteData: UserInviteInsert = {
      profile_id: profile.id,
      token,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      invited_by: currentProfile?.id || null,
    }

    const { data: invite, error: inviteError } = await adminClient
      .from('user_invites')
      .insert(inviteData)
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invite:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invite' },
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
      })

      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error)
        // Don't fail the request, as the invite is already created
        // Log the error and return success with a warning
        return NextResponse.json({
          success: true,
          invite,
          warning: 'Invite created but email sending failed',
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
  { params }: { params: { id: string } }
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

    const userId = params.id

    // Validate user ID format
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
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
