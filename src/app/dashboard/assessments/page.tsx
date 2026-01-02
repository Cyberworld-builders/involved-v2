import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import AssessmentsTable from './assessments-table'

export default async function AssessmentsPage() {
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
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching assessments:', error)
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Assessments</h1>
            <p className="text-sm md:text-base text-gray-600">Create and manage assessments.</p>
          </div>
          <Link href="/dashboard/assessments/create">
            <Button>
              <span className="mr-2">+</span>
              Create Assessment
            </Button>
          </Link>
        </div>

        {/* Supabase Setup Notice */}
        {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Supabase Not Configured
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    To save assessments to the database, please set up Supabase by following the instructions in{' '}
                    <code className="bg-blue-100 px-1 rounded">SUPABASE_SETUP.md</code>.
                  </p>
                  <p className="mt-1">
                    The form will work in demo mode until Supabase is configured.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Assessments
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assessments List */}
        <Card>
          <CardHeader>
            <CardTitle>All Assessments</CardTitle>
            <CardDescription>
              Manage your assessments and their settings
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
              <AssessmentsTable initialAssessments={assessments} />
            )}
          </CardContent>
        </Card>
      </div>
  )
}

