'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface CreateAssignmentClientProps {
  clientId: string
}

interface Assessment {
  id: string
  title: string
  target: string | null
  is_360: boolean
  status?: string
}

interface User {
  id: string
  name: string
  email: string
  username: string
}

interface AssignmentUser {
  user_id: string
  user: User
  target_id: string | null
  target: User | null
  role: string
}

export default function CreateAssignmentClient({ clientId }: CreateAssignmentClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [message, setMessage] = useState('')
  
  // Form data
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([])
  const [expirationDate, setExpirationDate] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [emailSubject, setEmailSubject] = useState('New assessments have been assigned to you')
  const [emailBody, setEmailBody] = useState('Hello {name}, you have been assigned {assessments}. Please complete by {expiration-date}.')
  const [assignmentUsers, setAssignmentUsers] = useState<AssignmentUser[]>([])
  
  // Available users for selection
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true)
      try {
        // Load assessments (show all non-archived assessments)
        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from('assessments')
          .select('*')
          .neq('status', 'archived')
          .order('title', { ascending: true })
        
        if (assessmentsError) {
          console.error('Error loading assessments:', assessmentsError)
          setMessage(`Failed to load assessments: ${assessmentsError.message}`)
        } else {
          setAssessments(assessmentsData || [])
          if (!assessmentsData || assessmentsData.length === 0) {
            setMessage('No assessments available. Create an assessment first before assigning.')
          }
        }

        // Load client users
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, name, email, username')
          .eq('client_id', clientId)
          .order('name', { ascending: true })
        setAvailableUsers(usersData || [])

        // Set default expiration to tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setExpirationDate(tomorrow.toISOString().split('T')[0])

        // Set default email subject and body
        setEmailSubject('New assessments have been assigned to you')
        setEmailBody(`Hello {name},

You have been assigned the following assessment(s):
{assessments}

Please complete these assessments by {expiration-date}.

If you have any questions, please contact your administrator.

Thank you.`)
      } catch (error) {
        console.error('Error loading data:', error)
        setMessage('Failed to load data')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const handleAddUsers = () => {
    const newUsers = availableUsers
      .filter(u => selectedUserIds.includes(u.id) && !assignmentUsers.some(au => au.user_id === u.id))
      .map(u => ({
        user_id: u.id,
        user: u,
        target_id: null,
        target: null,
        role: '',
      }))
    
    setAssignmentUsers(prev => [...prev, ...newUsers])
    setSelectedUserIds([])
    setShowAddUserModal(false)
  }

  const handleRemoveUser = (index: number) => {
    setAssignmentUsers(prev => prev.filter((_, i) => i !== index))
  }

  const handleSetTarget = (index: number, targetId: string) => {
    const target = availableUsers.find(u => u.id === targetId)
    setAssignmentUsers(prev => prev.map((au, i) => 
      i === index ? { ...au, target_id: targetId, target: target || null } : au
    ))
  }

  const handleSetRole = (index: number, role: string) => {
    setAssignmentUsers(prev => prev.map((au, i) => 
      i === index ? { ...au, role } : au
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      if (selectedAssessmentIds.length === 0) {
        throw new Error('Please select at least one assessment')
      }

      if (assignmentUsers.length === 0) {
        throw new Error('Please add at least one user to assign to')
      }

      // Check if any selected assessments require targets
      const selectedAssessments = assessments.filter(a => selectedAssessmentIds.includes(a.id))
      const requiresTarget = selectedAssessments.some(a => a.target === '1' || a.target === '2' || a.is_360)

      if (requiresTarget) {
        // Validate that all users have targets set
        for (const au of assignmentUsers) {
          if (!au.target_id) {
            throw new Error(`Target must be set for ${au.user.name} when assigning development/360 assessments`)
          }
        }
      }

      const expiresDate = new Date(expirationDate)
      expiresDate.setHours(23, 59, 59, 999) // Set to end of day

      // Create assignments for each user-assessment combination
      const assignmentsToCreate = []
      for (const au of assignmentUsers) {
        for (const assessmentId of selectedAssessmentIds) {
          const assessment = assessments.find(a => a.id === assessmentId)
          if (!assessment) continue

          // Prepare custom_fields for 360 assessments
          let customFields = null
          if (au.target && (assessment.target === '1' || assessment.target === '2' || assessment.is_360)) {
            customFields = {
              type: ['name', 'email', 'role'],
              value: [au.target.name, au.target.email, au.role || ''],
            }
          }

          // URL will be generated after assignment is created (server-side)
          const url = null

          assignmentsToCreate.push({
            user_id: au.user_id,
            assessment_id: assessmentId,
            target_id: au.target_id || null,
            custom_fields: customFields,
            expires: expiresDate.toISOString(),
            whitelabel: false, // Can be set based on client settings
            url,
            completed: false,
          })
        }
      }

      // Insert all assignments
      const { data: createdAssignments, error } = await supabase
        .from('assignments')
        .insert(assignmentsToCreate)
        .select()

      if (error) {
        throw new Error(`Failed to create assignments: ${error.message}`)
      }

      // Send emails if enabled
      if (sendEmail && createdAssignments && createdAssignments.length > 0) {
        // Group assignments by user
        const assignmentsByUser = new Map<string, Array<{ assessmentTitle: string; url?: string | null }>>()
        
        for (const assignment of createdAssignments) {
          const user = assignmentUsers.find(au => au.user_id === assignment.user_id)
          if (!user) continue

          const assessment = assessments.find(a => a.id === assignment.assessment_id)
          if (!assessment) continue

          if (!assignmentsByUser.has(user.user_id)) {
            assignmentsByUser.set(user.user_id, [])
          }
          
          assignmentsByUser.get(user.user_id)!.push({
            assessmentTitle: assessment.title,
            url: assignment.url,
          })
        }

        // Send email to each user
        const emailPromises = []
        for (const [userId, userAssignments] of assignmentsByUser.entries()) {
          const user = assignmentUsers.find(au => au.user_id === userId)
          if (!user) continue

          emailPromises.push(
            fetch('/api/assignments/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: user.user.email,
                toName: user.user.name,
                username: user.user.username,
                subject: emailSubject || 'New assessments have been assigned to you',
                body: emailBody || 'Hello {name}, you have been assigned {assessments}. Please complete by {expiration-date}.',
                assignments: userAssignments,
                expirationDate: expirationDate,
              }),
            })
          )
        }

        // Send all emails (don't fail if email sending fails)
        try {
          await Promise.allSettled(emailPromises)
        } catch (emailError) {
          console.error('Error sending emails:', emailError)
          // Don't throw - assignments were created successfully
        }
      }

      setMessage('Assignments created successfully!')
      setTimeout(() => {
        router.push(`/dashboard/clients/${clientId}?tab=assignments`)
      }, 1500)
    } catch (error) {
      console.error('Error creating assignments:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to create assignments')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assign Assessments</h1>
            <p className="text-gray-600">Assign assessments to client users</p>
          </div>
          <Link href={`/dashboard/clients/${clientId}?tab=assignments`}>
            <Button variant="outline">Back to Assignments</Button>
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

        {/* Assignment Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
              <CardDescription>Select assessments and set expiration date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assessments Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessments *
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  The assessments which will be assigned to these users.
                </p>
                {assessments.length === 0 ? (
                  <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">No assessments available.</p>
                    <p className="text-xs text-gray-500 mb-3">
                      Create an assessment first before assigning to users.
                    </p>
                    <Link href="/dashboard/assessments/create">
                      <Button variant="outline" size="sm">Create Assessment</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <select
                      multiple
                      value={selectedAssessmentIds}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value)
                        setSelectedAssessmentIds(selected)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      size={Math.min(assessments.length, 10)}
                    >
                      {assessments.map((assessment) => (
                        <option key={assessment.id} value={assessment.id}>
                          {assessment.title} {assessment.is_360 ? '(360)' : ''} {assessment.status !== 'active' ? `[${assessment.status}]` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Hold Ctrl/Cmd to select multiple assessments
                    </p>
                  </>
                )}
              </div>

              {/* Expiration Date */}
              {selectedAssessmentIds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration Date *
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Users will not be able to start or finish unfinished assignments after they have expired.
                  </p>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Email Notification */}
              {selectedAssessmentIds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Notification
                  </label>
                  <select
                    value={sendEmail ? '1' : '0'}
                    onChange={(e) => setSendEmail(e.target.value === '1')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              )}

              {/* Email Settings */}
              {sendEmail && selectedAssessmentIds.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="New assessments have been assigned to you"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Body
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Hello {name}, you have been assigned {assessments}. Please complete by {expiration-date}."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available shortcodes: {'{name}'}, {'{username}'}, {'{email}'}, {'{assessments}'}, {'{expiration-date}'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assign To Section */}
          {selectedAssessmentIds.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Assign To</CardTitle>
                    <CardDescription>Select users to assign these assessments to</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddUserModal(true)}
                    >
                      👤 Add Users
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {assignmentUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No users added yet.</p>
                    <p className="text-sm mt-2">Click "Add Users" to select users to assign to.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignmentUsers.map((au, index) => {
                      const selectedAssessments = assessments.filter(a => selectedAssessmentIds.includes(a.id))
                      const requiresTarget = selectedAssessments.some(a => a.target === '1' || a.target === '2' || a.is_360)
                      
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">👤</div>
                              <div>
                                <h4 className="font-medium text-gray-900">{au.user.name}</h4>
                                <p className="text-sm text-gray-500">{au.user.username} ({au.user.email})</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleRemoveUser(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>

                          {requiresTarget && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Target User *
                                </label>
                                <select
                                  value={au.target_id || ''}
                                  onChange={(e) => handleSetTarget(index, e.target.value)}
                                  required
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                  <option value="">Select target...</option>
                                  {availableUsers
                                    .filter(u => u.id !== au.user_id)
                                    .map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Role
                                </label>
                                <input
                                  type="text"
                                  value={au.role}
                                  onChange={(e) => handleSetRole(index, e.target.value)}
                                  placeholder="e.g., Manager, Peer, Direct Report"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          {selectedAssessmentIds.length > 0 && (
            <div className="flex justify-end space-x-4 mt-6">
              <Link href={`/dashboard/clients/${clientId}?tab=assignments`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading || assignmentUsers.length === 0}>
                {isLoading ? 'Creating...' : 'Create Assignments'}
              </Button>
            </div>
          )}
        </form>

        {/* Add Users Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Users</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false)
                    setSelectedUserIds([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Users
                </label>
                <select
                  multiple
                  value={selectedUserIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setSelectedUserIds(selected)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  size={Math.min(availableUsers.length, 10)}
                >
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hold Ctrl/Cmd to select multiple users
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddUserModal(false)
                    setSelectedUserIds([])
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddUsers}
                  disabled={selectedUserIds.length === 0}
                >
                  Add Selected Users
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

