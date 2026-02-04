import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'
import { applyTemplateToReport } from '@/lib/reports/apply-template'

/**
 * GET /api/reports/:assignmentId
 * Get report data for an assignment (generate if needed)
 */
function reportDebugRequested(request: NextRequest): boolean {
  try {
    return request.url.includes('report_debug=1')
  } catch {
    return false
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    const debug = reportDebugRequested(request)
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

    // Get assignment
    const { data: assignment, error: assignmentError } = await adminClient
      .from('assignments')
      .select('id, assessment_id, completed, completed_at, assessment:assessments!assignments_assessment_id_fkey(is_360)')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    const assessment = (assignment.assessment as unknown) as { is_360: boolean } | null
    // For 360 assessments, allow viewing report when not completed so we can show partial (0 responses)
    if (!assignment.completed && !assessment?.is_360) {
      return NextResponse.json(
        { error: 'Assignment must be completed before viewing report' },
        { status: 400 }
      )
    }

    // Check if report data exists and is current
    const { data: reportData } = await adminClient
      .from('report_data')
      .select('dimension_scores, calculated_at')
      .eq('assignment_id', assignmentId)
      .single()

    // Check if report data is stale (compare calculated_at with completed_at)
    const needsRegeneration =
      !reportData ||
      !reportData.dimension_scores ||
      (assignment.completed_at &&
        reportData.calculated_at &&
        new Date(reportData.calculated_at) < new Date(assignment.completed_at))

    if (needsRegeneration) {
      // Generate report
      let report: unknown
      let overallScore: number | null = null

      if (assessment?.is_360) {
        report = await generate360Report(assignmentId)
        // Extract overall_score from 360 report
        if (report && typeof report === 'object' && 'overall_score' in report) {
          overallScore = typeof report.overall_score === 'number' ? report.overall_score : null
        }
      } else {
        report = await generateLeaderBlockerReport(assignmentId)
        // Extract overall_score from Leader/Blocker report
        if (report && typeof report === 'object' && 'overall_score' in report) {
          overallScore = typeof report.overall_score === 'number' ? report.overall_score : null
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
      if (template && report && typeof report === 'object') {
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
        report = applyTemplateToReport(report as unknown as ReportData, template as unknown as ReportTemplate)
      }

      // Store report data
      await adminClient
        .from('report_data')
        .upsert({
          assignment_id: assignmentId,
          overall_score: overallScore,
          dimension_scores: report,
          calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'assignment_id',
        })

      const payload: { report: unknown; cached: boolean; _debug?: unknown } = {
        report,
        cached: false,
      }
      if (debug) {
        const r = report as Record<string, unknown>
        payload._debug = {
          assignmentId,
          assessment_id: assignment.assessment_id,
          completed: assignment.completed,
          is_360: assessment?.is_360,
          reportKeys: report != null && typeof report === 'object' ? Object.keys(r) : [],
          dimensionsCount: Array.isArray(r?.dimensions) ? r.dimensions.length : undefined,
        }
      }
      return NextResponse.json(payload)
    }

    // Return cached report data
    const cachedReport = reportData.dimension_scores
    const payload: { report: unknown; cached: boolean; _debug?: unknown } = {
      report: cachedReport,
      cached: true,
    }
    if (debug) {
      const r = cachedReport as Record<string, unknown> | null
      payload._debug = {
        assignmentId,
        assessment_id: assignment.assessment_id,
        completed: assignment.completed,
        is_360: assessment?.is_360,
        reportKeys: r != null && typeof r === 'object' ? Object.keys(r) : [],
        dimensionsCount: r?.dimensions != null && Array.isArray(r.dimensions) ? r.dimensions.length : undefined,
      }
    }
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error getting report:', error)
    return NextResponse.json(
      {
        error: 'Failed to get report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
