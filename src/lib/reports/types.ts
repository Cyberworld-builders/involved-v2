/**
 * Shared report types and partial-report contract
 *
 * PARTIAL REPORT CONTRACT
 * -----------------------
 * Reports can be "partial" when:
 * - 360: no or only some raters have completed (completedCount < total).
 * - Leader/Blocker: no dimension scores yet (dimensions may be empty or have null scores).
 *
 * All consumers (dashboard UI, fullscreen UI, CSV, Excel, React-PDF, Playwright PDF) MUST:
 * - Treat numeric fields as possibly null/undefined: use (value ?? 0).toFixed(...) or guard with value != null.
 * - Use optional chaining for nested objects (e.g. dimension.rater_breakdown?.peer).
 * - Handle empty dimensions array: do not assume dimensions.length > 0 or dimensions[0] exists.
 * - Never call .toFixed(), .replace(), or other methods on undefined without a fallback.
 */

/** Rater breakdown for 360 dimensions (scores may be null when no responses for that rater type). */
export interface RaterBreakdown360 {
  peer: number | null
  direct_report: number | null
  supervisor: number | null
  self: number | null
  other: number | null
  all_raters: number | null
}

/** Single dimension in a 360 report. Scores and breakdown may be zero/null for partial reports. */
export interface DimensionReport360 {
  dimension_id: string
  dimension_name: string
  dimension_code: string
  overall_score: number
  rater_breakdown: RaterBreakdown360
  industry_benchmark: number | null
  geonorm: number | null
  geonorm_participant_count: number
  improvement_needed: boolean
  text_feedback: string[]
  description?: string
  /** Legacy field for dimension definition text. */
  definition?: string
  feedback?: {
    Self: string[]
    'Direct Report': string[]
    Others: string[]
  }
}

/** 360 report payload. dimensions may be empty or contain placeholder entries; overall_score may be 0. */
export interface Report360Data {
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
  /** True when no or partial responses; report shows placeholders. */
  partial?: boolean
  /** When partial, indicates how many responses received vs total expected. */
  participant_response_summary?: { completed: number; total: number }
  /** Optional client name for display (e.g. fullscreen view). */
  client_name?: string
}

/** Subdimension in a Leader/Blocker dimension (for leader reports with subdimensions). */
export interface SubdimensionReportLeaderBlocker {
  dimension_id: string
  dimension_name: string
  dimension_code: string
  target_score: number
  industry_benchmark: number | null
  geonorm: number | null
  improvement_needed: boolean
  group_score?: number | null
  specific_feedback: string | null
  specific_feedback_id: string | null
  overall_feedback?: string | null
  definition?: string | null
}

/** Single dimension in a Leader/Blocker report. dimensions array may be empty for partial reports. */
export interface DimensionReportLeaderBlocker {
  dimension_id: string
  dimension_name: string
  dimension_code: string
  target_score: number
  industry_benchmark: number | null
  geonorm: number | null
  geonorm_participant_count: number
  improvement_needed: boolean
  overall_feedback: string | null
  overall_feedback_id: string | null
  specific_feedback: string | null
  specific_feedback_id: string | null
  group_score?: number | null
  definition?: string
  subdimensions?: SubdimensionReportLeaderBlocker[]
}

/** Leader/Blocker report payload. dimensions may be empty; overall_score may be 0. */
export interface ReportLeaderBlockerData {
  assignment_id: string
  user_id: string
  user_name: string
  user_email: string
  assessment_id: string
  assessment_title: string
  group_id: string | null
  group_name: string | null
  overall_score: number
  dimensions: DimensionReportLeaderBlocker[]
  overall_feedback: string | null
  overall_feedback_id: string | null
  generated_at: string
  is_blocker?: boolean
}
