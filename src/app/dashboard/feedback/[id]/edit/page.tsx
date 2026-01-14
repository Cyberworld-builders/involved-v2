import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import EditFeedbackClient from './edit-feedback-client'

export default async function EditFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile to check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('access_level')
    .eq('auth_user_id', user.id)
    .single()

  // Only admins can edit feedback
  if (!profile || (profile.access_level !== 'client_admin' && profile.access_level !== 'super_admin')) {
    redirect('/dashboard')
  }

  // Get feedback entry
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/feedback/${id}`, {
    headers: {
      Cookie: `sb-access-token=${user.id}`, // This won't work - need to use server-side fetch
    },
  })

  // Use admin client to fetch feedback
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const { data: feedback, error: feedbackError } = await adminClient
    .from('feedback_library')
    .select(`
      *,
      assessment:assessments!feedback_library_assessment_id_fkey(
        id,
        title
      ),
      dimension:dimensions!feedback_library_dimension_id_fkey(
        id,
        name,
        code
      )
    `)
    .eq('id', id)
    .single()

  if (feedbackError || !feedback) {
    notFound()
  }

  // Verify user has access to the assessment
  const { data: assessment } = await adminClient
    .from('assessments')
    .select('id, created_by')
    .eq('id', feedback.assessment_id)
    .single()

  if (!assessment || assessment.created_by !== user.id) {
    redirect('/dashboard/feedback')
  }

  // Get all assessments for selection
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title')
    .order('title', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Feedback Entry</h1>
          <p className="text-gray-600">Update feedback entry details</p>
        </div>
        <Link href="/dashboard/feedback">
          <Button variant="outline">Back to Feedback Library</Button>
        </Link>
      </div>

      <EditFeedbackClient
        feedback={feedback}
        assessments={assessments || []}
      />
    </div>
  )
}
