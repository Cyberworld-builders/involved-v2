'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Database } from '@/types/database'

// Manual type definition for report_data since it may not be in generated types
type ReportDataRow = {
  id: string
  assignment_id: string
  overall_score: number | null
  dimension_scores: Record<string, unknown>
  calculated_at: string
  updated_at: string
}
// Partial type for assignments query that only selects specific fields
type AssignmentQueryResult = {
  id: string
  user_id: string
  assessment_id: string
  completed: boolean
  completed_at: string | null
  created_at: string
}

interface ClientReportsProps {
  clientId: string
}

interface Report {
  id: string
  assignment_id: string
  overall_score: number | null
  dimension_scores: Record<string, unknown>
  calculated_at: string
  updated_at: string
  assignment: {
    id: string
    user_id: string
    assessment_id: string
    completed: boolean
    completed_at: string | null
    created_at: string
    user: {
      id: string
      name: string
      email: string
    } | null
    assessment: {
      id: string
      title: string
    } | null
  } | null
}

export default function ClientReports({ clientId }: ClientReportsProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterAssessmentId, setFilterAssessmentId] = useState<string>('')
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [availableAssessments, setAvailableAssessments] = useState<Array<{ id: string; title: string }>>([])
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const loadReports = async () => {
      setIsLoading(true)
      setMessage('')
      try {
        // First check if report_data table exists
        const { error: tableCheckError } = await supabase
          .from('report_data')
          .select('id')
          .limit(1)

        if (tableCheckError) {
          if (tableCheckError.code === '42P01' || tableCheckError.message?.includes('does not exist') || tableCheckError.message?.includes('relation') || tableCheckError.message?.includes('table')) {
            setMessage('Reports table not found. Please apply migration 029_create_reporting_tables.sql')
            setReports([])
            setIsLoading(false)
            return
          }
          throw new Error(`Table check failed: ${tableCheckError.message || JSON.stringify(tableCheckError)}`)
        }

        // Load all users for this client first
        const { data: clientUsers, error: usersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('client_id', clientId)

        if (usersError) {
          throw new Error(`Failed to load client users: ${usersError.message}`)
        }

        if (!clientUsers || clientUsers.length === 0) {
          setReports([])
          setIsLoading(false)
          return
        }

        const userIds = clientUsers.map(u => u.id)

        // Get all assignments for these users
        let assignmentsQuery = supabase
          .from('assignments')
          .select('id, user_id, assessment_id, completed, completed_at, created_at')
          .in('user_id', userIds)
          .eq('completed', true) // Only show reports for completed assignments

        // Apply user filter
        if (filterUserId) {
          assignmentsQuery = assignmentsQuery.eq('user_id', filterUserId)
        }

        // Apply assessment filter
        if (filterAssessmentId) {
          assignmentsQuery = assignmentsQuery.eq('assessment_id', filterAssessmentId)
        }

        const { data: assignments, error: assignmentsError } = await assignmentsQuery
          .order('created_at', { ascending: false })

        if (assignmentsError) {
          throw new Error(`Failed to load assignments: ${assignmentsError.message || JSON.stringify(assignmentsError)}`)
        }

        if (!assignments || assignments.length === 0) {
          setReports([])
          setIsLoading(false)
          return
        }

        const assignmentIds = assignments.map(a => a.id)

        // Load report_data for these assignments
        const { data: reportsData, error: reportsError } = await supabase
          .from('report_data')
          .select('*')
          .in('assignment_id', assignmentIds)
          .order('calculated_at', { ascending: false })

        if (reportsError) {
          throw new Error(`Failed to load reports: ${reportsError.message || JSON.stringify(reportsError)}`)
        }

        // Load related data
        const allUserIds = [...new Set(assignments.map((a: AssignmentQueryResult) => a.user_id))].filter(Boolean)
        const assessmentIds = [...new Set(assignments.map((a: AssignmentQueryResult) => a.assessment_id))].filter(Boolean)

        const [usersResult, assessmentsResult] = await Promise.all([
          allUserIds.length > 0
            ? supabase
                .from('profiles')
                .select('id, name, email')
                .in('id', allUserIds)
            : Promise.resolve({ data: [], error: null }),
          assessmentIds.length > 0
            ? supabase
                .from('assessments')
                .select('id, title')
                .in('id', assessmentIds)
            : Promise.resolve({ data: [], error: null })
        ])

        if (usersResult.error) {
          throw new Error(`Failed to load users: ${usersResult.error.message}`)
        }
        if (assessmentsResult.error) {
          throw new Error(`Failed to load assessments: ${assessmentsResult.error.message}`)
        }

        // Combine the data
        const reportsWithDetails = (reportsData || []).map((report: ReportDataRow) => {
          const assignment = assignments.find((a: AssignmentQueryResult) => a.id === report.assignment_id)
          return {
            ...report,
            assignment: assignment ? {
              ...assignment,
              user: usersResult.data?.find((u: { id: string; name: string; email: string }) => u.id === assignment.user_id) || null,
              assessment: assessmentsResult.data?.find((a: { id: string; title: string }) => a.id === assignment.assessment_id) || null,
            } : null,
          }
        })

        setReports(reportsWithDetails)

        // Load users and assessments for filters
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('client_id', clientId)
          .order('name', { ascending: true })

        const { data: assessmentsData } = await supabase
          .from('assessments')
          .select('id, title')
          .order('title', { ascending: true })

        setAvailableUsers(usersData || [])
        setAvailableAssessments(assessmentsData || [])
      } catch (error) {
        console.error('Error loading reports:', error)
        
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
        
        setMessage(`Failed to load reports: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, filterUserId, filterAssessmentId])

  const handleRegenerate = async (assignmentId: string) => {
    setRegenerating((prev) => new Set(prev).add(assignmentId))
    setMessage('')
    try {
      const response = await fetch(`/api/reports/generate/${assignmentId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to regenerate report')
      }

      setMessage('Report regenerated successfully')
      setTimeout(() => setMessage(''), 3000)
      
      // Reload reports by calling the existing loadReports function
      await loadReports()
    } catch (error) {
      console.error('Error regenerating report:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to regenerate report')
    } finally {
      setRegenerating((prev) => {
        const next = new Set(prev)
        next.delete(assignmentId)
        return next
      })
    }
  }

  const filteredReports = reports.filter((report) => {
    if (filterUserId && report.assignment?.user_id !== filterUserId) return false
    if (filterAssessmentId && report.assignment?.assessment_id !== filterAssessmentId) return false
    return true
  })

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading reports...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reports</h2>
          <p className="text-gray-600">View assessment reports for completed assignments</p>
        </div>
        {filteredReports.length > 0 && (
          <a
            href={`/api/reports/bulk-export?assignment_ids=${filteredReports.map(r => r.assignment_id).join(',')}`}
            download
          >
            <Button variant="outline">
              📦 Bulk Export ({filteredReports.length})
            </Button>
          </a>
        )}
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
                User
              </label>
              <select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Users</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
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

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
          <CardDescription>
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No reports available yet.</p>
              <p className="text-sm mt-2">
                Reports are generated automatically when assignments are completed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assessment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calculated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {report.assignment?.user?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.assignment?.user?.email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.assignment?.assessment?.title || 'Unknown Assessment'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {report.overall_score !== null 
                            ? report.overall_score.toFixed(2) 
                            : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.assignment?.completed_at
                          ? new Date(report.assignment.completed_at).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(report.calculated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Link href={`/dashboard/reports/${report.assignment_id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Regenerate Report"
                            onClick={() => handleRegenerate(report.assignment_id)}
                            disabled={regenerating.has(report.assignment_id)}
                          >
                            {regenerating.has(report.assignment_id) ? '⏳' : '🔄'}
                          </Button>
                          <Link href={`/api/reports/${report.assignment_id}/export/pdf`} target="_blank">
                            <Button variant="outline" size="sm" title="Export PDF">
                              📄
                            </Button>
                          </Link>
                          <Link href={`/api/reports/${report.assignment_id}/export/excel`} target="_blank">
                            <Button variant="outline" size="sm" title="Export Excel">
                              📊
                            </Button>
                          </Link>
                          <Link href={`/api/reports/${report.assignment_id}/export/csv`} target="_blank">
                            <Button variant="outline" size="sm" title="Export CSV">
                              📋
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
