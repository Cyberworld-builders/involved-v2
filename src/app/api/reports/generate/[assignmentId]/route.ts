import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'
import { assignFeedbackToReport, get360TextFeedback } from '@/lib/reports/assign-feedback'

/**
 * POST /api/reports/generate/:assignmentId
 * Generate report data for an assignment
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

    // Get assignment to verify it's completed
    const { data: assignment, error: assignmentError } = await adminClient
      .from('assignments')
      .select('id, assessment_id, completed, assessment:assessments!assignments_assessment_id_fkey(is_360)')
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
        { error: 'Assignment must be completed before generating report' },
        { status: 400 }
      )
    }

    // Assign feedback first (if not already assigned)
    const { data: existingReportData } = await adminClient
      .from('report_data')
      .select('feedback_assigned')
      .eq('assignment_id', assignmentId)
      .single()

    if (!existingReportData || !existingReportData.feedback_assigned || 
        (Array.isArray(existingReportData.feedback_assigned) && existingReportData.feedback_assigned.length === 0)) {
      // Assign feedback for non-360 assessments
      if (!assignment.assessment?.is_360) {
        const assignedFeedback = await assignFeedbackToReport(assignmentId, assignment.assessment_id)
        
        // Store assigned feedback
        await adminClient
          .from('report_data')
          .upsert({
            assignment_id: assignmentId,
            feedback_assigned: assignedFeedback,
          }, {
            onConflict: 'assignment_id',
          })
      }
    }

    // Generate report based on assessment type
    let reportData: unknown

    if (assignment.assessment?.is_360) {
      reportData = await generate360Report(assignmentId)
    } else {
      reportData = await generateLeaderBlockerReport(assignmentId)
    }

    // Store report data
    const { error: storeError } = await adminClient
      .from('report_data')
      .upsert({
        assignment_id: assignmentId,
        dimension_scores: reportData,
        calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'assignment_id',
      })

    if (storeError) {
      console.error('Error storing report data:', storeError)
      // Continue anyway - report is generated, just not cached
    }

    return NextResponse.json({
      success: true,
      report: reportData,
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
