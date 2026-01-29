import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignFeedbackToReport, get360TextFeedback } from '@/lib/reports/assign-feedback'

/**
 * POST /api/reports/assign-feedback/:assignmentId
 * Assign feedback to an assignment's report
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

    // Get assignment and assessment details
    const { data: assignment, error: assignmentError } = await adminClient
      .from('assignments')
      .select(`
        id,
        assessment_id,
        target_id,
        user_id,
        completed,
        assessment:assessments!assignments_assessment_id_fkey(
          id,
          is_360
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

    if (!assignment.completed) {
      return NextResponse.json(
        { error: 'Assignment must be completed before assigning feedback' },
        { status: 400 }
      )
    }

    // Type assertion for nested object (Supabase returns arrays for relations, but .single() should return objects)
    const assessment = (assignment.assessment as unknown) as { is_360: boolean } | null

    let assignedFeedback: Array<{
      dimension_id: string | null
      feedback_id?: string
      feedback_content: string
      type: 'overall' | 'specific' | '360_text'
    }> = []

    // Check if it's a 360 assessment
    if (assessment?.is_360 && assignment.target_id) {
      // For 360 assessments, use text input answers
      const textFeedback = await get360TextFeedback(assignmentId, assignment.target_id)
      assignedFeedback = textFeedback.map((f) => ({
        dimension_id: f.dimension_id,
        feedback_content: f.feedback,
        type: '360_text' as const,
      }))
    } else {
      // For non-360 assessments, use feedback library
      const libraryFeedback = await assignFeedbackToReport(
        assignmentId,
        assignment.assessment_id
      )
      assignedFeedback = libraryFeedback.map((f) => ({
        dimension_id: f.dimension_id,
        feedback_id: f.feedback_id,
        feedback_content: f.feedback_content,
        type: f.type,
      }))
    }

    // Update report_data with assigned feedback
    const { data: existingReportData } = await adminClient
      .from('report_data')
      .select('id')
      .eq('assignment_id', assignmentId)
      .single()

    if (existingReportData) {
      // Update existing report data
      await adminClient
        .from('report_data')
        .update({
          feedback_assigned: assignedFeedback,
          updated_at: new Date().toISOString(),
        })
        .eq('assignment_id', assignmentId)
    } else {
      // Create new report data entry
      await adminClient
        .from('report_data')
        .insert({
          assignment_id: assignmentId,
          feedback_assigned: assignedFeedback,
        })
    }

    return NextResponse.json({
      success: true,
      assigned_feedback: assignedFeedback,
      count: assignedFeedback.length,
    })
  } catch (error) {
    console.error('Error assigning feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
