'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'

interface ClientReportsProps {
  clientId: string
}

interface Survey {
  survey_id: string
  assessment_id: string
  assessment_title: string
  survey_name: string | null
  created_at: string
  total_assignments: number
  completed_assignments: number
}

export default function ClientReports({ clientId }: ClientReportsProps) {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filterAssessmentId, setFilterAssessmentId] = useState<string>('')
  const [availableAssessments, setAvailableAssessments] = useState<Array<{ id: string; title: string }>>([])
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const supabase = createClient()

  const handleDeleteSurvey = async () => {
    if (!surveyToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(
        `/api/clients/${clientId}/surveys/${surveyToDelete.survey_id}`,
        { method: 'DELETE' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data?.error || `Delete failed (${res.status})`)
        return
      }
      setSurveys((prev) => prev.filter((s) => s.survey_id !== surveyToDelete.survey_id))
      setSurveyToDelete(null)
      setMessage('Survey deleted successfully.')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete survey')
    } finally {
      setIsDeleting(false)
    }
  }

  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setSurveyToDelete(null)
      setDeleteError(null)
    }
  }

  const loadSurveys = async () => {
    setIsLoading(true)
    setMessage('')
    try {
      // Fetch surveys directly from the surveys table
      let surveysQuery = supabase
        .from('surveys')
        .select(`
          id,
          name,
          assessment_id,
          created_at,
          assessment:assessments!surveys_assessment_id_fkey(id, title)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      // Apply assessment filter
      if (filterAssessmentId) {
        surveysQuery = surveysQuery.eq('assessment_id', filterAssessmentId)
      }

      const { data: surveysData, error: surveysError } = await surveysQuery

      if (surveysError) {
        throw new Error(`Failed to load surveys: ${surveysError.message}`)
      }

      if (!surveysData || surveysData.length === 0) {
        setSurveys([])
        setIsLoading(false)
        return
      }

      // Get assignment counts and completion stats for each survey
      const surveyIds = surveysData.map(s => s.id)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('survey_id, completed')
        .in('survey_id', surveyIds)

      if (assignmentsError) {
        throw new Error(`Failed to load assignments: ${assignmentsError.message}`)
      }

      // Build assignment stats map
      const statsMap = new Map<string, { total: number; completed: number }>()
      for (const a of (assignments || [])) {
        if (!a.survey_id) continue
        if (!statsMap.has(a.survey_id)) {
          statsMap.set(a.survey_id, { total: 0, completed: 0 })
        }
        const s = statsMap.get(a.survey_id)!
        s.total++
        if (a.completed) s.completed++
      }

      // Build surveys list
      const surveysList: Survey[] = surveysData.map(s => {
        const assessment = s.assessment as unknown as { id: string; title: string } | null
        const stats = statsMap.get(s.id) || { total: 0, completed: 0 }
        return {
          survey_id: s.id,
          assessment_id: s.assessment_id,
          assessment_title: assessment?.title || 'Unknown Assessment',
          survey_name: s.name,
          created_at: s.created_at,
          total_assignments: stats.total,
          completed_assignments: stats.completed,
        }
      })

      setSurveys(surveysList)

      // Load assessments for filter
      const { data: allAssessmentsData } = await supabase
        .from('assessments')
        .select('id, title')
        .order('title', { ascending: true })

      setAvailableAssessments(allAssessmentsData || [])
    } catch (error) {
      console.error('Error loading surveys:', error)

      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === 'object') {
        const supabaseError = error as { message?: string; error?: string; code?: string }
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.error) {
          errorMessage = supabaseError.error
        } else if (supabaseError.code) {
          errorMessage = `Error code: ${supabaseError.code}`
        } else {
          try {
            errorMessage = JSON.stringify(error, null, 2)
          } catch {
            errorMessage = String(error)
          }
        }
      } else {
        errorMessage = String(error)
      }

      setMessage(`Failed to load surveys: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSurveys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, filterAssessmentId])

  const filteredSurveys = surveys

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading surveys...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Surveys</h2>
          <p className="text-gray-600">View surveys and their completion status</p>
        </div>
      </div>

      {/* Fixed message (toaster) */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md shadow-lg rounded-md p-4 flex items-start gap-3 ${
            message.includes('successfully')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <p className="flex-1 text-sm">{message}</p>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment
              </label>
              <select
                value={filterAssessmentId}
                onChange={(e) => setFilterAssessmentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Assessments</option>
                {availableAssessments.map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surveys Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Surveys</CardTitle>
          <CardDescription>
            {filteredSurveys.length} survey{filteredSurveys.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSurveys.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No surveys available yet.</p>
              <p className="text-sm mt-2">
                Surveys are created when assignments are assigned to users or groups.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Survey Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Survey Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      # of Assignments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSurveys.map((survey) => {
                    const completionPercent = survey.total_assignments > 0
                      ? Math.round((survey.completed_assignments / survey.total_assignments) * 100)
                      : 0
                    const isComplete = survey.completed_assignments === survey.total_assignments && survey.total_assignments > 0
                    const surveyDate = new Date(survey.created_at)
                    const displayName = survey.survey_name || `${survey.assessment_title} - ${surveyDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

                    return (
                      <tr key={survey.survey_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {displayName}
                          </div>
                          {survey.survey_name && (
                            <div className="text-xs text-gray-500">{survey.assessment_title}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {surveyDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-sm text-gray-500 italic">
                            {surveyDate.toLocaleDateString() === new Date().toLocaleDateString()
                              ? 'Today'
                              : `${Math.floor((new Date().getTime() - surveyDate.getTime()) / (1000 * 60 * 60 * 24))} days ago`
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {survey.total_assignments}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 mr-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    isComplete
                                      ? 'bg-green-500'
                                      : completionPercent >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${completionPercent}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 min-w-[80px]">
                              {survey.completed_assignments}/{survey.total_assignments}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard/clients/${clientId}/surveys/${survey.survey_id}`}>
                              <Button variant="outline" size="sm">
                                View Survey
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setSurveyToDelete(survey)}
                              aria-label="Delete survey"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete survey confirmation */}
      <Dialog open={!!surveyToDelete} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent
          title="Delete survey?"
          description="This action cannot be undone."
          onClose={closeDeleteDialog}
        >
          {surveyToDelete && (
            <>
              <p className="text-sm text-gray-700 mb-4">
                This will permanently delete this survey and:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
                <li>All <strong>{surveyToDelete.total_assignments}</strong> assignment(s) in it</li>
                <li>All answers and report data (and cached scores) for those assignments</li>
                <li>Any generated report PDFs for those assignments</li>
              </ul>
              <p className="text-sm font-medium text-gray-900 mb-1">Survey:</p>
              <p className="text-sm text-gray-600 mb-4">
                {surveyToDelete.survey_name || surveyToDelete.assessment_title} — {new Date(surveyToDelete.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {deleteError && (
                <p className="text-sm text-red-600 mb-4">{deleteError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDeleteDialog} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSurvey}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete survey'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
