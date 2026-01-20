/**
 * Excel Export functionality
 * 
 * Uses exceljs to generate Excel workbooks from report data
 */

import ExcelJS from 'exceljs'

interface DimensionReport360 {
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
  dimensions: DimensionReport360[]
  generated_at: string
}

interface DimensionReportLeader {
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
  dimensions: DimensionReportLeader[]
  overall_feedback: string | null
  overall_feedback_id: string | null
  generated_at: string
}

/**
 * Generate Excel workbook for 360 report
 */
export async function generate360ReportExcel(reportData: Report360Data): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 30 },
  ]
  
  summarySheet.addRow({ metric: 'Assessment', value: reportData.assessment_title })
  summarySheet.addRow({ metric: 'Target Name', value: reportData.target_name })
  summarySheet.addRow({ metric: 'Target Email', value: reportData.target_email })
  summarySheet.addRow({ metric: 'Group', value: reportData.group_name })
  summarySheet.addRow({ metric: 'Overall Score', value: reportData.overall_score.toFixed(2) })
  summarySheet.addRow({ metric: 'Generated At', value: new Date(reportData.generated_at).toLocaleString() })
  
  // Dimension breakdown sheet
  const dimensionSheet = workbook.addWorksheet('Dimension Breakdown')
  dimensionSheet.columns = [
    { header: 'Dimension', key: 'dimension', width: 30 },
    { header: 'Code', key: 'code', width: 15 },
    { header: 'Overall Score', key: 'overall_score', width: 15 },
    { header: 'Peer', key: 'peer', width: 12 },
    { header: 'Direct Report', key: 'direct_report', width: 15 },
    { header: 'Supervisor', key: 'supervisor', width: 15 },
    { header: 'Self', key: 'self', width: 12 },
    { header: 'Other', key: 'other', width: 12 },
    { header: 'Industry Benchmark', key: 'benchmark', width: 18 },
    { header: 'Group Norm', key: 'geonorm', width: 15 },
    { header: 'Improvement Needed', key: 'improvement', width: 18 },
  ]
  
  reportData.dimensions.forEach((dim) => {
    dimensionSheet.addRow({
      dimension: dim.dimension_name,
      code: dim.dimension_code,
      overall_score: dim.overall_score.toFixed(2),
      peer: dim.rater_breakdown.peer?.toFixed(2) || 'N/A',
      direct_report: dim.rater_breakdown.direct_report?.toFixed(2) || 'N/A',
      supervisor: dim.rater_breakdown.supervisor?.toFixed(2) || 'N/A',
      self: dim.rater_breakdown.self?.toFixed(2) || 'N/A',
      other: dim.rater_breakdown.other?.toFixed(2) || 'N/A',
      benchmark: dim.industry_benchmark?.toFixed(2) || 'N/A',
      geonorm: dim.geonorm ? `${dim.geonorm.toFixed(2)} (n=${dim.geonorm_participant_count})` : 'N/A',
      improvement: dim.improvement_needed ? 'Yes' : 'No',
    })
  })
  
  // Feedback sheet
  const feedbackSheet = workbook.addWorksheet('Feedback')
  feedbackSheet.columns = [
    { header: 'Dimension', key: 'dimension', width: 30 },
    { header: 'Feedback', key: 'feedback', width: 80 },
  ]
  
  reportData.dimensions.forEach((dim) => {
    if (dim.text_feedback.length > 0) {
      dim.text_feedback.forEach((feedback) => {
        feedbackSheet.addRow({
          dimension: dim.dimension_name,
          feedback: feedback.replace(/<[^>]*>/g, ''),
        })
      })
    }
  })
  
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Generate Excel workbook for Leader/Blocker report
 */
export async function generateLeaderBlockerReportExcel(reportData: ReportLeaderBlockerData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 30 },
  ]
  
  summarySheet.addRow({ metric: 'Assessment', value: reportData.assessment_title })
  summarySheet.addRow({ metric: 'User Name', value: reportData.user_name })
  summarySheet.addRow({ metric: 'User Email', value: reportData.user_email })
  if (reportData.group_name) {
    summarySheet.addRow({ metric: 'Group', value: reportData.group_name })
  }
  summarySheet.addRow({ metric: 'Overall Score', value: reportData.overall_score.toFixed(2) })
  summarySheet.addRow({ metric: 'Generated At', value: new Date(reportData.generated_at).toLocaleString() })
  
  // Dimension breakdown sheet
  const dimensionSheet = workbook.addWorksheet('Dimension Breakdown')
  dimensionSheet.columns = [
    { header: 'Dimension', key: 'dimension', width: 30 },
    { header: 'Code', key: 'code', width: 15 },
    { header: 'Your Score', key: 'score', width: 15 },
    { header: 'Industry Benchmark', key: 'benchmark', width: 18 },
    { header: 'Group Norm', key: 'geonorm', width: 15 },
    { header: 'Improvement Needed', key: 'improvement', width: 18 },
    { header: 'Feedback', key: 'feedback', width: 60 },
  ]
  
  reportData.dimensions.forEach((dim) => {
    dimensionSheet.addRow({
      dimension: dim.dimension_name,
      code: dim.dimension_code,
      score: dim.target_score.toFixed(2),
      benchmark: dim.industry_benchmark?.toFixed(2) || 'N/A',
      geonorm: dim.geonorm ? `${dim.geonorm.toFixed(2)} (n=${dim.geonorm_participant_count})` : 'N/A',
      improvement: dim.improvement_needed ? 'Yes' : 'No',
      feedback: dim.specific_feedback ? dim.specific_feedback.replace(/<[^>]*>/g, '') : 'N/A',
    })
  })
  
  // Overall feedback sheet
  if (reportData.overall_feedback) {
    const feedbackSheet = workbook.addWorksheet('Overall Feedback')
    feedbackSheet.columns = [
      { header: 'Feedback', key: 'feedback', width: 80 },
    ]
    feedbackSheet.addRow({
      feedback: reportData.overall_feedback.replace(/<[^>]*>/g, ''),
    })
  }
  
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
