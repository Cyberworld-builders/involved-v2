import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ReportViewClient from './report-view-client'

export default async function ReportPage({
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
      user:profiles!assignments_user_id_fkey(
        id,
        name,
        email
      ),
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

  // Type assertions for nested objects (Supabase returns arrays for relations, but .single() should return objects)
  const assessment = (assignment.assessment as unknown) as { id: string; title: string; is_360: boolean } | null
  const assignmentUser = (assignment.user as unknown) as { id: string; name: string; email: string } | null

  // Check permissions
  const isOwner = assignment.user_id === profile.id
  const isAdmin = profile.access_level === 'client_admin' || profile.access_level === 'super_admin'

  if (!isOwner && !isAdmin) {
    redirect('/dashboard')
  }

  if (!assignment.completed) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">
            This assignment has not been completed yet. Reports are only available for completed assignments.
          </p>
          <Link href="/dashboard/assignments" className="mt-4 inline-block">
            <Button variant="outline">Back to Assignments</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Assessment Report: {assessment?.title || 'Unknown Assessment'}
          </h1>
          <p className="text-gray-600">
            {assessment?.is_360 ? '360 Assessment Report' : 'Assessment Report'} for {assignmentUser?.name || 'Unknown User'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/reports/${assignmentId}/view`} target="_blank">
            <Button variant="outline">👁️ View Fullscreen</Button>
          </Link>
          <Link href={`/api/reports/${assignmentId}/export/pdf`} target="_blank">
            <Button variant="outline">📄 View PDF</Button>
          </Link>
          <Link href={`/api/reports/${assignmentId}/export/pdf?download=true`} target="_blank">
            <Button variant="outline">💾 Download PDF</Button>
          </Link>
          <Link href={`/api/reports/${assignmentId}/export/excel`}>
            <Button variant="outline">📊 Export Excel</Button>
          </Link>
          <Link href={`/api/reports/${assignmentId}/export/csv`}>
            <Button variant="outline">📋 Export CSV</Button>
          </Link>
          <Link href="/dashboard/assignments">
            <Button variant="outline">Back to Assignments</Button>
          </Link>
        </div>
      </div>

      <ReportViewClient assignmentId={assignmentId} is360={assessment?.is_360 || false} />
    </div>
  )
}
