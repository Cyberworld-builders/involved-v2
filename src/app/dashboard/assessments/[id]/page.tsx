import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import AssessmentPublishButton from '@/components/assessment-publish-button'

interface AssessmentPageProps {
  params: Promise<{
    id: string
  }>
}

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch assessment from database
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !assessment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
          <p className="text-gray-600 mb-4">The assessment you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/dashboard/assessments">
            <Button>Back to Assessments</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
            <p className="text-gray-600">Assessment details and settings</p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/dashboard/assessments/${assessment.id}/edit`}>
              <Button variant="outline">Edit Assessment</Button>
            </Link>
            <Link href="/dashboard/assessments">
              <Button variant="outline">Back to Assessments</Button>
            </Link>
          </div>
        </div>

        {/* Assessment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-gray-900">{assessment.title}</p>
              </div>
              {assessment.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <div 
                    className="text-gray-900 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: assessment.description }}
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {assessment.type}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
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
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{new Date(assessment.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Publish/Unpublish Section */}
              <div className="pb-4 border-b border-gray-200">
                <AssessmentPublishButton 
                  assessmentId={assessment.id} 
                  currentStatus={assessment.status}
                />
              </div>

              {/* Other Actions */}
              <div className="space-y-2">
                <Link href={`/dashboard/assessments/${assessment.id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    ✏️ Edit Assessment
                  </Button>
                </Link>
              <Link href={`/dashboard/assessments/${assessment.id}/preview`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  👁️ Preview Assessment
                </Button>
              </Link>
                <Button variant="outline" className="w-full justify-start">
                  📤 Duplicate Assessment
                </Button>
                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                  🗑️ Delete Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dimensions and Fields Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Dimensions & Fields</CardTitle>
            <CardDescription>
              Manage assessment dimensions and questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Dimensions and fields will be displayed here.</p>
              <p className="text-sm mt-2">Edit the assessment to add dimensions and fields.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}


