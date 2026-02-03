'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import RichTextEditor from '@/components/rich-text-editor'

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
  target_id?: string | null
  target?: User
  members?: Array<{
    profile_id: string
    profile?: User
    position?: string | null
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

interface SurveyOption {
  survey_id: string
  assessment_ids: string[]
  expires: string
  user_ids: string[]
  label: string
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
  const [emailBody, setEmailBody] = useState('Hello {name}, you have been assigned the following assessments:\n\n{assessments}\n\nPlease complete them by {expiration-date}.')
  const [enableReminder, setEnableReminder] = useState(false)
  const [firstReminderDate, setFirstReminderDate] = useState('')
  const [firstReminderTime, setFirstReminderTime] = useState('09:00')
  const [reminderFrequency, setReminderFrequency] = useState('+3 days')
  const [reminderBody, setReminderBody] = useState('Hello {name}, this is a reminder that you have incomplete assignments:\n\n{assessments}\n\nPlease complete them by {expiration-date}.')
  const [assignmentUsers, setAssignmentUsers] = useState<AssignmentUser[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Available data for selection
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [availableGroups, setAvailableGroups] = useState<Group[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [showAssignConfirmDialog, setShowAssignConfirmDialog] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [existingSurveyId, setExistingSurveyId] = useState<string | null>(null)
  const [surveysList, setSurveysList] = useState<SurveyOption[]>([])
  const [selectedSurveyMeta, setSelectedSurveyMeta] = useState<{ assessment_ids: string[]; expires: string; user_ids: string[] } | null>(null)

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

        // Load groups with members and target
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select(`
            *,
            target:profiles!groups_target_id_fkey(id, name, email, username),
            group_members(
              profile_id,
              position,
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
            target_id: string | null
            target?: User | null
            group_members?: Array<{
              profile_id: string
              position?: string | null
              profiles?: User | null
            }>
          }) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            target_id: group.target_id,
            target: group.target || undefined,
            members: group.group_members?.map((gm) => ({
              profile_id: gm.profile_id,
              profile: gm.profiles || undefined,
              position: gm.position || null,
            })) || [],
          }))
          setAvailableGroups(transformedGroups)
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

        // Set default expiration to 30 days from now
        const defaultExpiration = new Date()
        defaultExpiration.setDate(defaultExpiration.getDate() + 30)
        setExpirationDate(defaultExpiration.toISOString().split('T')[0])
        
        // Set default first reminder date (3 days from now)
        const defaultFirstReminder = new Date()
        defaultFirstReminder.setDate(defaultFirstReminder.getDate() + 3)
        setFirstReminderDate(defaultFirstReminder.toISOString().split('T')[0])

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

        // Automatically set target from group's designated target if available
        const targetId = group.target_id || null
        const target = group.target || null

        // Get position from group member (for custom fields)
        const position = member.position || ''

        newUsers.push({
          user_id: member.profile.id,
          user: member.profile,
          target_id: targetId,
          target: target,
          role: position, // Use position for role field (backward compatibility with custom fields)
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


  // Returns true if target is REQUIRED (360s and assessments with target='1' or '2')
  const getRequiresTarget = (assessment: Assessment): boolean => {
    return assessment.target === '1' || assessment.target === '2' || assessment.is_360 === true
  }

  // Returns true if target selection should be shown (any assessment with target field set or is_360)
  const getShowsTarget = (assessment: Assessment): boolean => {
    return assessment.target !== null && assessment.target !== '' || assessment.is_360 === true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSubmitting || isLoading) return
    setShowAssignConfirmDialog(true)
  }

  const performSubmit = async () => {
    setShowAssignConfirmDialog(false)
    if (isSubmitting || isLoading) return
    setIsSubmitting(true)
    setIsLoading(true)
    setMessage('')

    try {
      console.log('Form submitted!', {
        selectedAssessmentIds,
        assignmentUsers: assignmentUsers.length,
        expirationDate,
      })
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

      // When adding to existing survey, block if any selected user is already in that survey
      if (existingSurveyId && selectedSurveyMeta) {
        const existingUserIds = new Set(selectedSurveyMeta.user_ids)
        const duplicates = assignmentUsers.filter((au) => existingUserIds.has(au.user_id))
        if (duplicates.length > 0) {
          const names = duplicates.map((au) => au.user.name || au.user.email).join(', ')
          setMessage(`The following people already have assignments in this survey: ${names}. Please remove them from the list or choose "No — create a new survey" to assign them to a new survey.`)
          setIsLoading(false)
          setIsSubmitting(false)
          return
        }
      }

      // Validate assessments are active
      const selectedAssessments = assessments.filter(a => selectedAssessmentIds.includes(a.id))
      const inactiveAssessments = selectedAssessments.filter(a => a.status !== 'active')
      if (inactiveAssessments.length > 0) {
        const errorMsg = `Cannot assign inactive assessments: ${inactiveAssessments.map(a => a.title).join(', ')}. Please ensure all selected assessments are set to "Active" status.`
        console.error('Validation error:', errorMsg)
        throw new Error(errorMsg)
      }

      // Check if any selected assessments require targets (360s and target='1' or '2')
      const requiresTarget = selectedAssessments.some(a => getRequiresTarget(a))

      if (requiresTarget) {
        // Validate that all users have targets set (required for 360s and target='1'/'2')
        for (const au of assignmentUsers) {
          if (!au.target_id) {
            const errorMsg = `Target must be set for ${au.user.name} when assigning 360/development assessments`
            console.error('Validation error:', errorMsg)
            throw new Error(errorMsg)
          }
        }
      }
      // Note: For non-360 assessments with optional targets (like leadership), target_id can be null

      console.log(`Creating assignments for ${assignmentUsers.length} users and ${selectedAssessmentIds.length} assessments...`)

      const expiresDate = new Date(expirationDate)
      expiresDate.setHours(23, 59, 59, 999) // Set to end of day

      // Use existing survey_id when adding to a survey, otherwise generate a new one
      const surveyId = existingSurveyId || crypto.randomUUID()

      // Create assignments using API - one API call per user-assessment combination
      // This allows per-user custom_fields and target_id
      // All assignments in this batch will share the same survey_id
      const createdAssignments: CreatedAssignment[] = []
      const errors: string[] = []
      const userPasswords = new Map<string, string>() // userId -> temporary password

      for (const au of assignmentUsers) {
        for (const assessmentId of selectedAssessmentIds) {
          const assessment = assessments.find(a => a.id === assessmentId)
          if (!assessment) continue

          // Prepare custom_fields for assessments with targets (360s and others with targets)
          let customFields = null
          if (au.target && (getRequiresTarget(assessment) || au.target_id)) {
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
                survey_id: surveyId, // All assignments in this batch share the same survey_id
                reminder: enableReminder,
                first_reminder_date: enableReminder && firstReminderDate ? `${firstReminderDate}T${firstReminderTime}:00` : null,
                reminder_frequency: enableReminder ? reminderFrequency : null,
              }),
            })

            const data = await response.json()
            console.log('API response:', { status: response.status, ok: response.ok, data })

            if (response.status === 409) {
              throw new Error(data.error || 'Some users already have assignments in this survey.')
            }
            if (!response.ok) {
              const errorMsg = `Failed to create assignment for ${au.user.name} - ${assessment.title}: ${data.error || `HTTP ${response.status} - ${response.statusText}`}`
              console.error('API error:', errorMsg, data)
              errors.push(errorMsg)
              continue
            }

            if (data.assignments && data.assignments.length > 0) {
              console.log(`Successfully created assignment:`, data.assignments[0])
              createdAssignments.push(...data.assignments)
              
              // Collect passwords from response
              // Only update if we don't already have a password for this user
              // This prevents overwriting passwords when a user gets multiple assignments
              if (data.userPasswords && typeof data.userPasswords === 'object') {
                for (const [userId, password] of Object.entries(data.userPasswords)) {
                  if (typeof password === 'string' && !userPasswords.has(userId)) {
                    userPasswords.set(userId, password)
                  }
                }
              }
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
                body: emailBody || 'Hello {name}, you have been assigned {assessments}. Please complete by {expiration-date}.',
                assignments: userAssignments,
                expirationDate: expirationDate,
                password: password,
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
      setIsSubmitting(false)
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
  const showsTarget = selectedAssessments.some(a => getShowsTarget(a))
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

        {/* Fixed message (toaster) */}
        {message && (
          <div
            className={`fixed top-4 right-4 z-50 max-w-md shadow-lg rounded-md p-4 flex items-start gap-3 ${
              message.includes('Successfully') || message.includes('Created')
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
                        if (existingSurveyId) return
                        const selected = Array.from(e.target.selectedOptions, option => option.value)
                        setSelectedAssessmentIds(selected)
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium ${existingSurveyId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      size={Math.min(assessments.length, 10)}
                      required
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
                    onChange={(e) => { if (!existingSurveyId) setExpirationDate(e.target.value) }}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium ${existingSurveyId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    readOnly={!!existingSurveyId}
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
                      Available shortcodes: <code>{'{name}'}</code>, <code>{'{username}'}</code>, <code>{'{email}'}</code>, <code>{'{assessments}'}</code>, <code>{'{expiration-date}'}</code>, <code>{'{password}'}</code>
                    </p>
                  </div>
                </div>
              )}

              {/* Reminder Settings */}
              {selectedAssessmentIds.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enable Email Reminders
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                      Send automated reminder emails to users who have not completed their assignments.
                    </p>
                    <select
                      value={enableReminder ? '1' : '0'}
                      onChange={(e) => setEnableReminder(e.target.value === '1')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>

                  {/* Reminder Settings */}
                  {enableReminder && (
                    <>
                      {/* First Reminder Date & Time */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Reminder Date & Time
                        </label>
                        <p className="text-sm text-gray-500 mb-3">
                          The date and time when the first reminder should be sent.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <input
                              type="date"
                              value={firstReminderDate}
                              onChange={(e) => setFirstReminderDate(e.target.value)}
                              required
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                            />
                          </div>
                          <div>
                            <input
                              type="time"
                              value={firstReminderTime}
                              onChange={(e) => setFirstReminderTime(e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Reminder Frequency */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reminder Frequency
                        </label>
                        <p className="text-sm text-gray-500 mb-3">
                          How often reminders should be sent after the first one.
                        </p>
                        <select
                          value={reminderFrequency}
                          onChange={(e) => setReminderFrequency(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                        >
                          <optgroup label="Daily">
                            <option value="+1 day">Every Day</option>
                            <option value="+2 days">Every 2 Days</option>
                            <option value="+3 days">Every 3 Days</option>
                            <option value="+4 days">Every 4 Days</option>
                            <option value="+5 days">Every 5 Days</option>
                            <option value="+6 days">Every 6 Days</option>
                          </optgroup>
                          <optgroup label="Weekly">
                            <option value="+1 week">Every Week</option>
                            <option value="+2 weeks">Every 2 Weeks</option>
                            <option value="+3 weeks">Every 3 Weeks</option>
                          </optgroup>
                          <optgroup label="Monthly">
                            <option value="+1 month">Every Month</option>
                            <option value="+2 months">Every 2 Months</option>
                            <option value="+3 months">Every 3 Months</option>
                          </optgroup>
                        </select>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reminder Email Body
                        </label>
                        <RichTextEditor
                          content={reminderBody}
                          onChange={setReminderBody}
                          placeholder="Hello {name}, this is a reminder that you have incomplete assignments:\n\n{assessments}\n\nPlease complete them by {expiration-date}."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Available shortcodes: <code>{'{name}'}</code>, <code>{'{username}'}</code>, <code>{'{email}'}</code>, <code>{'{assessments}'}</code>, <code>{'{expiration-date}'}</code>, <code>{'{password}'}</code>
                        </p>
                      </div>
                    </>
                  )}
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

                          {showsTarget && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Target User {requiresTarget && <span className="text-red-500">*</span>}
                                </label>
                                <select
                                  value={au.target_id || ''}
                                  onChange={(e) => handleSetTarget(index, e.target.value)}
                                  required={requiresTarget}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                                >
                                  <option value="">Select target...</option>
                                  {availableUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                      {user.name} ({user.email}){user.id === au.user_id ? ' - Self Assessment' : ''}
                                    </option>
                                  ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                  {requiresTarget 
                                    ? 'The person being assessed in this 360/development assessment. Select the same user for a self-assessment.'
                                    : 'Optional: The person being assessed. Used for [name] shortcode replacement in questions.'}
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
                  // Form submission will be handled by the onSubmit handler
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
                  : `You are about to create ${totalAssignmentsToCreate} assignment${totalAssignmentsToCreate !== 1 ? 's' : ''} for ${assignmentUsers.length} user${assignmentUsers.length !== 1 ? 's' : ''}.`}
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
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Groups
                  </label>
                  {availableGroups.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedGroupIds.length === availableGroups.length) {
                            setSelectedGroupIds([])
                          } else {
                            setSelectedGroupIds(availableGroups.map(g => g.id))
                          }
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {selectedGroupIds.length === availableGroups.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  )}
                </div>
                {availableGroups.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-600">No groups available for this client.</p>
                    <p className="text-xs text-gray-500 mt-1">Create groups first in the Groups tab.</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {availableGroups.map((group) => (
                        <label
                          key={group.id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.includes(group.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGroupIds([...selectedGroupIds, group.id])
                              } else {
                                setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id))
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900 font-medium flex-1">
                            {group.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({group.members?.length || 0} {group.members?.length === 1 ? 'member' : 'members'})
                          </span>
                        </label>
                      ))}
                    </div>
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
              <div className="flex justify-between items-center">
                {availableGroups.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Add all groups
                      const allGroupIds = availableGroups.map(g => g.id)
                      setSelectedGroupIds(allGroupIds)
                      // Automatically trigger handleAddGroups with all groups
                      setTimeout(() => {
                        const allGroups = availableGroups
                        const newUsers: AssignmentUser[] = []

                        for (const group of allGroups) {
                          if (!group.members || group.members.length === 0) continue

                          for (const member of group.members) {
                            if (!member.profile) continue
                            
                            // Skip if user is already in assignmentUsers
                            if (assignmentUsers.some(au => au.user_id === member.profile!.id)) continue

                            // Automatically set target from group's designated target if available
                            const targetId = group.target_id || null
                            const target = group.target || null

                            // Get position from group member (for custom fields)
                            const position = member.position || ''

                            newUsers.push({
                              user_id: member.profile.id,
                              user: member.profile,
                              target_id: targetId,
                              target: target,
                              role: position, // Use position for role field (backward compatibility with custom fields)
                              source: 'group',
                              groupId: group.id,
                              groupName: group.name,
                            })
                          }
                        }

                        setAssignmentUsers(prev => [...prev, ...newUsers])
                        setSelectedGroupIds([])
                        setShowAddGroupModal(false)
                      }, 0)
                    }}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Add All Groups ({availableGroups.length})
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
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
                    Add Selected ({selectedGroupIds.length})
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
