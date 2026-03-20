'use client'

import { useState, useEffect, useCallback } from 'react'

export type PdfStatus = 'not_requested' | 'queued' | 'generating' | 'ready' | 'failed'

export interface PdfState {
  status: PdfStatus
  version: number | null
  generatedAt: string | null
  storagePath: string | null
  lastError: string | null
  jobId: string | null
}

export function usePdfState(assignmentId: string) {
  const [state, setState] = useState<PdfState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to request PDF generation')
      }
      const data = await response.json()
      setState(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/reports/${assignmentId}/pdf/url?download=1`)
      if (!response.ok) {
        throw new Error('Failed to get PDF download URL')
      }
      const data = await response.json()
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleRegenerate = async () => {
    setIsLoading(true)
    try {
      const reportResponse = await fetch(`/api/reports/generate/${assignmentId}`, { method: 'POST' })
      if (!reportResponse.ok) {
        const errorData = await reportResponse.json().catch(() => ({}))
        throw new Error((errorData as { error?: string }).error || 'Failed to regenerate report data')
      }
      const pdfResponse = await fetch(`/api/reports/${assignmentId}/pdf?force=1`, {
        method: 'POST',
      })
      if (!pdfResponse.ok) {
        throw new Error('Failed to request PDF generation')
      }
      const data = await pdfResponse.json()
      setState(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    state,
    isLoading,
    error,
    handleGenerate,
    handleView,
    handleDownload,
    handleRegenerate,
  }
}
