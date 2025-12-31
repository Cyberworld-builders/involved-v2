import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Define answer types manually until database types are regenerated
type AnswerInsert = {
  assignment_id: string
  field_id: string
  user_id: string
  value: string
  time?: number | null
}

type AnswerUpdate = Partial<AnswerInsert>

/**
 * POST /api/assignments/[id]/answers
 * Save or update an answer for an assignment
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
      .select('id, user_id, assessment_id, completed')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Check ownership (users can only answer their own assignments, admins can view)
    if (assignment.user_id !== actorProfile.id && actorProfile.access_level === 'member') {
      return NextResponse.json(
        { error: 'Forbidden: Cannot modify answers for other users' },
        { status: 403 }
      )
    }

    // Check if assignment is already completed
    if (assignment.completed) {
      return NextResponse.json(
        { error: 'Assignment has already been completed' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { field_id, value, complete = false, time } = body

    // Validate required fields
    if (!field_id) {
      return NextResponse.json(
        { error: 'field_id is required' },
        { status: 400 }
      )
    }

    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: 'value is required' },
        { status: 400 }
      )
    }

    // Verify field belongs to the assessment
    const { data: field, error: fieldError } = await supabase
      .from('fields')
      .select('id, assessment_id')
      .eq('id', field_id)
      .single()

    if (fieldError || !field) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      )
    }

    if (field.assessment_id !== assignment.assessment_id) {
      return NextResponse.json(
        { error: 'Field does not belong to this assessment' },
        { status: 400 }
      )
    }

    // Check if answer already exists
    const { data: existingAnswer } = await adminClient
      .from('answers')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('field_id', field_id)
      .single()

    const answerData: AnswerInsert | AnswerUpdate = {
      assignment_id: assignmentId,
      field_id: field_id,
      user_id: assignment.user_id,
      value: String(value),
      time: time || null,
    }

    let answer

    if (existingAnswer) {
      // Update existing answer
      const { data: updatedAnswer, error: updateError } = await adminClient
        .from('answers')
        .update(answerData)
        .eq('id', existingAnswer.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating answer:', updateError)
        return NextResponse.json(
          { error: 'Failed to update answer' },
          { status: 500 }
        )
      }

      answer = updatedAnswer
    } else {
      // Create new answer
      const { data: newAnswer, error: insertError } = await adminClient
        .from('answers')
        .insert(answerData)
        .select()
        .single()

      if (insertError) {
        console.error('Error creating answer:', insertError)
        return NextResponse.json(
          { error: 'Failed to create answer' },
          { status: 500 }
        )
      }

      answer = newAnswer
    }

    // If complete flag is set, mark assignment as completed
    if (complete) {
      const { error: completeError } = await adminClient
        .from('assignments')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)

      if (completeError) {
        console.error('Error completing assignment:', completeError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      answer,
      completed: complete,
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
 * GET /api/assignments/[id]/answers
 * Get all answers for an assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params
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

    // Check permissions (users can see their own, admins can see their clients')
    const isSuperAdmin = actorProfile.access_level === 'super_admin'
    const isClientAdmin = actorProfile.access_level === 'client_admin'
    const isOwner = assignment.user_id === actorProfile.id

    if (!isOwner && !isSuperAdmin && !isClientAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get answers
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: true })

    if (answersError) {
      console.error('Error fetching answers:', answersError)
      return NextResponse.json(
        { error: 'Failed to fetch answers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ answers: answers || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
