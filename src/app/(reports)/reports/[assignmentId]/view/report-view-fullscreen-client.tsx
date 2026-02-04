'use client'

import { useState, useEffect, useCallback } from 'react'
import Report360ViewFullscreen from '@/components/reports/360-report-view-fullscreen'
import ReportLeaderBlockerViewFullscreen from '@/components/reports/leader-blocker-report-view-fullscreen'
import {
  useReportDebug,
  setReportDebugGlobal,
  reportDataSummary,
} from '@/lib/reports/report-debug'

// Import types from report components
type Report360Data = Parameters<typeof Report360ViewFullscreen>[0]['reportData']
type ReportLeaderBlockerData = Parameters<typeof ReportLeaderBlockerViewFullscreen>[0]['reportData']

interface ReportViewFullscreenClientProps {
  assignmentId: string
  is360: boolean
  initialReportData?: unknown
}

export default function ReportViewFullscreenClient({ assignmentId, is360, initialReportData }: ReportViewFullscreenClientProps) {
  const reportDebug = useReportDebug()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(!initialReportData)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<Report360Data | ReportLeaderBlockerData | null>(
    initialReportData ? (initialReportData as Report360Data | ReportLeaderBlockerData) : null
  )

  useEffect(() => {
    if (!reportDebug) return
    console.log('[Report Debug] fullscreen init', {
      assignmentId,
      is360,
      hasInitialReportData: !!initialReportData,
    })
    if (initialReportData) {
      console.log('[Report Debug] initialReportData summary', reportDataSummary(initialReportData))
      setReportDebugGlobal({
        assignmentId,
        is360,
        source: 'fullscreen',
        reportData: initialReportData,
        timestamp: new Date().toISOString(),
      })
    }
  }, [reportDebug, assignmentId, is360, initialReportData])

  // Defer report render until after mount to avoid hydration mismatch (React #418) when
  // server and client disagree (e.g. large payload, serialization, or locale). PDF flow
  // waits for .page-container, which appears once this effect runs and report renders.
  useEffect(() => {
    setMounted(true)
  }, [])

  const loadReport = useCallback(async () => {
    const url = reportDebug
      ? `/api/reports/${assignmentId}?report_debug=1`
      : `/api/reports/${assignmentId}`
    try {
      setLoading(true)
      setError(null)

      if (reportDebug) {
        console.log('[Report Debug] fetch start', { assignmentId, is360, url })
      }

      const response = await fetch(url)

      if (reportDebug) {
        console.log('[Report Debug] response', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (reportDebug) {
          console.log('[Report Debug] load error', {
            status: response.status,
            errorBody: errorData,
          })
        }
        throw new Error((errorData as { error?: string }).error || 'Failed to load report')
      }

      const data = (await response.json()) as { report?: unknown; cached?: boolean; _debug?: unknown }
      if (reportDebug) {
        console.log('[Report Debug] api response', data)
        console.log('[Report Debug] reportData summary', reportDataSummary(data.report))
        setReportDebugGlobal({
          assignmentId,
          is360,
          source: 'fullscreen',
          apiResponse: data,
          reportData: data.report,
          timestamp: new Date().toISOString(),
        })
      }
      setReportData(data.report as Report360Data | ReportLeaderBlockerData)
    } catch (err) {
      if (reportDebug) {
        console.log('[Report Debug] load error', {
          error: err,
          message: err instanceof Error ? err.message : String(err),
        })
      }
      console.error('Error loading report:', err)
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [assignmentId, is360, reportDebug])

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (!initialReportData) {
      loadReport()
    }
  }, [loadReport, initialReportData])

  // Set data-report-loaded when report data is available and rendered
  useEffect(() => {
    if (reportData && !loading) {
      if (reportDebug) {
        console.log('[Report Debug] fullscreen rendering view', {
          is360,
          reportDataSummary: reportDataSummary(reportData),
        })
        setReportDebugGlobal({
          assignmentId,
          is360,
          source: 'fullscreen',
          reportData,
          timestamp: new Date().toISOString(),
        })
      }
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const container = document.querySelector('[data-report-loaded]')
        if (container) {
          // Ensure all page containers are rendered
          const pageContainers = document.querySelectorAll('.page-container')
          if (pageContainers.length > 0) {
            console.log(`Report loaded with ${pageContainers.length} pages`)
          }
        }
      }, 100)
    }
  }, [reportData, loading, reportDebug, assignmentId, is360])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-600 mt-4">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button onClick={loadReport} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <p>No report data available</p>
        </div>
      </div>
    )
  }

  // Only render the full report after mount. This avoids hydration mismatch (React #418):
  // server and client both render the same placeholder first, then client paints the report.
  // PDF service waits for .page-container, which appears after this client-only render.
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" data-report-loaded="true">
        <div className="text-center text-gray-500">
          <p>Preparing report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white print:bg-white" data-report-loaded="true">
      {is360 ? (
        <Report360ViewFullscreen reportData={reportData as Report360Data} />
      ) : (
        <ReportLeaderBlockerViewFullscreen reportData={reportData as ReportLeaderBlockerData} />
      )}
    </div>
  )
}
