import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validateAssignmentURL } from '@/lib/assignments/url-generator'
import AssessmentTakingClient from './assessment-taking-client'

interface AssessmentTakingPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    u?: string
    e?: string
    t?: string
  }>
}

export default async function AssessmentTakingPage({ params, searchParams }: AssessmentTakingPageProps) {
  const { id: assignmentId } = await params
  const query = await searchParams
  const supabase = await createClient()

  // Try to validate URL token first
  const validation = validateAssignmentURL(assignmentId, query)
  
  // If URL validation fails, check if user is authenticated and owns the assignment
  let username: string | undefined = validation.username
  let isValidAccess = validation.valid

  if (!validation.valid) {
    // Check if user is logged in and owns this assignment
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('auth_user_id', user.id)
        .single()

      if (profile) {
        // Check if this assignment belongs to the logged-in user
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const adminClient = createAdminClient()
        
        const { data: assignment } = await adminClient
          .from('assignments')
          .select('user_id')
          .eq('id', assignmentId)
          .single()

        if (assignment && assignment.user_id === profile.id) {
          // User owns this assignment, allow access
          isValidAccess = true
          username = profile.username
        }
      }
    }
  }

  if (!isValidAccess) {
    redirect(`/assignment/${assignmentId}?${new URLSearchParams(query as Record<string, string>).toString()}`)
  }

  // Load assignment and assessment data using admin client
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  const { data: assignment, error: assignmentError } = await adminClient
    .from('assignments')
    .select(`
      *,
      assessment:assessments!assignments_assessment_id_fkey(
        id,
        title,
        description,
        logo,
        background,
        primary_color,
        accent_color,
        split_questions,
        questions_per_page,
        timed,
        time_limit,
        target,
        is_360,
        show_question_numbers
      ),
      target_user:profiles!assignments_target_id_fkey(
        id,
        name,
        email
      )
    `)
    .eq('id', assignmentId)
    .single()

  if (assignmentError || !assignment) {
    redirect(`/assignment/${assignmentId}?${new URLSearchParams(query as Record<string, string>).toString()}`)
  }

  // Check if assignment is completed — show same completion UI (detail + dashboard link)
  if (assignment.completed) {
    redirect(`/assignment/${assignmentId}/complete?${new URLSearchParams(query as Record<string, string>).toString()}`)
  }

  // Check if assignment has expired
  if (new Date(assignment.expires) < new Date()) {
    redirect(`/assignment/${assignmentId}?${new URLSearchParams(query as Record<string, string>).toString()}`)
  }

  // Load assessment fields (questions)
  // For non-360 assessments with random question selection, load from assignment_fields
  // Otherwise, load all fields from the assessment
  let fields: Array<{
    id: string
    type: string
    label?: string
    content: string
    order: number
    required: boolean
    anchors?: unknown
    insights_table?: unknown
    [key: string]: unknown
  }> = []

  // Check if this assignment has selected fields (for random question selection)
  const { data: assignmentFields, error: assignmentFieldsError } = await adminClient
    .from('assignment_fields')
    .select('field_id, order')
    .eq('assignment_id', assignmentId)
    .order('order', { ascending: true })

  if (assignmentFieldsError) {
    console.error('Error loading assignment_fields:', assignmentFieldsError)
  }

  if (assignmentFields && assignmentFields.length > 0) {
    // Load only the selected fields for this assignment
    const fieldIds = assignmentFields.map(af => af.field_id)
    const { data: selectedFields, error: fieldsError } = await adminClient
      .from('fields')
      .select('*')
      .in('id', fieldIds)

    if (fieldsError) {
      console.error('Error loading selected fields:', fieldsError)
    } else if (selectedFields) {
      // Sort by the order from assignment_fields
      const orderMap = new Map(assignmentFields.map(af => [af.field_id, af.order]))
      fields = selectedFields
        .map(field => ({
          ...field,
          order: orderMap.get(field.id) || field.order || 0,
        }))
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    }
  } else {
    // No assignment_fields found, load all fields from assessment (default behavior)
    const { data: allFields, error: fieldsError } = await adminClient
      .from('fields')
      .select('*')
      .eq('assessment_id', assignment.assessment_id)
      .order('order', { ascending: true })

    if (fieldsError) {
      console.error('Error loading fields:', fieldsError)
    } else if (allFields) {
      fields = allFields
    }
  }

  // If no fields, show error but don't redirect (let client component handle it)
  if (!fields || fields.length === 0) {
    console.warn('No fields found for assessment:', assignment.assessment_id)
  }

  // Load existing answers
  const { data: answers, error: answersError } = await adminClient
    .from('answers')
    .select('*')
    .eq('assignment_id', assignmentId)

  if (answersError) {
    console.error('Error loading answers:', answersError)
  }

  // Load dimensions if needed
  const { data: dimensions } = await adminClient
    .from('dimensions')
    .select('*')
    .eq('assessment_id', assignment.assessment_id)
    .order('order', { ascending: true })

  return (
    <AssessmentTakingClient
      assignment={assignment}
      fields={fields || []}
      answers={answers || []}
      dimensions={dimensions || []}
      username={username}
    />
  )
}

