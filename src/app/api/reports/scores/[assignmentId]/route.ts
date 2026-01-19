import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/reports/scores/:assignmentId
 * Get cached dimension scores for an assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
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

    // Get assignment to verify access
    const { data: assignment, error: assignmentError } = await adminClient
      .from('assignments')
      .select('id, user_id, assessment_id, completed')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Get user profile to check permissions
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('id, access_level, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check permissions: user can view their own, admins can view their clients
    const isOwner = assignment.user_id === actorProfile.id
    const isAdmin = actorProfile.access_level === 'client_admin' || actorProfile.access_level === 'super_admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get cached dimension scores
    const { data: scores, error: scoresError } = await adminClient
      .from('assignment_dimension_scores')
      .select(`
        *,
        dimension:dimensions!assignment_dimension_scores_dimension_id_fkey(
          id,
          name,
          code,
          parent_id
        )
      `)
      .eq('assignment_id', assignmentId)
      .order('dimension_id')

    if (scoresError) {
      console.error('Error fetching dimension scores:', scoresError)
      return NextResponse.json(
        { error: 'Failed to fetch scores' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      assignment_id: assignmentId,
      scores: scores || [],
      cached: true,
    })
  } catch (error) {
    console.error('Error in GET /api/reports/scores:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reports/scores/:assignmentId
 * Force recalculation of dimension scores for an assignment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
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

    // Get assignment to verify access
    const { data: assignment, error: assignmentError } = await adminClient
      .from('assignments')
      .select('id, user_id, assessment_id, completed')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Get user profile to check permissions
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('id, access_level, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check permissions: only admins can force recalculation
    const isAdmin = actorProfile.access_level === 'client_admin' || actorProfile.access_level === 'super_admin'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use the database function to recalculate scores
    const { error: calcError } = await adminClient.rpc(
      'refresh_dimension_scores_for_assignment',
      { p_assignment_id: assignmentId }
    )

    if (calcError) {
      console.error('Error recalculating scores:', calcError)
      return NextResponse.json(
        { error: 'Failed to recalculate scores' },
        { status: 500 }
      )
    }

    // Get the newly calculated scores
    const { data: scores, error: scoresError } = await adminClient
      .from('assignment_dimension_scores')
      .select(`
        *,
        dimension:dimensions!assignment_dimension_scores_dimension_id_fkey(
          id,
          name,
          code,
          parent_id
        )
      `)
      .eq('assignment_id', assignmentId)
      .order('dimension_id')

    if (scoresError) {
      console.error('Error fetching recalculated scores:', scoresError)
      return NextResponse.json(
        { error: 'Failed to fetch recalculated scores' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      assignment_id: assignmentId,
      scores: scores || [],
      recalculated: true,
    })
  } catch (error) {
    console.error('Error in POST /api/reports/scores:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
