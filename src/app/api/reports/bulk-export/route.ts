import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'
import { generate360ReportPDF, generateLeaderBlockerReportPDF } from '@/lib/reports/export-pdf'
import { generate360ReportExcel, generateLeaderBlockerReportExcel } from '@/lib/reports/export-excel'
import { generate360ReportCSV, generateLeaderBlockerReportCSV } from '@/lib/reports/export-csv'
import archiver from 'archiver'
import { PassThrough } from 'stream'

// Extend Vercel function timeout (Pro plan supports up to 300s)
export const maxDuration = 120

// Synchronous ZIP is limited to avoid timeouts
const MAX_SYNC_REPORTS = 10
const PER_REPORT_TIMEOUT_MS = 30_000

/**
 * Wrap a promise with a timeout. Rejects if the promise doesn't settle in time.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out generating ${label}`)), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

/**
 * Shared logic for bulk export
 */
async function handleBulkExport(assignment_ids: string[], format: string = 'all') {
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

  if (!assignment_ids || !Array.isArray(assignment_ids) || assignment_ids.length === 0) {
    return NextResponse.json(
      { error: 'assignment_ids array is required' },
      { status: 400 }
    )
  }

  if (assignment_ids.length > MAX_SYNC_REPORTS) {
    return NextResponse.json(
      {
        error: `Bulk download supports up to ${MAX_SYNC_REPORTS} reports at a time. Please select fewer reports or download them individually.`,
      },
      { status: 400 }
    )
  }

  try {
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

    // Generate all reports (with per-report timeout)
    const reports: Array<{
      assignmentId: string
      assessmentTitle: string
      is360: boolean
      data: unknown
    }> = []
    const skipped: string[] = []

    for (const assignment of assignments) {
      const assessment = (assignment.assessment as unknown) as { id: string; title: string; is_360: boolean } | null
      const label = assessment?.title || assignment.id.substring(0, 8)

      try {
        const reportPromise: Promise<unknown> = assessment?.is_360
          ? generate360Report(assignment.id)
          : generateLeaderBlockerReport(assignment.id)
        const reportData = await withTimeout(
          reportPromise,
          PER_REPORT_TIMEOUT_MS,
          label,
        )

        reports.push({
          assignmentId: assignment.id,
          assessmentTitle: assessment?.title || 'Unknown',
          is360: assessment?.is_360 || false,
          data: reportData,
        })
      } catch (error) {
        console.error(`Skipping report for assignment ${assignment.id}:`, error)
        skipped.push(label)
      }
    }

    if (reports.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any reports. They may be too large to export in bulk — try downloading individually.' },
        { status: 500 }
      )
    }

    // Single report — return it directly (no ZIP needed)
    if (reports.length === 1) {
      const report = reports[0]
      const safeTitle = report.assessmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const shortId = report.assignmentId.substring(0, 8)

      if (format === 'pdf' || format === 'all') {
        const pdfBuffer = report.is360
          ? await generate360ReportPDF(report.data as Parameters<typeof generate360ReportPDF>[0])
          : await generateLeaderBlockerReportPDF(report.data as Parameters<typeof generateLeaderBlockerReportPDF>[0])
        const filename = `${safeTitle}_${shortId}.pdf`
        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      if (format === 'excel' || format === 'all') {
        const excelBuffer = report.is360
          ? await generate360ReportExcel(report.data as Parameters<typeof generate360ReportExcel>[0])
          : await generateLeaderBlockerReportExcel(report.data as Parameters<typeof generateLeaderBlockerReportExcel>[0])
        const filename = `${safeTitle}_${shortId}.xlsx`
        return new NextResponse(new Uint8Array(excelBuffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      if (format === 'csv' || format === 'all') {
        const csvContent = report.is360
          ? generate360ReportCSV(report.data as Parameters<typeof generate360ReportCSV>[0])
          : generateLeaderBlockerReportCSV(report.data as Parameters<typeof generateLeaderBlockerReportCSV>[0])
        const filename = `${safeTitle}_${shortId}.csv`
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }
    }

    // Multiple reports — stream a ZIP archive
    const archive = archiver('zip', { zlib: { level: 5 } })
    const passThrough = new PassThrough()
    archive.pipe(passThrough)

    for (const report of reports) {
      const safeTitle = report.assessmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const shortId = report.assignmentId.substring(0, 8)

      try {
        if (format === 'pdf' || format === 'all') {
          const pdfBuffer = report.is360
            ? await generate360ReportPDF(report.data as Parameters<typeof generate360ReportPDF>[0])
            : await generateLeaderBlockerReportPDF(report.data as Parameters<typeof generateLeaderBlockerReportPDF>[0])
          archive.append(Buffer.from(pdfBuffer), { name: `${safeTitle}_${shortId}.pdf` })
        }

        if (format === 'excel' || format === 'all') {
          const excelBuffer = report.is360
            ? await generate360ReportExcel(report.data as Parameters<typeof generate360ReportExcel>[0])
            : await generateLeaderBlockerReportExcel(report.data as Parameters<typeof generateLeaderBlockerReportExcel>[0])
          archive.append(Buffer.from(excelBuffer), { name: `${safeTitle}_${shortId}.xlsx` })
        }

        if (format === 'csv' || format === 'all') {
          const csvContent = report.is360
            ? generate360ReportCSV(report.data as Parameters<typeof generate360ReportCSV>[0])
            : generateLeaderBlockerReportCSV(report.data as Parameters<typeof generateLeaderBlockerReportCSV>[0])
          archive.append(csvContent, { name: `${safeTitle}_${shortId}.csv` })
        }
      } catch (fileError) {
        console.error(`Error exporting report ${report.assignmentId}:`, fileError)
        skipped.push(report.assessmentTitle)
      }
    }

    await archive.finalize()

    // Collect the stream into a buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of passThrough) {
      chunks.push(chunk as Uint8Array)
    }
    const zipBuffer = Buffer.concat(chunks)

    // Include skipped reports info in a custom header so the UI can inform the user
    const headers: Record<string, string> = {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="reports_export.zip"',
    }
    if (skipped.length > 0) {
      headers['X-Skipped-Reports'] = String(skipped.length)
    }

    return new NextResponse(new Uint8Array(zipBuffer), { headers })
  } catch (error) {
    console.error('Error in bulk export:', error)

    // Distinguish timeout-like errors for a friendlier message
    const message = error instanceof Error ? error.message : 'Unknown error'
    const isTimeout = message.includes('Timed out') || message.includes('FUNCTION_INVOCATION_TIMEOUT')

    return NextResponse.json(
      {
        error: isTimeout
          ? 'The export took too long. Try selecting fewer reports or downloading them individually.'
          : 'Failed to create bulk export',
        details: message,
      },
      { status: isTimeout ? 504 : 500 }
    )
  }
}

/**
 * POST /api/reports/bulk-export
 * Create bulk export for multiple reports as a ZIP
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assignment_ids, format = 'all' } = body // format: 'pdf', 'excel', 'csv', or 'all'
    return handleBulkExport(assignment_ids, format)
  } catch (error) {
    console.error('Error in POST /api/reports/bulk-export:', error)
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
    return handleBulkExport(assignment_ids, format)
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
