'use client'

import { useRouter } from 'next/navigation'
import TemplateForm from '@/components/templates/template-form'

interface CreateTemplateClientProps {
  assessmentId: string
}

export default function CreateTemplateClient({ assessmentId }: CreateTemplateClientProps) {
  const router = useRouter()

  const handleSubmit = async (data: {
    name: string
    is_default: boolean
    components: Record<string, boolean>
    labels: Record<string, string>
    styling: Record<string, unknown>
  }) => {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assessment_id: assessmentId,
        ...data,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create template')
    }

    router.push(`/dashboard/assessments/${assessmentId}/templates`)
    router.refresh()
  }

  return (
    <TemplateForm
      assessmentId={assessmentId}
      onSubmit={handleSubmit}
      onCancel={() => {
        router.push(`/dashboard/assessments/${assessmentId}/templates`)
      }}
    />
  )
}
