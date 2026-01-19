'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DimensionReport {
  dimension_id: string
  dimension_name: string
  dimension_code: string
  target_score: number
  industry_benchmark: number | null
  geonorm: number | null
  geonorm_participant_count: number
  improvement_needed: boolean
  specific_feedback: string | null
  specific_feedback_id: string | null
}

interface ReportLeaderBlockerData {
  assignment_id: string
  user_id: string
  user_name: string
  user_email: string
  assessment_id: string
  assessment_title: string
  group_id: string | null
  group_name: string | null
  overall_score: number
  dimensions: DimensionReport[]
  overall_feedback: string | null
  overall_feedback_id: string | null
  generated_at: string
}

interface ReportLeaderBlockerViewProps {
  reportData: ReportLeaderBlockerData
}

export default function ReportLeaderBlockerView({ reportData }: ReportLeaderBlockerViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{reportData.assessment_title}</CardTitle>
          <CardDescription>
            Assessment Report for {reportData.user_name}
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
            {reportData.group_name && (
              <div>
                <p className="text-sm text-gray-600">Group</p>
                <p className="text-lg font-semibold">{reportData.group_name}</p>
              </div>
            )}
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
            {/* Score Comparison */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Your Score</p>
                <p className="text-2xl font-bold">{dimension.target_score.toFixed(2)}</p>
              </div>
              {dimension.industry_benchmark !== null && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Industry Benchmark</p>
                  <p className="text-xl font-semibold">
                    {dimension.industry_benchmark.toFixed(2)}
                    {dimension.target_score < dimension.industry_benchmark && (
                      <span className="ml-2 text-red-600 text-sm">↓ Below</span>
                    )}
                    {dimension.target_score >= dimension.industry_benchmark && (
                      <span className="ml-2 text-green-600 text-sm">↑ Above</span>
                    )}
                  </p>
                </div>
              )}
              {dimension.geonorm !== null && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Group Norm (n={dimension.geonorm_participant_count})
                  </p>
                  <p className="text-xl font-semibold">
                    {dimension.geonorm.toFixed(2)}
                    {dimension.target_score < dimension.geonorm && (
                      <span className="ml-2 text-red-600 text-sm">↓ Below</span>
                    )}
                    {dimension.target_score >= dimension.geonorm && (
                      <span className="ml-2 text-green-600 text-sm">↑ Above</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Visual Comparison Bar Chart */}
            <div className="pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Score Comparison</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Your Score</span>
                    <span>{dimension.target_score.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-indigo-600 h-4 rounded-full"
                      style={{ width: `${Math.min((dimension.target_score / 5) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {dimension.industry_benchmark !== null && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Industry Benchmark</span>
                      <span>{dimension.industry_benchmark.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-500 h-4 rounded-full"
                        style={{ width: `${Math.min((dimension.industry_benchmark / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {dimension.geonorm !== null && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Group Norm</span>
                      <span>{dimension.geonorm.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-green-500 h-4 rounded-full"
                        style={{ width: `${Math.min((dimension.geonorm / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Improvement Indicator */}
            {dimension.improvement_needed && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Improvement suggested: Score is below benchmark or group norm
                </p>
              </div>
            )}

            {/* Specific Feedback */}
            {dimension.specific_feedback && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Feedback</p>
                <div
                  className="p-3 bg-gray-50 rounded text-sm text-gray-700"
                  dangerouslySetInnerHTML={{ __html: dimension.specific_feedback }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Overall Feedback */}
      {reportData.overall_feedback && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-gray-700"
              dangerouslySetInnerHTML={{ __html: reportData.overall_feedback }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
