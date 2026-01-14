'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface FeedbackEntry {
  id: string
  assessment_id: string
  dimension_id: string | null
  type: 'overall' | 'specific'
  feedback: string
  min_score: number | null
  max_score: number | null
  created_at: string
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

interface Assessment {
  id: string
  title: string
}

interface FeedbackListClientProps {
  assessments: Assessment[]
}

export default function FeedbackListClient({ assessments }: FeedbackListClientProps) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [filteredFeedback, setFilteredFeedback] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterAssessment, setFilterAssessment] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadFeedback()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [feedback, filterAssessment, filterType, searchTerm])

  const loadFeedback = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/feedback')
      
      if (!response.ok) {
        throw new Error('Failed to load feedback')
      }

      const data = await response.json()
      setFeedback(data.feedback || [])
      setError(null)
    } catch (err) {
      console.error('Error loading feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...feedback]

    // Filter by assessment
    if (filterAssessment !== 'all') {
      filtered = filtered.filter((f) => f.assessment_id === filterAssessment)
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((f) => f.type === filterType)
    }

    // Search in feedback content
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((f) =>
        f.feedback.toLowerCase().includes(searchLower)
      )
    }

    setFilteredFeedback(filtered)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback entry?')) {
      return
    }

    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete feedback')
      }

      // Reload feedback list
      loadFeedback()
    } catch (err) {
      console.error('Error deleting feedback:', err)
      alert('Failed to delete feedback')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            <p className="text-gray-600 mt-4">Loading feedback...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
            <Button onClick={loadFeedback} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment
              </label>
              <select
                value={filterAssessment}
                onChange={(e) => setFilterAssessment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All assessments</option>
                {assessments.map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All types</option>
                <option value="overall">Overall</option>
                <option value="specific">Specific</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search feedback content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Entries</CardTitle>
          <CardDescription>
            {filteredFeedback.length} {filteredFeedback.length === 1 ? 'entry' : 'entries'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFeedback.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No feedback entries found</p>
              <Link href="/dashboard/feedback/create" className="mt-4 inline-block">
                <Button>Create First Feedback Entry</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedback.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {entry.assessment?.title || 'Unknown Assessment'}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                          {entry.type}
                        </span>
                        {entry.dimension && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            {entry.dimension.name}
                          </span>
                        )}
                      </div>
                      <div
                        className="text-sm text-gray-600 mt-2"
                        dangerouslySetInnerHTML={{ __html: entry.feedback.substring(0, 200) + (entry.feedback.length > 200 ? '...' : '') }}
                      />
                      {(entry.min_score !== null || entry.max_score !== null) && (
                        <p className="text-xs text-gray-500 mt-2">
                          Score range: {entry.min_score ?? 'any'} - {entry.max_score ?? 'any'}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Link href={`/dashboard/feedback/${entry.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
