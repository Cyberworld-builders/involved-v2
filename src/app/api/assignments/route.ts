import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAssignmentURL } from '@/lib/assignments/url-generator'
import { Database } from '@/types/database'

type AssignmentInsert = Database['public']['Tables']['assignments']['Insert']

/**
 * GET /api/assignments
 * List assignments (filtered by user/client)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('access_level, role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const isSuperAdmin = actorProfile.access_level === 'super_admin'
    const isClientAdmin = actorProfile.access_level === 'client_admin'
    const isUser = actorProfile.access_level === 'member'

    // Build query
    let query = supabase.from('assignments').select(`
      *,
      user:profiles!assignments_user_id_fkey(id, name, email, username),
      assessment:assessments!assignments_assessment_id_fkey(id, title, description)
    `)

    // Apply filters based on user role
    if (isUser) {
      // Users can only see their own assignments
      query = query.eq('user_id', actorProfile.id)
    } else if (isClientAdmin && actorProfile.client_id) {
      // Client admins can see assignments for users in their client
      // First get all user IDs in the client
      const { data: clientUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('client_id', actorProfile.client_id)

      if (clientUsers && clientUsers.length > 0) {
        const clientUserIds = clientUsers.map((u) => u.id)
        query = query.in('user_id', clientUserIds)
      } else {
        // No users in client, return empty result
        return NextResponse.json({ assignments: [] })
      }
    }
    // Super admins can see all assignments (no filter)

    // Apply query parameters
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const assessmentId = searchParams.get('assessment_id')
    const completed = searchParams.get('completed')

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (assessmentId) {
      query = query.eq('assessment_id', assessmentId)
    }
    if (completed !== null) {
      query = query.eq('completed', completed === 'true')
    }

    const { data: assignments, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignments: assignments || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/assignments
 * Create new assignment(s)
 */
export async function POST(request: NextRequest) {
  try {
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

    // Get user profile to check permissions
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('access_level, role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const isSuperAdmin = actorProfile.access_level === 'super_admin'
    const isClientAdmin = actorProfile.access_level === 'client_admin'

    if (!isSuperAdmin && !isClientAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const {
      user_ids,
      assessment_ids,
      expires,
      target_id,
      custom_fields,
      whitelabel = false,
      job_id,
    } = body

    // Validate required fields
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: 'user_ids is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!assessment_ids || !Array.isArray(assessment_ids) || assessment_ids.length === 0) {
      return NextResponse.json(
        { error: 'assessment_ids is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!expires) {
      return NextResponse.json(
        { error: 'expires is required' },
        { status: 400 }
      )
    }

    const expiresDate = new Date(expires)
    if (isNaN(expiresDate.getTime())) {
      return NextResponse.json(
        { error: 'expires must be a valid date' },
        { status: 400 }
      )
    }

    // Verify all users exist and belong to the actor's client (if client admin)
    const { data: users, error: usersError } = await adminClient
      .from('profiles')
      .select('id, username, email, client_id')
      .in('id', user_ids)

    if (usersError || !users || users.length !== user_ids.length) {
      return NextResponse.json(
        { error: 'One or more users not found' },
        { status: 404 }
      )
    }

    // Check client permissions for client admins
    if (isClientAdmin && actorProfile.client_id) {
      const invalidUsers = users.filter(
        (u) => u.client_id !== actorProfile.client_id
      )
      if (invalidUsers.length > 0) {
        return NextResponse.json(
          { error: 'Cannot assign to users outside your client' },
          { status: 403 }
        )
      }
    }

    // Verify all assessments exist
    const { data: assessments, error: assessmentsError } = await adminClient
      .from('assessments')
      .select('id, title')
      .in('id', assessment_ids)

    if (assessmentsError || !assessments || assessments.length !== assessment_ids.length) {
      return NextResponse.json(
        { error: 'One or more assessments not found' },
        { status: 404 }
      )
    }

    // Generate assignments
    const assignments: AssignmentInsert[] = []
    const assignmentUrls: Array<{ id: string; url: string }> = []

    for (const userId of user_ids) {
      const user = users.find((u) => u.id === userId)
      if (!user) continue

      for (const assessmentId of assessment_ids) {
        const assignmentData: AssignmentInsert = {
          user_id: userId,
          assessment_id: assessmentId,
          expires: expiresDate.toISOString(),
          whitelabel: whitelabel || false,
          completed: false,
          custom_fields: custom_fields || null,
          target_id: target_id || null,
          job_id: job_id || null,
        }

        // Insert assignment
        const { data: assignment, error: insertError } = await adminClient
          .from('assignments')
          .insert(assignmentData)
          .select()
          .single()

        if (insertError || !assignment) {
          console.error('Error creating assignment:', insertError)
          continue
        }

        assignments.push(assignment)

        // Generate URL
        const url = generateAssignmentURL(
          assignment.id,
          user.username || user.email,
          expiresDate
        )

        // Update assignment with URL
        await adminClient
          .from('assignments')
          .update({ url })
          .eq('id', assignment.id)

        assignmentUrls.push({ id: assignment.id, url })
      }
    }

    if (assignments.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create any assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        assignments: assignments.map((a) => ({
          ...a,
          url: assignmentUrls.find((au) => au.id === a.id)?.url,
        })),
        count: assignments.length,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
