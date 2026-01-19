'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from '@/types/database'

type Assignment = Database['public']['Tables']['assignments']['Row']
type Assessment = Database['public']['Tables']['assessments']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface AssignmentWithRelations extends Assignment {
  user: Profile
  assessment: Assessment
}

export default function AssignmentsListClient() {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<AssignmentWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'expired'>('all')
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterAssessmentId, setFilterAssessmentId] = useState<string>('')
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; username: string }>>([])
  const [assessments, setAssessments] = useState<Array<{ id: string; title: string }>>([])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterUserId, filterAssessmentId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        if (filterStatus === 'completed') {
          params.append('completed', 'true')
        } else if (filterStatus === 'pending') {
          params.append('completed', 'false')
        }
      }
      if (filterUserId) {
        params.append('user_id', filterUserId)
      }
      if (filterAssessmentId) {
        params.append('assessment_id', filterAssessmentId)
      }

      // Fetch assignments
      const response = await fetch(`/api/assignments?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setAssignments(data.assignments || [])
      } else {
        console.error('Error fetching assignments:', data.error)
      }

      // Load users and assessments for filters
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, name, email, username')
        .order('name', { ascending: true })
        .limit(1000)

      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select('id, title')
        .order('title', { ascending: true })

      setUsers(usersData || [])
      setAssessments(assessmentsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (assignment: AssignmentWithRelations) => {
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
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-600">Manage and view all assignments</p>
        </div>
        <Link href="/dashboard/assignments/create">
          <Button>+ Create Assignment</Button>
        </Link>
      </div>

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
                {users.map((user) => (
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
                {assessments.map((assessment) => (
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
            <div className="text-center py-12">
              <p className="text-gray-500">No assignments found</p>
              <Link href="/dashboard/assignments/create">
                <Button variant="outline" className="mt-4">
                  Create First Assignment
                </Button>
              </Link>
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
                        <Link href={`/dashboard/assignments/${assignment.id}`}>
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

