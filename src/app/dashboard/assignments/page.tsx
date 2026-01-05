import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getUserProfile } from '@/lib/utils/get-user-profile'
import { Database } from '@/types/database'

type Assignment = Database['public']['Tables']['assignments']['Row']
type Assessment = Database['public']['Tables']['assessments']['Row']

interface AssignmentWithAssessment extends Assignment {
  assessment: Pick<Assessment, 'id' | 'title' | 'description'> | null
}

export default async function AssignmentsPage() {
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

  // If user is admin (client_admin or super_admin), redirect to clients page
  // Assignments are managed per-client, not globally
  if (profile.access_level === 'client_admin' || profile.access_level === 'super_admin') {
    if (profile.access_level === 'client_admin' && profile.client_id) {
      redirect(`/dashboard/clients/${profile.client_id}?tab=assignments`)
    } else {
      // Super admin - redirect to clients list
      redirect('/dashboard/clients')
    }
  }

  // Otherwise, show user's own assignments (member view)

  // Get user's profile ID (not auth_user_id)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!userProfile) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          Profile not found. Please contact support.
        </div>
      </div>
    )
  }

  // Get assignments for this user
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', userProfile.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching assignments:', error)
  }

  // Get unique assessment IDs
  const assessmentIds = [...new Set((assignments || []).map(a => a.assessment_id).filter(Boolean))]

  // Fetch assessments separately
  const assessmentsMap = new Map<string, Pick<Assessment, 'id' | 'title' | 'description'>>()
  if (assessmentIds.length > 0) {
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('id, title, description')
      .in('id', assessmentIds)

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError)
    } else if (assessments) {
      for (const assessment of assessments) {
        assessmentsMap.set(assessment.id, {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description
        })
      }
    }
  }

  // Join assignments with assessments
  const assignmentsList: AssignmentWithAssessment[] = (assignments || []).map(assignment => ({
    ...assignment,
    assessment: assessmentsMap.get(assignment.assessment_id) || null
  }))

  // Separate assignments by status
  const pendingAssignments = assignmentsList.filter(
    (a) => !a.completed && new Date(a.expires) > new Date()
  )
  const completedAssignments = assignmentsList.filter((a) => a.completed)
  const expiredAssignments = assignmentsList.filter(
    (a) => !a.completed && new Date(a.expires) <= new Date()
  )

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-600">View and complete your assigned assessments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending</CardTitle>
              <CardDescription>Assignments waiting for completion</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{pendingAssignments.length}</p>
              <p className="text-sm text-gray-600">Active assignments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
              <CardDescription>Assignments you&apos;ve finished</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{completedAssignments.length}</p>
              <p className="text-sm text-gray-600">Total completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expired</CardTitle>
              <CardDescription>Assignments past due date</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{expiredAssignments.length}</p>
              <p className="text-sm text-gray-600">Expired assignments</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Assignments */}
        {pendingAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Assignments</CardTitle>
              <CardDescription>Complete these assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {assignment.assessment?.title || 'Untitled Assessment'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {new Date(assignment.expires).toLocaleDateString()}
                        </p>
                        {assignment.assessment?.description && (
                          <div 
                            className="text-sm text-gray-500 mt-2 rich-text-content"
                            dangerouslySetInnerHTML={{ __html: assignment.assessment.description }}
                          />
                        )}
                      </div>
                      <div className="ml-4">
                        {assignment.url ? (() => {
                          let url = assignment.url.trim()
                          
                          // URLs are stored with domain but no protocol (e.g., "involved-v2.cyberworldbuilders.dev/assignment/...")
                          // Strip the domain and keep only the path so React/Next.js can add the domain automatically
                          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
                          const baseUrlWithoutProtocol = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
                          
                          // Remove the domain part if it matches our base URL
                          if (baseUrlWithoutProtocol && url.startsWith(baseUrlWithoutProtocol)) {
                            url = url.substring(baseUrlWithoutProtocol.length)
                          } else {
                            // Fallback: find the first slash and take everything from there
                            const firstSlashIndex = url.indexOf('/')
                            if (firstSlashIndex !== -1) {
                              url = url.substring(firstSlashIndex)
                            } else {
                              // No slash found, ensure it starts with /
                              url = `/${url}`
                            }
                          }
                          
                          // Ensure it starts with /
                          if (!url.startsWith('/')) {
                            url = `/${url}`
                          }
                          
                          return (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                            >
                              Start Assessment
                            </a>
                          )
                        })() : (
                          <span className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-600 text-sm font-medium rounded-md cursor-not-allowed">
                            Not Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Assignments */}
        {completedAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed Assignments</CardTitle>
              <CardDescription>Your finished assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {assignment.assessment?.title || 'Untitled Assessment'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Completed: {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                          Completed
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expired Assignments */}
        {expiredAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Expired Assignments</CardTitle>
              <CardDescription>Assignments past their due date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expiredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="border border-red-200 rounded-lg p-4 bg-red-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {assignment.assessment?.title || 'Untitled Assessment'}
                        </h3>
                        <p className="text-sm text-red-600 mt-1">
                          Expired: {new Date(assignment.expires).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                          Expired
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {assignmentsList.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-gray-500 text-lg">No assignments yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  You&apos;ll see your assigned assessments here when they&apos;re created.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  )
}

