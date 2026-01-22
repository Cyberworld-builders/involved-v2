import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/feedback
 * List feedback entries with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const assessmentId = searchParams.get('assessment_id')
    const dimensionId = searchParams.get('dimension_id')
    const type = searchParams.get('type') // 'overall' or 'specific'
    const search = searchParams.get('search') // Search in feedback content

    // Build query
    let query = adminClient
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
      .order('created_at', { ascending: false })

    // Apply filters
    if (assessmentId) {
      query = query.eq('assessment_id', assessmentId)
    }

    if (dimensionId) {
      query = query.eq('dimension_id', dimensionId)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: feedback, error: feedbackError } = await query

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError)
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      )
    }

    // Apply search filter in memory (PostgreSQL text search could be used for better performance)
    let filteredFeedback = feedback || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredFeedback = filteredFeedback.filter(
        (f) => f.feedback.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({
      feedback: filteredFeedback,
      count: filteredFeedback.length,
    })
  } catch (error) {
    console.error('Error in GET /api/feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/feedback
 * Create new feedback entry
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { assessment_id, dimension_id, type, feedback, min_score, max_score } = body

    // Validate required fields
    if (!assessment_id || !dimension_id || !type || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: assessment_id, dimension_id, type, feedback' },
        { status: 400 }
      )
    }

    if (!['overall', 'specific'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "overall" or "specific"' },
        { status: 400 }
      )
    }

    // Enforce one overall feedback per dimension
    if (type === 'overall') {
      const { data: existingOverall } = await adminClient
        .from('feedback_library')
        .select('id')
        .eq('assessment_id', assessment_id)
        .eq('dimension_id', dimension_id)
        .eq('type', 'overall')
        .maybeSingle()

      if (existingOverall) {
        return NextResponse.json(
          { error: 'This dimension already has an overall feedback entry. Each dimension can only have one overall feedback.' },
          { status: 400 }
        )
      }
    }

    // Verify user has access to the assessment
    const { data: assessment } = await adminClient
      .from('assessments')
      .select('id, created_by')
      .eq('id', assessment_id)
      .single()

    if (!assessment || assessment.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Assessment not found or access denied' },
        { status: 404 }
      )
    }

    // Create feedback entry
    const { data: newFeedback, error: createError } = await adminClient
      .from('feedback_library')
      .insert({
        assessment_id,
        dimension_id,
        type,
        feedback,
        min_score: min_score || null,
        max_score: max_score || null,
        created_by: user.id,
      })
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

    if (createError) {
      console.error('Error creating feedback:', createError)
      return NextResponse.json(
        { error: 'Failed to create feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { feedback: newFeedback },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
