import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface BenchmarksIndustryPageProps {
  params: Promise<{
    assessmentId: string
  }>
}

export default async function BenchmarksIndustryPage({ params }: BenchmarksIndustryPageProps) {
  const { assessmentId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch assessment
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', assessmentId)
    .single()

  if (assessmentError || !assessment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
          <p className="text-gray-600 mb-4">The assessment you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/dashboard/benchmarks">
            <Button>Back to Benchmarks</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  // Fetch industries
  const { data: industries, error: industriesError } = await supabase
    .from('industries')
    .select('*')
    .order('name', { ascending: true })

  if (industriesError) {
    console.error('Error fetching industries:', industriesError)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benchmarks</h1>
          <p className="text-gray-600">Manage industry benchmarks for assessment dimensions.</p>
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
            <li>
              <Link href={`/dashboard/benchmarks/${assessment.id}`} className="text-gray-500 hover:text-gray-700">
                {assessment.title}
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">Select Industry</li>
          </ol>
        </nav>

        {/* Industries List */}
        <Card>
          <CardHeader>
            <CardTitle>Select Industry</CardTitle>
            <CardDescription>
              Choose an industry to manage benchmarks for &quot;{assessment.title}&quot;
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!industries || industries.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No industries yet</h3>
                <p className="text-gray-500 mb-4">Industries need to be created first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {industries.map((industry) => (
                  <Link
                    key={industry.id}
                    href={`/dashboard/benchmarks/${assessment.id}/${industry.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{industry.name}</h3>
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

