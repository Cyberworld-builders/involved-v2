import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/clients/[id]/surveys/[surveyId]/snapshots/[snapshotId]/pdfs/[assignmentId]
 * Get signed URL for a snapshot PDF.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; surveyId: string; snapshotId: string; assignmentId: string }> }
) {
  const { id: clientId, snapshotId, assignmentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data: snapshot } = await adminClient
    .from('survey_snapshots')
    .select('pdf_paths')
    .eq('id', snapshotId)
    .eq('client_id', clientId)
    .single()

  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
  }

  const pdfPaths = (snapshot.pdf_paths || []) as Array<{ assignment_id: string; snapshot_path: string }>
  const pdf = pdfPaths.find(p => p.assignment_id === assignmentId)

  if (!pdf) {
    return NextResponse.json({ error: 'PDF not found in snapshot' }, { status: 404 })
  }

  const { data: signedUrl } = await adminClient.storage
    .from('survey-snapshots')
    .createSignedUrl(pdf.snapshot_path, 3600)

  if (!signedUrl?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }

  return NextResponse.redirect(signedUrl.signedUrl)
}
