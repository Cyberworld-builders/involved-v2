import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { getUserProfile } from '@/lib/utils/get-user-profile'
import { Database } from '@/types/database'

type Assessment = Database['public']['Tables']['assessments']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface AssignmentDetailPageProps {
  params: Promise<{
    id: string
    assignmentId: string
  }>
}

export default async function ClientAssignmentDetailPage({ params }: AssignmentDetailPageProps) {
  const { id: clientId, assignmentId } = await params
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
      user:profiles!assignments_user_id_fkey(id, name, email, username, client_id),
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
    .eq('id', assignmentId)
    .single()

  if (assignmentError || !assignment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assignment Not Found</h1>
          <p className="text-gray-600 mb-4">The assignment you&apos;re looking for doesn&apos;t exist.</p>
          <Link href={`/dashboard/clients/${clientId}?tab=assignments`}>
            <Button>Back to Assignments</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  // Check permissions - verify assignment user belongs to this client
  const assignmentUser = assignment.user as Profile & { client_id?: string }
  
  // If client_id is not available in the joined data, fetch it separately
  let userClientId = assignmentUser?.client_id
  if (!userClientId && assignmentUser?.id) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', assignmentUser.id)
      .single()
    userClientId = userProfile?.client_id
  }
  
  if (userClientId && userClientId !== clientId) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">This assignment does not belong to this client.</p>
          <Link href={`/dashboard/clients/${clientId}?tab=assignments`}>
            <Button>Back to Assignments</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const assignmentAssessment = assignment.assessment as Assessment

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignment Details</h1>
            <p className="text-gray-600">View assignment information and status</p>
          </div>
          <Link href={`/dashboard/clients/${clientId}?tab=assignments`}>
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
        </div>
      </div>
    </DashboardLayout>
  )
}
