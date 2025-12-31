'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

interface Group {
  id: string
  name: string
  description: string | null
  members?: Array<{
    profile_id: string
    profile?: User
  }>
}

interface AssignmentUser {
  user_id: string
  user: User
  target_id: string | null
  target: User | null
  role: string
  source: 'individual' | 'group'
  groupId?: string
  groupName?: string
}

interface CreatedAssignment {
  id: string
  user_id: string
  assessment_id: string
  url?: string | null
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
  const [emailBody, setEmailBody] = useState('')
  const [assignmentUsers, setAssignmentUsers] = useState<AssignmentUser[]>([])
  
  // Available data for selection
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [availableGroups, setAvailableGroups] = useState<Group[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true)
      try {
        // Load assessments (only show active assessments for assignment)
        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from('assessments')
          .select('*')
          .eq('status', 'active')
          .order('title', { ascending: true })
        
        if (assessmentsError) {
          console.error('Error loading assessments:', assessmentsError)
          setMessage(`Failed to load assessments: ${assessmentsError.message}`)
        } else {
          setAssessments(assessmentsData || [])
          if (!assessmentsData || assessmentsData.length === 0) {
            setMessage('No active assessments available. Only assessments with "Active" status can be assigned. Please publish an assessment first.')
          }
        }

        // Load client users
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, name, email, username')
          .eq('client_id', clientId)
          .order('name', { ascending: true })
        setAvailableUsers(usersData || [])

        // Load groups with members
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select(`
            *,
            group_members(
              profile_id,
              profiles(id, name, email, username)
            )
          `)
          .eq('client_id', clientId)
          .order('name', { ascending: true })

        if (!groupsError && groupsData) {
          const transformedGroups = groupsData.map((group: {
            id: string
            name: string
            description: string | null
            group_members?: Array<{
              profile_id: string
              profiles?: User | null
            }>
          }) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            members: group.group_members?.map((gm) => ({
              profile_id: gm.profile_id,
              profile: gm.profiles || undefined,
            })) || [],
          }))
          setAvailableGroups(transformedGroups)
        }

        // Set default expiration to 30 days from now
        const defaultExpiration = new Date()
        defaultExpiration.setDate(defaultExpiration.getDate() + 30)
        setExpirationDate(defaultExpiration.toISOString().split('T')[0])

        // Set default email body
        setEmailBody(`Hello {name},

You have been assigned the following assessment(s):
{assessments}

Please complete these assessments by {expiration-date}.

You can access your assignments at any time from your dashboard.

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
        source: 'individual' as const,
      }))
    
    setAssignmentUsers(prev => [...prev, ...newUsers])
    setSelectedUserIds([])
    setShowAddUserModal(false)
  }

  const handleAddGroups = async () => {
    if (selectedGroupIds.length === 0) return

    const selectedGroups = availableGroups.filter(g => selectedGroupIds.includes(g.id))
    const newUsers: AssignmentUser[] = []

    for (const group of selectedGroups) {
      if (!group.members || group.members.length === 0) continue

      for (const member of group.members) {
        if (!member.profile) continue
        
        // Skip if user is already in assignmentUsers
        if (assignmentUsers.some(au => au.user_id === member.profile!.id)) continue

        newUsers.push({
          user_id: member.profile.id,
          user: member.profile,
          target_id: null,
          target: null,
          role: '',
          source: 'group',
          groupId: group.id,
          groupName: group.name,
        })
      }
    }

    setAssignmentUsers(prev => [...prev, ...newUsers])
    setSelectedGroupIds([])
    setShowAddGroupModal(false)
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

  const getRequiresTarget = (assessment: Assessment): boolean => {
    return assessment.target === '1' || assessment.target === '2' || assessment.is_360 === true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Form submitted!', {
      selectedAssessmentIds,
      assignmentUsers: assignmentUsers.length,
      expirationDate,
    })
    
    setIsLoading(true)
    setMessage('')

    try {
      // Clear any previous errors
      console.log('Starting assignment creation...')

      if (selectedAssessmentIds.length === 0) {
        const errorMsg = 'Please select at least one assessment'
        console.error('Validation error:', errorMsg)
        throw new Error(errorMsg)
      }

      if (assignmentUsers.length === 0) {
        const errorMsg = 'Please add at least one user to assign to'
        console.error('Validation error:', errorMsg)
        throw new Error(errorMsg)
      }

      // Validate assessments are active
      const selectedAssessments = assessments.filter(a => selectedAssessmentIds.includes(a.id))
      const inactiveAssessments = selectedAssessments.filter(a => a.status !== 'active')
      if (inactiveAssessments.length > 0) {
        const errorMsg = `Cannot assign inactive assessments: ${inactiveAssessments.map(a => a.title).join(', ')}. Please ensure all selected assessments are set to "Active" status.`
        console.error('Validation error:', errorMsg)
        throw new Error(errorMsg)
      }

      // Check if any selected assessments require targets
      const requiresTarget = selectedAssessments.some(a => getRequiresTarget(a))

      if (requiresTarget) {
        // Validate that all users have targets set
        for (const au of assignmentUsers) {
          if (!au.target_id) {
            const errorMsg = `Target must be set for ${au.user.name} when assigning 360/development assessments`
            console.error('Validation error:', errorMsg)
            throw new Error(errorMsg)
          }
        }
      }

      console.log(`Creating assignments for ${assignmentUsers.length} users and ${selectedAssessmentIds.length} assessments...`)

      const expiresDate = new Date(expirationDate)
      expiresDate.setHours(23, 59, 59, 999) // Set to end of day

      // Create assignments using API - one API call per user-assessment combination
      // This allows per-user custom_fields and target_id
      const createdAssignments: CreatedAssignment[] = []
      const errors: string[] = []

      for (const au of assignmentUsers) {
        for (const assessmentId of selectedAssessmentIds) {
          const assessment = assessments.find(a => a.id === assessmentId)
          if (!assessment) continue

          // Prepare custom_fields for 360 assessments
          let customFields = null
          if (au.target && getRequiresTarget(assessment)) {
            customFields = {
              type: ['name', 'email', 'role'],
              value: [au.target.name, au.target.email, au.role || ''],
            }
          }

          try {
            console.log(`Creating assignment for user ${au.user.name} (${au.user_id}) - assessment ${assessment.title} (${assessmentId})`)
            
            const response = await fetch('/api/assignments', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_ids: [au.user_id],
                assessment_ids: [assessmentId],
                expires: expiresDate.toISOString(),
                target_id: au.target_id || null,
                custom_fields: customFields,
                whitelabel: false,
              }),
            })

            const data = await response.json()
            console.log('API response:', { status: response.status, ok: response.ok, data })

            if (!response.ok) {
              const errorMsg = `Failed to create assignment for ${au.user.name} - ${assessment.title}: ${data.error || `HTTP ${response.status} - ${response.statusText}`}`
              console.error('API error:', errorMsg, data)
              errors.push(errorMsg)
              continue
            }

            if (data.assignments && data.assignments.length > 0) {
              console.log(`Successfully created assignment:`, data.assignments[0])
              createdAssignments.push(...data.assignments)
            } else {
              const errorMsg = `No assignment returned for ${au.user.name} - ${assessment.title}`
              console.error('API warning:', errorMsg, data)
              errors.push(errorMsg)
            }
          } catch (error) {
            const errorMsg = `Failed to create assignment for ${au.user.name} - ${assessment.title}: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error('Network/parsing error:', errorMsg, error)
            errors.push(errorMsg)
          }
        }
      }

      console.log(`Assignment creation complete: ${createdAssignments.length} successful, ${errors.length} errors`)

      if (createdAssignments.length === 0) {
        const errorMsg = `Failed to create any assignments. ${errors.length > 0 ? errors.join('; ') : 'No error details available. Check console for more information.'}`
        console.error('Assignment creation failed:', errorMsg)
        throw new Error(errorMsg)
      }

      if (errors.length > 0) {
        const partialSuccessMsg = `Created ${createdAssignments.length} assignment(s) with ${errors.length} error(s). Check console for details.`
        console.warn('Partial success:', partialSuccessMsg)
        console.warn('Errors:', errors)
        setMessage(`${partialSuccessMsg} Errors: ${errors.join('; ')}`)
      } else {
        console.log('All assignments created successfully!')
        setMessage(`Successfully created ${createdAssignments.length} assignment(s)!`)
      }

      // Send emails if enabled
      if (sendEmail && createdAssignments.length > 0) {
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
        const emailPromises: Array<Promise<Response>> = []
        const emailUserMap: Array<{ userId: string; email: string; name: string }> = []
        
        for (const [userId, userAssignments] of assignmentsByUser.entries()) {
          const user = assignmentUsers.find(au => au.user_id === userId)
          if (!user) continue

          emailUserMap.push({
            userId,
            email: user.user.email,
            name: user.user.name,
          })

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

        // Send all emails and track results
        try {
          const emailResults = await Promise.allSettled(emailPromises)
          const emailErrors: string[] = []
          let emailSuccessCount = 0
          let emailFailureCount = 0

          // Process email results sequentially to properly await JSON parsing
          for (let i = 0; i < emailResults.length; i++) {
            const result = emailResults[i]
            const userInfo = emailUserMap[i]
            const userLabel = userInfo ? `${userInfo.name} (${userInfo.email})` : `Email ${i + 1}`
            
            if (result.status === 'fulfilled') {
              const response = result.value
              try {
                if (response.ok) {
                  const data = await response.json().catch(() => ({}))
                  if (data.success !== false && !data.error) {
                    emailSuccessCount++
                    console.log(`✅ Email sent successfully to ${userLabel}`)
                  } else {
                    emailFailureCount++
                    const errorMsg = data.error || data.message || 'Failed to send'
                    emailErrors.push(`${userLabel}: ${errorMsg}`)
                    console.error(`❌ Email failed for ${userLabel}:`, errorMsg)
                  }
                } else {
                  emailFailureCount++
                  const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
                  const errorMsg = errorData.error || errorData.message || `HTTP ${response.status}`
                  emailErrors.push(`${userLabel}: ${errorMsg}`)
                  console.error(`❌ Email HTTP error for ${userLabel}:`, errorMsg)
                }
              } catch (parseError) {
                emailFailureCount++
                emailErrors.push(`${userLabel}: Failed to parse response`)
                console.error(`❌ Email parse error for ${userLabel}:`, parseError)
              }
            } else {
              emailFailureCount++
              const errorMsg = result.reason?.message || 'Failed to send'
              emailErrors.push(`${userLabel}: ${errorMsg}`)
              console.error(`❌ Email promise rejected for ${userLabel}:`, errorMsg)
            }
          }

          // Update message with email results
          if (emailFailureCount > 0) {
            const emailMsg = `⚠️ Emails: ${emailSuccessCount} sent, ${emailFailureCount} failed. ${emailErrors.slice(0, 3).join('; ')}${emailErrors.length > 3 ? '...' : ''}`
            console.warn('Email sending issues:', emailMsg)
            setMessage(prev => prev + (prev ? ' ' : '') + emailMsg)
          } else if (emailSuccessCount > 0) {
            console.log(`✅ Successfully sent ${emailSuccessCount} email notification(s)`)
            setMessage(prev => prev + (prev ? ' ' : '') + `✅ ${emailSuccessCount} email notification(s) sent.`)
          } else {
            console.warn('No emails were sent (no valid recipients or all failed)')
          }
        } catch (emailError) {
          console.error('Error processing email results:', emailError)
          const emailErrorMsg = `⚠️ Warning: Email sending encountered an error: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`
          setMessage(prev => prev + (prev ? ' ' : '') + emailErrorMsg)
        }
      }

      setTimeout(() => {
        router.push(`/dashboard/clients/${clientId}?tab=assignments`)
      }, 2000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create assignments'
      console.error('Assignment creation error:', errorMsg, error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      setMessage(`Error: ${errorMsg}. Check the browser console for detailed error information.`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    )
  }

  const selectedAssessments = assessments.filter(a => selectedAssessmentIds.includes(a.id))
  const requiresTarget = selectedAssessments.some(a => getRequiresTarget(a))
  const totalAssignmentsToCreate = assignmentUsers.length * selectedAssessmentIds.length

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assign Assessments</h1>
            <p className="text-gray-600">Assign assessments to client users or groups</p>
          </div>
          <Link href={`/dashboard/clients/${clientId}?tab=assignments`}>
            <Button variant="outline">Back to Assignments</Button>
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('Successfully') || message.includes('Created')
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Assignment Form */}
        <form 
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault()
            }
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Select assessments and set expiration date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assessments Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessments <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Select one or more assessments to assign to users.
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
                      required
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
                    {selectedAssessmentIds.length > 0 && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>{selectedAssessmentIds.length}</strong> assessment{selectedAssessmentIds.length !== 1 ? 's' : ''} selected
                          {requiresTarget && (
                            <span className="block mt-1 text-xs">
                              ⚠️ These assessments require target users to be specified for each assigned user.
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Expiration Date */}
              {selectedAssessmentIds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration Date <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Users will not be able to start or finish unfinished assignments after this date.
                  </p>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Email Notification */}
              {selectedAssessmentIds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send Email Notification
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
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Hello {name}, you have been assigned {assessments}. Please complete by {expiration-date}."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available shortcodes: <code>{'{name}'}</code>, <code>{'{username}'}</code>, <code>{'{email}'}</code>, <code>{'{assessments}'}</code>, <code>{'{expiration-date}'}</code>
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
                    <CardDescription>
                      Select users or groups to assign these assessments to
                      {totalAssignmentsToCreate > 0 && (
                        <span className="block mt-1 text-sm font-medium text-gray-700">
                          {totalAssignmentsToCreate} assignment{totalAssignmentsToCreate !== 1 ? 's' : ''} will be created
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddUserModal(true)}
                    >
                      👤 Add Users
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddGroupModal(true)}
                      disabled={availableGroups.length === 0}
                    >
                      👥 Add Groups
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {assignmentUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No users added yet.</p>
                    <p className="text-sm mt-2">Click &quot;Add Users&quot; or &quot;Add Groups&quot; to select users to assign to.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignmentUsers.map((au, index) => {
                      return (
                        <div key={`${au.user_id}-${index}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">👤</div>
                              <div>
                                <h4 className="font-medium text-gray-900">{au.user.name}</h4>
                                <p className="text-sm text-gray-500">{au.user.username} ({au.user.email})</p>
                                {au.source === 'group' && au.groupName && (
                                  <p className="text-xs text-indigo-600 mt-1">From group: {au.groupName}</p>
                                )}
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
                                  Target User <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={au.target_id || ''}
                                  onChange={(e) => handleSetTarget(index, e.target.value)}
                                  required={requiresTarget}
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
                                <p className="text-xs text-gray-500 mt-1">
                                  The person being assessed in this 360/development assessment
                                </p>
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
                                <p className="text-xs text-gray-500 mt-1">
                                  The relationship/role of the assessor to the target
                                </p>
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
          <div className="flex justify-end space-x-4 mt-6">
            <Link href={`/dashboard/clients/${clientId}?tab=assignments`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button 
              type="button"
              disabled={isLoading || selectedAssessmentIds.length === 0 || assignmentUsers.length === 0}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Button clicked - Form state:', {
                  isLoading,
                  selectedAssessmentIds: selectedAssessmentIds.length,
                  assignmentUsers: assignmentUsers.length,
                  totalAssignmentsToCreate,
                })
                
                // Manually trigger form submission
                const form = e.currentTarget.closest('form')
                if (form) {
                  const formEvent = new Event('submit', { bubbles: true, cancelable: true })
                  form.dispatchEvent(formEvent)
                  // Also call handleSubmit directly as fallback
                  handleSubmit(formEvent as unknown as React.FormEvent<HTMLFormElement>)
                } else {
                  console.error('Form not found!')
                }
              }}
            >
              {isLoading ? 'Creating Assignments...' : `Create ${totalAssignmentsToCreate} Assignment${totalAssignmentsToCreate !== 1 ? 's' : ''}`}
            </Button>
          </div>
          {selectedAssessmentIds.length === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">Please select at least one assessment to continue.</p>
            </div>
          )}
          {selectedAssessmentIds.length > 0 && assignmentUsers.length === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">Please add at least one user or group to assign to.</p>
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
                  Add Selected Users ({selectedUserIds.length})
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Groups Modal */}
        {showAddGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Groups</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGroupModal(false)
                    setSelectedGroupIds([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Groups
                </label>
                {availableGroups.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-600">No groups available for this client.</p>
                    <p className="text-xs text-gray-500 mt-1">Create groups first in the Groups tab.</p>
                  </div>
                ) : (
                  <>
                    <select
                      multiple
                      value={selectedGroupIds}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value)
                        setSelectedGroupIds(selected)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      size={Math.min(availableGroups.length, 10)}
                    >
                      {availableGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.members?.length || 0} members)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Hold Ctrl/Cmd to select multiple groups. All members of selected groups will be added.
                    </p>
                    {selectedGroupIds.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs text-blue-800">
                          {availableGroups
                            .filter(g => selectedGroupIds.includes(g.id))
                            .reduce((sum, g) => sum + (g.members?.length || 0), 0)} total users will be added from {selectedGroupIds.length} group{selectedGroupIds.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddGroupModal(false)
                    setSelectedGroupIds([])
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddGroups}
                  disabled={selectedGroupIds.length === 0}
                >
                  Add Groups ({selectedGroupIds.length})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
