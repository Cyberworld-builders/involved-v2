'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Report360View from '@/components/reports/360-report-view'
import ReportLeaderBlockerView from '@/components/reports/leader-blocker-report-view'

// Import types from report components
type Report360Data = Parameters<typeof Report360View>[0]['reportData']
type ReportLeaderBlockerData = Parameters<typeof ReportLeaderBlockerView>[0]['reportData']

interface ReportViewClientProps {
  assignmentId: string
  is360: boolean
}

export default function ReportViewClient({ assignmentId, is360 }: ReportViewClientProps) {
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
            <Button onClick={loadReport} className="mt-4">
              Retry
            </Button>
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

  return (
    <div className="space-y-6">
      {is360 ? (
        <Report360View reportData={reportData as Report360Data} />
      ) : (
        <ReportLeaderBlockerView reportData={reportData as ReportLeaderBlockerData} />
      )}
    </div>
  )
}
