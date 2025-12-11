import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Database } from '@/types/database'

type Field = Database['public']['Tables']['fields']['Row']

interface AssessmentPreviewPageProps {
  params: Promise<{
    id: string
  }>
}

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AssessmentPreviewPage({ params }: AssessmentPreviewPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch assessment with dimensions and fields (no cache)
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', id)
    .single()

  if (assessmentError || !assessment) {
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

  // Fetch dimensions (no cache)
  const { data: dimensions } = await supabase
    .from('dimensions')
    .select('*')
    .eq('assessment_id', id)
    .order('name', { ascending: true })

  // Fetch fields (no cache)
  const { data: fields } = await supabase
    .from('fields')
    .select('*')
    .eq('assessment_id', id)
    .order('order', { ascending: true })

  // Group fields by dimension
  const fieldsByDimension = new Map<string, Field[]>()
  const fieldsWithoutDimension: Field[] = []

  fields?.forEach(field => {
    if (field.dimension_id) {
      if (!fieldsByDimension.has(field.dimension_id)) {
        fieldsByDimension.set(field.dimension_id, [])
      }
      fieldsByDimension.get(field.dimension_id)!.push(field)
    } else {
      fieldsWithoutDimension.push(field)
    }
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assessment Preview</h1>
            <p className="text-gray-600">Preview how users will see this assessment</p>
          </div>
          <Link href={`/dashboard/assessments/${id}`}>
            <Button variant="outline">Back to Assessment</Button>
          </Link>
        </div>

        {/* Assessment Header with Branding */}
        <div 
          className="rounded-lg p-8 text-white relative overflow-hidden"
          style={{
            backgroundColor: assessment.primary_color || '#2D2E30',
            backgroundImage: assessment.background ? `url(${assessment.background})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {assessment.background && (
            <div className="absolute inset-0 bg-black bg-opacity-40" />
          )}
          <div className="relative z-10 flex items-center space-x-4">
            {assessment.logo && (
              <Image
                src={assessment.logo}
                alt={assessment.title}
                width={80}
                height={80}
                className="rounded-lg"
              />
            )}
            <div>
              <h2 className="text-3xl font-bold">{assessment.title}</h2>
              {assessment.description && (
                <div 
                  className="text-lg mt-2 opacity-90 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: assessment.description }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Assessment Settings Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {assessment.timed && (
                <div>
                  <span className="font-medium text-gray-500">Time Limit:</span>
                  <p className="text-gray-900">{assessment.time_limit} minutes</p>
                </div>
              )}
              {assessment.split_questions && (
                <div>
                  <span className="font-medium text-gray-500">Questions per Page:</span>
                  <p className="text-gray-900">{assessment.questions_per_page}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-500">Type:</span>
                <p className="text-gray-900">{assessment.type}</p>
              </div>
              {assessment.is_360 && (
                <div>
                  <span className="font-medium text-gray-500">360 Assessment:</span>
                  <p className="text-gray-900">Yes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fields/Questions */}
        {!fields || fields.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <p>No fields or questions have been added to this assessment yet.</p>
              <p className="text-sm mt-2">Edit the assessment to add dimensions and fields.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Fields grouped by dimension */}
            {dimensions && dimensions.length > 0 && Array.from(fieldsByDimension.entries()).map(([dimensionId, dimensionFields]) => {
              const dimension = dimensions.find(d => d.id === dimensionId)
              return (
                <Card key={dimensionId}>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      {dimension?.name} ({dimension?.code})
                    </h3>
                    <div className="space-y-6">
                      {dimensionFields.map((field, index) => (
                        <FieldPreview key={field.id} field={field} fieldNumber={index + 1} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Fields without dimension */}
            {fieldsWithoutDimension.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    General Questions
                  </h3>
                  <div className="space-y-6">
                    {fieldsWithoutDimension.map((field, index) => (
                      <FieldPreview key={field.id} field={field} fieldNumber={index + 1} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Preview Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <span className="text-blue-400 text-xl">ℹ️</span>
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">Preview Mode</h3>
                <p className="text-sm text-blue-700">
                  This is a preview of how users will see the assessment. No data will be saved.
                  To make changes, edit the assessment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

// Field Preview Component
function FieldPreview({ field, fieldNumber }: { field: Field; fieldNumber: number }) {
  const anchors = (field.anchors || []) as Array<{
    id: string
    name: string
    value: number
    practice: boolean
  }>

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <span className="text-sm font-medium text-gray-500">Question {fieldNumber}</span>
        <span className="ml-2 px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
          {field.type === 'rich_text' ? 'Rich Text' : field.type === 'multiple_choice' ? 'Multiple Choice' : 'Slider'}
        </span>
      </div>

      {/* Field Content */}
      <div className="mb-4">
        {field.type === 'rich_text' ? (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: field.content || '<p>No content</p>' }}
          />
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap">{field.content || 'No content'}</p>
        )}
      </div>

      {/* Anchors for Multiple Choice and Slider */}
      {(field.type === 'multiple_choice' || field.type === 'slider') && anchors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Answer Options:
          </label>
          {field.type === 'multiple_choice' ? (
            <div className="space-y-2">
              {anchors.map((anchor) => (
                <label
                  key={anchor.id}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`field-${field.id}`}
                    value={anchor.value}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    disabled
                  />
                  <span className="text-sm text-gray-900">{anchor.name}</span>
                  {anchor.practice && (
                    <span className="ml-auto px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                      Practice
                    </span>
                  )}
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 min-w-[80px]">
                  {anchors[0]?.name || 'Min'}
                </span>
                <input
                  type="range"
                  min={anchors[0]?.value || 1}
                  max={anchors[anchors.length - 1]?.value || anchors.length}
                  defaultValue={Math.floor(((anchors[0]?.value || 1) + (anchors[anchors.length - 1]?.value || anchors.length)) / 2)}
                  className="flex-1"
                  disabled
                />
                <span className="text-sm text-gray-600 min-w-[80px] text-right">
                  {anchors[anchors.length - 1]?.name || 'Max'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                {anchors.map((anchor) => (
                  <span key={anchor.id}>
                    {anchor.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

