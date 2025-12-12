import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import BenchmarksListTable from '../benchmarks-list-table'

export default async function BenchmarksListPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch benchmarks from database with related dimension and industry data
  const { data: benchmarks, error } = await supabase
    .from('benchmarks')
    .select(`
      *,
      dimensions!inner(name, code, assessment_id),
      industries!inner(name)
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching benchmarks:', error)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">All Benchmarks</h1>
            <p className="text-sm md:text-base text-gray-600">View and manage all industry benchmarks.</p>
          </div>
          <Link href="/dashboard/benchmarks">
            <Button variant="outline">
              Manage by Assessment
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
            <li className="text-gray-900 font-medium">All Benchmarks</li>
          </ol>
        </nav>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Benchmarks
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benchmarks List */}
        <Card>
          <CardHeader>
            <CardTitle>All Benchmarks</CardTitle>
            <CardDescription>
              View all benchmarks across all assessments and industries
              {benchmarks && benchmarks.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({benchmarks.length} benchmark{benchmarks.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!benchmarks || benchmarks.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No benchmarks yet</h3>
                <p className="text-gray-500 mb-4">Get started by creating benchmarks for your assessments.</p>
                <Link href="/dashboard/benchmarks">
                  <Button>Manage Benchmarks</Button>
                </Link>
              </div>
            ) : (
              <BenchmarksListTable initialBenchmarks={benchmarks} />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
