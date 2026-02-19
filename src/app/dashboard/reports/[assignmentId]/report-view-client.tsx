'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Report360View from '@/components/reports/360-report-view'
import ReportLeaderBlockerView from '@/components/reports/leader-blocker-report-view'
import {
  useReportDebug,
  setReportDebugGlobal,
  reportDataSummary,
} from '@/lib/reports/report-debug'

// Import types from report components
type Report360Data = Parameters<typeof Report360View>[0]['reportData']
type ReportLeaderBlockerData = Parameters<typeof ReportLeaderBlockerView>[0]['reportData']

interface ReportViewClientProps {
  assignmentId: string
  is360: boolean
}

export default function ReportViewClient({ assignmentId, is360 }: ReportViewClientProps) {
  const reportDebug = useReportDebug()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<Report360Data | ReportLeaderBlockerData | null>(null)
  const [regenerating, setRegenerating] = useState(false)

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
        const summary = reportDataSummary(data.report)
        console.log('[Report Debug] reportData summary', summary)
        setReportDebugGlobal({
          assignmentId,
          is360,
          source: 'dashboard',
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

  const regenerateReport = useCallback(async () => {
    try {
      setRegenerating(true)
      setError(null)

      const response = await fetch(`/api/reports/generate/${assignmentId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to regenerate report')
      }

      // Reload the report after regeneration
      await loadReport()
    } catch (err) {
      console.error('Error regenerating report:', err)
      setError(err instanceof Error ? err.message : 'Failed to regenerate report')
    } finally {
      setRegenerating(false)
    }
  }, [assignmentId, loadReport])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            <p className="text-gray-600 mt-4">Generating report...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={loadReport} variant="outline">
                Retry
              </Button>
              <Button onClick={regenerateReport} disabled={regenerating}>
                {regenerating ? 'Regenerating...' : 'Force Regenerate'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <p>No report data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (reportDebug) {
    console.log('[Report Debug] rendering view', {
      is360,
      reportDataSummary: reportDataSummary(reportData),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={regenerateReport}
          disabled={regenerating}
          variant="outline"
          size="sm"
        >
          {regenerating ? 'Regenerating...' : '🔄 Regenerate Report'}
        </Button>
      </div>
      {is360 ? (
        <Report360View reportData={reportData as Report360Data} />
      ) : (
        <ReportLeaderBlockerView reportData={reportData as ReportLeaderBlockerData} />
      )}
    </div>
  )
}
