import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/config'

// Staleness thresholds — if a job sits in these states longer than this, auto-recover to "failed"
const QUEUED_TIMEOUT_MS = 2 * 60 * 1000    // 2 minutes
const GENERATING_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * GET /api/reports/[assignmentId]/pdf
 * Get current PDF status and metadata.
 * Includes automatic staleness recovery: stuck "queued"/"generating" jobs are
 * transitioned to "failed" so the user can retry.
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
      .select('pdf_status, pdf_storage_path, pdf_generated_at, pdf_version, pdf_last_error, pdf_job_id, pdf_status_changed_at')
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

    let currentStatus = reportData?.pdf_status || 'not_requested'

    // --- Staleness recovery ---
    // If a job has been stuck in "queued" or "generating" beyond the timeout,
    // auto-transition to "failed" so the user sees a retry button instead of
    // an infinite spinner.
    if (
      (currentStatus === 'queued' || currentStatus === 'generating') &&
      reportData?.pdf_status_changed_at
    ) {
      const changedAt = new Date(reportData.pdf_status_changed_at).getTime()
      const elapsed = Date.now() - changedAt
      const timeout = currentStatus === 'queued' ? QUEUED_TIMEOUT_MS : GENERATING_TIMEOUT_MS

      if (elapsed > timeout) {
        const timeoutLabel = currentStatus === 'queued' ? '2 minutes' : '5 minutes'
        const timeoutError = `PDF generation timed out — the job was stuck in "${currentStatus}" for over ${timeoutLabel}. Please try again.`
        console.warn(`[PDF] Staleness recovery: assignment ${assignmentId} stuck in "${currentStatus}" for ${Math.round(elapsed / 1000)}s, transitioning to failed`)

        await adminClient
          .from('report_data')
          .update({
            pdf_status: 'failed',
            pdf_last_error: timeoutError,
            pdf_status_changed_at: new Date().toISOString(),
          })
          .eq('assignment_id', assignmentId)

        currentStatus = 'failed'
        return NextResponse.json({
          status: 'failed',
          version: reportData?.pdf_version || null,
          generatedAt: reportData?.pdf_generated_at || null,
          storagePath: reportData?.pdf_storage_path || null,
          lastError: timeoutError,
          jobId: reportData?.pdf_job_id || null,
        })
      }
    }

    return NextResponse.json({
      status: currentStatus,
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
    const { data: currentReportData } = await adminClient
      .from('report_data')
      .select('pdf_status, pdf_job_id, assignment_id, pdf_version, pdf_generated_at, pdf_storage_path, pdf_last_error')
      .eq('assignment_id', assignmentId)
      .single()

    // Check if force regeneration was requested (e.g. from Regenerate PDF button)
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    // If already queued or generating, return current status to prevent duplicate work
    if (currentReportData?.pdf_status === 'queued' ||
        currentReportData?.pdf_status === 'generating') {
      return NextResponse.json({
        status: currentReportData.pdf_status,
        version: currentReportData.pdf_version || null,
        generatedAt: currentReportData.pdf_generated_at || null,
        storagePath: currentReportData.pdf_storage_path || null,
        lastError: currentReportData.pdf_last_error || null,
        jobId: currentReportData.pdf_job_id || null,
      })
    }

    // If ready and not force, return current status (idempotent)
    if (currentReportData?.pdf_status === 'ready' && !force) {
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
      .select('id, completed, assessment:assessments!assignments_assessment_id_fkey(is_360)')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // For 360 assessments, allow PDF generation even when not fully completed (partial reports)
    const assessment = (assignment.assessment as unknown) as { is_360: boolean } | null
    if (!assignment.completed && !assessment?.is_360) {
      return NextResponse.json(
        { error: 'Assignment must be completed before generating PDF' },
        { status: 400 }
      )
    }

    // Ensure report_data exists with actual report content (not just a stub)
    if (!currentReportData || !currentReportData.assignment_id) {
      // Generate the report first so the view page has data to render
      const generateUrl = new URL(`/api/reports/generate/${assignmentId}`, request.url)
      const generateRes = await fetch(generateUrl.toString(), {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          'Content-Type': 'application/json',
        },
      })
      if (!generateRes.ok) {
        const errData = await generateRes.json().catch(() => ({}))
        return NextResponse.json(
          { error: 'Report must be generated before PDF export', details: errData.error },
          { status: 400 }
        )
      }
    }

    // Generate job ID for tracking
    const jobId = crypto.randomUUID()

    // Atomically transition to 'queued' status, clear previous errors
    const { error: updateError } = await adminClient
      .from('report_data')
      .update({
        pdf_status: 'queued',
        pdf_job_id: jobId,
        pdf_last_error: null,
        pdf_status_changed_at: new Date().toISOString(),
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
    let baseUrl = getAppUrl()

    // For local development: Edge Function runs in Docker, needs host.docker.internal to reach host
    // Replace localhost with host.docker.internal when calling from Edge Function
    const isLocalDev = !process.env.VERCEL && !process.env.NEXT_PUBLIC_APP_URL
    const originalBaseUrl = baseUrl
    if (isLocalDev && baseUrl.includes('localhost')) {
      baseUrl = baseUrl.replace('localhost', 'host.docker.internal')
    }

    const viewUrl = `${baseUrl}/reports/${assignmentId}/view`
    const nextjsApiUrl = baseUrl
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // When PDF_GENERATION_BACKEND=ecs, ECS Fargate service polls Supabase for queued jobs.
    // Otherwise trigger Supabase Edge Function (legacy).
    const pdfBackend = process.env.PDF_GENERATION_BACKEND ?? 'edge'
    if (pdfBackend === 'ecs') {
      console.log(`[PDF] Queued for ECS PDF service (assignment ${assignmentId}, jobId ${jobId})`)
    } else {
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-report-pdf`
      console.log(`[PDF] Triggering Edge Function for assignment ${assignmentId}`, { edgeFunctionUrl, viewUrl, nextjsApiUrl, jobId })
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
          service_role_key: supabaseServiceKey,
        }),
      })
        .then(async (response) => {
          console.log(`[PDF] Edge Function response: ${response.status} ${response.statusText}`)
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Edge Function returned ${response.status}: ${errorText}`)
          }
        })
        .catch((error) => {
          console.error('[PDF] Edge Function fetch failed:', error)
          adminClient
            .from('report_data')
            .update({
              pdf_status: 'failed',
              pdf_last_error: `Failed to trigger PDF generation: ${error instanceof Error ? error.message : 'Unknown error'}`,
              pdf_status_changed_at: new Date().toISOString(),
            })
            .eq('assignment_id', assignmentId)
        })
    }

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
