/**
 * Apply report template to report data
 * 
 * Filters report data based on template components and applies labels/styling
 */

interface ReportTemplate {
  id: string
  assessment_id: string
  name: string
  is_default: boolean
  components: {
    dimension_breakdown?: boolean
    overall_score?: boolean
    benchmarks?: boolean
    geonorms?: boolean
    feedback?: boolean
    improvement_indicators?: boolean
    rater_breakdown?: boolean
  }
  labels: {
    overall_score_label?: string
    dimension_label?: string
    benchmark_label?: string
    geonorm_label?: string
    feedback_label?: string
  }
  styling: Record<string, any>
}

interface ReportData {
  overall_score: number
  dimensions: Array<{
    dimension_id: string
    dimension_name: string
    [key: string]: any
  }>
  [key: string]: any
}

/**
 * Apply template to report data
 */
export function applyTemplateToReport(
  reportData: ReportData,
  template: ReportTemplate | null
): ReportData {
  if (!template) {
    // No template, return data as-is
    return reportData
  }

  const filteredData: ReportData = {
    ...reportData,
    dimensions: [],
  }

  // Apply component filters
  if (template.components.overall_score !== false) {
    filteredData.overall_score = reportData.overall_score
  }

  // Filter dimensions based on component settings
  if (template.components.dimension_breakdown !== false) {
    filteredData.dimensions = reportData.dimensions.map((dim) => {
      const filteredDim: typeof dim = { ...dim }

      // Remove benchmark if not enabled
      if (template.components.benchmarks === false) {
        delete filteredDim.industry_benchmark
      }

      // Remove geonorm if not enabled
      if (template.components.geonorms === false) {
        delete filteredDim.geonorm
        delete filteredDim.geonorm_participant_count
      }

      // Remove feedback if not enabled
      if (template.components.feedback === false) {
        delete filteredDim.specific_feedback
        delete filteredDim.text_feedback
        delete filteredDim.overall_feedback
      }

      // Remove improvement indicators if not enabled
      if (template.components.improvement_indicators === false) {
        delete filteredDim.improvement_needed
      }

      // Remove rater breakdown if not enabled (360 only)
      if (template.components.rater_breakdown === false) {
        delete filteredDim.rater_breakdown
      }

      return filteredDim
    })
  }

  // Apply custom labels (stored in metadata for rendering)
  filteredData._templateLabels = template.labels
  filteredData._templateStyling = template.styling

  return filteredData
}

/**
 * Get default template structure
 */
export function getDefaultTemplate(): Omit<ReportTemplate, 'id' | 'assessment_id' | 'name' | 'is_default' | 'created_by' | 'created_at' | 'updated_at'> {
  return {
    components: {
      dimension_breakdown: true,
      overall_score: true,
      benchmarks: true,
      geonorms: true,
      feedback: true,
      improvement_indicators: true,
      rater_breakdown: true,
    },
    labels: {
      overall_score_label: 'Overall Score',
      dimension_label: 'Dimension',
      benchmark_label: 'Industry Benchmark',
      geonorm_label: 'Group Norm',
      feedback_label: 'Feedback',
    },
    styling: {},
  }
}
