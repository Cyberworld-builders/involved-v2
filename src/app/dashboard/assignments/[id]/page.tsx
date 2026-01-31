import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getUserProfile } from '@/lib/utils/get-user-profile'
import { Database } from '@/types/database'
import GenerateReportButton from './generate-report-button'

type Assessment = Database['public']['Tables']['assessments']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface AssignmentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AssignmentDetailPage({ params }: AssignmentPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile to verify access level
  const profile = await getUserProfile(supabase, user.id)
  if (!profile) {
    redirect('/auth/login')
  }

  // Use direct Supabase query
  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select(`
      *,
      user:profiles!assignments_user_id_fkey(id, name, email, username),
      assessment:assessments!assignments_assessment_id_fkey(
        id,
        title,
        description,
        logo,
        background,
        timed,
        time_limit
      )
    `)
    .eq('id', id)
    .single()

  if (assignmentError || !assignment) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Assignment Not Found</h1>
        <p className="text-gray-600 mb-4">The assignment you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/assignments">
          <Button>Back to Assignments</Button>
        </Link>
      </div>
    )
  }

  // Check permissions
  const isSuperAdmin = profile.access_level === 'super_admin'
  const isClientAdmin = profile.access_level === 'client_admin'
  const isOwner = (assignment.user as Profile)?.id === profile.id

  // For client admins, check if assignment user is in their client
  let canAccess = isSuperAdmin || isOwner
  if (isClientAdmin && profile.client_id) {
    const assignmentUser = assignment.user as Profile
    if (assignmentUser?.client_id === profile.client_id) {
      canAccess = true
    }
  }

  if (!canAccess) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-4">You don&apos;t have permission to view this assignment.</p>
        <Link href="/dashboard/assignments">
          <Button>Back to Assignments</Button>
        </Link>
      </div>
    )
  }

  const assignmentUser = assignment.user as Profile
  const assignmentAssessment = assignment.assessment as Assessment

  // Check if report exists and if dimensions exist for the assessment
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  const [reportDataResult, dimensionsResult] = await Promise.all([
    adminClient
      .from('report_data')
      .select('id, calculated_at')
      .eq('assignment_id', id)
      .single(),
    adminClient
      .from('dimensions')
      .select('id')
      .eq('assessment_id', assignment.assessment_id)
      .is('parent_id', null)
      .limit(1)
  ])

  const hasReport = !!reportDataResult.data
  const hasDimensions = !!dimensionsResult.data && dimensionsResult.data.length > 0

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignment Details</h1>
            <p className="text-gray-600">View assignment information and status</p>
          </div>
          <Link href="/dashboard/assignments">
            <Button variant="outline">Back to Assignments</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">User</label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {assignmentUser?.name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500">
                  {assignmentUser?.email || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Assessment</label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {assignmentAssessment?.title || 'Unknown Assessment'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  {assignment.completed ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  ) : new Date(assignment.expires) < new Date() ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Expired
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Pending
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Assigned</label>
                <p className="text-sm text-gray-900 mt-1">
                  {assignment.created_at
                    ? new Date(assignment.created_at).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Expires</label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(assignment.expires).toLocaleString()}
                </p>
              </div>
              {assignment.completed_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Completed</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(assignment.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
              {assignment.url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Assignment URL</label>
                  <div className="mt-1">
                    <a
                      href={assignment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-800 break-all"
                    >
                      {assignment.url}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assessment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {assignmentAssessment?.title || 'Unknown'}
                </p>
              </div>
              {assignmentAssessment?.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <div
                    className="text-sm text-gray-700 mt-1 rich-text-content"
                    dangerouslySetInnerHTML={{ __html: assignmentAssessment.description }}
                  />
                </div>
              )}
              {assignmentAssessment?.timed && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Time Limit</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {assignmentAssessment.time_limit || 0} minutes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Custom Fields */}
        {assignment.custom_fields && (
          <Card>
            <CardHeader>
              <CardTitle>Custom Fields</CardTitle>
              <CardDescription>Target information for 360 assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignment.custom_fields.type && assignment.custom_fields.value && (
                  <>
                    {assignment.custom_fields.type.map((type: string, index: number) => (
                      <div key={index} className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-500 w-24">
                          {type}:
                        </span>
                        <span className="text-sm text-gray-900">
                          {assignment.custom_fields?.value?.[index] || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          {!assignment.completed && assignment.url && (
            <a
              href={assignment.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button>View Assignment</Button>
            </a>
          )}
          {assignment.completed && (
            <>
              {hasReport ? (
                <Link href={`/dashboard/reports/${id}`}>
                  <Button>View Report</Button>
                </Link>
              ) : hasDimensions ? (
                <GenerateReportButton assignmentId={id} />
              ) : (
                <div className="flex flex-col items-end gap-2">
                  <Button disabled variant="outline" title="Assessment has no dimensions configured">
                    Generate Report (Unavailable)
                  </Button>
                  <p className="text-sm text-gray-500 max-w-xs text-right">
                    This assessment has no dimensions configured. Please add dimensions to the assessment before generating a report.
                  </p>
                </div>
              )}
            </>
          )}
          {(isSuperAdmin || isClientAdmin) && (
            <>
              <Link href={`/dashboard/assignments/${id}/edit`}>
                <Button variant="outline">Edit</Button>
              </Link>
            </>
          )}
        </div>
      </div>
  )
}

