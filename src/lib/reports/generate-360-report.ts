/**
 * Generate 360 assessment report data
 * 
 * 360 reports show:
 * - Overall score across all dimensions
 * - Per dimension:
 *   - Overall score
 *   - Breakdown by rater type (Peer, Direct Report, Supervisor, Self, Other)
 *   - Industry benchmark comparison
 *   - GEOnorm (group norm) comparison
 *   - Improvement indicators
 * - Text feedback from 360 responses (grouped by dimension)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { calculateGEOnorms } from './calculate-geonorms'

interface RaterTypeBreakdown {
  peer: number[]
  direct_report: number[]
  supervisor: number[]
  self: number[]
  other: number[]
}

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

/**
 * Map group_members.role to report rater types
 */
function mapRoleToRaterType(role: string | null | undefined): 'peer' | 'direct_report' | 'supervisor' | 'self' | 'other' {
  if (!role) return 'other'
  
  const roleLower = role.toLowerCase()
  
  if (roleLower === 'peer' || roleLower === 'colleague') {
    return 'peer'
  }
  if (roleLower === 'direct_report' || roleLower === 'subordinate' || roleLower === 'directreport') {
    return 'direct_report'
  }
  if (roleLower === 'supervisor' || roleLower === 'manager' || roleLower === 'boss') {
    return 'supervisor'
  }
  if (roleLower === 'self') {
    return 'self'
  }
  
  return 'other'
}

/**
 * Generate 360 report data for an assignment
 */
