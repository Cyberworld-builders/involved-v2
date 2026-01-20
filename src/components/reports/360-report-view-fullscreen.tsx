'use client'

/**
 * Full-screen 360 report view optimized for PDF/printing
 * Matches PDF styling as closely as possible
 */

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

interface Report360ViewFullscreenProps {
  reportData: Report360Data
}

export default function Report360ViewFullscreen({ reportData }: Report360ViewFullscreenProps) {
  return (
    <div className="max-w-4xl mx-auto p-8 print:p-8 bg-white print:bg-white">
      {/* Header */}
      <div className="mb-8 print:mb-8 border-b border-gray-300 print:border-gray-300 pb-4 print:pb-4">
        <h1 className="text-3xl font-bold text-gray-900 print:text-black mb-2 print:mb-2">
          {reportData.assessment_title}
        </h1>
        <p className="text-lg text-gray-600 print:text-gray-700">
          360 Assessment Report for {reportData.target_name}
        </p>
        <div className="mt-4 print:mt-4 grid grid-cols-2 gap-4 print:gap-4">
          <div>
            <p className="text-sm text-gray-500 print:text-gray-600">Overall Score</p>
            <p className="text-4xl font-bold text-indigo-600 print:text-indigo-700">
              {reportData.overall_score.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 print:text-gray-600">Group</p>
            <p className="text-xl font-semibold text-gray-900 print:text-black">
              {reportData.group_name}
            </p>
          </div>
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

          {/* Overall Score */}
          <div className="mb-4 print:mb-4">
            <p className="text-sm text-gray-600 print:text-gray-700 mb-1 print:mb-1">Overall Score</p>
            <p className="text-3xl font-bold text-gray-900 print:text-black">
              {dimension.overall_score.toFixed(2)}
            </p>
          </div>

          {/* Rater Breakdown */}
          <div className="mb-4 print:mb-4">
            <p className="text-sm font-medium text-gray-700 print:text-gray-800 mb-2 print:mb-2">
              Breakdown by Rater Type
            </p>
            <div className="grid grid-cols-5 gap-3 print:gap-3">
              {dimension.rater_breakdown.peer !== null && (
                <div className="text-center p-3 print:p-3 bg-gray-50 print:bg-gray-100 rounded print:rounded border border-gray-200 print:border-gray-300">
                  <p className="text-xs text-gray-600 print:text-gray-700 mb-1 print:mb-1">Peer</p>
                  <p className="text-lg font-semibold text-gray-900 print:text-black">
                    {dimension.rater_breakdown.peer.toFixed(2)}
                  </p>
                </div>
              )}
              {dimension.rater_breakdown.direct_report !== null && (
                <div className="text-center p-3 print:p-3 bg-gray-50 print:bg-gray-100 rounded print:rounded border border-gray-200 print:border-gray-300">
                  <p className="text-xs text-gray-600 print:text-gray-700 mb-1 print:mb-1">Direct Report</p>
                  <p className="text-lg font-semibold text-gray-900 print:text-black">
                    {dimension.rater_breakdown.direct_report.toFixed(2)}
                  </p>
                </div>
              )}
              {dimension.rater_breakdown.supervisor !== null && (
                <div className="text-center p-3 print:p-3 bg-gray-50 print:bg-gray-100 rounded print:rounded border border-gray-200 print:border-gray-300">
                  <p className="text-xs text-gray-600 print:text-gray-700 mb-1 print:mb-1">Supervisor</p>
                  <p className="text-lg font-semibold text-gray-900 print:text-black">
                    {dimension.rater_breakdown.supervisor.toFixed(2)}
                  </p>
                </div>
              )}
              {dimension.rater_breakdown.self !== null && (
                <div className="text-center p-3 print:p-3 bg-gray-50 print:bg-gray-100 rounded print:rounded border border-gray-200 print:border-gray-300">
                  <p className="text-xs text-gray-600 print:text-gray-700 mb-1 print:mb-1">Self</p>
                  <p className="text-lg font-semibold text-gray-900 print:text-black">
                    {dimension.rater_breakdown.self.toFixed(2)}
                  </p>
                </div>
              )}
              {dimension.rater_breakdown.other !== null && (
                <div className="text-center p-3 print:p-3 bg-gray-50 print:bg-gray-100 rounded print:rounded border border-gray-200 print:border-gray-300">
                  <p className="text-xs text-gray-600 print:text-gray-700 mb-1 print:mb-1">Other</p>
                  <p className="text-lg font-semibold text-gray-900 print:text-black">
                    {dimension.rater_breakdown.other.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Benchmarks and GEOnorm */}
          <div className="grid grid-cols-2 gap-4 print:gap-4 mb-4 print:mb-4 pt-4 print:pt-4 border-t border-gray-200 print:border-gray-300">
            {dimension.industry_benchmark !== null && (
              <div>
                <p className="text-sm text-gray-600 print:text-gray-700 mb-1 print:mb-1">Industry Benchmark</p>
                <p className="text-xl font-semibold text-gray-900 print:text-black">
                  {dimension.industry_benchmark.toFixed(2)}
                  {dimension.overall_score < dimension.industry_benchmark && (
                    <span className="ml-2 text-red-600 print:text-red-700 text-sm">↓ Below</span>
                  )}
                  {dimension.overall_score >= dimension.industry_benchmark && (
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
                  {dimension.overall_score < dimension.geonorm && (
                    <span className="ml-2 text-red-600 print:text-red-700 text-sm">↓ Below</span>
                  )}
                  {dimension.overall_score >= dimension.geonorm && (
                    <span className="ml-2 text-green-600 print:text-green-700 text-sm">↑ Above</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Improvement Indicator */}
          {dimension.improvement_needed && (
            <div className="bg-yellow-50 print:bg-yellow-50 border border-yellow-200 print:border-yellow-300 rounded-md print:rounded p-3 print:p-3 mb-4 print:mb-4">
              <p className="text-sm text-yellow-800 print:text-yellow-900">
                ⚠️ Improvement suggested: Score is below benchmark or group norm
              </p>
            </div>
          )}

          {/* Text Feedback */}
          {dimension.text_feedback.length > 0 && (
            <div className="pt-4 print:pt-4 border-t border-gray-200 print:border-gray-300">
              <p className="text-sm font-medium text-gray-700 print:text-gray-800 mb-2 print:mb-2">
                Feedback from Raters
              </p>
              <div className="space-y-2 print:space-y-2">
                {dimension.text_feedback.map((feedback, idx) => (
                  <div
                    key={idx}
                    className="p-3 print:p-3 bg-gray-50 print:bg-gray-100 rounded print:rounded text-sm text-gray-700 print:text-gray-800 border border-gray-200 print:border-gray-300"
                    dangerouslySetInnerHTML={{ __html: feedback }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      <div className="mt-8 print:mt-8 pt-4 print:pt-4 border-t border-gray-300 print:border-gray-400 text-xs text-gray-500 print:text-gray-600 text-center print:text-center">
        <p>Generated on {new Date(reportData.generated_at).toLocaleString()}</p>
      </div>
    </div>
  )
}
