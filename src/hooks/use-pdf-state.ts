'use client'

import { useState, useEffect, useCallback } from 'react'
import { friendlyPdfError } from '@/lib/reports/pdf-error-messages'

export type PdfStatus = 'not_requested' | 'queued' | 'generating' | 'ready' | 'failed'

export interface PdfState {
  status: PdfStatus
  version: number | null
  generatedAt: string | null
  storagePath: string | null
  lastError: string | null
  jobId: string | null
}

/**
 * Transient error surfaced by an action (view, download, generate, etc.)
 * Auto-clears after a timeout so the user isn't stuck staring at it.
 */
export interface PdfActionError {
  message: string       // user-friendly message
  rawMessage?: string   // original technical message (for admins)
}

const ACTION_ERROR_TTL = 8000 // ms before auto-clearing transient errors

export function usePdfState(assignmentId: string) {
  const [state, setState] = useState<PdfState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionError, setActionError] = useState<PdfActionError | null>(null)

  // Auto-clear transient action errors
  useEffect(() => {
    if (!actionError) return
    const timer = setTimeout(() => setActionError(null), ACTION_ERROR_TTL)
    return () => clearTimeout(timer)
  }, [actionError])

  const surfaceError = useCallback((err: unknown) => {
    const raw = err instanceof Error ? err.message : String(err)
    setActionError({ message: friendlyPdfError(raw), rawMessage: raw })
  }, [])

  const clearError = useCallback(() => setActionError(null), [])

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf`)
      if (!response.ok) {
        throw new Error('Failed to fetch PDF status')
      }
      const data = await response.json()
      setState(data)
    } catch (err) {
      surfaceError(err)
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
  }, [assignmentId, surfaceError])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (state?.status === 'queued' || state?.status === 'generating') {
      const interval = setInterval(() => {
        fetchStatus()
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [state?.status, fetchStatus])

  const handleGenerate = async () => {
    setIsLoading(true)
    setActionError(null)
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to request PDF generation')
      }
      setState(data)
    } catch (err) {
      surfaceError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleView = async () => {
    setActionError(null)
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf/url`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to get PDF URL')
      }
      const data = await response.json()
      window.open(data.url, '_blank')
    } catch (err) {
      surfaceError(err)
    }
  }

  const handleDownload = async () => {
    setActionError(null)
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf/url?download=1`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to get PDF download URL')
      }
      const data = await response.json()
      window.location.href = data.url
    } catch (err) {
      surfaceError(err)
    }
  }

  const handleRegenerate = async () => {
    setIsLoading(true)
    setActionError(null)
    try {
      const reportResponse = await fetch(`/api/reports/generate/${assignmentId}`, { method: 'POST' })
      if (!reportResponse.ok) {
        const errorData = await reportResponse.json().catch(() => ({}))
        throw new Error((errorData as { error?: string; details?: string }).details || (errorData as { error?: string }).error || 'Failed to regenerate report data')
      }
      const pdfResponse = await fetch(`/api/reports/${assignmentId}/pdf?force=1`, {
        method: 'POST',
      })
      const data = await pdfResponse.json()
      if (!pdfResponse.ok) {
        throw new Error(data.error || data.details || 'Failed to request PDF generation')
      }
      setState(data)
    } catch (err) {
      surfaceError(err)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    state,
    isLoading,
    actionError,
    clearError,
    handleGenerate,
    handleView,
    handleDownload,
    handleRegenerate,
  }
}