export async function generate360Report(
  assignmentId: string
): Promise<Report360Data> {
  const adminClient = createAdminClient()

  // Get assignment with target and assessment info
  const { data: assignment, error: assignmentError } = await adminClient
    .from('assignments')
    .select(`
      id,
      user_id,
      assessment_id,
      target_id,
      assessment:assessments!assignments_assessment_id_fkey(
        id,
        title
      ),
      target:profiles!assignments_target_id_fkey(
        id,
        name,
        email
      )
    `)
    .eq('id', assignmentId)
    .single()

  if (assignmentError || !assignment || !assignment.target_id) {
    throw new Error('Assignment not found or invalid for 360 report')
  }

  // Find the group that has this target
  const { data: group } = await adminClient
    .from('groups')
    .select('id, name, target_id')
    .eq('target_id', assignment.target_id)
    .single()

  if (!group) {
    throw new Error('Group not found for 360 target')
  }

  // Get all assignments for this target (all raters' assessments)
  const { data: allTargetAssignments } = await adminClient
    .from('assignments')
    .select(`
      id,
      user_id,
      completed,
      user:profiles!assignments_user_id_fkey(
        id,
        name,
        email
      )
    `)
    .eq('target_id', assignment.target_id)
    .eq('assessment_id', assignment.assessment_id)
    .eq('completed', true)

  if (!allTargetAssignments || allTargetAssignments.length === 0) {
    throw new Error('No completed assignments found for 360 target')
  }

  // Get group members with their roles (raters)
  const { data: groupMembers } = await adminClient
    .from('group_members')
    .select('profile_id, role')
    .eq('group_id', group.id)

  // Create rater lookup map
  const raterMap = new Map<string, string>() // user_id -> rater_type
  groupMembers?.forEach((gm) => {
    const raterType = mapRoleToRaterType(gm.role)
    raterMap.set(gm.profile_id, raterType)
  })

  // Get all dimensions for this assessment
  const { data: dimensions } = await adminClient
    .from('dimensions')
    .select('id, name, code, parent_id')
    .eq('assessment_id', assignment.assessment_id)
    .is('parent_id', null) // Get top-level dimensions only
    .order('name', { ascending: true })

  if (!dimensions || dimensions.length === 0) {
    // Check if there are any dimensions at all (including child dimensions)
    const { data: allDimensions } = await adminClient
      .from('dimensions')
      .select('id')
      .eq('assessment_id', assignment.assessment_id)
      .limit(1)

    if (!allDimensions || allDimensions.length === 0) {
      throw new Error('This assessment has no dimensions configured. Please add dimensions to the assessment before generating a report.')
    } else {
      throw new Error('This assessment has dimensions but no top-level (parent) dimensions. Reports require at least one top-level dimension.')
    }
  }

  const dimensionIds = dimensions.map((d) => d.id)

  // Get all dimension scores for all target assignments
  const assignmentIds = allTargetAssignments.map((a) => a.id)
  const { data: allDimensionScores } = await adminClient
    .from('assignment_dimension_scores')
    .select('assignment_id, dimension_id, avg_score')
    .in('assignment_id', assignmentIds)
    .in('dimension_id', dimensionIds)

  // Get industry benchmarks
  const { data: benchmarks } = await adminClient
    .from('benchmarks')
    .select('dimension_id, value')
    .in('dimension_id', dimensionIds)

  const benchmarkMap = new Map<string, number>()
  benchmarks?.forEach((b) => {
    benchmarkMap.set(b.dimension_id, b.value)
  })

  // Calculate GEOnorms
  const geonorms = await calculateGEOnorms(group.id, assignment.assessment_id, dimensionIds)

  // Get text feedback from 360 responses
  const { data: textAnswers } = await adminClient
    .from('answers')
    .select(`
      value,
      assignment_id,
      field:fields!answers_field_id_fkey(
        dimension_id,
        type
      )
    `)
    .in('assignment_id', assignmentIds)
    .eq('fields.type', 'text_input')

  // Group text feedback by dimension
  const textFeedbackByDimension = new Map<string, string[]>()
  textAnswers?.forEach((answer) => {
    const dimensionId = answer.field?.dimension_id || 'overall'
    if (!textFeedbackByDimension.has(dimensionId)) {
      textFeedbackByDimension.set(dimensionId, [])
    }
    if (answer.value) {
      textFeedbackByDimension.get(dimensionId)!.push(answer.value)
    }
  })

  // Build dimension reports
  const dimensionReports: DimensionReport[] = []

  for (const dimension of dimensions) {
    // Get scores for this dimension from all assignments
    const scoresForDimension = (allDimensionScores || []).filter(
      (ds) => ds.dimension_id === dimension.id
    )

    if (scoresForDimension.length === 0) {
      continue
    }

    // Calculate overall score (average of all raters)
    const overallScore =
      scoresForDimension.reduce((sum, ds) => sum + (ds.avg_score || 0), 0) /
      scoresForDimension.length

    // Group scores by rater type
    const raterBreakdown: RaterTypeBreakdown = {
      peer: [],
      direct_report: [],
      supervisor: [],
      self: [],
      other: [],
    }

    scoresForDimension.forEach((ds) => {
      const assignment = allTargetAssignments.find((a) => a.id === ds.assignment_id)
      if (!assignment) return

      const raterType = raterMap.get(assignment.user_id) || 'other'
      raterBreakdown[raterType].push(ds.avg_score || 0)
    })

    // Calculate average for each rater type
    const raterAverages = {
      peer: raterBreakdown.peer.length > 0
        ? raterBreakdown.peer.reduce((sum, s) => sum + s, 0) / raterBreakdown.peer.length
        : null,
      direct_report: raterBreakdown.direct_report.length > 0
        ? raterBreakdown.direct_report.reduce((sum, s) => sum + s, 0) / raterBreakdown.direct_report.length
        : null,
      supervisor: raterBreakdown.supervisor.length > 0
        ? raterBreakdown.supervisor.reduce((sum, s) => sum + s, 0) / raterBreakdown.supervisor.length
        : null,
      self: raterBreakdown.self.length > 0
        ? raterBreakdown.self.reduce((sum, s) => sum + s, 0) / raterBreakdown.self.length
        : null,
      other: raterBreakdown.other.length > 0
        ? raterBreakdown.other.reduce((sum, s) => sum + s, 0) / raterBreakdown.other.length
        : null,
    }

    // Get benchmark and geonorm
    const industryBenchmark = benchmarkMap.get(dimension.id) || null
    const geonorm = geonorms.get(dimension.id)

    // Determine if improvement is needed
    // Improvement needed if score is below benchmark or geonorm
    const improvementNeeded =
      (industryBenchmark !== null && overallScore < industryBenchmark) ||
      (geonorm !== undefined && overallScore < geonorm.avg_score)

    // Get text feedback for this dimension
    const textFeedback = textFeedbackByDimension.get(dimension.id) || []

    dimensionReports.push({
      dimension_id: dimension.id,
      dimension_name: dimension.name,
      dimension_code: dimension.code,
      overall_score: overallScore,
      rater_breakdown: raterAverages,
      industry_benchmark: industryBenchmark,
      geonorm: geonorm?.avg_score || null,
      geonorm_participant_count: geonorm?.participant_count || 0,
      improvement_needed: improvementNeeded,
      text_feedback: textFeedback,
    })
  }

  // Calculate overall score (mean of all dimension scores)
  const overallScore =
    dimensionReports.length > 0
      ? dimensionReports.reduce((sum, dr) => sum + dr.overall_score, 0) /
        dimensionReports.length
      : 0

  return {
    assignment_id: assignmentId,
    target_id: assignment.target_id,
    target_name: assignment.target?.name || 'Unknown',
    target_email: assignment.target?.email || '',
    assessment_id: assignment.assessment_id,
    assessment_title: assignment.assessment?.title || 'Unknown Assessment',
    group_id: group.id,
    group_name: group.name,
    overall_score: overallScore,
    dimensions: dimensionReports,
    generated_at: new Date().toISOString(),
  }
}
