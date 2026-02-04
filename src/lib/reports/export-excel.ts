/**
 * Excel Export functionality
 * 
 * Uses exceljs to generate Excel workbooks from report data
 */

import ExcelJS from 'exceljs'
import type { Report360Data, ReportLeaderBlockerData } from './types'

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
    { header: 'All Raters', key: 'all_raters', width: 15 },
    { header: 'Peer', key: 'peer', width: 12 },
    { header: 'Direct Report', key: 'direct_report', width: 15 },
    { header: 'Supervisor', key: 'supervisor', width: 15 },
    { header: 'Self', key: 'self', width: 12 },
    { header: 'Other', key: 'other', width: 12 },
    { header: 'Industry Benchmark', key: 'benchmark', width: 18 },
    { header: 'Group Norm', key: 'geonorm', width: 15 },
    { header: 'Improvement Needed', key: 'improvement', width: 18 },
  ]
  
  if (reportData.dimensions.length === 0) {
    dimensionSheet.addRow({
      dimension: 'No data',
      code: '',
      all_raters: '0',
      peer: 'N/A',
      direct_report: 'N/A',
      supervisor: 'N/A',
      self: 'N/A',
      other: 'N/A',
      benchmark: 'N/A',
      geonorm: 'N/A',
      improvement: 'No',
    })
  } else {
    reportData.dimensions.forEach((dim) => {
      dimensionSheet.addRow({
        dimension: dim.dimension_name,
        code: dim.dimension_code,
        all_raters: (dim.rater_breakdown?.all_raters ?? dim.overall_score ?? 0).toFixed(2),
        peer: dim.rater_breakdown?.peer?.toFixed(2) || 'N/A',
        direct_report: dim.rater_breakdown?.direct_report?.toFixed(2) || 'N/A',
        supervisor: dim.rater_breakdown?.supervisor?.toFixed(2) || 'N/A',
        self: dim.rater_breakdown?.self?.toFixed(2) || 'N/A',
        other: dim.rater_breakdown?.other?.toFixed(2) || 'N/A',
        benchmark: dim.industry_benchmark?.toFixed(2) || 'N/A',
        geonorm: dim.geonorm != null ? `${dim.geonorm.toFixed(2)} (n=${dim.geonorm_participant_count ?? 0})` : 'N/A',
        improvement: dim.improvement_needed ? 'Yes' : 'No',
      })
    })
  }
  
  // Feedback sheet
  const feedbackSheet = workbook.addWorksheet('Feedback')
  feedbackSheet.columns = [
    { header: 'Dimension', key: 'dimension', width: 30 },
    { header: 'Feedback', key: 'feedback', width: 80 },
  ]
  
  if (reportData.dimensions.length > 0) {
    reportData.dimensions.forEach((dim) => {
      const feedbacks = dim.text_feedback ?? []
      if (feedbacks.length > 0) {
        feedbacks.forEach((feedback) => {
          feedbackSheet.addRow({
            dimension: dim.dimension_name,
            feedback: feedback.replace(/<[^>]*>/g, ''),
          })
        })
      }
    })
  }
  
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
  
  if (reportData.dimensions.length === 0) {
    dimensionSheet.addRow({
      dimension: 'No data',
      code: '',
      score: '0',
      benchmark: 'N/A',
      geonorm: 'N/A',
      improvement: 'No',
      feedback: 'N/A',
    })
  } else {
    reportData.dimensions.forEach((dim) => {
      dimensionSheet.addRow({
        dimension: dim.dimension_name,
        code: dim.dimension_code,
        score: (dim.target_score ?? 0).toFixed(2),
        benchmark: dim.industry_benchmark?.toFixed(2) || 'N/A',
        geonorm: dim.geonorm != null ? `${dim.geonorm.toFixed(2)} (n=${dim.geonorm_participant_count ?? 0})` : 'N/A',
        improvement: dim.improvement_needed ? 'Yes' : 'No',
        feedback: dim.specific_feedback ? dim.specific_feedback.replace(/<[^>]*>/g, '') : 'N/A',
      })
    })
  }
  
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
