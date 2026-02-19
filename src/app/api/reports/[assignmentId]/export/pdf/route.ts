import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/reports/:assignmentId/export/pdf
 * Export report as PDF
 * 
 * This route now serves PDFs from storage if available, otherwise falls back to on-demand generation.
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

    // Verify user is authenticated OR service role (for internal Edge Function calls)
    const authHeader = request.headers.get('authorization')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'export/pdf/route.ts:25',message:'Auth check',data:{hasAuthHeader:!!authHeader,authHeaderPrefix:authHeader?.substring(0,20)+'...',hasServiceKey:!!serviceRoleKey,serviceKeyPrefix:serviceRoleKey?.substring(0,20)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Normalize both strings for comparison (trim whitespace)
    const normalizedAuthHeader = authHeader?.trim()
    const normalizedServiceKey = serviceRoleKey?.trim()
    const expectedAuthHeader = normalizedServiceKey ? `Bearer ${normalizedServiceKey}` : null
    
    const isServiceRole = normalizedAuthHeader?.startsWith('Bearer ') && 
                         normalizedServiceKey &&
                         normalizedAuthHeader === expectedAuthHeader
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'export/pdf/route.ts:32',message:'Service role check result',data:{isServiceRole,authHeaderLength:authHeader?.length,serviceKeyLength:serviceRoleKey?.length,matches:authHeader===`Bearer ${serviceRoleKey}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    if (!isServiceRole) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
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

    // Check if PDF exists in storage
    const { data: reportData } = await adminClient
      .from('report_data')
      .select('pdf_status, pdf_storage_path')
      .eq('assignment_id', assignmentId)
      .single()

    // If PDF is ready in storage, redirect to signed URL
    if (reportData?.pdf_status === 'ready' && reportData?.pdf_storage_path) {
      const { data: signedUrlData, error: urlError } = await adminClient.storage
        .from('reports-pdf')
        .createSignedUrl(reportData.pdf_storage_path, 3600) // 1 hour expiry

      if (!urlError && signedUrlData) {
        // Redirect to signed URL (storage/CDN handles the file)
        return NextResponse.redirect(signedUrlData.signedUrl)
      }
    }

    // Fallback: Generate PDF on-demand (for backward compatibility or if storage PDF is missing)
    // This ensures the route still works even if PDF generation hasn't completed yet
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   request.headers.get('origin') || 
                   'http://localhost:3000'
    
    // Ensure baseUrl has a protocol (https:// or http://)
    // If it's just a domain, add https://
    if (baseUrl && !baseUrl.match(/^https?:\/\//)) {
      baseUrl = `https://${baseUrl}`
    }

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
    // If service role authentication, add token to query parameter for view page
    const viewUrl = isServiceRole 
      ? `${baseUrl}/reports/${assignmentId}/view?service_role_token=${encodeURIComponent(normalizedServiceKey!)}`
      : `${baseUrl}/reports/${assignmentId}/view`

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'export/pdf/route.ts:120',message:'About to generate PDF',data:{viewUrl,isServiceRole,hasCookies:cookieArray.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Generate PDF from the fullscreen view
    // Use Puppeteer in Vercel (serverless), Playwright in local development
    const isVercel = !!process.env.VERCEL
    console.log(`[PDF] Starting PDF generation (Vercel: ${isVercel}, View URL: ${viewUrl})`)
    let pdfBuffer: Buffer
    
    if (isVercel) {
      // Use Puppeteer with @sparticuz/chromium for Vercel
      const { generatePDFFromViewPuppeteer } = await import('@/lib/reports/export-pdf-puppeteer')
      pdfBuffer = await generatePDFFromViewPuppeteer(
        viewUrl,
        cookieArray,
        {
          waitForSelector: '[data-report-loaded]',
          waitForTimeout: 30000,
        }
      )
    } else {
      // Use Playwright for local development
      console.log(`[PDF] Using Playwright for local PDF generation`)
      const { generatePDFFromView } = await import('@/lib/reports/export-pdf-playwright')
      pdfBuffer = await generatePDFFromView(viewUrl, cookieArray)
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
