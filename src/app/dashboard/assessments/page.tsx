import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default async function AssessmentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch assessments from database
  const { data: assessments } = await supabase
    .from('assessments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Assessments</h1>
            <p className="text-sm md:text-base text-gray-600">Create and manage talent assessments.</p>
          </div>
          <Link href="/dashboard/assessments/create">
            <Button>
              <span className="mr-2">+</span>
              Create Assessment
            </Button>
          </Link>
        </div>

        {/* Assessments List */}
        <Card>
          <CardHeader>
            <CardTitle>All Assessments</CardTitle>
            <CardDescription>
              Manage your organization&apos;s assessments and their settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!assessments || assessments.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>
                <p className="text-gray-500 mb-4">Get started by creating your first assessment.</p>
                <Link href="/dashboard/assessments/create">
                  <Button>Create Assessment</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                            Assessment
                          </th>
                          <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                            Type
                          </th>
                          <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                            Status
                          </th>
                          <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                            Created
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {assessments.map((assessment) => (
                          <tr key={assessment.id} className="hover:bg-gray-50">
                            <td className="px-3 py-4 sm:px-6">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0">
                                  {assessment.logo ? (
                                    <Image
                                      className="h-10 w-10 rounded-full"
                                      src={assessment.logo}
                                      alt={assessment.title}
                                      width={40}
                                      height={40}
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-700">
                                        {assessment.title.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    <Link
                                      href={`/dashboard/assessments/${assessment.id}`}
                                      className="hover:text-indigo-600"
                                    >
                                      {assessment.title}
                                    </Link>
                                  </div>
                                  {assessment.description && (
                                    <div 
                                      className="text-sm text-gray-500 max-w-xs overflow-hidden hidden sm:block"
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                      dangerouslySetInnerHTML={{ __html: assessment.description }}
                                    />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell px-3 py-4 sm:px-6">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {assessment.type}
                              </span>
                            </td>
                            <td className="hidden md:table-cell px-3 py-4 sm:px-6">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                assessment.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : assessment.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : assessment.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {assessment.status}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell px-3 py-4 sm:px-6 text-sm text-gray-500">
                              {new Date(assessment.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-4 sm:px-6 text-sm font-medium">
                              <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-1 sm:space-y-0">
                                <Link
                                  href={`/dashboard/assessments/${assessment.id}/edit`}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Edit
                                </Link>
                                <Link
                                  href={`/dashboard/assessments/${assessment.id}`}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  View
                                </Link>
                                <button className="text-red-600 hover:text-red-900 text-left">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

