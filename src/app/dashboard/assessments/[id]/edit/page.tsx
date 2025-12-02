'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/dashboard-layout'
import AssessmentForm, { AssessmentFormData } from '@/components/forms/assessment-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface EditAssessmentPageProps {
  params: {
    id: string
  }
}

export default function EditAssessmentPage({ params }: EditAssessmentPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [message, setMessage] = useState('')
  const [initialData, setInitialData] = useState<Partial<AssessmentFormData> | null>(null)
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const [existingBackgroundUrl, setExistingBackgroundUrl] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        // Load assessment with dimensions and fields
        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', params.id)
          .single()

        if (assessmentError || !assessment) {
          throw new Error(`Failed to load assessment: ${assessmentError?.message || 'Assessment not found'}`)
        }

        // Load dimensions
        const { data: dimensions, error: dimensionsError } = await supabase
          .from('dimensions')
          .select('*')
          .eq('assessment_id', params.id)
          .order('created_at', { ascending: true })

        if (dimensionsError) {
          console.error('Error loading dimensions:', dimensionsError)
        }

        // Load fields
        const { data: fields, error: fieldsError } = await supabase
          .from('fields')
          .select('*')
          .eq('assessment_id', params.id)
          .order('order', { ascending: true })

        if (fieldsError) {
          console.error('Error loading fields:', fieldsError)
        }

        // Store existing image URLs
        setExistingLogoUrl(assessment.logo)
        setExistingBackgroundUrl(assessment.background)

        // Convert to form data format
        setInitialData({
          title: assessment.title,
          description: assessment.description || '',
          logo: null, // Will be set from URL preview if needed
          background: null, // Will be set from URL preview if needed
          primary_color: assessment.primary_color || '#2D2E30',
          accent_color: assessment.accent_color || '#FFBA00',
          split_questions: assessment.split_questions || false,
          questions_per_page: assessment.questions_per_page || 10,
          timed: assessment.timed || false,
          time_limit: assessment.time_limit,
          target: assessment.target || '',
          is_360: assessment.is_360 || false,
          dimensions: (dimensions || []).map(dim => ({
            id: dim.id,
            name: dim.name,
            code: dim.code,
            parent_id: dim.parent_id,
          })),
          fields: (fields || []).map(field => ({
            id: field.id,
            type: field.type as 'rich_text' | 'multiple_choice' | 'slider',
            content: field.content,
            dimension_id: field.dimension_id,
            anchors: (field.anchors || []) as Array<{
              id: string
              name: string
              value: number
              practice: boolean
            }>,
            order: field.order,
          })),
        })
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to load assessment')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadAssessment()
  }, [params.id, supabase])

  const handleSubmit = async (data: AssessmentFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        console.log('Demo mode - Assessment update data:', data)
        setMessage('Demo mode: Assessment update data logged to console.')
        return
      }

      // Handle image uploads if changed
      let logoUrl = existingLogoUrl || undefined
      let backgroundUrl = existingBackgroundUrl || undefined

      if (data.logo) {
        const logoExt = data.logo.name.split('.').pop()
        const logoFileName = `assessment-logo-${Date.now()}.${logoExt}`
        const { error: logoError } = await supabase.storage
          .from('assessment-assets')
          .upload(logoFileName, data.logo)

        if (logoError) {
          throw new Error(`Failed to upload logo: ${logoError.message}`)
        }

        const { data: logoUrlData } = supabase.storage
          .from('assessment-assets')
          .getPublicUrl(logoFileName)
        logoUrl = logoUrlData.publicUrl
      }

      if (data.background) {
        const backgroundExt = data.background.name.split('.').pop()
        const backgroundFileName = `assessment-background-${Date.now()}.${backgroundExt}`
        const { error: backgroundError } = await supabase.storage
          .from('assessment-assets')
          .upload(backgroundFileName, data.background)

        if (backgroundError) {
          throw new Error(`Failed to upload background: ${backgroundError.message}`)
        }

        const { data: backgroundUrlData } = supabase.storage
          .from('assessment-assets')
          .getPublicUrl(backgroundFileName)
        backgroundUrl = backgroundUrlData.publicUrl
      }

      // Update assessment record
      const { error: assessmentError } = await supabase
        .from('assessments')
        .update({
          title: data.title,
          description: data.description || null,
          logo: logoUrl,
          background: backgroundUrl,
          primary_color: data.primary_color,
          accent_color: data.accent_color,
          split_questions: data.split_questions,
          questions_per_page: data.questions_per_page,
          timed: data.timed,
          time_limit: data.time_limit,
          target: data.target || null,
          is_360: data.is_360,
          type: data.is_360 ? '360' : 'custom',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)

      if (assessmentError) {
        throw new Error(`Failed to update assessment: ${assessmentError.message}`)
      }

      // Delete existing dimensions and fields, then recreate
      // (Simpler than trying to match and update individual items)
      await supabase.from('dimensions').delete().eq('assessment_id', params.id)
      await supabase.from('fields').delete().eq('assessment_id', params.id)

      // Create dimensions
      if (data.dimensions.length > 0) {
        const dimensionsToInsert = data.dimensions
          .filter(dim => dim.name && dim.code)
          .map(dim => ({
            assessment_id: params.id,
            name: dim.name,
            code: dim.code,
            parent_id: dim.parent_id || null,
          }))

        if (dimensionsToInsert.length > 0) {
          const { error: dimensionsError } = await supabase
            .from('dimensions')
            .insert(dimensionsToInsert)

          if (dimensionsError) {
            console.error('Error updating dimensions:', dimensionsError)
          }
        }
      }

      // Create fields
      if (data.fields.length > 0) {
        // Get dimension IDs for mapping
        const { data: dimensions } = await supabase
          .from('dimensions')
          .select('id, code')
          .eq('assessment_id', params.id)

        const dimensionMap = new Map(
          dimensions?.map(d => [d.code, d.id]) || []
        )

        const fieldsToInsert = data.fields
          .filter(field => field.content)
          .map(field => {
            let dimensionId = null
            if (field.dimension_id) {
              const dimension = data.dimensions.find(d => d.id === field.dimension_id)
              if (dimension) {
                dimensionId = dimensionMap.get(dimension.code) || null
              }
            }

            return {
              assessment_id: params.id,
              dimension_id: dimensionId,
              type: field.type,
              content: field.content,
              order: field.order,
              anchors: field.anchors || [],
            }
          })

        if (fieldsToInsert.length > 0) {
          const { error: fieldsError } = await supabase
            .from('fields')
            .insert(fieldsToInsert)

          if (fieldsError) {
            console.error('Error updating fields:', fieldsError)
          }
        }
      }

      setMessage('Assessment updated successfully!')
      setTimeout(() => {
        router.push('/dashboard/assessments')
      }, 1500)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!initialData) {
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
            <h1 className="text-2xl font-bold text-gray-900">Edit Assessment</h1>
            <p className="text-gray-600">Update assessment details and settings.</p>
          </div>
          <Link href="/dashboard/assessments">
            <Button variant="outline">Back to Assessments</Button>
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Assessment Form */}
        <AssessmentForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitText="Update Assessment"
          existingLogoUrl={existingLogoUrl}
          existingBackgroundUrl={existingBackgroundUrl}
        />
      </div>
    </DashboardLayout>
  )
}

