import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REPORTS_PDF_BUCKET = 'reports-pdf'

/**
 * PATCH /api/clients/[id]/surveys/[surveyId]
 * Batch-update all assignments in a survey.
 * Supported fields: expires (extend/change deadline), delete_assignment_ids (delete specific assignments).
 */
export async function PATCH(
  request: NextRequest,
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
        { error: 'Forbidden: Cannot modify surveys for another client' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expires, delete_assignment_ids, reminder, reminder_frequency, first_reminder_date } = body

    if (!expires && !delete_assignment_ids && reminder === undefined) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400 }
      )
    }

    // Get all assignments in this survey
    const { data: assignments, error: assignmentsError } = await adminClient
      .from('assignments')
      .select('id, user_id')
      .eq('survey_id', surveyId)

    if (assignmentsError || !assignments?.length) {
      return NextResponse.json(
        { error: 'Survey not found or has no assignments' },
        { status: 404 }
      )
    }

    // Verify all assignments belong to this client
    const { data: clientProfiles } = await adminClient
      .from('profiles')
      .select('id')
      .eq('client_id', clientId)

    if (!clientProfiles?.length) {
      return NextResponse.json(
        { error: 'Client has no users' },
        { status: 400 }
      )
    }

    const clientUserIds = new Set(clientProfiles.map((p) => p.id))
    const surveyAssignmentIds = assignments
      .filter((a) => clientUserIds.has(a.user_id))
      .map((a) => a.id)

    if (surveyAssignmentIds.length === 0) {
      return NextResponse.json(
        { error: 'No assignments found for this client in this survey' },
        { status: 404 }
      )
    }

    const result: { updated_assignments?: number; deleted_assignments?: number } = {}

    // Batch update expiration date
    if (expires) {
      const expiresDate = new Date(expires)
      if (isNaN(expiresDate.getTime())) {
        return NextResponse.json(
          { error: 'expires must be a valid date' },
          { status: 400 }
        )
      }

      const { error: updateError, count } = await adminClient
        .from('assignments')
        .update({ expires: expiresDate.toISOString() })
        .in('id', surveyAssignmentIds)

      if (updateError) {
        console.error('Error batch-updating assignments:', updateError)
        return NextResponse.json(
          { error: 'Failed to update assignments' },
          { status: 500 }
        )
      }

      result.updated_assignments = count ?? surveyAssignmentIds.length
    }

    // Batch update reminders (only for incomplete assignments)
    if (reminder !== undefined) {
      const updateData: Record<string, unknown> = {
        reminder: !!reminder,
      }

      if (reminder) {
        // Calculate next_reminder
        if (first_reminder_date) {
          updateData.next_reminder = new Date(first_reminder_date).toISOString()
        } else {
          // Default: tomorrow at 9 AM UTC
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setUTCHours(9, 0, 0, 0)
          updateData.next_reminder = tomorrow.toISOString()
        }
        updateData.reminder_frequency = reminder_frequency || '+3 days'
      } else {
        updateData.next_reminder = null
        updateData.reminder_frequency = null
      }

      const { error: reminderError, count } = await adminClient
        .from('assignments')
        .update(updateData)
        .in('id', surveyAssignmentIds)
        .eq('completed', false)

      if (reminderError) {
        console.error('Error updating reminders:', reminderError)
        return NextResponse.json({ error: 'Failed to update reminders' }, { status: 500 })
      }

      result.updated_assignments = (result.updated_assignments || 0) + (count ?? 0)
    }

    // Batch delete specific assignments
    if (delete_assignment_ids && Array.isArray(delete_assignment_ids) && delete_assignment_ids.length > 0) {
      // Only allow deleting assignments that are actually in this survey
      const validDeleteIds = delete_assignment_ids.filter((id: string) =>
        surveyAssignmentIds.includes(id)
      )

      if (validDeleteIds.length === 0) {
        return NextResponse.json(
          { error: 'None of the specified assignments belong to this survey' },
          { status: 400 }
        )
      }

      // Clean up report PDFs from storage
      for (const assignmentId of validDeleteIds) {
        try {
          const { data: files } = await adminClient.storage
            .from(REPORTS_PDF_BUCKET)
            .list(assignmentId, { limit: 100 })
          if (files?.length) {
            const paths = files.map((f) => `${assignmentId}/${f.name}`)
            await adminClient.storage.from(REPORTS_PDF_BUCKET).remove(paths)
          }
        } catch (storageError) {
          console.warn(`Storage cleanup for assignment ${assignmentId}:`, storageError)
        }
      }

      const { error: deleteError } = await adminClient
        .from('assignments')
        .delete()
        .in('id', validDeleteIds)

      if (deleteError) {
        console.error('Error batch-deleting assignments:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete assignments' },
          { status: 500 }
        )
      }

      result.deleted_assignments = validDeleteIds.length
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Unexpected error updating survey:', error)
    return NextResponse.json(
      { error: 'Failed to update survey', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

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
