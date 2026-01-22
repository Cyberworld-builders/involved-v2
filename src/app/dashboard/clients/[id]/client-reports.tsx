'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface ClientReportsProps {
  clientId: string
}

interface Survey {
  survey_id: string
  assessment_id: string
  assessment_title: string
  created_at: string
  total_assignments: number
  completed_assignments: number
  first_assignment_date: string
}

export default function ClientReports({ clientId }: ClientReportsProps) {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filterAssessmentId, setFilterAssessmentId] = useState<string>('')
  const [availableAssessments, setAvailableAssessments] = useState<Array<{ id: string; title: string }>>([])
  const supabase = createClient()

  const loadSurveys = async () => {
    setIsLoading(true)
    setMessage('')
    try {
      // Load all users for this client first
      const { data: clientUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('client_id', clientId)

      if (usersError) {
        throw new Error(`Failed to load client users: ${usersError.message}`)
      }

      if (!clientUsers || clientUsers.length === 0) {
        setSurveys([])
        setIsLoading(false)
        return
      }

      const userIds = clientUsers.map(u => u.id)

      // Get all assignments for these users (not just completed - we want to see all surveys)
      let assignmentsQuery = supabase
        .from('assignments')
        .select('id, assessment_id, survey_id, completed, created_at')
        .in('user_id', userIds)
        .not('survey_id', 'is', null) // Only show assignments with survey_id

      // Apply assessment filter
      if (filterAssessmentId) {
        assignmentsQuery = assignmentsQuery.eq('assessment_id', filterAssessmentId)
      }

      const { data: assignments, error: assignmentsError } = await assignmentsQuery
        .order('created_at', { ascending: false })

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client-reports.tsx:65',message:'Loaded assignments for surveys',data:{assignmentCount:assignments?.length||0,assignmentsWithSurveyId:assignments?.filter(a=>a.survey_id).length||0,assignmentsWithoutSurveyId:assignments?.filter(a=>!a.survey_id).length||0,error:assignmentsError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (assignmentsError) {
        throw new Error(`Failed to load assignments: ${assignmentsError.message || JSON.stringify(assignmentsError)}`)
      }

      if (!assignments || assignments.length === 0) {
        setSurveys([])
        setIsLoading(false)
        return
      }

      // Group assignments by survey_id + assessment_id
      const surveyMap = new Map<string, {
        survey_id: string
        assessment_id: string
        assignments: Array<{ id: string; completed: boolean; created_at: string }>
        first_created_at: string
      }>()

      assignments.forEach((assignment) => {
        if (!assignment.survey_id) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client-reports.tsx:87',message:'Skipping assignment without survey_id',data:{assignmentId:assignment.id,assessmentId:assignment.assessment_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return // Skip assignments without survey_id
        }

        const key = `${assignment.survey_id}_${assignment.assessment_id}`
        
        if (!surveyMap.has(key)) {
          surveyMap.set(key, {
            survey_id: assignment.survey_id,
            assessment_id: assignment.assessment_id,
            assignments: [],
            first_created_at: assignment.created_at,
          })
        }

        const survey = surveyMap.get(key)!
        survey.assignments.push({
          id: assignment.id,
          completed: assignment.completed,
          created_at: assignment.created_at,
        })

        // Track earliest created_at for this survey
        if (new Date(assignment.created_at) < new Date(survey.first_created_at)) {
          survey.first_created_at = assignment.created_at
        }
      })

      // Get unique assessment IDs
      const assessmentIds = [...new Set(Array.from(surveyMap.values()).map(s => s.assessment_id))]

      // Load assessment metadata
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessments')
        .select('id, title')
        .in('id', assessmentIds)

      if (assessmentsError) {
        throw new Error(`Failed to load assessments: ${assessmentsError.message}`)
      }

      const assessmentMap = new Map<string, string>()
      assessmentsData?.forEach(a => {
        assessmentMap.set(a.id, a.title)
      })

      // Build surveys array with completion stats
      const surveysList: Survey[] = Array.from(surveyMap.values()).map(survey => {
        const completedCount = survey.assignments.filter(a => a.completed).length
        return {
          survey_id: survey.survey_id,
          assessment_id: survey.assessment_id,
          assessment_title: assessmentMap.get(survey.assessment_id) || 'Unknown Assessment',
          created_at: survey.first_created_at,
          total_assignments: survey.assignments.length,
          completed_assignments: completedCount,
          first_assignment_date: survey.first_created_at,
        }
      })

      // Sort by date (newest first)
      surveysList.sort((a, b) => 
        new Date(b.first_assignment_date).getTime() - new Date(a.first_assignment_date).getTime()
      )

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

  const filteredSurveys = surveys.filter((survey) => {
    if (filterAssessmentId && survey.assessment_id !== filterAssessmentId) return false
    return true
  })

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
                    const surveyDate = new Date(survey.first_assignment_date)

                    return (
                      <tr key={survey.survey_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {survey.assessment_title}
                          </div>
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
                          <Link href={`/dashboard/clients/${clientId}/surveys/${survey.survey_id}`}>
                            <Button variant="outline" size="sm">
                              View Survey
                            </Button>
                          </Link>
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
    </div>
  )
}
