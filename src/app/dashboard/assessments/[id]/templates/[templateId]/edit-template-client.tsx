'use client'

import { useRouter } from 'next/navigation'
import TemplateForm from '@/components/templates/template-form'

interface EditTemplateClientProps {
  assessmentId: string
  templateId: string
  initialData: {
    name: string
    is_default: boolean
    components: Record<string, boolean>
    labels: Record<string, string>
    styling: Record<string, unknown>
  }
}

export default function EditTemplateClient({
  assessmentId,
  templateId,
  initialData,
}: EditTemplateClientProps) {
  const router = useRouter()

  const handleSubmit = async (data: {
    name: string
    is_default: boolean
    components: Record<string, boolean>
    labels: Record<string, string>
    styling: Record<string, unknown>
  }) => {
    const response = await fetch(`/api/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update template')
    }

    router.push(`/dashboard/assessments/${assessmentId}/templates`)
    router.refresh()
  }

  return (
    <TemplateForm
      assessmentId={assessmentId}
      templateId={templateId}
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={() => {
        router.push(`/dashboard/assessments/${assessmentId}/templates`)
      }}
    />
  )
}
