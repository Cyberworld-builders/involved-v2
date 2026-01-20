import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'
import { generate360ReportExcel, generateLeaderBlockerReportExcel } from '@/lib/reports/export-excel'

/**
 * GET /api/reports/:assignmentId/export/excel
 * Export report as Excel
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

    // Generate Excel
    let excelBuffer: Buffer
    if (assignment.assessment?.is_360) {
      excelBuffer = await generate360ReportExcel(reportData as Parameters<typeof generate360ReportExcel>[0])
    } else {
      excelBuffer = await generateLeaderBlockerReportExcel(reportData as Parameters<typeof generateLeaderBlockerReportExcel>[0])
    }

    // Get assessment title for filename
    const { data: assessment } = await adminClient
      .from('assessments')
      .select('title')
      .eq('id', assignment.assessment_id)
      .single()

    const filename = `${assessment?.title || 'Report'}_${assignmentId.substring(0, 8)}.xlsx`
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()

    // Return Excel
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting Excel:', error)
    return NextResponse.json(
      {
        error: 'Failed to export Excel',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
