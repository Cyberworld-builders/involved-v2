import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/feedback/:id
 * Get a specific feedback entry
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get feedback entry
    const { data: feedback, error: feedbackError } = await adminClient
      .from('feedback_library')
      .select(`
        *,
        assessment:assessments!feedback_library_assessment_id_fkey(
          id,
          title
        ),
        dimension:dimensions!feedback_library_dimension_id_fkey(
          id,
          name,
          code
        )
      `)
      .eq('id', id)
      .single()

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Verify user has access to the assessment
    const { data: assessment } = await adminClient
      .from('assessments')
      .select('id, created_by')
      .eq('id', feedback.assessment_id)
      .single()

    if (!assessment || assessment.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Error in GET /api/feedback/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/feedback/:id
 * Update a feedback entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get existing feedback to verify access
    const { data: existingFeedback, error: fetchError } = await adminClient
      .from('feedback_library')
      .select('assessment_id, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Verify user has access to the assessment
    const { data: assessment } = await adminClient
      .from('assessments')
      .select('id, created_by')
      .eq('id', existingFeedback.assessment_id)
      .single()

    if (!assessment || assessment.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { dimension_id, type, feedback, min_score, max_score } = body

    // Validate type if provided
    if (type && !['overall', 'specific'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "overall" or "specific"' },
        { status: 400 }
      )
    }

    // Update feedback entry
    const updateData: Record<string, unknown> = {}
    if (dimension_id !== undefined) updateData.dimension_id = dimension_id || null
    if (type !== undefined) updateData.type = type
    if (feedback !== undefined) updateData.feedback = feedback
    if (min_score !== undefined) updateData.min_score = min_score || null
    if (max_score !== undefined) updateData.max_score = max_score || null

    const { data: updatedFeedback, error: updateError } = await adminClient
      .from('feedback_library')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assessment:assessments!feedback_library_assessment_id_fkey(
          id,
          title
        ),
        dimension:dimensions!feedback_library_dimension_id_fkey(
          id,
          name,
          code
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating feedback:', updateError)
      return NextResponse.json(
        { error: 'Failed to update feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ feedback: updatedFeedback })
  } catch (error) {
    console.error('Error in PUT /api/feedback/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/feedback/:id
 * Delete a feedback entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get existing feedback to verify access
    const { data: existingFeedback, error: fetchError } = await adminClient
      .from('feedback_library')
      .select('assessment_id, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Verify user has access to the assessment
    const { data: assessment } = await adminClient
      .from('assessments')
      .select('id, created_by')
      .eq('id', existingFeedback.assessment_id)
      .single()

    if (!assessment || assessment.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete feedback entry
    const { error: deleteError } = await adminClient
      .from('feedback_library')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting feedback:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/feedback/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
