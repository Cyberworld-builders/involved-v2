'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import RichTextEditor from '@/components/rich-text-editor'
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react'
import FeedbackPreview from '@/components/feedback/feedback-preview'

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
  created_at: string
  dimension?: {
    id: string
    name: string
    code: string
  } | null
}

interface FeedbackManageClientProps {
  assessments: Assessment[]
}

export default function FeedbackManageClient({ assessments }: FeedbackManageClientProps) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(
    assessments.length > 0 ? assessments[0].id : null
  )
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [loadingDimensions, setLoadingDimensions] = useState(false)
  const [feedbackEntries, setFeedbackEntries] = useState<Record<string, FeedbackEntry[]>>({})
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editing state
  const [editingEntry, setEditingEntry] = useState<{
    id: string | null
    dimensionId: string
    type: 'overall' | 'specific'
  } | null>(null)
  const [editForm, setEditForm] = useState({
    feedback: '',
    type: 'specific' as 'overall' | 'specific',
  })
  const [previewFeedback, setPreviewFeedback] = useState<FeedbackEntry | null>(null)

  // Load dimensions when assessment changes
  useEffect(() => {
    if (selectedAssessmentId) {
      loadDimensions(selectedAssessmentId)
      loadFeedbackForAssessment(selectedAssessmentId)
    }
  }, [selectedAssessmentId])

  const loadDimensions = async (assessmentId: string) => {
    try {
      setLoadingDimensions(true)
      const response = await fetch(`/api/assessments/${assessmentId}/dimensions`)
      if (response.ok) {
        const data = await response.json()
        setDimensions(data.dimensions || [])
      }
    } catch (err) {
      console.error('Error loading dimensions:', err)
    } finally {
      setLoadingDimensions(false)
    }
  }

  const loadFeedbackForAssessment = async (assessmentId: string) => {
    try {
      setLoadingFeedback(true)
      const response = await fetch(`/api/feedback?assessment_id=${assessmentId}`)
      if (response.ok) {
        const data = await response.json()
        const feedback = data.feedback || []
        
        // Group feedback by dimension_id (filter out any null entries)
        const grouped: Record<string, FeedbackEntry[]> = {}
        feedback.forEach((entry: FeedbackEntry) => {
          if (!entry.dimension_id) {
            // Skip entries without dimension_id (shouldn't exist, but handle gracefully)
            return
          }
          const key = entry.dimension_id
          if (!grouped[key]) {
            grouped[key] = []
          }
          grouped[key].push(entry)
        })
        setFeedbackEntries(grouped)
      }
    } catch (err) {
      console.error('Error loading feedback:', err)
      setError('Failed to load feedback')
    } finally {
      setLoadingFeedback(false)
    }
  }

  const handleAddFeedback = (dimensionId: string, type: 'overall' | 'specific') => {
    setEditingEntry({ id: null, dimensionId, type })
    setEditForm({
      feedback: '',
      type,
    })
  }

  const handleEditFeedback = (entry: FeedbackEntry) => {
    setEditingEntry({
      id: entry.id,
      dimensionId: entry.dimension_id,
      type: entry.type,
    })
    setEditForm({
      feedback: entry.feedback,
      type: entry.type,
    })
  }

  const handleCancelEdit = () => {
    setEditingEntry(null)
    setEditForm({
      feedback: '',
      type: 'specific',
    })
  }

  const handleSaveFeedback = async () => {
    if (!selectedAssessmentId || !editForm.feedback.trim()) {
      setError('Please enter feedback content')
      return
    }

    if (!editingEntry?.dimensionId) {
      setError('Dimension is required')
      return
    }

    try {
      setError(null)
      const url = editingEntry?.id
        ? `/api/feedback/${editingEntry.id}`
        : '/api/feedback'
      const method = editingEntry?.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessment_id: selectedAssessmentId,
          dimension_id: editingEntry.dimensionId,
          type: editForm.type,
          feedback: editForm.feedback,
          min_score: null,
          max_score: null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save feedback')
      }

      // Reload feedback for the assessment
      await loadFeedbackForAssessment(selectedAssessmentId)
      handleCancelEdit()
    } catch (err) {
      console.error('Error saving feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to save feedback')
    }
  }

  const handleDeleteFeedback = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this feedback entry?')) {
      return
    }

    try {
      const response = await fetch(`/api/feedback/${entryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete feedback')
      }

      // Reload feedback for the assessment
      if (selectedAssessmentId) {
        await loadFeedbackForAssessment(selectedAssessmentId)
      }
    } catch (err) {
      console.error('Error deleting feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete feedback')
    }
  }

  const getFeedbackForDimension = (dimensionId: string): FeedbackEntry[] => {
    return feedbackEntries[dimensionId] || []
  }

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId)

  if (assessments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No assessments found.</p>
        <p className="text-sm mt-2">Create an assessment first to manage feedback entries.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Vertical Tabs - Left Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200">
        <div className="sticky top-0">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Assessments
            </h3>
          </div>
          <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {assessments.map((assessment) => {
              const isActive = selectedAssessmentId === assessment.id
              return (
                <button
                  key={assessment.id}
                  onClick={() => setSelectedAssessmentId(assessment.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {assessment.title}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content Area - Right Side */}
      <div className="flex-1 overflow-y-auto">
        {selectedAssessmentId && selectedAssessment ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedAssessment.title}</h2>
              <p className="text-gray-600 mt-1">
                Manage feedback entries for {selectedAssessment.title} dimensions.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
                {error}
              </div>
            )}

            {loadingDimensions ? (
              <div className="text-center py-8 text-gray-500">Loading dimensions...</div>
            ) : (
              <div className="space-y-8">
                {/* Dimension Feedback Sections */}
                {dimensions.map((dimension) => {
                  const dimensionFeedback = getFeedbackForDimension(dimension.id)
                  const isEditing = editingEntry?.dimensionId === dimension.id
                  const overallFeedback = dimensionFeedback.filter((f) => f.type === 'overall')
                  const specificFeedback = dimensionFeedback.filter((f) => f.type === 'specific')
                  const hasOverall = overallFeedback.length > 0

                  return (
                    <Card key={dimension.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {dimension.name}
                            </h3>
                            <p className="text-sm text-gray-600">Code: {dimension.code}</p>
                          </div>
                          {!isEditing && (
                            <div className="flex gap-2">
                              {!hasOverall && (
                                <Button
                                  size="sm"
                                  onClick={() => handleAddFeedback(dimension.id, 'overall')}
                                  variant="outline"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Overall
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleAddFeedback(dimension.id, 'specific')}
                                variant="outline"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Specific
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Overall Feedback Section for this Dimension */}
                        {overallFeedback.length > 0 && (
                          <div className="mb-6 pb-6 border-b border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                              Overall Feedback
                            </h4>
                            <div className="space-y-3">
                              {overallFeedback.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="border border-gray-200 rounded-md p-4 bg-gray-50"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded">
                                          Overall
                                        </span>
                                      </div>
                                      <div
                                        className="text-sm text-gray-700 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: entry.feedback }}
                                      />
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setPreviewFeedback(entry)}
                                      >
                                        Preview
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditFeedback(entry)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteFeedback(entry.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Overall Feedback Form */}
                        {isEditing && editingEntry?.type === 'overall' && (
                          <div className="mb-6 pb-6 border-b border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                              Add Overall Feedback
                            </h4>
                            <div className="border border-indigo-200 rounded-md p-4 bg-indigo-50">
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Feedback Content
                                  </label>
                                  <RichTextEditor
                                    content={editForm.feedback}
                                    onChange={(content) => setEditForm({ ...editForm, feedback: content })}
                                    placeholder="Enter overall feedback for this dimension..."
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Overall feedback provides high-level, strategic guidance for this dimension.
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <Button onClick={handleSaveFeedback} size="sm">
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                  </Button>
                                  <Button onClick={handleCancelEdit} size="sm" variant="outline">
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Specific Feedback Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                            Specific Feedback
                          </h4>

                          {/* Specific Feedback Entries */}
                          {specificFeedback.length > 0 && (
                            <div className="space-y-3 mb-4">
                              {specificFeedback.map((entry) => (
                              <div
                                key={entry.id}
                                className="border border-gray-200 rounded-md p-4 bg-gray-50"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded">
                                        {entry.type === 'overall' ? 'Overall' : 'Specific'}
                                      </span>
                                    </div>
                                    <div
                                      className="text-sm text-gray-700 prose prose-sm max-w-none"
                                      dangerouslySetInnerHTML={{ __html: entry.feedback }}
                                    />
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setPreviewFeedback(entry)}
                                    >
                                      Preview
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditFeedback(entry)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteFeedback(entry.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                          {/* Add/Edit Form for Specific Feedback */}
                          {isEditing && editingEntry?.type === 'specific' && (
                            <div className="border border-indigo-200 rounded-md p-4 bg-indigo-50">
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Feedback Content
                                  </label>
                                  <RichTextEditor
                                    content={editForm.feedback}
                                    onChange={(content) => setEditForm({ ...editForm, feedback: content })}
                                    placeholder="Enter specific feedback for this dimension..."
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Specific feedback provides detailed, actionable guidance for this dimension.
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <Button onClick={handleSaveFeedback} size="sm">
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                  </Button>
                                  <Button onClick={handleCancelEdit} size="sm" variant="outline">
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {dimensions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No dimensions found for this assessment.</p>
                    <p className="text-sm mt-2">
                      Add dimensions to the assessment to create dimension-specific feedback.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Select an assessment to manage feedback entries</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFeedback && selectedAssessment && (
        <FeedbackPreview
          feedback={{
            id: previewFeedback.id,
            feedback: previewFeedback.feedback,
            type: previewFeedback.type,
            dimension: previewFeedback.dimension || null,
            assessment: {
              id: selectedAssessment.id,
              title: selectedAssessment.title,
            },
            min_score: previewFeedback.min_score,
            max_score: previewFeedback.max_score,
          }}
          open={previewFeedback !== null}
          onClose={() => setPreviewFeedback(null)}
        />
      )}
    </div>
  )
}
