'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

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

        // Load assignments for these users
        const { data: assignmentsOnly, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .in('user_id', userIds)
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
          ...assignmentsOnly.map((a: any) => a.user_id),
          ...assignmentsOnly.filter((a: any) => a.target_id).map((a: any) => a.target_id)
        ])].filter(Boolean) // Remove any null/undefined values
        const assessmentIds = [...new Set(assignmentsOnly.map((a: any) => a.assessment_id))].filter(Boolean)

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
        const assignmentsData = assignmentsOnly.map((assignment: any) => ({
          ...assignment,
          user: usersResult.data?.find((u: any) => u.id === assignment.user_id) || null,
          assessment: assessmentsResult.data?.find((a: any) => a.id === assignment.assessment_id) || null,
          target: usersResult.data?.find((u: any) => u.id === assignment.target_id) || null,
        }))

        setAssignments(assignmentsData)
      } catch (error) {
        console.error('Error loading assignments:', error)
        
        // Extract error message from various error types
        let errorMessage = 'Unknown error'
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (error && typeof error === 'object') {
          // Handle Supabase error objects
          const supabaseError = error as any
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
  }, [clientId])

  const handleDelete = async (assignmentId: string, userName: string, assessmentTitle: string) => {
    if (!confirm(`Are you sure you want to delete the assignment for ${userName} for ${assessmentTitle}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) {
        throw new Error(`Failed to delete assignment: ${error.message}`)
      }

      // Refresh assignments list
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      setMessage('Assignment deleted successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting assignment:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to delete assignment')
    }
  }

  const formatExpiration = (expires: string) => {
    const expiresDate = new Date(expires)
    const now = new Date()
    const diff = expiresDate.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (diff < 0) {
      const absDays = Math.abs(days)
      const absHours = Math.abs(hours)
      if (absDays > 0) {
        return `Expired ${absDays} day${absDays > 1 ? 's' : ''} ago`
      } else if (absHours > 0) {
        return `Expired ${absHours} hour${absHours > 1 ? 's' : ''} ago`
      } else {
        return `Expired ${Math.abs(minutes)} minute${Math.abs(minutes) !== 1 ? 's' : ''} ago`
      }
    } else {
      if (days > 0) {
        return `Expires in ${days} day${days > 1 ? 's' : ''}`
      } else if (hours > 0) {
        return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`
      } else {
        return `Expires in ${minutes} minute${minutes !== 1 ? 's' : ''}`
      }
    }
  }

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

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <CardDescription>
            View and manage all assessment assignments for this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
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
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assessment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Settings
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assignment.user ? (
                          <Link 
                            href={`/dashboard/users/${assignment.user.id}`}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            👤 {assignment.user.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">User not found</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assignment.assessment ? (
                          <div>
                            <Link 
                              href={`/dashboard/assessments/${assignment.assessment.id}`}
                              className="text-indigo-600 hover:text-indigo-700"
                            >
                              {assignment.assessment.title}
                            </Link>
                            {assignment.target && (
                              <div className="text-sm text-gray-500">
                                For {assignment.target.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-600">
                            ⚠️ Assessment Not Found
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assignment.completed ? (
                          <div className="text-green-600">
                            ✓ Completed
                            {assignment.completed_at && (
                              <div className="text-xs text-gray-500">
                                {new Date(assignment.completed_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not Completed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={new Date(assignment.expires) < new Date() ? 'text-red-600' : 'text-gray-900'}>
                          {formatExpiration(assignment.expires)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-4">
                          <Link 
                            href={`/dashboard/assignments/${assignment.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            ✏️ Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(
                              assignment.id,
                              assignment.user?.name || 'Unknown',
                              assignment.assessment?.title || 'Unknown Assessment'
                            )}
                            className="text-red-600 hover:text-red-700"
                          >
                            🗑️ Delete
                          </button>
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

