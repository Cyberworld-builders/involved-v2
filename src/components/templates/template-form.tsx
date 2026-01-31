'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TemplateFormProps {
  assessmentId: string
  templateId?: string
  initialData?: {
    name: string
    is_default: boolean
    components: Record<string, boolean>
    labels: Record<string, string>
    styling: Record<string, unknown>
  }
  onSubmit: (data: {
    name: string
    is_default: boolean
    components: Record<string, boolean>
    labels: Record<string, string>
    styling: Record<string, unknown>
  }) => Promise<void>
  onCancel: () => void
}

const DEFAULT_COMPONENTS = {
  dimension_breakdown: true,
  overall_score: true,
  benchmarks: true,
  geonorms: true,
  feedback: true,
  improvement_indicators: true,
  rater_breakdown: true,
}

const DEFAULT_LABELS = {
  overall_score_label: 'Overall Score',
  dimension_label: 'Dimension',
  benchmark_label: 'Industry Benchmark',
  geonorm_label: 'Group Norm',
  feedback_label: 'Feedback',
}

export default function TemplateForm({
  assessmentId: _assessmentId,
  templateId,
  initialData,
  onSubmit,
  onCancel,
}: TemplateFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [isDefault, setIsDefault] = useState(initialData?.is_default || false)
  const [components, setComponents] = useState<Record<string, boolean>>(
    initialData?.components || DEFAULT_COMPONENTS
  )
  const [labels, setLabels] = useState<Record<string, string>>(
    initialData?.labels || DEFAULT_LABELS
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleComponentToggle = (key: string) => {
    setComponents((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleLabelChange = (key: string, value: string) => {
    setLabels((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        name,
        is_default: isDefault,
        components,
        labels,
        styling: {}, // Styling can be added later
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Template name and default settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Standard Report Template"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">
              Set as default template for this assessment
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Components</CardTitle>
          <CardDescription>Toggle which components appear in reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.keys(DEFAULT_COMPONENTS).map((key) => (
              <div key={key} className="flex items-center">
                <input
                  type="checkbox"
                  id={`component_${key}`}
                  checked={components[key] ?? true}
                  onChange={() => handleComponentToggle(key)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor={`component_${key}`} className="ml-2 block text-sm text-gray-700">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Labels</CardTitle>
          <CardDescription>Customize labels used in reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(DEFAULT_LABELS).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {key.replace(/_/g, ' ').replace(/_label$/, '').replace(/\b\w/g, (l) => l.toUpperCase())}
              </label>
              <input
                type="text"
                value={labels[key] || ''}
                onChange={(e) => handleLabelChange(key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={DEFAULT_LABELS[key as keyof typeof DEFAULT_LABELS]}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  )
}
