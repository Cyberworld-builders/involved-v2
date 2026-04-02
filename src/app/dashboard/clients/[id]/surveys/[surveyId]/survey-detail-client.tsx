'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import Link from 'next/link'
import { Calendar, ChevronDown, ChevronRight, Download, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { PdfActionButtons } from '@/components/reports/pdf-action-buttons'
import SurveySnapshots from '@/components/surveys/survey-snapshots'
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
  expires?: string | null
  user_name?: string | null
  user_email?: string | null
  target_name?: string | null
  target_email?: string | null
}

interface SurveyDetailClientProps {
  clientId: string
  surveyId: string
  surveyMeta?: {
    id: string
    name: string | null
    created_at: string
  }
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
  surveyId,
  surveyMeta,
  assessment,
  assignments: initialAssignments,
  initialSubjects = [],
  initialScores = {},
}: SurveyDetailClientProps) {
  const router = useRouter()

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
  const [message, setMessage] = useState('')
  const _supabase = createClient()

  // No longer need to fetch data client-side since it's passed from server
  // Keep this useEffect empty for now, or remove if not needed

  const [expandedAssignmentIds, setExpandedAssignmentIds] = useState<Set<string>>(new Set())
  const [selectedReportAssignmentIds, setSelectedReportAssignmentIds] = useState<Set<string>>(new Set())
  const [isBulkPdfLoading, setIsBulkPdfLoading] = useState(false)
  const [isBulkZipLoading, setIsBulkZipLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Batch edit state
  const [assignments, setAssignments] = useState(initialAssignments)
  const [showBatchEdit, setShowBatchEdit] = useState(false)
  const [batchExpirationDate, setBatchExpirationDate] = useState(() => {
    // Default to the most common expiration date in the survey
    const firstExpires = initialAssignments.find(a => a.expires)?.expires
    return firstExpires
      ? new Date(firstExpires).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  })
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<string>>(new Set())
  const [deleteSelectedDialogOpen, setDeleteSelectedDialogOpen] = useState(false)
  const [isDeletingSelected, setIsDeletingSelected] = useState(false)

  // Reminder state
  const [showReminderSettings, setShowReminderSettings] = useState(false)
  const [reminderFrequency, setReminderFrequency] = useState('+3 days')
  const [firstReminderDate, setFirstReminderDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [isUpdatingReminders, setIsUpdatingReminders] = useState(false)

  const incompleteCount = assignments.filter(a => !a.completed).length

  const handleEnableReminders = async () => {
    setIsUpdatingReminders(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder: true,
          reminder_frequency: reminderFrequency,
          first_reminder_date: `${firstReminderDate}T09:00:00`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Failed to enable reminders')
      } else {
        setMessage(`Reminders enabled for ${incompleteCount} incomplete assignment(s)`)
        setShowReminderSettings(false)
      }
    } catch {
      setMessage('Failed to enable reminders')
    } finally {
      setIsUpdatingReminders(false)
    }
  }

  const handleDisableReminders = async () => {
    setIsUpdatingReminders(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder: false }),
      })
      if (res.ok) {
        setMessage('Reminders disabled')
        setShowReminderSettings(false)
      }
    } catch {
      setMessage('Failed to disable reminders')
    } finally {
      setIsUpdatingReminders(false)
    }
  }

  const handleDeleteSurvey = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/surveys/${surveyId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data?.error || `Delete failed (${res.status})`)
        return
      }
      router.push(`/dashboard/clients/${clientId}?tab=reports`)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete survey')
    } finally {
      setIsDeleting(false)
    }
  }

  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setDeleteDialogOpen(false)
      setDeleteError(null)
    }
  }

  const handleBatchExtendDeadline = async () => {
    setIsBatchUpdating(true)
    setMessage('')
    try {
      const res = await fetch(`/api/clients/${clientId}/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expires: new Date(batchExpirationDate + 'T23:59:59').toISOString(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || `Failed to update deadline (${res.status})`)
        return
      }
      setMessage(`Successfully updated deadline for ${data.updated_assignments ?? 'all'} assignment(s).`)
      // Update local state
      setAssignments(prev =>
        prev.map(a => ({ ...a, expires: new Date(batchExpirationDate + 'T23:59:59').toISOString() }))
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update deadline')
    } finally {
      setIsBatchUpdating(false)
    }
  }

  const handleDeleteSelectedAssignments = async () => {
    if (selectedAssignmentIds.size === 0) return
    setIsDeletingSelected(true)
    setMessage('')
    try {
      const res = await fetch(`/api/clients/${clientId}/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delete_assignment_ids: Array.from(selectedAssignmentIds),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || `Failed to delete assignments (${res.status})`)
        return
      }
      setMessage(`Successfully deleted ${data.deleted_assignments ?? selectedAssignmentIds.size} assignment(s).`)
      // Update local state
      setAssignments(prev => prev.filter(a => !selectedAssignmentIds.has(a.id)))
      setSelectedAssignmentIds(new Set())
      setDeleteSelectedDialogOpen(false)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete assignments')
    } finally {
      setIsDeletingSelected(false)
    }
  }

  const toggleAssignmentSelection = (id: string) => {
    setSelectedAssignmentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllAssignments = (checked: boolean) => {
    if (checked) {
      setSelectedAssignmentIds(new Set(assignments.map(a => a.id)))
    } else {
      setSelectedAssignmentIds(new Set())
    }
  }

  const allAssignmentsSelected = assignments.length > 0 && selectedAssignmentIds.size === assignments.length
  const someAssignmentsSelected = selectedAssignmentIds.size > 0 && selectedAssignmentIds.size < assignments.length

  const toggleExpanded = (id: string) => {
    setExpandedAssignmentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const completedCount = assignments.filter(a => a.completed).length
  const totalCount = assignments.length
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const surveyDate = surveyMeta?.created_at
    ? new Date(surveyMeta.created_at)
    : assignments.length > 0
      ? new Date(assignments[0].created_at)
      : new Date()
  const surveyDisplayName = surveyMeta?.name || `${assessment.title} Survey`
  const currentDeadline = assignments.find(a => a.expires)?.expires
    ? new Date(assignments.find(a => a.expires)!.expires!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  // For all assessments: Find an assignment that rated this target/subject to view report
  // The report generation will aggregate all assignments for this target
  const getAssignmentIdForSubject = (subject: Subject): string | null => {
    // Find a completed assignment that rated this target (prefer completed)
    const completedAssignment = assignments.find(a =>
      a.target_id === subject.id &&
      subject.assignment_ids.includes(a.id) &&
      a.completed
    )
    if (completedAssignment) {
      return completedAssignment.id
    }
    // Fallback to any assignment for this target
    const anyAssignment = assignments.find(a =>
      a.target_id === subject.id && subject.assignment_ids.includes(a.id)
    )
    return anyAssignment?.id || null
  }

  const selectableReportAssignmentIds = new Set(
    subjects.map((s) => getAssignmentIdForSubject(s)).filter((id): id is string => id != null)
  )
  const selectAllReportsChecked = selectableReportAssignmentIds.size > 0 &&
    selectedReportAssignmentIds.size === selectableReportAssignmentIds.size
  const selectAllReportsIndeterminate =
    selectedReportAssignmentIds.size > 0 && selectedReportAssignmentIds.size < selectableReportAssignmentIds.size

  const handleSelectAllReports = (checked: boolean) => {
    if (checked) {
      setSelectedReportAssignmentIds(new Set(selectableReportAssignmentIds))
    } else {
      setSelectedReportAssignmentIds(new Set())
    }
  }

  const handleSelectReport = (assignmentId: string, checked: boolean) => {
    setSelectedReportAssignmentIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(assignmentId)
      else next.delete(assignmentId)
      return next
    })
  }

  const handleBulkGeneratePdfs = async () => {
    if (selectedReportAssignmentIds.size === 0) return
    setIsBulkPdfLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/reports/pdf/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_ids: Array.from(selectedReportAssignmentIds) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || `Request failed (${res.status})`)
        return
      }
      const { queued = 0, skipped = 0 } = data
      setMessage(
        `Successfully queued ${queued} PDF(s) for generation.${skipped > 0 ? ` ${skipped} already queued or ready.` : ''} They will be generated in the background.`
      )
      setSelectedReportAssignmentIds(new Set())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to queue PDFs')
    } finally {
      setIsBulkPdfLoading(false)
    }
  }

  const handleBulkDownloadZip = async () => {
    if (selectedReportAssignmentIds.size === 0) return
    setIsBulkZipLoading(true)
    setMessage('')
    try {
      const controller = new AbortController()
      const fetchTimeout = setTimeout(() => controller.abort(), 120_000)

      const res = await fetch('/api/reports/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_ids: Array.from(selectedReportAssignmentIds),
          format: 'pdf',
        }),
        signal: controller.signal,
      })
      clearTimeout(fetchTimeout)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data?.error || `Download failed (${res.status})`)
        return
      }

      const blob = await res.blob()
      const contentType = res.headers.get('Content-Type') || ''
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Use the filename from the server header when available (e.g. single PDF)
      if (filenameMatch) {
        a.download = filenameMatch[1]
      } else if (contentType.includes('application/pdf')) {
        a.download = 'report.pdf'
      } else {
        a.download = 'reports_export.zip'
      }
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      const skippedCount = Number(res.headers.get('X-Skipped-Reports') || 0)
      const successMsg = `Successfully downloaded ${selectedReportAssignmentIds.size - skippedCount} report(s) as ZIP.`
      setMessage(skippedCount > 0
        ? `${successMsg} ${skippedCount} report(s) were skipped due to errors — try downloading those individually.`
        : successMsg
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessage('The download took too long. Try selecting fewer reports or downloading them individually.')
      } else {
        setMessage(err instanceof Error ? err.message : 'Failed to download ZIP')
      }
    } finally {
      setIsBulkZipLoading(false)
    }
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
          <h2 className="text-xl font-bold text-gray-900">{surveyDisplayName}</h2>
          {surveyMeta?.name && (
            <p className="text-sm text-gray-500">{assessment.title}</p>
          )}
          <p className="text-gray-600">
            Survey launched on {surveyDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBatchEdit(!showBatchEdit)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {showBatchEdit ? 'Close Edit' : 'Edit Survey'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label="Delete survey"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete survey
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open(`/api/clients/${clientId}/surveys/${surveyId}/export-csv`, '_blank')
            }}
            aria-label="Export raw data CSV"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Raw Data
          </Button>
          {incompleteCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReminderSettings(!showReminderSettings)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Reminders ({incompleteCount} pending)
            </Button>
          )}
        </div>

        {showReminderSettings && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Reminder</label>
                  <input
                    type="date"
                    value={firstReminderDate}
                    onChange={e => setFirstReminderDate(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    value={reminderFrequency}
                    onChange={e => setReminderFrequency(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="+1 day">Every day</option>
                    <option value="+2 days">Every 2 days</option>
                    <option value="+3 days">Every 3 days</option>
                    <option value="+1 week">Every week</option>
                    <option value="+2 weeks">Every 2 weeks</option>
                  </select>
                </div>
                <Button size="sm" onClick={handleEnableReminders} disabled={isUpdatingReminders}>
                  {isUpdatingReminders ? 'Updating...' : `Enable for ${incompleteCount} incomplete`}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDisableReminders} disabled={isUpdatingReminders}>
                  Disable All
                </Button>
              </div>
              <p className="text-xs text-amber-700 mt-2">
                Reminders are sent daily at 9 AM UTC to users who haven&apos;t completed their assessment.
              </p>
            </CardContent>
          </Card>
        )}
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

      {/* Batch Edit Panel */}
      {showBatchEdit && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-indigo-600" />
              Batch Edit Survey
            </CardTitle>
            <CardDescription>
              Update all {totalCount} assignment(s) in this survey at once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Extend Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Extend Deadline
              </label>
              {currentDeadline && (
                <p className="text-sm text-gray-500 mb-2">
                  Current deadline: <strong>{currentDeadline}</strong>
                </p>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={batchExpirationDate}
                  onChange={(e) => setBatchExpirationDate(e.target.value)}
                  className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
                <Button
                  onClick={handleBatchExtendDeadline}
                  disabled={isBatchUpdating}
                  size="sm"
                >
                  {isBatchUpdating ? 'Updating…' : `Update all ${totalCount} assignments`}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This will set the expiration date for all assignments in this survey.
              </p>
            </div>

            {/* Delete Selected Assignments */}
            <div className="border-t border-indigo-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Trash2 className="h-4 w-4 inline mr-1" />
                Delete Selected Assignments
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Use the checkboxes in the &quot;Data Collection Status&quot; section below to select assignments, then delete them here.
              </p>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedAssignmentIds.size === 0 || isDeletingSelected}
                onClick={() => setDeleteSelectedDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {selectedAssignmentIds.size === 0
                  ? 'Select assignments below'
                  : `Delete ${selectedAssignmentIds.size} selected assignment(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
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

      {/* Survey Snapshots */}
      <SurveySnapshots clientId={clientId} surveyId={surveyId} assessmentId={assessment.id} />

      {/* Subjects/Targets Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>
                {assessment.is_360 ? 'Targets Being Rated' : 'Leaders/Blockers Being Rated'}
              </CardTitle>
              <CardDescription>
                {assessment.is_360 
                  ? 'People being rated in this 360 assessment'
                  : 'People being rated in this assessment. Each person may have multiple data points from different raters.'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBulkGeneratePdfs}
                disabled={selectedReportAssignmentIds.size === 0 || isBulkPdfLoading}
                variant="outline"
                size="sm"
              >
                {isBulkPdfLoading ? 'Queuing…' : 'Generate PDFs for selected'}
              </Button>
              <Button
                onClick={handleBulkDownloadZip}
                disabled={selectedReportAssignmentIds.size === 0 || isBulkZipLoading}
                variant="outline"
                size="sm"
              >
                {isBulkZipLoading ? 'Downloading…' : 'Download ZIP'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No {assessment.is_360 ? 'targets' : 'people being rated'} found for this survey.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectAllReportsChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = selectAllReportsIndeterminate
                          }}
                          onChange={(e) => handleSelectAllReports(e.target.checked)}
                          className="rounded border-gray-300"
                          aria-label="Select all reports"
                        />
                        <span className="sr-only">Select</span>
                      </label>
                    </th>
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
                    const canSelect = assignmentId != null
                    const isSelected = assignmentId != null && selectedReportAssignmentIds.has(assignmentId)

                    return (
                      <tr key={subject.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap w-10">
                          {canSelect ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleSelectReport(assignmentId!, e.target.checked)}
                                className="rounded border-gray-300"
                                aria-label={`Select report for ${subject.name}`}
                              />
                            </label>
                          ) : (
                            <span className="sr-only">No report to select</span>
                          )}
                        </td>
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Data Collection Status</CardTitle>
              <CardDescription>
                Status of all assignments in this survey. Expand a row to see details and open the assignment.
              </CardDescription>
            </div>
            {showBatchEdit && assignments.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={allAssignmentsSelected}
                  ref={(el) => { if (el) el.indeterminate = someAssignmentsSelected }}
                  onChange={(e) => handleSelectAllAssignments(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Select all
              </label>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {assignments.map((assignment) => {
              const isExpanded = expandedAssignmentIds.has(assignment.id)
              const isSelected = selectedAssignmentIds.has(assignment.id)
              const raterLabel = assignment.user_name || assignment.user_email || assignment.user_id?.slice(0, 8) || '—'
              const targetLabel = assessment.is_360
                ? (assignment.target_name || assignment.target_email || (assignment.target_id ? assignment.target_id.slice(0, 8) : null) || '—')
                : null
              return (
                <div
                  key={assignment.id}
                  className={`rounded-md border overflow-hidden ${
                    isSelected ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    {showBatchEdit && (
                      <div className="flex-shrink-0 pl-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAssignmentSelection(assignment.id)}
                          className="rounded border-gray-300"
                          aria-label={`Select assignment ${assignment.id.slice(0, 8)}`}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(assignment.id)}
                      className="flex-1 flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors"
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
                          {assignment.expires && (
                            <> • Due {new Date(assignment.expires).toLocaleDateString()}</>
                          )}
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
                  </div>
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
                          <dt className="text-gray-500 font-medium">Deadline</dt>
                          <dd className="text-gray-900">
                            {assignment.expires
                              ? new Date(assignment.expires).toLocaleString()
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

      {/* Delete selected assignments confirmation */}
      <Dialog open={deleteSelectedDialogOpen} onOpenChange={(open) => !open && !isDeletingSelected && setDeleteSelectedDialogOpen(false)}>
        <DialogContent
          title="Delete selected assignments?"
          description="This action cannot be undone."
          onClose={() => !isDeletingSelected && setDeleteSelectedDialogOpen(false)}
        >
          <p className="text-sm text-gray-700 mb-4">
            This will permanently delete <strong>{selectedAssignmentIds.size}</strong> assignment(s) and all their associated data:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
            <li>All answers and responses</li>
            <li>Any generated report data and PDFs</li>
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteSelectedDialogOpen(false)} disabled={isDeletingSelected}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelectedAssignments}
              disabled={isDeletingSelected}
            >
              {isDeletingSelected ? 'Deleting…' : `Delete ${selectedAssignmentIds.size} assignment(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete survey confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent
          title="Delete survey?"
          description="This action cannot be undone."
          onClose={closeDeleteDialog}
        >
          <p className="text-sm text-gray-700 mb-4">
            This will permanently delete this survey and:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
            <li>All <strong>{totalCount}</strong> assignment(s) in it</li>
            <li>All answers and report data (and cached scores) for those assignments</li>
            <li>Any generated report PDFs for those assignments</li>
          </ul>
          <p className="text-sm font-medium text-gray-900 mb-1">Survey:</p>
          <p className="text-sm text-gray-600 mb-4">
            {surveyDisplayName} — {surveyDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {deleteError && (
            <p className="text-sm text-red-600 mb-4">{deleteError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDeleteDialog} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSurvey}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete survey'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
