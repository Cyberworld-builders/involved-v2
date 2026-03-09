import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/config'

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
    const { data: currentReportData } = await adminClient
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
    const { error: updateError } = await adminClient
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
