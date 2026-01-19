'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DimensionReport {
  dimension_id: string
  dimension_name: string
  dimension_code: string
  overall_score: number
  rater_breakdown: {
    peer: number | null
    direct_report: number | null
    supervisor: number | null
    self: number | null
    other: number | null
  }
  industry_benchmark: number | null
  geonorm: number | null
  geonorm_participant_count: number
  improvement_needed: boolean
  text_feedback: string[]
}

interface Report360Data {
  assignment_id: string
  target_id: string
  target_name: string
  target_email: string
  assessment_id: string
  assessment_title: string
  group_id: string
  group_name: string
  overall_score: number
  dimensions: DimensionReport[]
  generated_at: string
}

interface Report360ViewProps {
  reportData: Report360Data
}

export default function Report360View({ reportData }: Report360ViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{reportData.assessment_title}</CardTitle>
          <CardDescription>
            360 Assessment Report for {reportData.target_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Overall Score</p>
              <p className="text-3xl font-bold text-indigo-600">
                {reportData.overall_score.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Group</p>
              <p className="text-lg font-semibold">{reportData.group_name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension Breakdowns */}
      {reportData.dimensions.map((dimension) => (
        <Card key={dimension.dimension_id}>
          <CardHeader>
            <CardTitle>{dimension.dimension_name}</CardTitle>
            <CardDescription>Dimension Code: {dimension.dimension_code}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Score */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Overall Score</p>
              <p className="text-2xl font-bold">{dimension.overall_score.toFixed(2)}</p>
            </div>

            {/* Rater Breakdown */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Breakdown by Rater Type</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {dimension.rater_breakdown.peer !== null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Peer</p>
                    <p className="text-lg font-semibold">{dimension.rater_breakdown.peer.toFixed(2)}</p>
                  </div>
                )}
                {dimension.rater_breakdown.direct_report !== null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Direct Report</p>
                    <p className="text-lg font-semibold">{dimension.rater_breakdown.direct_report.toFixed(2)}</p>
                  </div>
                )}
                {dimension.rater_breakdown.supervisor !== null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Supervisor</p>
                    <p className="text-lg font-semibold">{dimension.rater_breakdown.supervisor.toFixed(2)}</p>
                  </div>
                )}
                {dimension.rater_breakdown.self !== null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Self</p>
                    <p className="text-lg font-semibold">{dimension.rater_breakdown.self.toFixed(2)}</p>
                  </div>
                )}
                {dimension.rater_breakdown.other !== null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Other</p>
                    <p className="text-lg font-semibold">{dimension.rater_breakdown.other.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Benchmarks and GEOnorm */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              {dimension.industry_benchmark !== null && (
                <div>
                  <p className="text-sm text-gray-600">Industry Benchmark</p>
                  <p className="text-xl font-semibold">
                    {dimension.industry_benchmark.toFixed(2)}
                    {dimension.overall_score < dimension.industry_benchmark && (
                      <span className="ml-2 text-red-600 text-sm">↓ Below</span>
                    )}
                    {dimension.overall_score >= dimension.industry_benchmark && (
                      <span className="ml-2 text-green-600 text-sm">↑ Above</span>
                    )}
                  </p>
                </div>
              )}
              {dimension.geonorm !== null && (
                <div>
                  <p className="text-sm text-gray-600">
                    Group Norm (n={dimension.geonorm_participant_count})
                  </p>
                  <p className="text-xl font-semibold">
                    {dimension.geonorm.toFixed(2)}
                    {dimension.overall_score < dimension.geonorm && (
                      <span className="ml-2 text-red-600 text-sm">↓ Below</span>
                    )}
                    {dimension.overall_score >= dimension.geonorm && (
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
            {dimension.text_feedback.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Feedback from Raters</p>
                <div className="space-y-2">
                  {dimension.text_feedback.map((feedback, index) => (
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
