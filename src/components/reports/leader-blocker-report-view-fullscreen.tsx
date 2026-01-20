'use client'

/**
 * Full-screen Leader/Blocker report view optimized for PDF/printing
 * Matches PDF styling as closely as possible
 */

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

interface ReportLeaderBlockerViewFullscreenProps {
  reportData: ReportLeaderBlockerData
}

export default function ReportLeaderBlockerViewFullscreen({ reportData }: ReportLeaderBlockerViewFullscreenProps) {
  return (
    <div className="max-w-4xl mx-auto p-8 print:p-8 bg-white print:bg-white">
      {/* Header */}
      <div className="mb-8 print:mb-8 border-b border-gray-300 print:border-gray-300 pb-4 print:pb-4">
        <h1 className="text-3xl font-bold text-gray-900 print:text-black mb-2 print:mb-2">
          {reportData.assessment_title}
        </h1>
        <p className="text-lg text-gray-600 print:text-gray-700">
          Assessment Report for {reportData.user_name}
        </p>
        <div className="mt-4 print:mt-4 grid grid-cols-2 gap-4 print:gap-4">
          <div>
            <p className="text-sm text-gray-500 print:text-gray-600">Overall Score</p>
            <p className="text-4xl font-bold text-indigo-600 print:text-indigo-700">
              {reportData.overall_score.toFixed(2)}
            </p>
          </div>
          {reportData.group_name && (
            <div>
              <p className="text-sm text-gray-500 print:text-gray-600">Group</p>
              <p className="text-xl font-semibold text-gray-900 print:text-black">
                {reportData.group_name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dimension Breakdowns */}
      {reportData.dimensions.map((dimension, index) => (
        <div
          key={dimension.dimension_id}
          className={`mb-8 print:mb-8 pb-6 print:pb-6 ${index < reportData.dimensions.length - 1 ? 'border-b border-gray-200 print:border-gray-300' : ''}`}
        >
          <div className="mb-4 print:mb-4">
            <h2 className="text-2xl font-bold text-gray-900 print:text-black mb-1 print:mb-1">
              {dimension.dimension_name}
            </h2>
            <p className="text-sm text-gray-500 print:text-gray-600">
              Dimension Code: {dimension.dimension_code}
            </p>
          </div>

          {/* Score Comparison */}
          <div className="grid grid-cols-3 gap-4 print:gap-4 mb-4 print:mb-4">
            <div>
              <p className="text-sm text-gray-600 print:text-gray-700 mb-1 print:mb-1">Your Score</p>
              <p className="text-3xl font-bold text-gray-900 print:text-black">
                {dimension.target_score.toFixed(2)}
              </p>
            </div>
            {dimension.industry_benchmark !== null && (
              <div>
                <p className="text-sm text-gray-600 print:text-gray-700 mb-1 print:mb-1">Industry Benchmark</p>
                <p className="text-xl font-semibold text-gray-900 print:text-black">
                  {dimension.industry_benchmark.toFixed(2)}
                  {dimension.target_score < dimension.industry_benchmark && (
                    <span className="ml-2 text-red-600 print:text-red-700 text-sm">↓ Below</span>
                  )}
                  {dimension.target_score >= dimension.industry_benchmark && (
                    <span className="ml-2 text-green-600 print:text-green-700 text-sm">↑ Above</span>
                  )}
                </p>
              </div>
            )}
            {dimension.geonorm !== null && (
              <div>
                <p className="text-sm text-gray-600 print:text-gray-700 mb-1 print:mb-1">
                  Group Norm (n={dimension.geonorm_participant_count})
                </p>
                <p className="text-xl font-semibold text-gray-900 print:text-black">
                  {dimension.geonorm.toFixed(2)}
                  {dimension.target_score < dimension.geonorm && (
                    <span className="ml-2 text-red-600 print:text-red-700 text-sm">↓ Below</span>
                  )}
                  {dimension.target_score >= dimension.geonorm && (
                    <span className="ml-2 text-green-600 print:text-green-700 text-sm">↑ Above</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Visual Comparison Bar Chart */}
          <div className="mb-4 print:mb-4 pt-4 print:pt-4 border-t border-gray-200 print:border-gray-300">
            <p className="text-sm font-medium text-gray-700 print:text-gray-800 mb-2 print:mb-2">
              Score Comparison
            </p>
            <div className="space-y-3 print:space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-600 print:text-gray-700 mb-1 print:mb-1">
                  <span>Your Score</span>
                  <span>{dimension.target_score.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 print:bg-gray-300 rounded-full h-4 print:h-4 border border-gray-300 print:border-gray-400">
                  <div
                    className="bg-indigo-600 print:bg-indigo-700 h-4 print:h-4 rounded-full"
                    style={{ width: `${Math.min((dimension.target_score / 5) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {dimension.industry_benchmark !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 print:text-gray-700 mb-1 print:mb-1">
                    <span>Industry Benchmark</span>
                    <span>{dimension.industry_benchmark.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 print:bg-gray-300 rounded-full h-4 print:h-4 border border-gray-300 print:border-gray-400">
                    <div
                      className="bg-blue-500 print:bg-blue-600 h-4 print:h-4 rounded-full"
                      style={{ width: `${Math.min((dimension.industry_benchmark / 5) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {dimension.geonorm !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 print:text-gray-700 mb-1 print:mb-1">
                    <span>Group Norm</span>
                    <span>{dimension.geonorm.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 print:bg-gray-300 rounded-full h-4 print:h-4 border border-gray-300 print:border-gray-400">
                    <div
                      className="bg-green-500 print:bg-green-600 h-4 print:h-4 rounded-full"
                      style={{ width: `${Math.min((dimension.geonorm / 5) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Improvement Indicator */}
          {dimension.improvement_needed && (
            <div className="bg-yellow-50 print:bg-yellow-50 border border-yellow-200 print:border-yellow-300 rounded-md print:rounded p-3 print:p-3 mb-4 print:mb-4">
              <p className="text-sm text-yellow-800 print:text-yellow-900">
                ⚠️ Improvement suggested: Score is below benchmark or group norm
              </p>
            </div>
          )}

          {/* Specific Feedback */}
          {dimension.specific_feedback && (
            <div className="pt-4 print:pt-4 border-t border-gray-200 print:border-gray-300">
              <p className="text-sm font-medium text-gray-700 print:text-gray-800 mb-2 print:mb-2">
                Feedback
              </p>
              <div
                className="p-3 print:p-3 bg-gray-50 print:bg-gray-100 rounded print:rounded text-sm text-gray-700 print:text-gray-800 border border-gray-200 print:border-gray-300"
                dangerouslySetInnerHTML={{ __html: dimension.specific_feedback }}
              />
            </div>
          )}
        </div>
      ))}

      {/* Overall Feedback */}
      {reportData.overall_feedback && (
        <div className="mt-8 print:mt-8 pt-6 print:pt-6 border-t border-gray-300 print:border-gray-400">
          <h2 className="text-2xl font-bold text-gray-900 print:text-black mb-4 print:mb-4">
            Overall Feedback
          </h2>
          <div
            className="p-4 print:p-4 bg-gray-50 print:bg-gray-100 rounded print:rounded text-gray-700 print:text-gray-800 border border-gray-200 print:border-gray-300"
            dangerouslySetInnerHTML={{ __html: reportData.overall_feedback }}
          />
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 print:mt-8 pt-4 print:pt-4 border-t border-gray-300 print:border-gray-400 text-xs text-gray-500 print:text-gray-600 text-center print:text-center">
        <p>Generated on {new Date(reportData.generated_at).toLocaleString()}</p>
      </div>
    </div>
  )
}
