import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/surveys/delete
 * Delete test assignments and all related data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Verify user is authenticated and is super_admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('access_level')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.access_level !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { assignment_ids } = body

    if (!assignment_ids || !Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return NextResponse.json(
        { error: 'assignment_ids array is required' },
        { status: 400 }
      )
    }

    let deletedCount = 0
    const errors: string[] = []

    // Delete each assignment and related data
    for (const assignmentId of assignment_ids) {
      try {
        // Delete in order to respect foreign key constraints
        // 1. Delete report_data (if exists)
        await adminClient
          .from('report_data')
          .delete()
          .eq('assignment_id', assignmentId)

        // 2. Delete assignment_dimension_scores (if exists)
        await adminClient
          .from('assignment_dimension_scores')
          .delete()
          .eq('assignment_id', assignmentId)

        // 3. Delete answers (cascade should handle this, but explicit for clarity)
        await adminClient
          .from('answers')
          .delete()
          .eq('assignment_id', assignmentId)

        // 4. Delete assignment_fields (if exists)
        await adminClient
          .from('assignment_fields')
          .delete()
          .eq('assignment_id', assignmentId)

        // 5. Delete assignment (this will cascade to answers if not already deleted)
        const { error: deleteError } = await adminClient
          .from('assignments')
          .delete()
          .eq('id', assignmentId)

        if (deleteError) {
          errors.push(`Assignment ${assignmentId.substring(0, 8)}: ${deleteError.message}`)
        } else {
          deletedCount++
        }
      } catch (error) {
        errors.push(
          `Assignment ${assignmentId.substring(0, 8)}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      deleted_count: deletedCount,
      total_requested: assignment_ids.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error deleting assignments:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete assignments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
