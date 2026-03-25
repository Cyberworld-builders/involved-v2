import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string; surveyId: string; snapshotId: string }> }

/**
 * GET /api/clients/[id]/surveys/[surveyId]/snapshots/[snapshotId]
 * Get snapshot detail with signed download URL.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id: clientId, snapshotId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data: snapshot, error } = await adminClient
    .from('survey_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .eq('client_id', clientId)
    .single()

  if (error || !snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
  }

  // Generate signed URL for JSON download
  const { data: signedUrl } = await adminClient.storage
    .from('survey-snapshots')
    .createSignedUrl(snapshot.storage_path, 3600) // 1 hour

  return NextResponse.json({
    snapshot,
    download_url: signedUrl?.signedUrl || null,
  })
}

/**
 * DELETE /api/clients/[id]/surveys/[surveyId]/snapshots/[snapshotId]
 * Delete a snapshot and its storage files.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id: clientId, snapshotId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('access_level')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['client_admin', 'super_admin'].includes(profile.access_level)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { data: snapshot } = await adminClient
    .from('survey_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .eq('client_id', clientId)
    .single()

  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
  }

  // Delete storage files
  const filesToDelete = [snapshot.storage_path]
  const pdfPaths = (snapshot.pdf_paths || []) as Array<{ snapshot_path: string }>
  for (const pdf of pdfPaths) {
    filesToDelete.push(pdf.snapshot_path)
  }

  await adminClient.storage.from('survey-snapshots').remove(filesToDelete)

  // Delete DB row
  const { error } = await adminClient
    .from('survey_snapshots')
    .delete()
    .eq('id', snapshotId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
