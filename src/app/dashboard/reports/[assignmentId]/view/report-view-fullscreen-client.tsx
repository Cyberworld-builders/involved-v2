'use client'

import { useState, useEffect, useCallback } from 'react'
import Report360ViewFullscreen from '@/components/reports/360-report-view-fullscreen'
import ReportLeaderBlockerViewFullscreen from '@/components/reports/leader-blocker-report-view-fullscreen'

// Import types from report components
type Report360Data = Parameters<typeof Report360ViewFullscreen>[0]['reportData']
type ReportLeaderBlockerData = Parameters<typeof ReportLeaderBlockerViewFullscreen>[0]['reportData']

interface ReportViewFullscreenClientProps {
  assignmentId: string
  is360: boolean
}

export default function ReportViewFullscreenClient({ assignmentId, is360 }: ReportViewFullscreenClientProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<Report360Data | ReportLeaderBlockerData | null>(null)

  const loadReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/reports/${assignmentId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load report')
      }

      const data = await response.json()
      setReportData(data.report)
    } catch (err) {
      console.error('Error loading report:', err)
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [assignmentId])

  useEffect(() => {
    loadReport()
  }, [loadReport])

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

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {is360 ? (
        <Report360ViewFullscreen reportData={reportData as Report360Data} />
      ) : (
        <ReportLeaderBlockerViewFullscreen reportData={reportData as ReportLeaderBlockerData} />
      )}
    </div>
  )
}
