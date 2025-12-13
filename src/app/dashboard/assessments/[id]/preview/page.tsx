import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type DimensionRow = Database['public']['Tables']['dimensions']['Row']
type FieldRow = Database['public']['Tables']['fields']['Row']

export default async function AssessmentPreviewPage({
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

  const [{ data: assessment }, { data: dimensions }, { data: fields }] = await Promise.all([
    supabase.from('assessments').select('*').eq('id', id).single(),
    supabase.from('dimensions').select('*').eq('assessment_id', id).order('created_at', { ascending: true }),
    supabase.from('fields').select('*').eq('assessment_id', id).order('order', { ascending: true }),
  ])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Preview</h1>
            <p className="text-gray-600">Read-only preview of the assessment configuration</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/assessments/${id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            <Link href={`/dashboard/benchmarks/manage/${id}`}>
              <Button>Manage Benchmarks</Button>
            </Link>
            <Link href={`/dashboard/assessments/${id}`}>
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Title:</span>{' '}
              <span className="text-gray-900">{assessment?.title || '(missing)'}</span>
            </div>
            {assessment?.description ? (
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="mt-1 whitespace-pre-wrap text-gray-900">{assessment.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            {!dimensions || dimensions.length === 0 ? (
              <p className="text-sm text-gray-500">No dimensions yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(dimensions as DimensionRow[]).map((d) => (
                  <li key={d.id} className="rounded border border-gray-200 p-3">
                    <div className="font-medium text-gray-900">
                      {d.name} <span className="text-gray-500">({d.code})</span>
                    </div>
                    {d.parent_id ? (
                      <div className="text-gray-600">Parent: {d.parent_id}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fields</CardTitle>
          </CardHeader>
          <CardContent>
            {!fields || fields.length === 0 ? (
              <p className="text-sm text-gray-500">No fields yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(fields as FieldRow[]).map((f) => (
                  <li key={f.id} className="rounded border border-gray-200 p-3">
                    <div className="font-medium text-gray-900">
                      {f.order}. {f.type}
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">{f.content || ''}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
