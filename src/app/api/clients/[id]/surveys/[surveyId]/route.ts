import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REPORTS_PDF_BUCKET = 'reports-pdf'

/**
 * DELETE /api/clients/[id]/surveys/[surveyId]
 * Permanently delete a survey: all assignments with this survey_id that belong to the client,
 * plus their answers, report data, dimension scores, and report PDFs in storage.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  try {
    const { id: clientId, surveyId } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('id, access_level, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const isSuperAdmin = actorProfile.access_level === 'super_admin'
    const isClientAdmin = actorProfile.access_level === 'client_admin'

    if (!isSuperAdmin && !isClientAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    if (isClientAdmin && actorProfile.client_id !== clientId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot delete surveys for another client' },
        { status: 403 }
      )
    }

    // Get all profiles for this client (so we only consider assignments whose user is in this client)
    const { data: clientProfiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('client_id', clientId)

    if (profilesError || !clientProfiles?.length) {
      return NextResponse.json(
        { error: 'Client has no users or failed to load' },
        { status: 400 }
      )
    }

    const clientUserIds = new Set(clientProfiles.map((p) => p.id))

    // Fetch assignment IDs for this survey
    const { data: assignments, error: assignmentsError } = await adminClient
      .from('assignments')
      .select('id, user_id')
      .eq('survey_id', surveyId)

    if (assignmentsError) {
      console.error('Error fetching survey assignments:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to load survey assignments' },
        { status: 500 }
      )
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: 'Survey not found or has no assignments', deleted_assignments: 0 },
        { status: 404 }
      )
    }

    // Ensure every assignment belongs to this client (no cross-client delete)
    const assignmentIds: string[] = []
    for (const a of assignments) {
      if (!clientUserIds.has(a.user_id)) {
        return NextResponse.json(
          { error: 'Forbidden: Survey contains assignments from another client' },
          { status: 403 }
        )
      }
      assignmentIds.push(a.id)
    }

    // Remove report PDFs from storage for each assignment (avoid orphaned files)
    for (const assignmentId of assignmentIds) {
      try {
        const { data: files } = await adminClient.storage
          .from(REPORTS_PDF_BUCKET)
          .list(assignmentId, { limit: 100 })

        if (files?.length) {
          const paths = files.map((f) => `${assignmentId}/${f.name}`)
          await adminClient.storage.from(REPORTS_PDF_BUCKET).remove(paths)
        }
      } catch (storageError) {
        // Log but do not fail the request; DB cleanup is primary
        console.warn(`Storage cleanup for assignment ${assignmentId}:`, storageError)
      }
    }

    // Delete assignments; DB cascades remove answers, assignment_fields, assignment_dimension_scores, report_data
    const { error: deleteError } = await adminClient
      .from('assignments')
      .delete()
      .in('id', assignmentIds)

    if (deleteError) {
      console.error('Error deleting assignments:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete survey assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      deleted_assignments: assignmentIds.length,
    })
  } catch (error) {
    console.error('Unexpected error deleting survey:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete survey',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
