import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DuplicateButton from './duplicate-button'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !assessment) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Assessment</h1>
            <Link href="/dashboard/assessments">
              <Button variant="outline">Back to Assessments</Button>
            </Link>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
            Failed to load assessment.
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
            <p className="text-gray-600">Assessment details and actions</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DuplicateButton assessmentId={assessment.id} />
            <Link href={`/dashboard/benchmarks/manage/${assessment.id}`}>
              <Button>Manage Benchmarks</Button>
            </Link>
            <Link href={`/dashboard/assessments/${assessment.id}/edit`}>
              <Button variant="outline">Edit Assessment</Button>
            </Link>
            <Link href={`/dashboard/assessments/${assessment.id}/preview`}>
              <Button variant="outline">Preview</Button>
            </Link>
            <Link href="/dashboard/assessments">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Type:</span>{' '}
              <span className="text-gray-900">{assessment.type}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>{' '}
              <span className="text-gray-900">{assessment.status}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Created:</span>{' '}
              <span className="text-gray-900">
                {new Date(assessment.created_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Updated:</span>{' '}
              <span className="text-gray-900">
                {new Date(assessment.updated_at).toLocaleString()}
              </span>
            </div>
            {assessment.description ? (
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{assessment.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
