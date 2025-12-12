import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default async function BenchmarksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch assessments from database
  const { data: assessments, error } = await supabase
    .from('assessments')
    .select('*')
    .order('title', { ascending: true })

  if (error) {
    console.error('Error fetching assessments:', error)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Benchmarks</h1>
            <p className="text-gray-600">Manage industry benchmarks for assessment dimensions.</p>
          </div>
          <Link href="/dashboard/benchmarks/list">
            <Button variant="outline">
              View All Benchmarks
            </Button>
          </Link>
        </div>

        {/* Breadcrumbs */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/dashboard/benchmarks" className="text-gray-500 hover:text-gray-700">
                Benchmarks
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">Select Assessment</li>
          </ol>
        </nav>

        {/* Assessments List */}
        <Card>
          <CardHeader>
            <CardTitle>Select Assessment</CardTitle>
            <CardDescription>
              Choose an assessment to manage benchmarks for its dimensions
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
                <p className="text-gray-500 mb-4">Create an assessment first to manage benchmarks.</p>
                <Link href="/dashboard/assessments/create">
                  <Button>Create Assessment</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {assessments.map((assessment) => (
                  <Link
                    key={assessment.id}
                    href={`/dashboard/benchmarks/${assessment.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{assessment.title}</h3>
                        {assessment.description && (
                          <p className="text-sm text-gray-500 mt-1">{assessment.description}</p>
                        )}
                      </div>
                      <div className="text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
