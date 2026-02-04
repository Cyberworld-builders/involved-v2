'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { PdfActionButtons } from '@/components/reports/pdf-action-buttons'
import { Subject } from '@/lib/reports/get-survey-subjects'
import { ScoreData } from '@/lib/reports/get-survey-scores'

export type SurveyAssignment = {
  id: string
  user_id: string
  target_id: string | null
  assessment_id: string
  completed: boolean
  completed_at: string | null
  created_at: string
  started_at?: string | null
  user_name?: string | null
  user_email?: string | null
  target_name?: string | null
  target_email?: string | null
}

interface SurveyDetailClientProps {
  clientId: string
  surveyId: string
  assessment: {
    id: string
    title: string
    is_360: boolean
  }
  assignments: SurveyAssignment[]
  initialSubjects?: Subject[]
  initialScores?: Record<string, ScoreData>
}

export default function SurveyDetailClient({
  clientId,
  surveyId: _surveyId,
  assessment,
  assignments: initialAssignments,
  initialSubjects = [],
  initialScores = {},
}: SurveyDetailClientProps) {
  // #region agent log
  console.log('[DEBUG] SurveyDetailClient rendered', {
    initialSubjectsCount: initialSubjects.length,
    initialSubjects: initialSubjects.map(s => ({ id: s.id, name: s.name })),
    assignmentCount: initialAssignments.length,
    is360: assessment.is_360
  })
  // #endregion
  
  // Use initial data from server, or empty if not provided
  const [subjects] = useState<Subject[]>(initialSubjects)
  const [scores] = useState<Map<string, ScoreData>>(() => {
    const scoresMap = new Map<string, ScoreData>()
    Object.entries(initialScores).forEach(([key, value]) => {
      scoresMap.set(key, value)
    })
    return scoresMap
  })
  const [isLoading] = useState(false)
  const [message] = useState('')
  const _supabase = createClient()

  // #region agent log
  useEffect(() => {
    console.log('[DEBUG] State initialized', {
      subjectsCount: subjects.length,
      subjects: subjects.map(s => ({ id: s.id, name: s.name })),
      scoresCount: scores.size
    })
  }, [])
  // #endregion

  // No longer need to fetch data client-side since it's passed from server
  // Keep this useEffect empty for now, or remove if not needed

  const [expandedAssignmentIds, setExpandedAssignmentIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedAssignmentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const completedCount = initialAssignments.filter(a => a.completed).length
  const totalCount = initialAssignments.length
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const surveyDate = initialAssignments.length > 0 
    ? new Date(initialAssignments[0].created_at)
    : new Date()

  // For all assessments: Find an assignment that rated this target/subject to view report
  // The report generation will aggregate all assignments for this target
  const getAssignmentIdForSubject = (subject: Subject): string | null => {
    // Find a completed assignment that rated this target (prefer completed)
    const completedAssignment = initialAssignments.find(a => 
      a.target_id === subject.id && 
      subject.assignment_ids.includes(a.id) &&
      a.completed
    )
    if (completedAssignment) {
      return completedAssignment.id
    }
    // Fallback to any assignment for this target
    const anyAssignment = initialAssignments.find(a => 
      a.target_id === subject.id && subject.assignment_ids.includes(a.id)
    )
    return anyAssignment?.id || null
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading survey details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Link href={`/dashboard/clients/${clientId}?tab=reports`}>
            <Button variant="ghost" size="sm" className="mb-2">
              ← Back to Surveys
            </Button>
          </Link>
          <h2 className="text-xl font-bold text-gray-900">{assessment.title} Survey</h2>
          <p className="text-gray-600">
            Survey launched on {surveyDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
          {message}
        </div>
      )}

      {/* Survey Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Survey Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Total Assignments</div>
              <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Completed</div>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Completion Rate</div>
              <div className="text-2xl font-bold text-gray-900">{completionPercent}%</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  completionPercent === 100
                    ? 'bg-green-500'
                    : completionPercent >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects/Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {assessment.is_360 ? 'Targets Being Rated' : 'Leaders/Blockers Being Rated'}
          </CardTitle>
          <CardDescription>
            {assessment.is_360 
              ? 'People being rated in this 360 assessment'
              : 'People being rated in this assessment. Each person may have multiple data points from different raters.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* #region agent log */}
          {(() => {
            console.log('[DEBUG] Rendering subjects table', {
              subjectsLength: subjects.length,
              subjects: subjects.map(s => ({ id: s.id, name: s.name })),
              is360: assessment.is_360
            })
            return null
          })()}
          {/* #endregion */}
          {subjects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No {assessment.is_360 ? 'targets' : 'people being rated'} found for this survey.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    {assessment.is_360 && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Points
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjects.map((subject) => {
                    const scoreData = scores.get(subject.id)
                    const assignmentId = getAssignmentIdForSubject(subject)

                    return (
                      <tr key={subject.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {subject.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {subject.email}
                          </div>
                        </td>
                        {assessment.is_360 && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {subject.assignment_count}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {scoreData?.overall_score !== null && scoreData?.overall_score !== undefined
                              ? scoreData.overall_score.toFixed(2)
                              : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {assignmentId ? (
                            <div className="flex gap-2">
                              <Link href={`/dashboard/reports/${assignmentId}`}>
                                <Button variant="outline" size="sm">
                                  View Report
                                </Button>
                              </Link>
                              <PdfActionButtons assignmentId={assignmentId} size="sm" />
                            </div>
                          ) : (
                            <span className="text-gray-400">No assignment</span>
                          )}
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

      {/* Data Collection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Data Collection Status</CardTitle>
          <CardDescription>
            Status of all assignments in this survey. Expand a row to see details and open the assignment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {initialAssignments.map((assignment) => {
              const isExpanded = expandedAssignmentIds.has(assignment.id)
              const raterLabel = assignment.user_name || assignment.user_email || assignment.user_id?.slice(0, 8) || '—'
              const targetLabel = assessment.is_360
                ? (assignment.target_name || assignment.target_email || (assignment.target_id ? assignment.target_id.slice(0, 8) : null) || '—')
                : null
              return (
                <div
                  key={assignment.id}
                  className="rounded-md border border-gray-200 bg-gray-50 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(assignment.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        assignment.completed ? 'bg-green-500' : 'bg-gray-300 border-2 border-gray-400'
                      }`} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          #{assignment.id.slice(0, 8)}… • {new Date(assignment.created_at).toLocaleDateString()}
                          {targetLabel && (
                            <span className="text-gray-500 font-normal">
                              {' '}• Rater: {raterLabel}
                              {' '}• Target: {targetLabel}
                            </span>
                          )}
                          {!targetLabel && (
                            <span className="text-gray-500 font-normal">
                              {' '}• {raterLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created {new Date(assignment.created_at).toLocaleString()}
                          {assignment.completed_at && (
                            <> • Completed {new Date(assignment.completed_at).toLocaleString()}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {assignment.completed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Pending
                        </span>
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-white px-4 py-3 text-sm">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <dt className="text-gray-500 font-medium">Assignment ID</dt>
                          <dd className="text-gray-900 font-mono text-xs break-all">{assignment.id}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 font-medium">Rater</dt>
                          <dd className="text-gray-900">
                            {assignment.user_name ?? '—'}
                            {assignment.user_email && (
                              <span className="block text-gray-500 text-xs">{assignment.user_email}</span>
                            )}
                          </dd>
                        </div>
                        {assessment.is_360 && (
                          <div>
                            <dt className="text-gray-500 font-medium">Target</dt>
                            <dd className="text-gray-900">
                              {assignment.target_name ?? '—'}
                              {assignment.target_email && (
                                <span className="block text-gray-500 text-xs">{assignment.target_email}</span>
                              )}
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-gray-500 font-medium">Created</dt>
                          <dd className="text-gray-900">{new Date(assignment.created_at).toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 font-medium">Started</dt>
                          <dd className="text-gray-900">
                            {assignment.started_at
                              ? new Date(assignment.started_at).toLocaleString()
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 font-medium">Completed</dt>
                          <dd className="text-gray-900">
                            {assignment.completed_at
                              ? new Date(assignment.completed_at).toLocaleString()
                              : '—'}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Link href={`/dashboard/clients/${clientId}/assignments/${assignment.id}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            View Assignment
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
