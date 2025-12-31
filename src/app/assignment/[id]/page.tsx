import { createClient } from '@/lib/supabase/server'
import { validateAssignmentURL } from '@/lib/assignments/url-generator'
import AssignmentStageClient from './assignment-stage-client'

interface AssignmentStagePageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    u?: string
    e?: string
    t?: string
  }>
}

export default async function AssignmentStagePage({ params, searchParams }: AssignmentStagePageProps) {
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Assignment Link</h1>
          <p className="text-gray-600 mb-4">{validation.error || 'This assignment link is invalid or has expired.'}</p>
          <p className="text-sm text-gray-500">
            Please contact your administrator for a new assignment link.
          </p>
        </div>
      </div>
    )
  }

  // Load assignment and assessment data
  // Use admin client to bypass RLS since we've already validated the URL token
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
        accent_color
      )
    `)
    .eq('id', assignmentId)
    .single()

  if (assignmentError) {
    console.error('Error loading assignment:', assignmentError)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Assignment</h1>
          <p className="text-gray-600 mb-4">
            {assignmentError.message || 'Failed to load assignment. Please try again or contact support.'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Error code: {assignmentError.code || 'Unknown'}
          </p>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assignment Not Found</h1>
          <p className="text-gray-600 mb-4">The assignment you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  // Verify the assignment belongs to the user from the URL (additional security check)
  // Get user profile by username to verify
  if (validation.username) {
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('id, username')
      .eq('username', validation.username)
      .single()

    if (userProfile && assignment.user_id !== userProfile.id) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">This assignment does not belong to you.</p>
          </div>
        </div>
      )
    }
  }

  // Check if assignment is completed
  if (assignment.completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assignment Completed</h1>
          <p className="text-gray-600 mb-4">This assignment has already been completed.</p>
        </div>
      </div>
    )
  }

  // Check if assignment has expired
  if (new Date(assignment.expires) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assignment Expired</h1>
          <p className="text-gray-600 mb-4">
            This assignment expired on {new Date(assignment.expires).toLocaleDateString()}.
          </p>
        </div>
      </div>
    )
  }

  return <AssignmentStageClient assignment={assignment} username={username} />
}
