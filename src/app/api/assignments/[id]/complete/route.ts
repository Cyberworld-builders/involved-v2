import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/assignments/[id]/complete
 * Mark an assignment as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
    const supabase = await createClient()
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
      .select('id, access_level')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Verify assignment exists and belongs to user
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, user_id, completed')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Check ownership (users can only complete their own assignments)
    if (assignment.user_id !== actorProfile.id && actorProfile.access_level === 'member') {
      return NextResponse.json(
        { error: 'Forbidden: Cannot complete assignments for other users' },
        { status: 403 }
      )
    }

    // Check if already completed
    if (assignment.completed) {
      return NextResponse.json(
        { error: 'Assignment has already been completed' },
        { status: 400 }
      )
    }

    // Mark as completed
    const { data: updatedAssignment, error: updateError } = await adminClient
      .from('assignments')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error completing assignment:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete assignment' },
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
