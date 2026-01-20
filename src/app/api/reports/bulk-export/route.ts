import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'
import { generate360ReportPDF, generateLeaderBlockerReportPDF } from '@/lib/reports/export-pdf'
import { generate360ReportExcel, generateLeaderBlockerReportExcel } from '@/lib/reports/export-excel'
import { generate360ReportCSV, generateLeaderBlockerReportCSV } from '@/lib/reports/export-csv'

/**
 * POST /api/reports/bulk-export
 * Create bulk export job for multiple reports
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
    const { assignment_ids, format = 'all' } = body // format: 'pdf', 'excel', 'csv', or 'all'

    if (!assignment_ids || !Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return NextResponse.json(
        { error: 'assignment_ids array is required' },
        { status: 400 }
      )
    }

    // Limit to 100 reports at a time
    if (assignment_ids.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 reports per bulk export' },
        { status: 400 }
      )
    }

    // Get assignments
    const { data: assignments, error: assignmentsError } = await adminClient
      .from('assignments')
      .select(`
        id,
        assessment_id,
        completed,
        assessment:assessments!assignments_assessment_id_fkey(
          id,
          title,
          is_360
        )
      `)
      .in('id', assignment_ids)
      .eq('completed', true)

    if (assignmentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: 'No completed assignments found' },
        { status: 404 }
      )
    }

    // Generate all reports
    const reports: Array<{
      assignmentId: string
      assessmentTitle: string
      is360: boolean
      data: unknown
    }> = []

    for (const assignment of assignments) {
      try {
        let reportData: unknown
        if (assignment.assessment?.is_360) {
          reportData = await generate360Report(assignment.id)
        } else {
          reportData = await generateLeaderBlockerReport(assignment.id)
        }

        reports.push({
          assignmentId: assignment.id,
          assessmentTitle: assignment.assessment?.title || 'Unknown',
          is360: assignment.assessment?.is_360 || false,
          data: reportData,
        })
      } catch (error) {
        console.error(`Error generating report for assignment ${assignment.id}:`, error)
        // Continue with other reports
      }
    }

    if (reports.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any reports' },
        { status: 500 }
      )
    }

    // For now, return a simple response indicating bulk export needs a ZIP library
    // In production, you would use a library like 'archiver' or 'jszip'
    // For simplicity, we'll return the first report as a single file for now
    // TODO: Implement proper ZIP creation with archiver or jszip
    
    if (reports.length === 1) {
      // Single report - return it directly
      const report = reports[0]
      const safeTitle = report.assessmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const shortId = report.assignmentId.substring(0, 8)

      if (format === 'pdf' || format === 'all') {
        let pdfBuffer: Buffer
        if (report.is360) {
          pdfBuffer = await generate360ReportPDF(report.data as Parameters<typeof generate360ReportPDF>[0])
        } else {
          pdfBuffer = await generateLeaderBlockerReportPDF(report.data as Parameters<typeof generateLeaderBlockerReportPDF>[0])
        }
        const filename = `${safeTitle}_${shortId}.pdf`
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      if (format === 'excel' || format === 'all') {
        let excelBuffer: Buffer
        if (report.is360) {
          excelBuffer = await generate360ReportExcel(report.data as Parameters<typeof generate360ReportExcel>[0])
        } else {
          excelBuffer = await generateLeaderBlockerReportExcel(report.data as Parameters<typeof generateLeaderBlockerReportExcel>[0])
        }
        const filename = `${safeTitle}_${shortId}.xlsx`
        return new NextResponse(excelBuffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      if (format === 'csv' || format === 'all') {
        let csvContent: string
        if (report.is360) {
          csvContent = generate360ReportCSV(report.data as Parameters<typeof generate360ReportCSV>[0])
        } else {
          csvContent = generateLeaderBlockerReportCSV(report.data as Parameters<typeof generateLeaderBlockerReportCSV>[0])
        }
        const filename = `${safeTitle}_${shortId}.csv`
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }
    }

    // Multiple reports - for now return error suggesting to use individual exports
    // In production, implement ZIP with archiver or jszip
    return NextResponse.json(
      {
        error: 'Bulk export for multiple reports requires ZIP library. Please export reports individually or install archiver/jszip.',
        note: 'For now, please export reports individually. ZIP functionality will be added in a future update.',
      },
      { status: 501 }
    )
    const filename = `reports_export_${new Date().toISOString().split('T')[0]}.zip`

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error in bulk export:', error)
    return NextResponse.json(
      {
        error: 'Failed to create bulk export',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports/bulk-export
 * Bulk export via query parameters (for simple use cases)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignmentIdsParam = searchParams.get('assignment_ids')
    const format = searchParams.get('format') || 'all'

    if (!assignmentIdsParam) {
      return NextResponse.json(
        { error: 'assignment_ids query parameter is required' },
        { status: 400 }
      )
    }

    const assignment_ids = assignmentIdsParam.split(',').filter(Boolean)

    // Create a POST request body and call POST handler logic
    const postRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ assignment_ids, format }),
    })

    return POST(postRequest)
  } catch (error) {
    console.error('Error in GET /api/reports/bulk-export:', error)
    return NextResponse.json(
      {
        error: 'Failed to create bulk export',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
