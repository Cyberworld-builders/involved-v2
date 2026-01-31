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

interface CreateFeedbackClientProps {
  assessments: Assessment[]
}

export default function CreateFeedbackClient({ assessments }: CreateFeedbackClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  // Form state
  const [assessmentId, setAssessmentId] = useState('')
  const [dimensionId, setDimensionId] = useState<string | null>(null)
  const [type, setType] = useState<'overall' | 'specific'>('specific')
  const [feedback, setFeedback] = useState('')

  // Dimensions for selected assessment
  const [dimensions, setDimensions] = useState<Dimension[]>([])

  // Load dimensions when assessment changes
  useEffect(() => {
    const loadDimensions = async () => {
      if (!assessmentId) {
        setDimensions([])
        setDimensionId(null)
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

    if (!feedback.trim()) {
      setError('Please enter feedback content')
      setLoading(false)
      return
    }

    if (!dimensionId) {
      setError('Please select a dimension')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessment_id: assessmentId,
          dimension_id: dimensionId,
          type,
          feedback,
          min_score: null,
          max_score: null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create feedback')
      }

      setMessage('Feedback entry created successfully!')
      setTimeout(() => {
        router.push('/dashboard/feedback')
      }, 1500)
    } catch (err) {
      console.error('Error creating feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to create feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Details</CardTitle>
        <CardDescription>Enter the feedback content and configuration</CardDescription>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select an assessment</option>
              {assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.title}
                </option>
              ))}
            </select>
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
            <p className="text-xs text-gray-500 mt-1">
              Overall feedback applies to the entire assessment. Specific feedback applies to a particular dimension.
            </p>
          </div>

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
            {assessmentId && dimensions.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No dimensions found for this assessment. Please add dimensions to the assessment first.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {type === 'overall' 
                ? 'Overall feedback provides high-level, strategic guidance for this dimension. Each dimension can only have one overall feedback entry.'
                : 'Specific feedback provides detailed, actionable guidance for this dimension.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback Content <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              content={feedback}
              onChange={setFeedback}
              placeholder="Enter feedback content..."
            />
            <p className="text-xs text-gray-500 mt-1">
              This feedback will be randomly selected and assigned to users based on their scores.
            </p>
          </div>


          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Feedback'}
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
