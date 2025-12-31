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
        is_360
      )
    `)
    .eq('id', assignmentId)
    .single()

  if (assignmentError || !assignment) {
    redirect(`/assignment/${assignmentId}?${new URLSearchParams(query as Record<string, string>).toString()}`)
  }

  // Check if assignment is completed
  if (assignment.completed) {
    redirect(`/assignment/${assignmentId}?${new URLSearchParams(query as Record<string, string>).toString()}`)
  }

  // Check if assignment has expired
  if (new Date(assignment.expires) < new Date()) {
    redirect(`/assignment/${assignmentId}?${new URLSearchParams(query as Record<string, string>).toString()}`)
  }

  // Load assessment fields (questions)
  const { data: fields, error: fieldsError } = await adminClient
    .from('fields')
    .select('*')
    .eq('assessment_id', assignment.assessment_id)
    .order('order', { ascending: true })

  if (fieldsError) {
    console.error('Error loading fields:', fieldsError)
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
