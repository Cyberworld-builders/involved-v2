import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/reports/[assignmentId]/pdf
 * Get current PDF status and metadata
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

    // Get PDF status from report_data
    const { data: reportData, error: reportError } = await adminClient
      .from('report_data')
      .select('pdf_status, pdf_storage_path, pdf_generated_at, pdf_version, pdf_last_error, pdf_job_id')
      .eq('assignment_id', assignmentId)
      .single()

    if (reportError) {
      // If no report_data exists, return not_requested status
      if (reportError.code === 'PGRST116') {
        return NextResponse.json({
          status: 'not_requested',
          version: null,
          generatedAt: null,
          storagePath: null,
          lastError: null,
          jobId: null,
        })
      }

      return NextResponse.json(
        { error: 'Failed to fetch PDF status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: reportData?.pdf_status || 'not_requested',
      version: reportData?.pdf_version || null,
      generatedAt: reportData?.pdf_generated_at || null,
      storagePath: reportData?.pdf_storage_path || null,
      lastError: reportData?.pdf_last_error || null,
      jobId: reportData?.pdf_job_id || null,
    })
  } catch (error) {
    console.error('Error fetching PDF status:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch PDF status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reports/[assignmentId]/pdf
 * Request PDF generation (idempotent)
 */
export async function POST(
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

    // Get current PDF status
    const { data: currentReportData, error: fetchError } = await adminClient
      .from('report_data')
      .select('pdf_status, pdf_job_id, assignment_id, pdf_version, pdf_generated_at, pdf_storage_path, pdf_last_error')
      .eq('assignment_id', assignmentId)
      .single()

    // If already queued, generating, or ready, return current status (idempotent)
    if (currentReportData?.pdf_status === 'queued' || 
        currentReportData?.pdf_status === 'generating' || 
        currentReportData?.pdf_status === 'ready') {
      return NextResponse.json({
        status: currentReportData.pdf_status,
        version: currentReportData.pdf_version || null,
        generatedAt: currentReportData.pdf_generated_at || null,
        storagePath: currentReportData.pdf_storage_path || null,
        lastError: currentReportData.pdf_last_error || null,
        jobId: currentReportData.pdf_job_id || null,
      })
    }

    // Verify assignment exists and is completed
    const { data: assignment, error: assignmentError } = await adminClient
      .from('assignments')
      .select('id, completed')
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
        { error: 'Assignment must be completed before generating PDF' },
        { status: 400 }
      )
    }

    // Ensure report_data exists (create if not)
    if (!currentReportData) {
      await adminClient
        .from('report_data')
        .insert({
          assignment_id: assignmentId,
          dimension_scores: {},
        })
    }

    // Generate job ID for tracking
    const jobId = crypto.randomUUID()

    // Atomically transition to 'queued' status
    const { data: updatedReportData, error: updateError } = await adminClient
      .from('report_data')
      .update({
        pdf_status: 'queued',
        pdf_job_id: jobId,
      })
      .eq('assignment_id', assignmentId)
      .select('pdf_status, pdf_job_id')
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to queue PDF generation' },
        { status: 500 }
      )
    }

    // Get base URL for view URL
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   request.headers.get('origin') || 
                   'http://localhost:3000'

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf/route.ts:171',message:'Before URL replacement',data:{baseUrl,hasVercel:!!process.env.VERCEL,hasAppUrl:!!process.env.NEXT_PUBLIC_APP_URL,origin:request.headers.get('origin')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Ensure baseUrl has a protocol (https:// or http://)
    // If it's just a domain, add https://
    if (baseUrl && !baseUrl.match(/^https?:\/\//)) {
      baseUrl = `https://${baseUrl}`
    }

    // For local development: Edge Function runs in Docker, needs host.docker.internal to reach host
    // Replace localhost with host.docker.internal when calling from Edge Function
    const isLocalDev = !process.env.VERCEL && !process.env.NEXT_PUBLIC_APP_URL
    const originalBaseUrl = baseUrl
    if (isLocalDev && baseUrl.includes('localhost')) {
      baseUrl = baseUrl.replace('localhost', 'host.docker.internal')
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf/route.ts:180',message:'After URL replacement',data:{originalBaseUrl,baseUrl,isLocalDev,replaced:originalBaseUrl!==baseUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    const viewUrl = `${baseUrl}/reports/${assignmentId}/view`
    const nextjsApiUrl = baseUrl
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf/route.ts:176',message:'About to trigger Edge Function',data:{assignmentId,supabaseUrl:supabaseUrl?.substring(0,30)+'...',hasServiceKey:!!supabaseServiceKey,viewUrl,nextjsApiUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Trigger Edge Function asynchronously (don't wait for completion)
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-report-pdf`
    
    console.log(`[PDF] Triggering Edge Function for assignment ${assignmentId}`, {
      edgeFunctionUrl,
      viewUrl,
      nextjsApiUrl,
      jobId,
    })
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf/route.ts:182',message:'Calling Edge Function',data:{edgeFunctionUrl,assignmentId,jobId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assignment_id: assignmentId,
        view_url: viewUrl,
        nextjs_api_url: nextjsApiUrl,
        job_id: jobId,
        service_role_key: supabaseServiceKey, // Pass the key so Edge Function can use it for Next.js API calls
      }),
    })
    .then(async (response) => {
      console.log(`[PDF] Edge Function response: ${response.status} ${response.statusText}`)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf/route.ts:200',message:'Edge Function response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (!response.ok) {
        const errorText = await response.text()
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf/route.ts:205',message:'Edge Function returned error',data:{status:response.status,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        throw new Error(`Edge Function returned ${response.status}: ${errorText}`)
      }
      
      const result = await response.json()
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf/route.ts:212',message:'Edge Function succeeded',data:{result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    })
    .catch(error => {
      console.error(`[PDF] Edge Function fetch failed:`, error)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf/route.ts:216',message:'Edge Function fetch failed',data:{error:error.message,stack:error.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.error('Error triggering PDF generation Edge Function:', error)
      // Update status to failed if Edge Function call fails
      adminClient
        .from('report_data')
        .update({
          pdf_status: 'failed',
          pdf_last_error: `Failed to trigger PDF generation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
        .eq('assignment_id', assignmentId)
    })

    return NextResponse.json({
      status: 'queued',
      version: null,
      generatedAt: null,
      storagePath: null,
      lastError: null,
      jobId: jobId,
    })
  } catch (error) {
    console.error('Error requesting PDF generation:', error)
    return NextResponse.json(
      {
        error: 'Failed to request PDF generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
