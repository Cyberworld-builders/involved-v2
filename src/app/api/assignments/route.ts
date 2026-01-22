import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAssignmentURL } from '@/lib/assignments/url-generator'
import { generateTemporaryPassword } from '@/lib/utils/generate-temporary-password'
import { Database } from '@/types/database'
import { randomUUID } from 'crypto'

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
      .select('id, access_level, role, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!actorProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

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
      survey_id,
      reminder = false,
      first_reminder_date = null,
      reminder_frequency = null,
    } = body as {
      user_ids: string[]
      assessment_ids: string[]
      expires: string
      target_id?: string | null
      custom_fields?: Record<string, unknown> | null
      whitelabel?: boolean
      job_id?: string | null
      survey_id?: string | null
      reminder?: boolean
      first_reminder_date?: string | null
      reminder_frequency?: string | null
    }

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
      .select('id, username, email, client_id, auth_user_id')
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

    // Verify all assessments exist and get their details
    const { data: assessments, error: assessmentsError } = await adminClient
      .from('assessments')
      .select('id, title, is_360, number_of_questions, dimension_question_counts')
      .in('id', assessment_ids)

    if (assessmentsError || !assessments || assessments.length !== assessment_ids.length) {
      return NextResponse.json(
        { error: 'One or more assessments not found' },
        { status: 404 }
      )
    }

    // Type assertion for assessments with the fields we need
    type AssessmentWithDetails = {
      id: string
      title: string
      is_360: boolean
      number_of_questions: number | null
      dimension_question_counts: Record<string, number> | null
    }
    const typedAssessments = assessments as AssessmentWithDetails[]

    // Calculate next_reminder from first_reminder_date if provided, otherwise calculate from reminder_frequency
    let nextReminderDate: Date | null = null
    if (reminder) {
      if (first_reminder_date) {
        // Use the specified first reminder date
        nextReminderDate = new Date(first_reminder_date)
      } else if (reminder_frequency) {
        // Fallback: Calculate from frequency if no first reminder date is provided
        const now = new Date()
        // Parse frequency string like "+1 day", "+2 days", "+1 week", "+2 weeks", "+1 month", etc.
        if (reminder_frequency === '+1 day') {
          nextReminderDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
        } else if (reminder_frequency === '+2 days') {
          nextReminderDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
        } else if (reminder_frequency === '+3 days') {
          nextReminderDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        } else if (reminder_frequency === '+4 days') {
          nextReminderDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)
        } else if (reminder_frequency === '+5 days') {
          nextReminderDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
        } else if (reminder_frequency === '+6 days') {
          nextReminderDate = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)
        } else if (reminder_frequency === '+1 week') {
          nextReminderDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        } else if (reminder_frequency === '+2 weeks') {
          nextReminderDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
        } else if (reminder_frequency === '+3 weeks') {
          nextReminderDate = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000)
        } else if (reminder_frequency === '+1 month') {
          nextReminderDate = new Date(now)
          nextReminderDate.setMonth(nextReminderDate.getMonth() + 1)
        } else if (reminder_frequency === '+2 months') {
          nextReminderDate = new Date(now)
          nextReminderDate.setMonth(nextReminderDate.getMonth() + 2)
        } else if (reminder_frequency === '+3 months') {
          nextReminderDate = new Date(now)
          nextReminderDate.setMonth(nextReminderDate.getMonth() + 3)
        }
      }
    }

    // Ensure all users have auth accounts and generate temporary passwords
    const userPasswords = new Map<string, string>() // userId -> temporary password
    
    for (const user of users) {
      let authUserId = user.auth_user_id
      
      // Create auth account if it doesn't exist
      if (!authUserId) {
        try {
          // Generate temporary password
          const tempPassword = generateTemporaryPassword(12)
          
          // Create auth user
          const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: user.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: user.username || user.email,
              username: user.username || user.email.split('@')[0],
            },
          })

          if (authError || !authData?.user) {
            console.error(`Error creating auth account for user ${user.id}:`, authError)
            // Continue without auth account - user can still access via signed URL
            continue
          }

          authUserId = authData.user.id
          
          // Update profile with auth_user_id
          const { error: updateError } = await adminClient
            .from('profiles')
            .update({ auth_user_id: authUserId })
            .eq('id', user.id)

          if (updateError) {
            console.error(`Error updating profile with auth_user_id for user ${user.id}:`, updateError)
          }

          // Store password for email
          userPasswords.set(user.id, tempPassword)
        } catch (error) {
          console.error(`Unexpected error creating auth account for user ${user.id}:`, error)
          // Continue without auth account
        }
      } else {
        // User already has auth account - don't reset their password
        // They can use their existing password or access via signed URL
        // Resetting passwords for existing users could cause issues if they receive
        // multiple assignments (password would be overwritten multiple times)
        console.log(`User ${user.id} already has auth account - skipping password generation`)
      }
    }

    // Generate or use provided survey_id for this batch of assignments
    // All assignments created in this API call will share the same survey_id
    // If survey_id is provided, use it (for adding to existing survey)
    // Otherwise, generate a new one
    const surveyId = survey_id || randomUUID()

    // Generate assignments
    const assignments: AssignmentInsert[] = []
    const assignmentUrls: Array<{ id: string; url: string }> = []

      for (const userId of user_ids) {
        const user = users.find((u) => u.id === userId)
        if (!user) continue

        for (const assessmentId of assessment_ids) {
        const assignmentData: AssignmentInsert & {
          reminder?: boolean
          reminder_frequency?: string | null
          next_reminder?: string | null
        } = {
          user_id: userId,
          assessment_id: assessmentId,
          expires: expiresDate.toISOString(),
          whitelabel: whitelabel || false,
          completed: false,
          custom_fields: custom_fields || null,
          target_id: target_id || null,
          job_id: job_id || null,
          survey_id: surveyId,
          reminder: reminder || false,
          reminder_frequency: reminder ? reminder_frequency : null,
          next_reminder: nextReminderDate ? nextReminderDate.toISOString() : null,
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

        // For non-360 assessments, select questions based on dimension_question_counts or number_of_questions
        const assessment = typedAssessments.find(a => a.id === assessmentId)
        if (assessment && !assessment.is_360) {
          // Load all questions for this assessment (excluding instructions and page breaks)
          const { data: allFields, error: fieldsError } = await adminClient
            .from('fields')
            .select('id, order, type, dimension_id')
            .eq('assessment_id', assessmentId)
            .order('order', { ascending: true })

          if (!fieldsError && allFields && allFields.length > 0) {
            // Filter out instructions and page breaks
            const questionFields = allFields.filter(field => {
              const fieldType = field.type as string
              return fieldType !== 'instructions' && 
                     fieldType !== '10' && 
                     fieldType !== 'page_break'
            })

            if (questionFields.length > 0) {
              let selectedFields: typeof questionFields = []

              // Check if dimension_question_counts is set and has values
              const dimensionCounts = assessment.dimension_question_counts
              const hasDimensionCounts = dimensionCounts && 
                                         typeof dimensionCounts === 'object' && 
                                         Object.keys(dimensionCounts).length > 0 &&
                                         Object.values(dimensionCounts).some((count: unknown) => typeof count === 'number' && count > 0)

              if (hasDimensionCounts) {
                // Select questions per dimension based on dimension_question_counts
                const selectedByDimension: typeof questionFields = []
                
                for (const [dimensionId, count] of Object.entries(dimensionCounts)) {
                  if (typeof count !== 'number' || count <= 0) continue
                  
                  // Get questions for this dimension
                  const dimensionFields = questionFields.filter(field => field.dimension_id === dimensionId)
                  
                  if (dimensionFields.length > 0) {
                    // Randomly select the specified number of questions from this dimension
                    const shuffled = [...dimensionFields].sort(() => Math.random() - 0.5)
                    const selected = shuffled.slice(0, Math.min(count, dimensionFields.length))
                    selectedByDimension.push(...selected)
                  }
                }
                
                // Also handle questions with no dimension (dimension_id is null)
                const nullDimensionCount = dimensionCounts['null'] || dimensionCounts[''] || 0
                if (nullDimensionCount > 0) {
                  const nullDimensionFields = questionFields.filter(field => !field.dimension_id)
                  if (nullDimensionFields.length > 0) {
                    const shuffled = [...nullDimensionFields].sort(() => Math.random() - 0.5)
                    const selected = shuffled.slice(0, Math.min(nullDimensionCount, nullDimensionFields.length))
                    selectedByDimension.push(...selected)
                  }
                }
                
                selectedFields = selectedByDimension
              } else if (assessment.number_of_questions) {
                // Fall back to random selection using number_of_questions
                const shuffled = [...questionFields].sort(() => Math.random() - 0.5)
                selectedFields = shuffled.slice(0, Math.min(assessment.number_of_questions, questionFields.length))
              }

              // Sort selected fields by original order to maintain question flow
              selectedFields.sort((a, b) => (a.order || 0) - (b.order || 0))

              // Create assignment_fields entries
              if (selectedFields.length > 0) {
                const assignmentFieldsToInsert = selectedFields.map((field, index) => ({
                  assignment_id: assignment.id,
                  field_id: field.id,
                  order: index + 1,
                }))

                const { error: assignmentFieldsError } = await adminClient
                  .from('assignment_fields')
                  .insert(assignmentFieldsToInsert)

                if (assignmentFieldsError) {
                  console.error('Error creating assignment_fields:', assignmentFieldsError)
                  // Continue anyway - assignment is created, just without field selection
                }
              }
            }
          }
        }

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
        userPasswords: Object.fromEntries(userPasswords), // Convert Map to object for JSON
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

