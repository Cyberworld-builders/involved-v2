import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'
import { assignFeedbackToReport, get360TextFeedback } from '@/lib/reports/assign-feedback'
import { applyTemplateToReport } from '@/lib/reports/apply-template'

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

    // Type assertion for nested object (Supabase returns arrays for relations, but .single() should return objects)
    const assessment = (assignment.assessment as unknown) as { is_360: boolean } | null

    if (!existingReportData || !existingReportData.feedback_assigned || 
        (Array.isArray(existingReportData.feedback_assigned) && existingReportData.feedback_assigned.length === 0)) {
      // Assign feedback for non-360 assessments
      if (!assessment?.is_360) {
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
    let overallScore: number | null = null

    if (assessment?.is_360) {
      reportData = await generate360Report(assignmentId)
      // Extract overall_score from 360 report
      if (reportData && typeof reportData === 'object' && 'overall_score' in reportData) {
        overallScore = typeof reportData.overall_score === 'number' ? reportData.overall_score : null
      }
    } else {
      reportData = await generateLeaderBlockerReport(assignmentId)
      // Extract overall_score from Leader/Blocker report
      if (reportData && typeof reportData === 'object' && 'overall_score' in reportData) {
        overallScore = typeof reportData.overall_score === 'number' ? reportData.overall_score : null
      }
    }

    // Load template for this assessment (default or first available)
    const { data: template } = await adminClient
      .from('report_templates')
      .select('*')
      .eq('assessment_id', assignment.assessment_id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Apply template to report if available
    if (template && reportData && typeof reportData === 'object') {
      // Type assertions for applyTemplateToReport
      type ReportData = {
        overall_score: number
        dimensions: Array<{
          dimension_id: string
          dimension_name: string
          [key: string]: unknown
        }>
        [key: string]: unknown
      }
      type ReportTemplate = {
        id: string
        assessment_id: string
        name: string
        is_default: boolean
        components: Record<string, boolean>
        labels: Record<string, string>
        styling: Record<string, unknown>
      }
      reportData = applyTemplateToReport(reportData as unknown as ReportData, template as unknown as ReportTemplate)
    }

    // Store report data
    const { error: storeError } = await adminClient
      .from('report_data')
      .upsert({
        assignment_id: assignmentId,
        overall_score: overallScore,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const statusCode = errorMessage.includes('dimensions') || errorMessage.includes('No dimensions') ? 400 : 500
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        details: errorMessage,
      },
      { status: statusCode }
    )
  }
}
