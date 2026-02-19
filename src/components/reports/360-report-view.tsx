'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Report360Data } from '@/lib/reports/types'
import { getReportDebug } from '@/lib/reports/report-debug'

interface Report360ViewProps {
  reportData: Report360Data
}

export default function Report360View({ reportData }: Report360ViewProps) {
  if (getReportDebug()) {
    const r = reportData as unknown as Record<string, unknown>
    console.log('[Report Debug] view received', {
      component: '360-dashboard',
      reportDataKeys: Object.keys(r),
      dimensionsLength: r.dimensions != null && Array.isArray(r.dimensions) ? r.dimensions.length : undefined,
      partial: r.partial,
      overall_score: r.overall_score,
    })
    console.log('[Report Debug] full reportData for view', reportData)
  }

  const dimensions = reportData.dimensions ?? []
  const isEmptyReport = dimensions.length === 0 && (reportData as unknown as Record<string, unknown>).assessment_title == null

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{reportData.assessment_title ?? '360 Assessment'}</CardTitle>
          <CardDescription>
            360 Assessment Report for {reportData.target_name ?? '—'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Overall Score</p>
              <p className="text-3xl font-bold text-indigo-600">
                {(reportData.overall_score ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Group</p>
              <p className="text-lg font-semibold">{reportData.group_name ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isEmptyReport && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              No report data is available for this assignment yet. The report may still be generating or cached data was empty.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dimension Breakdowns */}
      {dimensions.map((dimension) => (
        <Card key={dimension.dimension_id}>
          <CardHeader>
            <CardTitle>{dimension.dimension_name}</CardTitle>
            <CardDescription>Dimension Code: {dimension.dimension_code}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Score */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Overall Score</p>
              <p className="text-2xl font-bold">{(dimension.overall_score ?? 0).toFixed(2)}</p>
            </div>

            {/* Rater Breakdown */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Breakdown by Rater Type</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {dimension.rater_breakdown?.peer != null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Peer</p>
                    <p className="text-lg font-semibold">{(dimension.rater_breakdown.peer ?? 0).toFixed(2)}</p>
                  </div>
                )}
                {dimension.rater_breakdown?.direct_report != null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Direct Report</p>
                    <p className="text-lg font-semibold">{(dimension.rater_breakdown.direct_report ?? 0).toFixed(2)}</p>
                  </div>
                )}
                {dimension.rater_breakdown?.supervisor != null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Supervisor</p>
                    <p className="text-lg font-semibold">{(dimension.rater_breakdown.supervisor ?? 0).toFixed(2)}</p>
                  </div>
                )}
                {dimension.rater_breakdown?.self != null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Self</p>
                    <p className="text-lg font-semibold">{(dimension.rater_breakdown.self ?? 0).toFixed(2)}</p>
                  </div>
                )}
                {dimension.rater_breakdown?.other != null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Other</p>
                    <p className="text-lg font-semibold">{(dimension.rater_breakdown.other ?? 0).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Benchmarks and GEOnorm */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              {dimension.industry_benchmark != null && (
                <div>
                  <p className="text-sm text-gray-600">Industry Benchmark</p>
                  <p className="text-xl font-semibold">
                    {(dimension.industry_benchmark ?? 0).toFixed(2)}
                    {(dimension.overall_score ?? 0) < (dimension.industry_benchmark ?? 0) && (
                      <span className="ml-2 text-red-600 text-sm">↓ Below</span>
                    )}
                    {(dimension.overall_score ?? 0) >= (dimension.industry_benchmark ?? 0) && (
                      <span className="ml-2 text-green-600 text-sm">↑ Above</span>
                    )}
                  </p>
                </div>
              )}
              {dimension.geonorm != null && (
                <div>
                  <p className="text-sm text-gray-600">
                    Group Norm (n={dimension.geonorm_participant_count ?? 0})
                  </p>
                  <p className="text-xl font-semibold">
                    {(dimension.geonorm ?? 0).toFixed(2)}
                    {(dimension.overall_score ?? 0) < (dimension.geonorm ?? 0) && (
                      <span className="ml-2 text-red-600 text-sm">↓ Below</span>
                    )}
                    {(dimension.overall_score ?? 0) >= (dimension.geonorm ?? 0) && (
                      <span className="ml-2 text-green-600 text-sm">↑ Above</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Improvement Indicator */}
            {dimension.improvement_needed && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Improvement suggested: Score is below benchmark or group norm
                </p>
              </div>
            )}

            {/* Text Feedback */}
            {((dimension.text_feedback ?? []).length > 0) && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Feedback from Raters</p>
                <div className="space-y-2">
                  {(dimension.text_feedback ?? []).map((feedback, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: feedback }}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
