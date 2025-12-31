import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/assignments/[id]
 * Get assignment details
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

    // Get user profile
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('id, access_level, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const assignmentId = params.id

    // Get assignment with related data
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        *,
        user:profiles!assignments_user_id_fkey(id, name, email, username),
        assessment:assessments!assignments_assessment_id_fkey(
          id,
          title,
          description,
          logo,
          background,
          timed,
          time_limit
        )
      `)
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const isSuperAdmin = actorProfile.access_level === 'super_admin'
    const isClientAdmin = actorProfile.access_level === 'client_admin'
    const isOwner = assignment.user_id === actorProfile.id

    // For client admins, check if assignment user is in their client
    let canAccess = isSuperAdmin || isOwner
    if (isClientAdmin && actorProfile.client_id) {
      const { data: assignmentUser } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', assignment.user_id)
        .single()

      if (assignmentUser?.client_id === actorProfile.client_id) {
        canAccess = true
      }
    }

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/assignments/[id]
 * Update assignment (expiration, whitelabel, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('id, access_level, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const isSuperAdmin = actorProfile.access_level === 'super_admin'
    const isClientAdmin = actorProfile.access_level === 'client_admin'

    if (!isSuperAdmin && !isClientAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const assignmentId = params.id

    // Verify assignment exists
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, user_id')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Check client permissions for client admins
    if (isClientAdmin && actorProfile.client_id) {
      const { data: assignmentUser } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', assignment.user_id)
        .single()

      if (assignmentUser?.client_id !== actorProfile.client_id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot modify assignments outside your client' },
          { status: 403 }
        )
      }
    }

    // Parse request body
    const body = await request.json()
    const { expires, whitelabel, job_id } = body

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (expires !== undefined) {
      const expiresDate = new Date(expires)
      if (isNaN(expiresDate.getTime())) {
        return NextResponse.json(
          { error: 'expires must be a valid date' },
          { status: 400 }
        )
      }
      updateData.expires = expiresDate.toISOString()
    }

    if (whitelabel !== undefined) {
      updateData.whitelabel = Boolean(whitelabel)
    }

    if (job_id !== undefined) {
      updateData.job_id = job_id || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update assignment
    const { data: updatedAssignment, error: updateError } = await adminClient
      .from('assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating assignment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/assignments/[id]
 * Delete an assignment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('id, access_level, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const isSuperAdmin = actorProfile.access_level === 'super_admin'
    const isClientAdmin = actorProfile.access_level === 'client_admin'

    if (!isSuperAdmin && !isClientAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const assignmentId = params.id

    // Verify assignment exists
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, user_id')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Check client permissions for client admins
    if (isClientAdmin && actorProfile.client_id) {
      const { data: assignmentUser } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', assignment.user_id)
        .single()

      if (assignmentUser?.client_id !== actorProfile.client_id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot delete assignments outside your client' },
          { status: 403 }
        )
      }
    }

    // Delete assignment (cascade will delete answers)
    const { error: deleteError } = await adminClient
      .from('assignments')
      .delete()
      .eq('id', assignmentId)

    if (deleteError) {
      console.error('Error deleting assignment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
