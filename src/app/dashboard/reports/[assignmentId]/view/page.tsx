import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ReportViewFullscreenClient from './report-view-fullscreen-client'

export default async function ReportViewFullscreenPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params
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
    .select('id, access_level, client_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  // Get assignment to verify access
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const { data: assignment, error: assignmentError } = await adminClient
    .from('assignments')
    .select(`
      id,
      user_id,
      assessment_id,
      completed,
      assessment:assessments!assignments_assessment_id_fkey(
        id,
        title,
        is_360
      )
    `)
    .eq('id', assignmentId)
    .single()

  if (assignmentError || !assignment) {
    notFound()
  }

  // Check permissions
  const isOwner = assignment.user_id === profile.id
  const isAdmin = profile.access_level === 'client_admin' || profile.access_level === 'super_admin'

  if (!isOwner && !isAdmin) {
    redirect('/dashboard')
  }

  if (!assignment.completed) {
    redirect(`/dashboard/reports/${assignmentId}`)
  }

  return (
    <ReportViewFullscreenClient 
      assignmentId={assignmentId} 
      is360={assignment.assessment?.is_360 || false} 
    />
  )
}
