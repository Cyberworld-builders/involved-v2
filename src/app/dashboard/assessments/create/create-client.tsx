'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/dashboard-layout'
import AssessmentForm, { AssessmentFormData } from '@/components/forms/assessment-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CreateAssessmentClient() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (data: AssessmentFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      // Ensure we have a signed-in user (required by RLS: created_by must equal auth.uid())
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setMessage('You must be signed in to create an assessment.')
        return
      }

      // Handle image uploads if provided
      let logoUrl: string | undefined
      let backgroundUrl: string | undefined

      if (data.logo) {
        const logoExt = data.logo.name.split('.').pop() || 'png'
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
        const backgroundExt = data.background.name.split('.').pop() || 'png'
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
        .insert([
          {
            created_by: user.id,
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
          },
        ])
        .select()
        .single()

      if (assessmentError || !assessment) {
        throw new Error(`Failed to create assessment: ${assessmentError?.message || 'Unknown error'}`)
      }

      // Create dimensions if any
      if (data.dimensions.length > 0) {
        const dimensionsToInsert = data.dimensions
          .filter(dim => dim.name && dim.code)
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
            throw new Error(`Failed to create dimensions: ${dimensionsError.message}`)
          }
        }
      }

      setMessage('Assessment created successfully!')
      setTimeout(() => {
        router.push('/dashboard/assessments')
      }, 1500)
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Assessment</h1>
            <p className="text-gray-600">Set up a new assessment with basic metadata.</p>
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
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitText="Create Assessment"
        />
      </div>
    </DashboardLayout>
  )
}
