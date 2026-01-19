'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Database } from '@/types/database'

type AssignmentRow = Database['public']['Tables']['assignments']['Row']

interface ClientAssignmentsProps {
  clientId: string
}

interface Assignment {
  id: string
  user_id: string
  assessment_id: string
  target_id: string | null
  expires: string
  completed: boolean
  started_at: string | null
  completed_at: string | null
  created_at: string
  user: {
    id: string
    name: string
    email: string
    username: string
  } | null
  assessment: {
    id: string
    title: string
  } | null
  target: {
    id: string
    name: string
    email: string
  } | null
}

export default function ClientAssignments({ clientId }: ClientAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'expired'>('all')
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterAssessmentId, setFilterAssessmentId] = useState<string>('')
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [availableAssessments, setAvailableAssessments] = useState<Array<{ id: string; title: string }>>([])
  const supabase = createClient()

  useEffect(() => {
    const loadAssignments = async () => {
      setIsLoading(true)
      setMessage('')
      try {
        // First check if assignments table exists by trying a simple query
        const { error: tableCheckError } = await supabase
          .from('assignments')
          .select('id')
          .limit(1)

        if (tableCheckError) {
          // Table doesn't exist or migration not applied
          if (tableCheckError.code === '42P01' || tableCheckError.message?.includes('does not exist') || tableCheckError.message?.includes('relation') || tableCheckError.message?.includes('table')) {
            setMessage('Assignments table not found. Please apply migration 007_create_assignments_table.sql')
            setAssignments([])
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
          setAssignments([])
          setIsLoading(false)
          return
        }

        const userIds = clientUsers.map(u => u.id)

        // Build query with filters
        let assignmentsQuery = supabase
          .from('assignments')
          .select('*')
          .in('user_id', userIds)

        // Apply status filter
        if (filterStatus === 'completed') {
          assignmentsQuery = assignmentsQuery.eq('completed', true)
        } else if (filterStatus === 'pending') {
          assignmentsQuery = assignmentsQuery.eq('completed', false)
        }

        // Apply user filter
        if (filterUserId) {
          assignmentsQuery = assignmentsQuery.eq('user_id', filterUserId)
        }

        // Apply assessment filter
        if (filterAssessmentId) {
          assignmentsQuery = assignmentsQuery.eq('assessment_id', filterAssessmentId)
        }

        // Load assignments for these users
        const { data: assignmentsOnly, error: assignmentsError } = await assignmentsQuery
          .order('created_at', { ascending: false })

        if (assignmentsError) {
          throw new Error(`Failed to load assignments: ${assignmentsError.message || JSON.stringify(assignmentsError)}`)
        }

        if (!assignmentsOnly || assignmentsOnly.length === 0) {
          setAssignments([])
          setIsLoading(false)
          return
        }

        // Load related data separately (more reliable than joins)
        const allUserIds = [...new Set([
          ...assignmentsOnly.map((a: AssignmentRow) => a.user_id),
          ...assignmentsOnly.filter((a: AssignmentRow) => a.target_id).map((a: AssignmentRow) => a.target_id)
        ])].filter(Boolean) // Remove any null/undefined values
        const assessmentIds = [...new Set(assignmentsOnly.map((a: AssignmentRow) => a.assessment_id))].filter(Boolean)

        // Only fetch if we have IDs to query
        const [usersResult, assessmentsResult] = await Promise.all([
          allUserIds.length > 0
            ? supabase
                .from('profiles')
                .select('id, name, email, username')
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
        type UserResult = { id: string; name: string; email: string; username: string }
        type AssessmentResult = { id: string; title: string }
        
        const assignmentsData = assignmentsOnly.map((assignment: AssignmentRow) => ({
          ...assignment,
          user: usersResult.data?.find((u: UserResult) => u.id === assignment.user_id) || null,
          assessment: assessmentsResult.data?.find((a: AssessmentResult) => a.id === assignment.assessment_id) || null,
          target: usersResult.data?.find((u: UserResult) => u.id === assignment.target_id) || null,
        }))

        setAssignments(assignmentsData)

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
        console.error('Error loading assignments:', error)
        
        // Extract error message from various error types
        let errorMessage = 'Unknown error'
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (error && typeof error === 'object') {
          // Handle Supabase error objects
          const supabaseError = error as { message?: string; error?: string; code?: string }
          if (supabaseError.message) {
            errorMessage = supabaseError.message
          } else if (supabaseError.error) {
            errorMessage = supabaseError.error
          } else if (supabaseError.code) {
            errorMessage = `Error code: ${supabaseError.code}`
          } else {
            // Try to stringify, but handle circular references
            try {
              errorMessage = JSON.stringify(error, null, 2)
            } catch {
              errorMessage = String(error)
            }
          }
        } else {
          errorMessage = String(error)
        }
        
        setMessage(`Failed to load assignments: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, filterStatus, filterUserId, filterAssessmentId])

  // Delete functionality can be added later if needed
  // const handleDelete = async (assignmentId: string, userName: string, assessmentTitle: string) => {
  //   if (!confirm(`Are you sure you want to delete the assignment for ${userName} for ${assessmentTitle}?`)) {
  //     return
  //   }

  //   try {
  //     const { error } = await supabase
  //       .from('assignments')
  //       .delete()
  //       .eq('id', assignmentId)

  //     if (error) {
  //       throw new Error(`Failed to delete assignment: ${error.message}`)
  //     }

  //     // Refresh assignments list
  //     setAssignments(prev => prev.filter(a => a.id !== assignmentId))
  //     setMessage('Assignment deleted successfully')
  //     setTimeout(() => setMessage(''), 3000)
  //   } catch (error) {
  //     console.error('Error deleting assignment:', error)
  //     setMessage(error instanceof Error ? error.message : 'Failed to delete assignment')
  //   }
  // }

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.completed) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Completed
        </span>
      )
    }
    if (new Date(assignment.expires) < new Date()) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expired
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        Pending
      </span>
    )
  }

  const filteredAssignments = assignments.filter((assignment) => {
    if (filterStatus === 'completed' && !assignment.completed) return false
    if (filterStatus === 'pending' && (assignment.completed || new Date(assignment.expires) < new Date())) return false
    if (filterStatus === 'expired' && (assignment.completed || new Date(assignment.expires) >= new Date())) return false
    if (filterUserId && assignment.user_id !== filterUserId) return false
    if (filterAssessmentId && assignment.assessment_id !== filterAssessmentId) return false
    return true
  })

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading assignments...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Assignments</h2>
          <p className="text-gray-600">Manage assessment assignments for client users</p>
        </div>
        <Link href={`/dashboard/clients/${clientId}/assignments/create`}>
          <Button>📤 Assign Assessments</Button>
        </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'completed' | 'expired')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
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

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <CardDescription>
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No assignments have been assigned yet.</p>
              <p className="text-sm mt-2">
                <Link href={`/dashboard/clients/${clientId}/assignments/create`} className="text-indigo-600 hover:text-indigo-700">
                  Create your first assignment
                </Link>
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
                      Assigned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.user?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.user?.email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {assignment.assessment?.title || 'Unknown Assessment'}
                        </div>
                        {assignment.target && (
                          <div className="text-xs text-gray-500">
                            Target: {assignment.target.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.created_at
                          ? new Date(assignment.created_at).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(assignment.expires).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(assignment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link href={`/dashboard/clients/${clientId}/assignments/${assignment.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
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

