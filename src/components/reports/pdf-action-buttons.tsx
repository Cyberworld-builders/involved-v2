'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

export type PdfStatus = 'not_requested' | 'queued' | 'generating' | 'ready' | 'failed'

export interface PdfState {
  status: PdfStatus
  version: number | null
  generatedAt: string | null
  storagePath: string | null
  lastError: string | null
  jobId: string | null
}

interface PdfActionButtonsProps {
  assignmentId: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link'
}

/**
 * Smart PDF button component that adapts based on PDF generation status
 * Polls for status updates when PDF is queued or generating
 */
export function PdfActionButtons({
  assignmentId,
  size = 'default',
  variant = 'outline',
}: PdfActionButtonsProps) {
  const [state, setState] = useState<PdfState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

  // Fetch PDF status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf`)
      if (!response.ok) {
        throw new Error('Failed to fetch PDF status')
      }
      const data = await response.json()
      setState(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Default to not_requested on error
      setState({
        status: 'not_requested',
        version: null,
        generatedAt: null,
        storagePath: null,
        lastError: null,
        jobId: null,
      })
    } finally {
      setIsLoading(false)
    }
  }, [assignmentId])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll when queued or generating
  useEffect(() => {
    if (state?.status === 'queued' || state?.status === 'generating') {
      const interval = setInterval(() => {
        fetchStatus()
      }, 2500) // Poll every 2.5 seconds

      return () => clearInterval(interval)
    }
  }, [state?.status, fetchStatus])

  // Request PDF generation
  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to request PDF generation')
      }
      const data = await response.json()
      setState(data)
      // Will start polling automatically due to status change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle view PDF
  const handleView = async () => {
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf/url`)
      if (!response.ok) {
        throw new Error('Failed to get PDF URL')
      }
      const data = await response.json()
      window.open(data.url, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Handle download PDF
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf/url?download=1`)
      if (!response.ok) {
        throw new Error('Failed to get PDF download URL')
      }
      // Redirect to signed URL (which will trigger download)
      const data = await response.json()
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Handle retry
  const handleRetry = async () => {
    await handleGenerate()
  }

  if (isLoading && !state) {
    return (
      <Button variant={variant} size={size} disabled>
        Loading...
      </Button>
    )
  }

  const currentStatus = state?.status || 'not_requested'

  // Render based on status
  switch (currentStatus) {
    case 'not_requested':
      return (
        <div className="flex flex-col gap-1">
          <Button
            variant={variant}
            size={size}
            onClick={handleGenerate}
            disabled={isLoading}
          >
            Generate PDF
          </Button>
          <p className="text-xs text-gray-500">Creates a PDF and saves it for future downloads</p>
        </div>
      )

    case 'queued':
      return (
        <div className="flex flex-col gap-1">
          <Button variant={variant} size={size} disabled>
            Queued...
          </Button>
          <p className="text-xs text-gray-500">Waiting to start</p>
        </div>
      )

    case 'generating':
      return (
        <div className="flex flex-col gap-1">
          <Button variant={variant} size={size} disabled>
            Generating...
          </Button>
          <p className="text-xs text-gray-500">This can take ~10–30s</p>
        </div>
      )

    case 'ready':
      return (
        <div className="flex gap-2">
          <Button variant={variant} size={size} onClick={handleView}>
            View PDF
          </Button>
          <Button variant={variant} size={size} onClick={handleDownload}>
            Download
          </Button>
          <Button variant={variant} size={size} onClick={handleRetry} title="Generate a new PDF (replaces current)">
            Regenerate PDF
          </Button>
        </div>
      )

    case 'failed':
      return (
        <div className="flex flex-col gap-1">
          <Button variant="destructive" size={size} onClick={handleRetry}>
            Retry PDF
          </Button>
          {state?.lastError && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer">View error details</summary>
              <p className="mt-1 text-red-600">{state?.lastError}</p>
            </details>
          )}
        </div>
      )

    default:
      return (
        <Button variant={variant} size={size} disabled>
          Unknown status
        </Button>
      )
  }
}
