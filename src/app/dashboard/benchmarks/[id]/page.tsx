import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface BenchmarkPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BenchmarkPage({ params }: BenchmarkPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch benchmark from database with related dimension and industry data
  const { data: benchmark, error } = await supabase
    .from('benchmarks')
    .select(`
      *,
      dimensions(id, name, code, assessment_id),
      industries(id, name)
    `)
    .eq('id', id)
    .single()

  if (error || !benchmark) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Benchmark Not Found</h1>
          <p className="text-gray-600 mb-4">The benchmark you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/dashboard/benchmarks/list">
            <Button>Back to Benchmarks</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const dimension = benchmark.dimensions
  const industry = benchmark.industries

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {dimension?.name || 'Unknown Dimension'}
            </h1>
            <p className="text-gray-600">Benchmark details for {industry?.name || 'Unknown Industry'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/benchmarks/${dimension?.assessment_id}/${benchmark.industry_id}`}>
              <Button variant="outline">Edit Benchmark</Button>
            </Link>
            <Link href="/dashboard/benchmarks/list">
              <Button variant="outline">Back to List</Button>
            </Link>
          </div>
        </div>

        {/* Breadcrumbs */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/dashboard/benchmarks" className="text-gray-500 hover:text-gray-700">
                Benchmarks
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/dashboard/benchmarks/list" className="text-gray-500 hover:text-gray-700">
                All Benchmarks
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">{dimension?.code || 'Benchmark'}</li>
          </ol>
        </nav>

        {/* Benchmark Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Benchmark Value</label>
                <div className="mt-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-lg font-semibold bg-indigo-100 text-indigo-800">
                    {benchmark.value}%
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Dimension</label>
                <p className="text-gray-900">{dimension?.name || 'Unknown'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Dimension Code</label>
                <p className="text-gray-900 font-mono text-sm">{dimension?.code || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Industry</label>
                <p className="text-gray-900">{industry?.name || 'Unknown'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Benchmark ID</label>
                <p className="text-gray-900 font-mono text-xs break-all">{benchmark.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">
                  {new Date(benchmark.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900">
                  {new Date(benchmark.updated_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Related Information */}
        <Card>
          <CardHeader>
            <CardTitle>Related Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">View all benchmarks for this industry</p>
                  <p className="text-xs text-gray-500">{industry?.name || 'Unknown Industry'}</p>
                </div>
                <Link href={`/dashboard/benchmarks/list`}>
                  <Button variant="outline" size="sm">View</Button>
                </Link>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">Manage benchmarks by assessment</p>
                  <p className="text-xs text-gray-500">Navigate through assessments and industries</p>
                </div>
                <Link href="/dashboard/benchmarks">
                  <Button variant="outline" size="sm">Manage</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
