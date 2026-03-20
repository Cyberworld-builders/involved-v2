import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import ReportPageClient from './report-page-client'

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
      completed_at,
      user:profiles!assignments_user_id_fkey(
        id,
        name,
        email,
        client_id
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

  const assessment = (assignment.assessment as unknown) as { id: string; title: string; is_360: boolean } | null
  const assignmentUser = (assignment.user as unknown) as { id: string; name: string; email: string; client_id: string } | null
  const clientId = assignmentUser?.client_id || profile.client_id

  // Check permissions
  const isOwner = assignment.user_id === profile.id
  const isAdmin = profile.access_level === 'client_admin' || profile.access_level === 'super_admin'

  if (!isOwner && !isAdmin) {
    redirect('/dashboard')
  }

  const is360 = assessment?.is_360 || false
  const isCompleted = !!assignment.completed

  // For non-360 assessments that aren't completed, show status message
  if (!isCompleted && !is360) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/clients/${clientId}?tab=assignments`}
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          &larr; Back to Assignments
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Assessment Report: {assessment?.title || 'Unknown Assessment'}
          </h1>
          <p className="text-gray-600">
            For {assignmentUser?.name || 'Unknown User'}
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Report Not Available Yet</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                The participant needs to finish the assessment before a report can be generated.
                Once the assessment is complete, return here to generate and download the report.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href={`/dashboard/clients/${clientId}?tab=assignments`}
        className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
      >
        &larr; Back to Assignments
      </Link>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Assessment Report: {assessment?.title || 'Unknown Assessment'}
        </h1>
        <p className="text-gray-600">
          {is360 ? '360 Assessment' : 'Assessment'} for {assignmentUser?.name || 'Unknown User'}
          {isCompleted ? (
            assignment.completed_at ? ` \u00B7 Completed ${new Date(assignment.completed_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ' \u00B7 Completed'
          ) : (
            ' \u00B7 In Progress'
          )}
        </p>
      </div>

      {/* 360 partial data warning */}
      {is360 && !isCompleted && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            This report reflects responses received so far. Not all raters may have completed their assessments.
            You can regenerate the report as more responses come in.
          </p>
        </div>
      )}

      {/* Export & Share + Report Preview */}
      <ReportPageClient
        assignmentId={assignmentId}
        is360={is360}
        isCompleted={isCompleted}
      />
    </div>
  )
}
