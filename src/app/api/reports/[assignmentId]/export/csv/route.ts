import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'
import { generate360ReportCSV, generateLeaderBlockerReportCSV } from '@/lib/reports/export-csv'

/**
 * GET /api/reports/:assignmentId/export/csv
 * Export report as CSV
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
        { error: 'Assignment must be completed before exporting report' },
        { status: 400 }
      )
    }

    // Generate report data
    let reportData: unknown

    if (assignment.assessment?.is_360) {
      reportData = await generate360Report(assignmentId)
    } else {
      reportData = await generateLeaderBlockerReport(assignmentId)
    }

    // Generate CSV
    let csvContent: string
    if (assignment.assessment?.is_360) {
      csvContent = generate360ReportCSV(reportData as Parameters<typeof generate360ReportCSV>[0])
    } else {
      csvContent = generateLeaderBlockerReportCSV(reportData as Parameters<typeof generateLeaderBlockerReportCSV>[0])
    }

    // Get assessment title for filename
    const { data: assessment } = await adminClient
      .from('assessments')
      .select('title')
      .eq('id', assignment.assessment_id)
      .single()

    const filename = `${assessment?.title || 'Report'}_${assignmentId.substring(0, 8)}.csv`
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()

    // Return CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json(
      {
        error: 'Failed to export CSV',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
