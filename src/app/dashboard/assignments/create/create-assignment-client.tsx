'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Database } from '@/types/database'
import RichTextEditor from '@/components/rich-text-editor'

type Assessment = Database['public']['Tables']['assessments']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Group = Database['public']['Tables']['groups']['Row']

interface GroupWithMembers extends Group {
  group_members?: Array<{
    profile_id: string
    profiles: Profile
  }>
}

interface UserInfo {
  id: string
  name: string
  email: string
  username: string
  client_id?: string | null
}

interface AssignmentUser {
  user_id: string
  user: UserInfo
  target_id: string | null
  target: UserInfo | null
  role: string
  source: 'user' | 'group' // Track if user came from direct selection or group
  group_id?: string // If from group, track which group
}

interface SurveyOption {
  survey_id: string
  assessment_ids: string[]
  expires: string
  user_ids: string[]
  label: string
}

export default function CreateAssignmentClient() {
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
  
  // Assignment targets
  const [assignmentUsers, setAssignmentUsers] = useState<AssignmentUser[]>([])
  
  // Available options
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string; username: string; client_id: string | null }>>([])
  const [availableGroups, setAvailableGroups] = useState<GroupWithMembers[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [showAssignConfirmDialog, setShowAssignConfirmDialog] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  // Add to existing survey
  const [existingSurveyId, setExistingSurveyId] = useState<string | null>(null)
  const [surveysList, setSurveysList] = useState<SurveyOption[]>([])
  const [selectedSurveyMeta, setSelectedSurveyMeta] = useState<{ assessment_ids: string[]; expires: string; user_ids: string[] } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true)
      try {
        // Load assessments
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
        }

        // Load all users (for super_admin) or client users (for client_admin)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('access_level, client_id')
            .eq('auth_user_id', user.id)
            .single()

          if (profile) {
            let usersQuery = supabase
              .from('profiles')
              .select('id, name, email, username, client_id')
              .order('name', { ascending: true })

            // Client admins only see their client's users
            if (profile.access_level === 'client_admin' && profile.client_id) {
              usersQuery = usersQuery.eq('client_id', profile.client_id)
            }

            const { data: usersData } = await usersQuery
            setAvailableUsers(usersData || [])

            // Load groups
            let groupsQuery = supabase
              .from('groups')
              .select(`
                *,
                group_members(
                  profile_id,
                  profiles(id, name, email, username)
                )
              `)
              .order('name', { ascending: true })

            // Client admins only see their client's groups
            if (profile.access_level === 'client_admin' && profile.client_id) {
              groupsQuery = groupsQuery.eq('client_id', profile.client_id)
            }

            const { data: groupsData } = await groupsQuery
            setAvailableGroups((groupsData as GroupWithMembers[]) || [])
          }
        }

        // Load assignments to build existing surveys list (for "Add to existing survey" dropdown)
        const assignmentsRes = await fetch('/api/assignments')
        const assignmentsData = await assignmentsRes.json().catch(() => ({}))
        const allAssignments = Array.isArray(assignmentsData.assignments) ? assignmentsData.assignments : []
        const bySurvey = new Map<string, { assessment_ids: Set<string>; expires: string; user_ids: Set<string>; assessmentTitles: string[] }>()
        for (const a of allAssignments as Array<{ survey_id: string | null; assessment_id: string; user_id: string; expires: string; assessment?: { title?: string } }>) {
          if (!a.survey_id) continue
          if (!bySurvey.has(a.survey_id)) {
            bySurvey.set(a.survey_id, { assessment_ids: new Set(), expires: a.expires, user_ids: new Set(), assessmentTitles: [] })
          }
          const g = bySurvey.get(a.survey_id)!
          g.assessment_ids.add(a.assessment_id)
          g.user_ids.add(a.user_id)
          if (a.assessment?.title && !g.assessmentTitles.includes(a.assessment.title)) {
            g.assessmentTitles.push(a.assessment.title)
          }
        }
        const surveys: SurveyOption[] = []
        bySurvey.forEach((g, survey_id) => {
          const assessment_ids = Array.from(g.assessment_ids)
          const user_ids = Array.from(g.user_ids)
          const expiresDate = g.expires.slice(0, 10)
          const label = g.assessmentTitles.length
            ? `${g.assessmentTitles[0]}${g.assessmentTitles.length > 1 ? ` (+${g.assessmentTitles.length - 1} more)` : ''} – expires ${expiresDate} – ${user_ids.length} participant${user_ids.length !== 1 ? 's' : ''}`
            : `Survey – expires ${expiresDate} – ${user_ids.length} participant${user_ids.length !== 1 ? 's' : ''}`
          surveys.push({ survey_id, assessment_ids, expires: g.expires, user_ids, label })
        })
        setSurveysList(surveys)

        // Set default expiration to tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setExpirationDate(tomorrow.toISOString().split('T')[0])

        // Set default email body
        setEmailBody(`Hello {name},

You have been assigned the following assessment(s):
{assessments}

Please click the link above to take you to the dashboard to log in. Please complete your
assignments by {expiration-date}.

You can access your assignments at any time from your dashboard ({dashboard-link}).

SAVE this email and BOOKMARK your login page. If you have been assigned multiple
assessments, this will help you navigate to the login page.

If you have any questions, please contact us at: support@involvedtalent.com

Thank you!

-Involved Talent Team
© {year} Involved Talent`)
      } catch (error) {
        console.error('Error loading data:', error)
        setMessage('Failed to load data')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddUsers = () => {
    const newUsers = availableUsers
      .filter(u => selectedUserIds.includes(u.id) && !assignmentUsers.some(au => au.user_id === u.id))
      .map(u => ({
        user_id: u.id,
        user: u,
        target_id: null,
        target: null,
        role: '',
        source: 'user' as const,
      }))
    
    setAssignmentUsers(prev => [...prev, ...newUsers])
    setSelectedUserIds([])
    setShowAddUserModal(false)
  }

  const handleAddGroups = async () => {
    const selectedGroups = availableGroups.filter(g => selectedGroupIds.includes(g.id))
    const newUsers: AssignmentUser[] = []

    for (const group of selectedGroups) {
      // Get all members of this group
      const { data: members } = await supabase
        .from('group_members')
        .select('profile_id, profiles(id, name, email, username)')
        .eq('group_id', group.id)

      if (members) {
        for (const member of members) {
          // profiles is returned as an object (not array) from Supabase when using select with nested relation
          const profile = (member.profiles as unknown) as UserInfo | null
          if (profile && profile.id && !assignmentUsers.some(au => au.user_id === profile.id)) {
            newUsers.push({
              user_id: profile.id,
              user: profile,
              target_id: null,
              target: null,
              role: '',
              source: 'group',
              group_id: group.id,
            })
          }
        }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowAssignConfirmDialog(true)
  }

  const performSubmit = async () => {
    setShowAssignConfirmDialog(false)
    setIsLoading(true)
    setMessage('')

    try {
      if (selectedAssessmentIds.length === 0) {
        throw new Error('Please select at least one assessment')
      }

      if (assignmentUsers.length === 0) {
        throw new Error('Please add at least one user or group to assign to')
      }

      // When adding to existing survey, block if any selected user is already in that survey
      if (existingSurveyId && selectedSurveyMeta) {
        const existingUserIds = new Set(selectedSurveyMeta.user_ids)
        const duplicates = assignmentUsers.filter((au) => existingUserIds.has(au.user_id))
        if (duplicates.length > 0) {
          const names = duplicates.map((au) => au.user.name || au.user.email).join(', ')
          setMessage(`The following people already have assignments in this survey: ${names}. Please remove them from the list or choose "No — create a new survey" to assign them to a new survey.`)
          setIsLoading(false)
          return
        }
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
      expiresDate.setHours(23, 59, 59, 999)

      // Create assignments for each user
      // Since each user can have different target_id and custom_fields,
      // we make one API call per user with all their assessments
      interface CreatedAssignment {
        id: string
        user_id: string
        assessment_id: string
        url?: string | null
      }
      const createdAssignments: CreatedAssignment[] = []
      const assignmentPromises: Promise<{ assignments: CreatedAssignment[]; userPasswords?: Record<string, string> }>[] = []
      const userPasswords = new Map<string, string>() // userId -> temporary password

      for (const au of assignmentUsers) {
        // Prepare custom_fields for this user (if any assessment requires it)
        const selectedAssessmentsForUser = assessments.filter(a => selectedAssessmentIds.includes(a.id))
        const requiresTargetForUser = selectedAssessmentsForUser.some(a => a.target === '1' || a.target === '2' || a.is_360)
        
        let customFields = null
        if (au.target && requiresTargetForUser) {
          // Use the first assessment that requires target to determine custom_fields format
          const firstRequiringTarget = selectedAssessmentsForUser.find(a => a.target === '1' || a.target === '2' || a.is_360)
          if (firstRequiringTarget) {
            customFields = {
              type: ['name', 'email', 'role'],
              value: [au.target.name, au.target.email, au.role || ''],
            }
          }
        }

        // Create all assessments for this user in one API call
        const body: Record<string, unknown> = {
          user_ids: [au.user_id],
          assessment_ids: selectedAssessmentIds,
          expires: expiresDate.toISOString(),
          target_id: au.target_id || null,
          custom_fields: customFields,
          whitelabel: false,
        }
        if (existingSurveyId) {
          body.survey_id = existingSurveyId
        }
        const promise = fetch('/api/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }).then(async (response) => {
          const data = await response.json()
          if (response.status === 409) {
            throw new Error(data.error || 'Some users already have assignments in this survey.')
          }
          if (response.ok && data.assignments) {
            // Collect passwords from response
            if (data.userPasswords && typeof data.userPasswords === 'object') {
              for (const [userId, password] of Object.entries(data.userPasswords)) {
                if (typeof password === 'string') {
                  userPasswords.set(userId, password)
                }
              }
            }
            return { assignments: data.assignments as CreatedAssignment[], userPasswords: data.userPasswords }
          } else {
            console.error('Error creating assignments:', data.error)
            return { assignments: [], userPasswords: undefined }
          }
        })

        assignmentPromises.push(promise)
      }

      // Wait for all assignments to be created
      const results = await Promise.all(assignmentPromises)
      for (const result of results) {
        createdAssignments.push(...result.assignments)
      }

      if (createdAssignments.length === 0) {
        throw new Error('Failed to create any assignments')
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

          // Get password for this user if available
          const password = userPasswords.get(userId) || undefined

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
                body: emailBody || 'Hello {name}, you have been assigned {assessments}. Please complete by {expiration-date}. Dashboard: {dashboard-link}. © {year} Involved Talent.',
                assignments: userAssignments,
                expirationDate: expirationDate,
                password: password,
              }),
            })
          )
        }

        // Send all emails (don't fail if email sending fails)
        try {
          await Promise.allSettled(emailPromises)
        } catch (emailError) {
          console.error('Error sending emails:', emailError)
        }
      }

      setMessage('Assignments created successfully!')
      setTimeout(() => {
        router.push('/dashboard/assignments')
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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Assignment</h1>
          <p className="text-gray-600">Assign assessments to users or groups</p>
        </div>
        <Link href="/dashboard/assignments">
          <Button variant="outline">Back to Assignments</Button>
        </Link>
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

      {/* Assignment Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>Select assessments and set expiration date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add to existing survey */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add to existing survey?
              </label>
              <select
                value={existingSurveyId ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (!v) {
                    setExistingSurveyId(null)
                    setSelectedSurveyMeta(null)
                    return
                  }
                  const survey = surveysList.find((s) => s.survey_id === v)
                  if (survey) {
                    setExistingSurveyId(survey.survey_id)
                    setSelectedSurveyMeta({ assessment_ids: survey.assessment_ids, expires: survey.expires, user_ids: survey.user_ids })
                    setSelectedAssessmentIds(survey.assessment_ids)
                    setExpirationDate(survey.expires.slice(0, 10))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
              >
                <option value="">No — create a new survey</option>
                {surveysList.map((s) => (
                  <option key={s.survey_id} value={s.survey_id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {existingSurveyId && (
                <p className="text-sm text-amber-700 mt-2">
                  Assessment(s) and expiration are set by the existing survey. Add users or groups below.
                </p>
              )}
            </div>

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
                      if (existingSurveyId) return
                      const selected = Array.from(e.target.selectedOptions, option => option.value)
                      setSelectedAssessmentIds(selected)
                    }}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium ${existingSurveyId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    size={Math.min(assessments.length, 10)}
                    disabled={!!existingSurveyId}
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
                  onChange={(e) => { if (!existingSurveyId) setExpirationDate(e.target.value) }}
                  required
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium ${existingSurveyId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  readOnly={!!existingSurveyId}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                    placeholder="New assessments have been assigned to you"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Body
                  </label>
                  <RichTextEditor
                    content={emailBody}
                    onChange={setEmailBody}
                    placeholder="Hello {name}, you have been assigned {assessments}. Please complete by {expiration-date}."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available shortcodes: {'{name}'}, {'{username}'}, {'{email}'}, {'{assessments}'}, {'{expiration-date}'}, {'{password}'}, {'{dashboard-link}'}, {'{year}'}
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
                  <CardDescription>Select users or groups to assign these assessments to</CardDescription>
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
                  <p className="text-sm mt-2">Click &quot;Add Users&quot; or &quot;Add Groups&quot; to select recipients.</p>
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
                            <div className="text-2xl">{au.source === 'group' ? '👥' : '👤'}</div>
                            <div>
                              <h4 className="font-medium text-gray-900">{au.user.name}</h4>
                              <p className="text-sm text-gray-500">
                                {au.user.username} ({au.user.email})
                                {au.source === 'group' && au.group_id && (
                                  <span className="ml-2 text-xs text-blue-600">
                                    (from group)
                                  </span>
                                )}
                              </p>
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
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
            <Link href="/dashboard/assignments">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isLoading || assignmentUsers.length === 0}>
              {isLoading ? 'Creating...' : 'Create Assignments'}
            </Button>
          </div>
        )}
      </form>

      {/* Confirm before submit */}
      <Dialog open={showAssignConfirmDialog} onOpenChange={setShowAssignConfirmDialog}>
        <DialogContent
          title={existingSurveyId ? 'Add to existing survey' : 'Confirm assignment'}
          description={existingSurveyId
            ? 'This will add the selected users to the existing survey. Emails will be sent if enabled.'
            : 'This will create assignments and send emails to the selected users if email is enabled. Double-check your survey group and settings before continuing.'}
          onClose={() => setShowAssignConfirmDialog(false)}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              {existingSurveyId
                ? `You are adding ${assignmentUsers.length} user${assignmentUsers.length !== 1 ? 's' : ''} to this survey.`
                : `You are about to assign ${selectedAssessmentIds.length} assessment${selectedAssessmentIds.length !== 1 ? 's' : ''} to ${assignmentUsers.length} user${assignmentUsers.length !== 1 ? 's' : ''}.`}
              {sendEmail && ' Emails will be sent to each user.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void performSubmit()}
              >
                {existingSurveyId ? 'Add to survey' : 'Create assignments'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
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
              <select
                multiple
                value={selectedGroupIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setSelectedGroupIds(selected)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                size={Math.min(availableGroups.length, 10)}
              >
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.group_members?.length || 0} members)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple groups. All members of selected groups will be added.
              </p>
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
                Add Selected Groups
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

