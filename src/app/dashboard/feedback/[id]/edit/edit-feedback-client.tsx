'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RichTextEditor from '@/components/rich-text-editor'

interface Assessment {
  id: string
  title: string
}

interface Dimension {
  id: string
  name: string
  code: string
}

interface FeedbackEntry {
  id: string
  assessment_id: string
  dimension_id: string | null
  type: 'overall' | 'specific'
  feedback: string
  min_score: number | null
  max_score: number | null
  assessment: {
    id: string
    title: string
  } | null
  dimension: {
    id: string
    name: string
    code: string
  } | null
}

interface EditFeedbackClientProps {
  feedback: FeedbackEntry
  assessments: Assessment[]
}

export default function EditFeedbackClient({ feedback, assessments }: EditFeedbackClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  // Form state
  const [assessmentId, setAssessmentId] = useState(feedback.assessment_id)
  const [dimensionId, setDimensionId] = useState<string | null>(feedback.dimension_id)
  const [type, setType] = useState<'overall' | 'specific'>(feedback.type)
  const [feedbackContent, setFeedbackContent] = useState(feedback.feedback)
  const [minScore, setMinScore] = useState<string>(feedback.min_score?.toString() || '')
  const [maxScore, setMaxScore] = useState<string>(feedback.max_score?.toString() || '')

  // Dimensions for selected assessment
  const [dimensions, setDimensions] = useState<Dimension[]>([])

  // Load dimensions when assessment changes
  useEffect(() => {
    const loadDimensions = async () => {
      if (!assessmentId) {
        setDimensions([])
        return
      }

      try {
        const response = await fetch(`/api/assessments/${assessmentId}/dimensions`)
        if (response.ok) {
          const data = await response.json()
          setDimensions(data.dimensions || [])
        }
      } catch (err) {
        console.error('Error loading dimensions:', err)
      }
    }

    loadDimensions()
  }, [assessmentId])

  // Reset dimension when type changes to overall
  useEffect(() => {
    if (type === 'overall') {
      setDimensionId(null)
    }
  }, [type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage('')

    // Validation
    if (!assessmentId) {
      setError('Please select an assessment')
      setLoading(false)
      return
    }

    if (!feedbackContent.trim()) {
      setError('Please enter feedback content')
      setLoading(false)
      return
    }

    if (type === 'specific' && !dimensionId) {
      setError('Please select a dimension for specific feedback')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/feedback/${feedback.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dimension_id: dimensionId || null,
          type,
          feedback: feedbackContent,
          min_score: minScore ? parseFloat(minScore) : null,
          max_score: maxScore ? parseFloat(maxScore) : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update feedback')
      }

      setMessage('Feedback entry updated successfully!')
      setTimeout(() => {
        router.push('/dashboard/feedback')
      }, 1500)
    } catch (err) {
      console.error('Error updating feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to update feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Details</CardTitle>
        <CardDescription>Update the feedback content and configuration</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment <span className="text-red-500">*</span>
            </label>
            <select
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value)}
              required
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            >
              {assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Assessment cannot be changed after creation
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'overall' | 'specific')}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="overall">Overall</option>
              <option value="specific">Specific (Dimension)</option>
            </select>
          </div>

          {type === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimension <span className="text-red-500">*</span>
              </label>
              <select
                value={dimensionId || ''}
                onChange={(e) => setDimensionId(e.target.value || null)}
                required
                disabled={!assessmentId || dimensions.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              >
                <option value="">Select a dimension</option>
                {dimensions.map((dimension) => (
                  <option key={dimension.id} value={dimension.id}>
                    {dimension.name} ({dimension.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback Content <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              content={feedbackContent}
              onChange={setFeedbackContent}
              placeholder="Enter feedback content..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Score (optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="e.g., 1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Score (optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                placeholder="e.g., 5.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Feedback'}
            </Button>
            <Link href="/dashboard/feedback">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
