'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Survey {
  id: string
  name: string | null
  assessment_id: string
  created_at: string
  updated_at: string
  assessment_title: string
  assignment_count: number
  completed_count: number
}

export default function ClientSurveys({ clientId }: { clientId: string }) {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const supabase = createClient()

  const loadSurveys = useCallback(async () => {
    setLoading(true)
    const { data: surveyRows } = await supabase
      .from('surveys')
      .select('id, name, assessment_id, created_at, updated_at, assessment:assessments(title)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (!surveyRows) {
      setSurveys([])
      setLoading(false)
      return
    }

    // Get assignment stats
    const surveyIds = surveyRows.map(s => s.id)
    const { data: assignments } = await supabase
      .from('assignments')
      .select('survey_id, completed')
      .in('survey_id', surveyIds)

    const statsMap = new Map<string, { total: number; completed: number }>()
    for (const a of assignments || []) {
      if (!a.survey_id) continue
      const stats = statsMap.get(a.survey_id) || { total: 0, completed: 0 }
      stats.total++
      if (a.completed) stats.completed++
      statsMap.set(a.survey_id, stats)
    }

    setSurveys(surveyRows.map(s => ({
      id: s.id,
      name: s.name,
      assessment_id: s.assessment_id,
      created_at: s.created_at,
      updated_at: s.updated_at,
      assessment_title: ((s.assessment as unknown) as { title: string } | null)?.title || 'Unknown',
      assignment_count: statsMap.get(s.id)?.total || 0,
      completed_count: statsMap.get(s.id)?.completed || 0,
    })))
    setLoading(false)
  }, [clientId, supabase])

  useEffect(() => { loadSurveys() }, [loadSurveys])

  const handleSave = async (surveyId: string) => {
    await supabase
      .from('surveys')
      .update({ name: editName || null })
      .eq('id', surveyId)
    setEditingId(null)
    loadSurveys()
  }

  const handleDelete = async (surveyId: string) => {
    if (!confirm('Delete this survey and all its assignments? This cannot be undone.')) return
    // Delete assignments first (cascade should handle it, but explicit is safer)
    await supabase.from('assignments').delete().eq('survey_id', surveyId)
    await supabase.from('surveys').delete().eq('id', surveyId)
    loadSurveys()
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading surveys...</div>
  }

  if (surveys.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-gray-500">
          No surveys found for this client. Create assignments to start a survey.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Surveys ({surveys.length})</h2>
      </div>

      {surveys.map(survey => {
        const isEditing = editingId === survey.id
        const displayName = survey.name || `${survey.assessment_title} — ${new Date(survey.created_at).toLocaleDateString()}`
        const completionPct = survey.assignment_count > 0
          ? Math.round((survey.completed_count / survey.assignment_count) * 100)
          : 0

        return (
          <Card key={survey.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder={`${survey.assessment_title} — ${new Date(survey.created_at).toLocaleDateString()}`}
                        className="border rounded px-2 py-1 text-sm flex-1"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSave(survey.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <Button size="sm" onClick={() => handleSave(survey.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <CardTitle className="text-base">
                      <Link
                        href={`/dashboard/clients/${clientId}/surveys/${survey.id}`}
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {displayName}
                      </Link>
                    </CardTitle>
                  )}
                  {survey.name && !isEditing && (
                    <p className="text-sm text-gray-500 mt-0.5">{survey.assessment_title}</p>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex gap-1 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(survey.id)
                        setEditName(survey.name || '')
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(survey.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 text-sm text-gray-600">
                <div>
                  <span className="font-medium">{survey.assignment_count}</span> assignments
                </div>
                <div>
                  <span className="font-medium">{survey.completed_count}</span> completed
                </div>
                <div>
                  <span className="font-medium">{completionPct}%</span> completion
                </div>
                <div className="text-gray-400">
                  Created {new Date(survey.created_at).toLocaleDateString()}
                </div>
              </div>
              {survey.assignment_count > 0 && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
