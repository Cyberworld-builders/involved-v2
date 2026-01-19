import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'

/**
 * GET /api/reports/:assignmentId
 * Get report data for an assignment (generate if needed)
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

    if (!assignment.completed) {
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

      if (assignment.assessment?.is_360) {
        report = await generate360Report(assignmentId)
      } else {
        report = await generateLeaderBlockerReport(assignmentId)
      }

      // Store report data
      await adminClient
        .from('report_data')
        .upsert({
          assignment_id: assignmentId,
          dimension_scores: report,
          calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'assignment_id',
        })

      return NextResponse.json({
        report,
        cached: false,
      })
    }

    // Return cached report data
    return NextResponse.json({
      report: reportData.dimension_scores,
      cached: true,
    })
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
