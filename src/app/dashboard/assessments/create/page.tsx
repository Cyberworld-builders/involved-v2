'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/dashboard-layout'
import AssessmentForm, { AssessmentFormData } from '@/components/forms/assessment-form'

export default function CreateAssessmentPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (data: AssessmentFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        // Supabase not configured - show demo mode
        console.log('Demo mode - Assessment data:', data)
        setMessage('Demo mode: Assessment data logged to console. Set up Supabase to save to database.')
        
        // Simulate success after a delay
        setTimeout(() => {
          setMessage('Demo mode: Assessment would be created successfully!')
          setTimeout(() => {
            router.push('/dashboard/assessments')
          }, 2000)
        }, 1000)
        return
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to create an assessment')
      }

      // TODO: Upload images to Supabase storage if provided
      let logoUrl = null
      let backgroundUrl = null

      if (data.logo) {
        // Upload logo
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
        // Upload background
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

      // Create assessment record
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
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
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single()

      if (assessmentError || !assessment) {
        throw new Error(`Failed to create assessment: ${assessmentError?.message || 'Unknown error'}`)
      }

      // Create dimensions
      if (data.dimensions.length > 0) {
        const dimensionsToInsert = data.dimensions
          .filter(dim => dim.name && dim.code) // Only insert dimensions with name and code
          .map(dim => ({
            assessment_id: assessment.id,
            name: dim.name,
            code: dim.code,
            parent_id: dim.parent_id || null,
          }))

        if (dimensionsToInsert.length > 0) {
          const { error: dimensionsError } = await supabase
            .from('dimensions')
            .insert(dimensionsToInsert)

          if (dimensionsError) {
            console.error('Error creating dimensions:', dimensionsError)
            // Continue even if dimensions fail - assessment is already created
          }
        }
      }

      // Create fields
      if (data.fields.length > 0) {
        // First, get dimension IDs for mapping
        const { data: dimensions } = await supabase
          .from('dimensions')
          .select('id, code')
          .eq('assessment_id', assessment.id)

        const dimensionMap = new Map(
          dimensions?.map(d => [d.code, d.id]) || []
        )

        const fieldsToInsert = data.fields
          .filter(field => field.content) // Only insert fields with content
          .map(field => {
            // Find dimension_id by matching the dimension code from form data
            let dimensionId = null
            if (field.dimension_id) {
              const dimension = data.dimensions.find(d => d.id === field.dimension_id)
              if (dimension) {
                dimensionId = dimensionMap.get(dimension.code) || null
              }
            }

            return {
              assessment_id: assessment.id,
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
            console.error('Error creating fields:', fieldsError)
            // Continue even if fields fail - assessment is already created
          }
        }
      }

      setMessage('Assessment created successfully!')
      router.push('/dashboard/assessments')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Assessment</h1>
          <p className="text-gray-600">Create a new talent assessment.</p>
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
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitText="Create Assessment"
        />
      </div>
    </DashboardLayout>
  )
}

