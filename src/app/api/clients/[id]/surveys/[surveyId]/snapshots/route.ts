import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { collectSurveyData } from '@/lib/snapshots/collect-survey-data'

/**
 * GET /api/clients/[id]/surveys/[surveyId]/snapshots
 * List all snapshots for a survey.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  const { id: clientId, surveyId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('access_level, client_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['client_admin', 'super_admin'].includes(profile.access_level)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { data: snapshots, error } = await adminClient
    .from('survey_snapshots')
    .select('*')
    .eq('survey_id', surveyId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ snapshots })
}

/**
 * POST /api/clients/[id]/surveys/[surveyId]/snapshots
 * Create a new snapshot.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  const { id: clientId, surveyId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, access_level, client_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['client_admin', 'super_admin'].includes(profile.access_level)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { label?: string; assessment_id?: string } = {}
  try {
    body = await request.json()
  } catch {
    // No body is ok — label is optional
  }

  const assessmentId = body.assessment_id
  if (!assessmentId) {
    return NextResponse.json({ error: 'assessment_id is required' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const snapshotId = crypto.randomUUID()
  const storagePath = `${clientId}/${surveyId}/${snapshotId}/snapshot.json`

  // Create DB row with status='creating'
  const { error: insertError } = await adminClient
    .from('survey_snapshots')
    .insert({
      id: snapshotId,
      survey_id: surveyId,
      client_id: clientId,
      assessment_id: assessmentId,
      created_by: profile.id,
      label: body.label || null,
      storage_path: storagePath,
      status: 'creating',
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  try {
    // Collect all survey data
    const snapshotData = await collectSurveyData(
      adminClient,
      surveyId,
      clientId,
      assessmentId,
      profile.id,
      body.label
    )

    // Upload snapshot JSON
    const jsonBlob = new Blob([JSON.stringify(snapshotData, null, 2)], { type: 'application/json' })
    const { error: uploadError } = await adminClient.storage
      .from('survey-snapshots')
      .upload(storagePath, jsonBlob, { upsert: true })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    // Copy PDFs from reports-pdf bucket
    const pdfPaths: { assignment_id: string; original_path: string; snapshot_path: string }[] = []
    const reportDataWithPdfs = (snapshotData.report_data || []).filter(
      (r) => r.pdf_storage_path && r.pdf_status === 'ready'
    )

    for (const report of reportDataWithPdfs) {
      const assignmentId = report.assignment_id as string
      const originalPath = report.pdf_storage_path as string
      const snapshotPdfPath = `${clientId}/${surveyId}/${snapshotId}/pdfs/${assignmentId}.pdf`

      try {
        const { data: pdfData, error: dlError } = await adminClient.storage
          .from('reports-pdf')
          .download(originalPath)

        if (dlError || !pdfData) continue

        const { error: ulError } = await adminClient.storage
          .from('survey-snapshots')
          .upload(snapshotPdfPath, pdfData, { upsert: true })

        if (!ulError) {
          pdfPaths.push({
            assignment_id: assignmentId,
            original_path: originalPath,
            snapshot_path: snapshotPdfPath,
          })
        }
      } catch {
        // PDF copy failed — not blocking
      }
    }

    // Update DB row with final status
    const { error: updateError } = await adminClient
      .from('survey_snapshots')
      .update({
        status: 'ready',
        size_bytes: jsonBlob.size,
        pdf_count: pdfPaths.length,
        pdf_paths: pdfPaths,
        assignment_count: snapshotData.assignments.length,
        answer_count: snapshotData.answers.length,
      })
      .eq('id', snapshotId)

    if (updateError) throw new Error(`Failed to update snapshot: ${updateError.message}`)

    // Fetch the final row
    const { data: snapshot } = await adminClient
      .from('survey_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()

    return NextResponse.json({ snapshot })
  } catch (err) {
    // Mark as failed
    await adminClient
      .from('survey_snapshots')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', snapshotId)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create snapshot' },
      { status: 500 }
    )
  }
}
