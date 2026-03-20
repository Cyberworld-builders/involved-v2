'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Download, FileText, Trash2, Loader2, Info } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface SnapshotPdf {
  assignment_id: string
  original_path: string
  snapshot_path: string
}

interface Snapshot {
  id: string
  survey_id: string
  client_id: string
  assessment_id: string
  created_by: string
  created_at: string
  label: string | null
  storage_path: string
  pdf_paths: SnapshotPdf[]
  size_bytes: number | null
  pdf_count: number
  assignment_count: number
  answer_count: number
  status: string
  error_message: string | null
}

interface SurveySnapshotsProps {
  clientId: string
  surveyId: string
  assessmentId: string
}

export default function SurveySnapshots({ clientId, surveyId, assessmentId }: SurveySnapshotsProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [showLabelInput, setShowLabelInput] = useState(false)

  const apiBase = `/api/clients/${clientId}/surveys/${surveyId}/snapshots`

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetch(apiBase)
      if (res.ok) {
        const data = await res.json()
        setSnapshots(data.snapshots || [])
      }
    } catch {
      // Silent fail on load
    } finally {
      setIsLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    loadSnapshots()
  }, [loadSnapshots])

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          label: label.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create snapshot')
      }

      setLabel('')
      setShowLabelInput(false)
      await loadSnapshots()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create snapshot')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (snapshotId: string) => {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return
    setDeletingId(snapshotId)
    try {
      const res = await fetch(`${apiBase}/${snapshotId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setSnapshots(prev => prev.filter(s => s.id !== snapshotId))
    } catch {
      alert('Failed to delete snapshot')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (snapshotId: string) => {
    const res = await fetch(`${apiBase}/${snapshotId}`)
    if (res.ok) {
      const data = await res.json()
      if (data.download_url) {
        window.open(data.download_url, '_blank')
      }
    }
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Survey Snapshots</CardTitle>
          {!showLabelInput ? (
            <Button
              size="sm"
              onClick={() => setShowLabelInput(true)}
              disabled={isCreating}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Snapshot
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Optional label (e.g. 'Before Q3 edits')"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="text-sm px-3 py-1.5 border rounded-md w-64"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button size="sm" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  'Save'
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowLabelInput(false); setLabel('') }}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading snapshots...
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">No snapshots yet. Take a snapshot to preserve the current survey state.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between p-3 rounded-md border border-gray-200 bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {snapshot.label || formatDateTime(snapshot.created_at)}
                    </span>
                    {snapshot.status === 'creating' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Creating...</span>
                    )}
                    {snapshot.status === 'failed' && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Failed</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {snapshot.label && <span>{formatDateTime(snapshot.created_at)} · </span>}
                    {snapshot.assignment_count} assignment{snapshot.assignment_count !== 1 ? 's' : ''} · {snapshot.answer_count} answer{snapshot.answer_count !== 1 ? 's' : ''} · {formatSize(snapshot.size_bytes)}
                    {snapshot.pdf_count > 0 && ` · ${snapshot.pdf_count} PDF${snapshot.pdf_count !== 1 ? 's' : ''}`}
                  </div>
                  {snapshot.error_message && (
                    <div className="text-xs text-red-600 mt-1">{snapshot.error_message}</div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  {/* PDF links */}
                  {snapshot.pdf_paths && snapshot.pdf_paths.length > 0 && snapshot.pdf_paths.map((pdf) => (
                    <a
                      key={pdf.assignment_id}
                      href={`${apiBase}/${snapshot.id}/pdfs/${pdf.assignment_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                      title={`PDF: ${pdf.assignment_id.slice(0, 8)}...`}
                    >
                      <FileText className="w-4 h-4" />
                    </a>
                  ))}

                  {/* Download JSON */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(snapshot.id)}
                    title="Download snapshot JSON"
                    className="h-8 w-8"
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(snapshot.id)}
                    disabled={deletingId === snapshot.id}
                    title="Delete snapshot"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === snapshot.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Restore info */}
        <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Snapshots preserve the full state of this survey including answers, scores, and reports.
            Use the download and PDF icons to view or save snapshot data at any time.
            To restore from a snapshot, contact your administrator — restoration requires careful data
            mapping and may involve creating temporary assessment structures.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
