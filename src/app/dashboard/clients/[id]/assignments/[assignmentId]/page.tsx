import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { getUserProfile } from '@/lib/utils/get-user-profile'
import { Database } from '@/types/database'
import AssignmentResultsClient from './assignment-results-client'

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
        primary_color,
        accent_color,
        timed,
        time_limit
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

  // Load answers and fields if assignment is completed
  let answers: Array<{ field_id: string; value: string; time?: number | null }> = []
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

  if (assignment.completed) {
    // Use admin client to bypass RLS for loading answers and fields
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    // Load answers
    const { data: answersData, error: answersError } = await adminClient
      .from('answers')
      .select('*')
      .eq('assignment_id', assignmentId)

    if (!answersError && answersData) {
      answers = answersData.map((a: { field_id: string; value: string; time?: number | null }) => ({
        field_id: a.field_id,
        value: a.value,
        time: a.time,
      }))
    }

    // Load fields - check if assignment has selected fields (for random question selection)
    let fieldsData: Array<{
      id: string
      type: string
      label?: string
      content: string
      order: number
      required: boolean
      anchors?: unknown
      insights_table?: unknown
      [key: string]: unknown
    }> | null = null

    // Check if this assignment has selected fields
    const { data: assignmentFields, error: assignmentFieldsError } = await adminClient
      .from('assignment_fields')
      .select('field_id, order')
      .eq('assignment_id', assignmentId)
      .order('order', { ascending: true })

    if (!assignmentFieldsError && assignmentFields && assignmentFields.length > 0) {
      // Load only the selected fields for this assignment
      const fieldIds = assignmentFields.map(af => af.field_id)
      const { data: selectedFields, error: selectedFieldsError } = await adminClient
        .from('fields')
        .select('*')
        .in('id', fieldIds)

      if (!selectedFieldsError && selectedFields) {
        // Sort by the order from assignment_fields
        const orderMap = new Map(assignmentFields.map(af => [af.field_id, af.order]))
        fieldsData = selectedFields
          .map(field => ({
            ...field,
            order: orderMap.get(field.id) || field.order || 0,
          }))
          .sort((a, b) => (a.order || 0) - (b.order || 0))
      }
    } else {
      // No assignment_fields found, load all fields from assessment (default behavior)
      const { data: allFields, error: allFieldsError } = await adminClient
        .from('fields')
        .select('*')
        .eq('assessment_id', assignment.assessment_id)
        .order('order', { ascending: true })
      
      if (!allFieldsError) {
        fieldsData = allFields
      }
    }

    if (fieldsData) {
      fields = fieldsData
    }
  }

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

        {/* Assessment Results - Only show if completed */}
        {assignment.completed && assignmentAssessment && fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Assessment Results</CardTitle>
              <CardDescription>
                View the completed assessment responses below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentResultsClient
                assessment={{
                  id: assignmentAssessment.id,
                  title: assignmentAssessment.title,
                  description: assignmentAssessment.description,
                  logo: assignmentAssessment.logo,
                  background: assignmentAssessment.background,
                  primary_color: assignmentAssessment.primary_color,
                  accent_color: assignmentAssessment.accent_color,
                }}
                fields={fields}
                answers={answers}
                target_user={assignment.target_user as { id: string; name: string; email: string } | null}
                custom_fields={assignment.custom_fields as { type?: string[]; value?: string[] } | null}
              />
            </CardContent>
          </Card>
        )}

        {assignment.completed && fields.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Assessment Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">No questions were found for this assessment.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
