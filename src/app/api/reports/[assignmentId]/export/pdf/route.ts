import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'
import { generate360ReportPDF, generateLeaderBlockerReportPDF } from '@/lib/reports/export-pdf'

/**
 * GET /api/reports/:assignmentId/export/pdf
 * Export report as PDF
 * Query param ?download=true forces download, otherwise opens in browser viewer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { searchParams } = new URL(request.url)
  const forceDownload = searchParams.get('download') === 'true'
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

    // Generate PDF
    let pdfBuffer: Buffer
    if (assignment.assessment?.is_360) {
      pdfBuffer = await generate360ReportPDF(reportData as Parameters<typeof generate360ReportPDF>[0])
    } else {
      pdfBuffer = await generateLeaderBlockerReportPDF(reportData as Parameters<typeof generateLeaderBlockerReportPDF>[0])
    }

    // Get assessment title for filename
    const { data: assessment } = await adminClient
      .from('assessments')
      .select('title')
      .eq('id', assignment.assessment_id)
      .single()

    const filename = `${assessment?.title || 'Report'}_${assignmentId.substring(0, 8)}.pdf`
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()

    // Return PDF - use 'inline' to open in browser viewer, 'attachment' to force download
    const disposition = forceDownload ? 'attachment' : 'inline'

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting PDF:', error)
    return NextResponse.json(
      {
        error: 'Failed to export PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
