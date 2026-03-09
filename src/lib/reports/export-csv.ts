/**
 * CSV Export functionality
 * 
 * Generates simple CSV files from report data
 */

import type { Report360Data, ReportLeaderBlockerData } from './types'

/**
 * Escape CSV field
 */
function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return ''
  }
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generate CSV for 360 report
 */
export function generate360ReportCSV(reportData: Report360Data): string {
  const lines: string[] = []
  
  // Header
  lines.push('Assessment,Target Name,Target Email,Group,Overall Score,Generated At')
  lines.push(
    [
      escapeCsvField(reportData.assessment_title),
      escapeCsvField(reportData.target_name),
      escapeCsvField(reportData.target_email),
      escapeCsvField(reportData.group_name),
      escapeCsvField((reportData.overall_score ?? 0).toFixed(2)),
      escapeCsvField(reportData.generated_at ? new Date(reportData.generated_at).toLocaleString() : 'N/A'),
    ].join(',')
  )
  
  // Empty line
  lines.push('')
  
  // Dimension breakdown
  lines.push('Dimension,Code,All Raters,Peer,Direct Report,Supervisor,Self,Other,Industry Benchmark,Group Norm,Improvement Needed')
  
  if (reportData.dimensions.length === 0) {
    lines.push('No data,,0,N/A,N/A,N/A,N/A,N/A,N/A,N/A,No')
  } else {
    reportData.dimensions.forEach((dim) => {
      lines.push(
        [
          escapeCsvField(dim.dimension_name),
          escapeCsvField(dim.dimension_code),
          escapeCsvField((dim.rater_breakdown?.all_raters ?? dim.overall_score ?? 0).toFixed(2)),
          escapeCsvField(dim.rater_breakdown?.peer?.toFixed(2) || 'N/A'),
          escapeCsvField(dim.rater_breakdown?.direct_report?.toFixed(2) || 'N/A'),
          escapeCsvField(dim.rater_breakdown?.supervisor?.toFixed(2) || 'N/A'),
          escapeCsvField(dim.rater_breakdown?.self?.toFixed(2) || 'N/A'),
          escapeCsvField(dim.rater_breakdown?.other?.toFixed(2) || 'N/A'),
          escapeCsvField(dim.industry_benchmark?.toFixed(2) || 'N/A'),
          escapeCsvField(dim.geonorm != null ? `${dim.geonorm.toFixed(2)} (n=${dim.geonorm_participant_count ?? 0})` : 'N/A'),
          escapeCsvField(dim.improvement_needed ? 'Yes' : 'No'),
        ].join(',')
      )
    })
  }
  
  // Feedback section
  if (reportData.dimensions.length > 0 && reportData.dimensions.some((d) => (d.text_feedback?.length ?? 0) > 0)) {
    lines.push('')
    lines.push('Dimension,Feedback')
    reportData.dimensions.forEach((dim) => {
      (dim.text_feedback ?? []).forEach((feedback) => {
        lines.push(
          [
            escapeCsvField(dim.dimension_name),
            escapeCsvField(feedback.replace(/<[^>]*>/g, '')),
          ].join(',')
        )
      })
    })
  }
  
  return lines.join('\n')
}

/**
 * Generate CSV for Leader/Blocker report
 */
export function generateLeaderBlockerReportCSV(reportData: ReportLeaderBlockerData): string {
  const lines: string[] = []
  
  // Header
  lines.push('Assessment,User Name,User Email,Group,Overall Score,Generated At')
  lines.push(
    [
      escapeCsvField(reportData.assessment_title),
      escapeCsvField(reportData.user_name),
      escapeCsvField(reportData.user_email),
      escapeCsvField(reportData.group_name || 'N/A'),
      escapeCsvField((reportData.overall_score ?? 0).toFixed(2)),
      escapeCsvField(reportData.generated_at ? new Date(reportData.generated_at).toLocaleString() : 'N/A'),
    ].join(',')
  )
  
  // Empty line
  lines.push('')
  
  // Dimension breakdown
  lines.push('Dimension,Code,Your Score,Industry Benchmark,Group Norm,Improvement Needed,Feedback')
  
  if (reportData.dimensions.length === 0) {
    lines.push('No data,,0,N/A,N/A,No,N/A')
  } else {
    reportData.dimensions.forEach((dim) => {
      lines.push(
        [
          escapeCsvField(dim.dimension_name),
          escapeCsvField(dim.dimension_code),
          escapeCsvField((dim.target_score ?? 0).toFixed(2)),
          escapeCsvField(dim.industry_benchmark?.toFixed(2) || 'N/A'),
          escapeCsvField(dim.geonorm != null ? `${dim.geonorm.toFixed(2)} (n=${dim.geonorm_participant_count ?? 0})` : 'N/A'),
          escapeCsvField(dim.improvement_needed ? 'Yes' : 'No'),
          escapeCsvField(dim.specific_feedback ? dim.specific_feedback.replace(/<[^>]*>/g, '') : 'N/A'),
        ].join(',')
      )
    })
  }
  
  // Overall feedback
  if (reportData.overall_feedback) {
    lines.push('')
    lines.push('Overall Feedback')
    lines.push(escapeCsvField(reportData.overall_feedback.replace(/<[^>]*>/g, '')))
  }
  
  return lines.join('\n')
}
