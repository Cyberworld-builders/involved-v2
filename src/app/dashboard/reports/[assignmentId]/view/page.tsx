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

  // Type assertion for nested object (Supabase returns arrays for relations, but .single() should return objects)
  const assessment = (assignment.assessment as unknown) as { id: string; title: string; is_360: boolean } | null

  // For non-360 assessments, require completed assignment
  // For 360 assessments, allow viewing partial reports (matches dashboard behavior)
  if (!assignment.completed && !assessment?.is_360) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Report Not Available Yet</h1>
        <p style={{ color: '#666', lineHeight: 1.6 }}>
          This assignment has not been completed yet. The participant needs to finish the assessment before a report can be generated.
        </p>
        <p style={{ color: '#666', lineHeight: 1.6, marginTop: 12 }}>
          Once the assessment is complete, return to the report dashboard and generate the report.
        </p>
        <a href={`/dashboard/reports/${assignmentId}`} style={{ display: 'inline-block', marginTop: 20, color: '#55a1d8' }}>
          Back to report dashboard
        </a>
      </div>
    )
  }

  return (
    <ReportViewFullscreenClient 
      assignmentId={assignmentId} 
      is360={assessment?.is_360 || false} 
    />
  )
}
