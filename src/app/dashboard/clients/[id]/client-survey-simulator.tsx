'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface ClientSurveySimulatorProps {
  clientId: string
}

interface Group {
  id: string
  name: string
  target_id: string | null
  members?: Array<{
    id: string
    profile_id: string
    position: string | null
    leader: boolean
  }>
}

interface Assessment {
  id: string
  title: string
  is_360: boolean
}

export default function ClientSurveySimulator({ clientId }: ClientSurveySimulatorProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [createdAssignments, setCreatedAssignments] = useState<string[]>([])
  const [logLines, setLogLines] = useState<string[]>([])
  const logContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Auto-scroll console to bottom when new lines arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logLines])

  useEffect(() => {
    loadGroups()
    loadAssessments()
  }, [clientId])

  const loadGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members(
          id,
          profile_id,
          position,
          leader
        )
      `)
      .eq('client_id', clientId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading groups:', error)
      setMessage({ type: 'error', text: 'Failed to load groups' })
      return
    }

    // Transform the data to properly handle nested group_members
    // Use the same pattern as client-groups.tsx which works correctly
    const transformed = (data || []).map((group: unknown) => {
      const g = group as {
        id: string
        name: string
        target_id: string | null
        group_members?: Array<{
          id: string
          profile_id: string
          position: string | null
          leader: boolean
        }> | null
      }
      
      // Handle the nested group_members relation
      // Supabase returns it as an array when using select with nested relations
      const members = (g.group_members && Array.isArray(g.group_members)) 
        ? g.group_members.map((gm) => ({
            id: gm.id,
            profile_id: gm.profile_id,
            position: gm.position || null,
            leader: gm.leader || false,
          }))
        : []
      
      return {
        id: g.id,
        name: g.name,
        target_id: g.target_id,
        members: members,
      }
    })

    setGroups(transformed as Group[])
  }

  const loadAssessments = async () => {
    const { data, error } = await supabase
      .from('assessments')
      .select('id, title, is_360')
      .order('title', { ascending: true })

    if (error) {
      console.error('Error loading assessments:', error)
      setMessage({ type: 'error', text: 'Failed to load assessments' })
      return
    }

    setAssessments((data || []) as Assessment[])
  }

  const handleSimulate = async () => {
    if (!selectedGroupId || !selectedAssessmentId) {
      setMessage({ type: 'error', text: 'Please select both a group and an assessment' })
      return
    }

    const selectedGroup = groups.find(g => g.id === selectedGroupId)
    if (!selectedGroup || !selectedGroup.members || selectedGroup.members.length === 0) {
      setMessage({ type: 'error', text: 'Selected group has no members' })
      return
    }

    setIsLoading(true)
    setMessage(null)
    setLogLines([])

    try {
      const response = await fetch('/api/surveys/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_id: selectedGroupId,
          assessment_id: selectedAssessmentId,
        }),
      })

      // Non-2xx with JSON body (e.g. 400 validation)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to simulate survey')
      }

      // Stream progress lines
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (reader) {
        let streamFinished = false
        while (!streamFinished) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            // Final result line is JSON with done
            if (trimmed.startsWith('{')) {
              try {
                const obj = JSON.parse(trimmed) as { done?: boolean; error?: string; assignment_ids?: string[]; reports_generated?: number }
                if (obj.done) {
                  if (obj.error) {
                    setMessage({ type: 'error', text: obj.error })
                  } else {
                    setCreatedAssignments(obj.assignment_ids ?? [])
                    setMessage({
                      type: 'success',
                      text: `Successfully simulated survey! Created ${obj.assignment_ids?.length ?? 0} assignments and generated ${obj.reports_generated ?? 0} reports.`,
                    })
                  }
                  streamFinished = true
                  break
                }
              } catch {
                // Not JSON or parse failed, treat as normal log line
              }
            }
            setLogLines((prev) => [...prev, trimmed])
          }
          if (streamFinished) break
        }
        // Flush remaining buffer (final JSON or last line)
        if (!streamFinished && buffer.trim()) {
          const trimmed = buffer.trim()
          if (trimmed.startsWith('{')) {
            try {
              const obj = JSON.parse(trimmed) as { done?: boolean; error?: string; assignment_ids?: string[]; reports_generated?: number }
              if (obj.done) {
                if (obj.error) setMessage({ type: 'error', text: obj.error })
                else {
                  setCreatedAssignments(obj.assignment_ids ?? [])
                  setMessage({
                    type: 'success',
                    text: `Successfully simulated survey! Created ${obj.assignment_ids?.length ?? 0} assignments and generated ${obj.reports_generated ?? 0} reports.`,
                  })
                }
              }
            } catch {
              setLogLines((prev) => [...prev, trimmed])
            }
          } else {
            setLogLines((prev) => [...prev, trimmed])
          }
        }
      }
    } catch (error) {
      console.error('Error simulating survey:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to simulate survey',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (createdAssignments.length === 0) {
      setMessage({ type: 'error', text: 'No assignments to delete' })
      return
    }

    if (!confirm(`Are you sure you want to delete ${createdAssignments.length} test assignment(s) and all related data? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/surveys/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment_ids: createdAssignments,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete assignments')
      }

      setCreatedAssignments([])
      setMessage({
        type: 'success',
        text: `Successfully deleted ${data.deleted_count || 0} assignment(s) and all related data.`,
      })
    } catch (error) {
      console.error('Error deleting assignments:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete assignments',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId)
  const memberCount = selectedGroup && Array.isArray(selectedGroup.members) ? selectedGroup.members.length : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Survey Simulator</CardTitle>
          <CardDescription>
            Automatically complete assessments for all users in a group and generate reports. 
            This tool is for testing purposes only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Group Selection */}
          <div>
            <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Group
            </label>
            <select
              id="group-select"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              <option value="">-- Select a group --</option>
              {groups.map((group) => {
                const memberCount = Array.isArray(group.members) ? group.members.length : 0
                return (
                  <option key={group.id} value={group.id}>
                    {group.name} ({memberCount} members)
                  </option>
                )
              })}
            </select>
            {selectedGroupId && memberCount === 0 && (
              <p className="mt-2 text-sm text-yellow-600">
                Warning: This group has no members. Please add members before simulating.
              </p>
            )}
          </div>

          {/* Assessment Selection */}
          <div>
            <label htmlFor="assessment-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Assessment
            </label>
            <select
              id="assessment-select"
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              <option value="">-- Select an assessment --</option>
              {assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.title} {assessment.is_360 ? '(360)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Simulation log (console-style) */}
          {(logLines.length > 0 || isLoading) && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Simulation log
              </label>
              <div
                ref={logContainerRef}
                className="rounded-md border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-300 overflow-auto max-h-[320px] min-h-[120px]"
                role="log"
                aria-live="polite"
              >
                {logLines.length === 0 && isLoading && (
                  <div className="text-slate-500">Connecting...</div>
                )}
                {logLines.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixed message (toaster) */}
          {message && (
            <div
              className={`fixed top-4 right-4 z-50 max-w-md shadow-lg rounded-md p-4 flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : message.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <p className="flex-1 text-sm">{message.text}</p>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="flex-shrink-0 text-gray-500 hover:text-gray-700"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={handleSimulate}
              disabled={isLoading || !selectedGroupId || !selectedAssessmentId || memberCount === 0}
            >
              {isLoading ? 'Simulating...' : 'Simulate Survey'}
            </Button>
            {createdAssignments.length > 0 && (
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="destructive"
              >
                {isDeleting ? 'Deleting...' : `Delete Test Data (${createdAssignments.length} assignments)`}
              </Button>
            )}
          </div>

          {/* Created Assignments List */}
          {createdAssignments.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Created Assignments ({createdAssignments.length})
              </h3>
              <div className="space-y-2">
                {createdAssignments.map((assignmentId) => (
                  <div key={assignmentId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Assignment: {assignmentId.substring(0, 8)}...</span>
                    <Link
                      href={`/dashboard/reports/${assignmentId}`}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      View Report →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
