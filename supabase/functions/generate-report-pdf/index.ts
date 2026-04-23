import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeneratePDFRequest {
  assignment_id: string
  view_url: string
  nextjs_api_url?: string // Optional: URL of Next.js API (defaults to view_url base)
  job_id?: string
  service_role_key?: string // Optional: Service role key for Next.js API authentication (passed from Next.js)
}

/**
 * Update PDF status in report_data table
 */
async function updatePdfStatus(
  supabase: ReturnType<typeof createClient>,
  assignmentId: string,
  status: 'queued' | 'generating' | 'ready' | 'failed',
  updates?: {
    storage_path?: string
    generated_at?: string
    version?: number
    last_error?: string
  }
) {
  const updateData: Record<string, unknown> = {
    pdf_status: status,
    pdf_status_changed_at: new Date().toISOString(),
  }

  // Clear previous error on non-failed transitions
  if (status !== 'failed') {
    updateData.pdf_last_error = null
  }

  if (updates?.storage_path) {
    updateData.pdf_storage_path = updates.storage_path
  }
  if (updates?.generated_at) {
    updateData.pdf_generated_at = updates.generated_at
  }
  if (updates?.version) {
    updateData.pdf_version = updates.version
  }
  if (updates?.last_error) {
    updateData.pdf_last_error = updates.last_error
  }

  const { error } = await supabase
    .from('report_data')
    .update(updateData)
    .eq('assignment_id', assignmentId)

  if (error) {
    console.error('Error updating PDF status:', error)
    throw error
  }
}

/**
 * Generate PDF by calling the Next.js API route that has Playwright
 * This is a pragmatic solution that reuses existing PDF generation code
 * 
 * Alternative: In the future, we could use a headless browser service
 * (like Gotenberg, Browserless, or similar) for a fully self-contained Edge Function
 */
async function generatePDF(
  viewUrl: string,
  nextjsApiUrl: string,
  serviceRoleKey: string
): Promise<Uint8Array> {
  try {
    console.log('[Edge Function] Starting PDF generation', { viewUrl, nextjsApiUrl })
    
    // Extract assignment ID from view URL or construct the API URL
    // The viewUrl format is: {baseUrl}/reports/{assignmentId}/view
    const urlParts = viewUrl.split('/reports/')
    if (urlParts.length < 2) {
      throw new Error('Invalid view URL format')
    }
    const assignmentId = urlParts[1].split('/')[0]

    // Call the Next.js API route that has Playwright/Puppeteer.
    // We use the service role key for authentication via both Authorization header
    // AND query parameter for redundancy.
    const apiUrl = `${nextjsApiUrl}/api/reports/${assignmentId}/export/pdf?download=true&service_role_token=${encodeURIComponent(serviceRoleKey)}`

    console.log(`[Edge Function] Calling Next.js API: ${nextjsApiUrl}/api/reports/${assignmentId}/export/pdf`)
    console.log(`[Edge Function] Service role key present: ${!!serviceRoleKey}, length: ${serviceRoleKey?.length || 0}`)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`PDF generation API failed: ${response.status} ${errorText}`)
    }

    // Get PDF as array buffer
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

/**
 * Upload PDF to Supabase Storage
 */
async function uploadPDFToStorage(
  supabase: ReturnType<typeof createClient>,
  assignmentId: string,
  pdfBuffer: Uint8Array,
  version: number
): Promise<string> {
  const storagePath = `${assignmentId}/v${version}.pdf`

  const { data, error } = await supabase.storage
    .from('reports-pdf')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    console.error('Error uploading PDF to storage:', error)
    throw error
  }

  return storagePath
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[Edge Function] PDF generation request received')

  try {
    // Get Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Parse request body
    const body: GeneratePDFRequest = await req.json()
    console.log('[Edge Function] Request body parsed:', {
      assignment_id: body.assignment_id,
      view_url: body.view_url,
      nextjs_api_url: body.nextjs_api_url,
    })
    const { assignment_id, view_url, nextjs_api_url, job_id, service_role_key } = body

    if (!assignment_id || !view_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: assignment_id, view_url' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Determine Next.js API URL (use provided or extract from view_url)
    let nextjsApiUrl = nextjs_api_url || (() => {
      try {
        const url = new URL(view_url)
        return `${url.protocol}//${url.host}`
      } catch {
        throw new Error('Invalid view_url format - cannot extract base URL')
      }
    })()

    // For local development: Edge Function runs in Docker, needs host.docker.internal to reach host
    // Replace localhost with host.docker.internal if not already replaced
    if (nextjsApiUrl.includes('localhost')) {
      nextjsApiUrl = nextjsApiUrl.replace('localhost', 'host.docker.internal')
      console.log(`[Info] Replaced localhost with host.docker.internal: ${nextjsApiUrl}`)
    }

    // Update status to 'generating'
    await updatePdfStatus(supabase, assignment_id, 'generating')

    // Get current PDF version
    const { data: reportData } = await supabase
      .from('report_data')
      .select('pdf_version')
      .eq('assignment_id', assignment_id)
      .single()

    const currentVersion = reportData?.pdf_version || 1
    const nextVersion = currentVersion
    const keyForNextJs = service_role_key || supabaseServiceKey

    // Retry transient failures (Vercel serverless Chromium races: ETXTBSY/EBUSY/EAGAIN,
    // navigation timeouts). Status stays in 'generating' across attempts so the UI
    // keeps showing progress instead of flickering through 'failed'.
    const MAX_ATTEMPTS = 5
    const TRANSIENT_PATTERN = /ETXTBSY|EBUSY|EAGAIN|spawn|navigation timeout|timeout.*exceeded|ECONNRESET|socket hang up|fetch failed/i
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`[Edge Function] PDF generation attempt ${attempt}/${MAX_ATTEMPTS}`)
        const pdfBuffer = await generatePDF(view_url, nextjsApiUrl, keyForNextJs)
        const storagePath = await uploadPDFToStorage(supabase, assignment_id, pdfBuffer, nextVersion)

        await updatePdfStatus(supabase, assignment_id, 'ready', {
          storage_path: storagePath,
          generated_at: new Date().toISOString(),
          version: nextVersion,
        })

        return new Response(
          JSON.stringify({ success: true, storage_path: storagePath, version: nextVersion, attempts: attempt }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const isTransient = TRANSIENT_PATTERN.test(lastError.message)
        console.warn(`[Edge Function] Attempt ${attempt} failed (transient=${isTransient}): ${lastError.message}`)

        if (!isTransient || attempt === MAX_ATTEMPTS) break

        // Exponential backoff: 2s, 4s, 8s, 16s
        const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 16000)
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
      }
    }

    const errorMessage = lastError?.message || 'Unknown error'
    await updatePdfStatus(supabase, assignment_id, 'failed', { last_error: errorMessage })
    console.error('PDF generation failed after all retries:', errorMessage)

    return new Response(
      JSON.stringify({ success: false, error: errorMessage, attempts: MAX_ATTEMPTS }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
