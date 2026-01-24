import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/reports/[assignmentId]/pdf/url
 * Get signed URL for PDF download/view
 * Query param ?download=1 forces download disposition
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    const { searchParams } = new URL(request.url)
    const forceDownload = searchParams.get('download') === '1'

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

    // Get PDF status and storage path
    const { data: reportData, error: reportError } = await adminClient
      .from('report_data')
      .select('pdf_status, pdf_storage_path')
      .eq('assignment_id', assignmentId)
      .single()

    if (reportError || !reportData) {
      return NextResponse.json(
        { error: 'Report data not found' },
        { status: 404 }
      )
    }

    // Only allow access if PDF is ready
    if (reportData.pdf_status !== 'ready') {
      return NextResponse.json(
        { 
          error: 'PDF not ready',
          status: reportData.pdf_status,
        },
        { status: 404 }
      )
    }

    if (!reportData.pdf_storage_path) {
      return NextResponse.json(
        { error: 'PDF storage path not found' },
        { status: 404 }
      )
    }

    // Generate signed URL (1 hour expiry)
    const { data: signedUrlData, error: urlError } = await adminClient.storage
      .from('reports-pdf')
      .createSignedUrl(reportData.pdf_storage_path, 3600)

    if (urlError || !signedUrlData) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    // If download is requested, redirect with appropriate headers
    if (forceDownload) {
      // For download, we can either:
      // 1. Redirect to signed URL (simpler, but browser may not respect download)
      // 2. Proxy the file and set Content-Disposition (more control)
      // We'll use redirect for simplicity, as storage/CDN can handle disposition
      return NextResponse.redirect(signedUrlData.signedUrl)
    }

    // For view, return the signed URL (client can open in new tab)
    return NextResponse.json({
      url: signedUrlData.signedUrl,
    })
  } catch (error) {
    console.error('Error generating PDF URL:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate PDF URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
