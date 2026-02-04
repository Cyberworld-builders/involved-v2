/**
 * Report fixtures for partial/empty report testing.
 * Use these to assert all consumers (CSV, Excel, PDF, UI) handle partial data without throwing.
 */

import type {
  DimensionReport360,
  DimensionReportLeaderBlocker,
  Report360Data,
  ReportLeaderBlockerData,
} from '@/lib/reports/types'

const emptyRaterBreakdown = {
  peer: null,
  direct_report: null,
  supervisor: null,
  self: null,
  other: null,
  all_raters: null,
} as const

/** 360 report with one dimension, all scores zero/null; partial with 0 of 5 responses. */
export const partial360Report: Report360Data = {
  assignment_id: 'fixture-assignment-360',
  target_id: 'fixture-target',
  target_name: 'Test User',
  target_email: 'test@example.com',
  assessment_id: 'fixture-assessment',
  assessment_title: '360 Assessment',
  group_id: 'fixture-group',
  group_name: 'Test Group',
  overall_score: 0,
  dimensions: [
    {
      dimension_id: 'dim-1',
      dimension_name: 'Leadership',
      dimension_code: 'LEAD',
      overall_score: 0,
      rater_breakdown: { ...emptyRaterBreakdown },
      industry_benchmark: null,
      geonorm: null,
      geonorm_participant_count: 0,
      improvement_needed: false,
      text_feedback: [],
    },
  ],
  generated_at: new Date().toISOString(),
  partial: true,
  participant_response_summary: { completed: 0, total: 5 },
}

/** 360 report with zero dimensions (no placeholder dimensions). */
export const emptyDimensions360Report: Report360Data = {
  ...partial360Report,
  assignment_id: 'fixture-assignment-360-empty',
  dimensions: [],
}

/** Leader/Blocker report with zero dimensions and zero overall score. */
export const partialLeaderBlockerReport: ReportLeaderBlockerData = {
  assignment_id: 'fixture-assignment-lb',
  user_id: 'fixture-user',
  user_name: 'Test User',
  user_email: 'test@example.com',
  assessment_id: 'fixture-assessment-lb',
  assessment_title: 'Leader Assessment',
  group_id: null,
  group_name: null,
  overall_score: 0,
  dimensions: [],
  overall_feedback: null,
  overall_feedback_id: null,
  generated_at: new Date().toISOString(),
}

/** 360 dimension with null benchmark/geonorm for mixed partial testing. */
export const dimension360WithNullBenchmark: DimensionReport360 = {
  dimension_id: 'dim-2',
  dimension_name: 'Communication',
  dimension_code: 'COMM',
  overall_score: 3.5,
  rater_breakdown: {
    peer: 3.5,
    direct_report: null,
    supervisor: 4,
    self: 3,
    other: null,
    all_raters: 3.5,
  },
  industry_benchmark: null,
  geonorm: null,
  geonorm_participant_count: 0,
  improvement_needed: false,
  text_feedback: [],
}

/** Leader/Blocker report with one dimension (for export tests that need non-empty dimensions). */
export const leaderBlockerReportWithOneDimension: ReportLeaderBlockerData = {
  ...partialLeaderBlockerReport,
  overall_score: 3,
  dimensions: [
    {
      dimension_id: 'dim-1',
      dimension_name: 'Dimension One',
      dimension_code: 'D1',
      target_score: 3,
      industry_benchmark: 3.2,
      geonorm: 3.1,
      geonorm_participant_count: 10,
      improvement_needed: false,
      overall_feedback: null,
      overall_feedback_id: null,
      specific_feedback: null,
      specific_feedback_id: null,
    },
  ],
}
