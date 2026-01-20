import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePDFFromView } from '@/lib/reports/export-pdf-playwright'

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

    // Get the base URL for constructing the fullscreen view URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   request.headers.get('origin') || 
                   'http://localhost:3000'

    // Get all cookies from the request to pass to Playwright for authentication
    const requestCookies = request.headers.get('cookie') || ''
    const cookieArray = requestCookies.split(';').map(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=')
      return {
        name: name.trim(),
        value: valueParts.join('='),
      }
    }).filter(c => c.name && c.value)

    // Construct the fullscreen view URL (using the route group path, no dashboard layout)
    const viewUrl = `${baseUrl}/reports/${assignmentId}/view`

    // Generate PDF from the fullscreen view using Playwright
    // This ensures the PDF is identical to what users see
    const pdfBuffer = await generatePDFFromView(
      viewUrl,
      cookieArray,
      {
        waitForSelector: '[data-report-loaded]',
        waitForTimeout: 30000,
      }
    )

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

    return new NextResponse(new Uint8Array(pdfBuffer), {
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
