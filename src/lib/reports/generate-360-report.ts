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
    all_raters: number | null
  }
  industry_benchmark: number | null
  geonorm: number | null
  geonorm_participant_count: number
  improvement_needed: boolean
  text_feedback: string[]
  description?: string
  feedback?: {
    Self: string[]
    'Direct Report': string[]
    Others: string[]
  }
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
  /** True when no or partial responses; report shows placeholders */
  partial?: boolean
  /** When partial, indicates how many responses received vs total expected */
  participant_response_summary?: { completed: number; total: number }
}

/**
 * Map group_members.position to report rater types
 * Legacy uses free-form position text, so we map common values to standard types
 * Custom position names will fall into 'other' category
 */
function mapPositionToRaterType(position: string | null | undefined): 'peer' | 'direct_report' | 'supervisor' | 'self' | 'other' {
  if (!position) return 'other'
  
  const positionLower = position.toLowerCase().trim()
  
  // Map common legacy position values
  if (positionLower === 'peer' || positionLower === 'peers' || positionLower === 'colleague' || positionLower === 'colleagues') {
    return 'peer'
  }
  if (positionLower === 'direct_report' || positionLower === 'direct reports' || 
      positionLower === 'subordinate' || positionLower === 'subordinates' ||
      positionLower === 'directreport' || positionLower === 'staff') {
    return 'direct_report'
  }
  if (positionLower === 'supervisor' || positionLower === 'supervisors' || 
      positionLower === 'manager' || positionLower === 'managers' || 
      positionLower === 'boss') {
    return 'supervisor'
  }
  if (positionLower === 'self') {
    return 'self'
  }
  
  // Any other position value goes to 'other'
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
      group_id,
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

  // Type assertions for nested objects (Supabase returns arrays for relations, but .single() should return objects)
  const assessmentData = (assignment.assessment as unknown) as { id: string; title: string } | null
  const targetData = (assignment.target as unknown) as { id: string; name: string; email: string } | null

  // Resolve group: by assignment.group_id when set, else by target_id (legacy; use first if multiple)
  let groupFromDb: { id: string; name: string; target_id: string | null } | null = null
  const assignmentRow = assignment as { group_id?: string | null }
  if (assignmentRow.group_id) {
    const { data: groupById, error: groupByIdError } = await adminClient
      .from('groups')
      .select('id, name, target_id')
      .eq('id', assignmentRow.group_id)
      .single()
    if (groupByIdError || !groupById) {
      throw new Error(
        `Group not found for this assignment (group_id: ${assignmentRow.group_id}). The group may have been deleted.`
      )
    }
    groupFromDb = groupById
  } else {
    const { data: groupsByTarget } = await adminClient
      .from('groups')
      .select('id, name, target_id')
      .eq('target_id', assignment.target_id)
    if (!groupsByTarget || groupsByTarget.length === 0) {
      throw new Error(
        'No group is linked to this 360 target. Ensure the group has its target (person being rated) set, and that assignments were created from that group.'
      )
    }
    groupFromDb = groupsByTarget[0]
  }

  // Get all assignments for this target (and this group when known)
  let allTargetAssignmentsQuery = adminClient
    .from('assignments')
    .select(`
      id,
      user_id,
      target_id,
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
  if (groupFromDb?.id) {
    allTargetAssignmentsQuery = allTargetAssignmentsQuery.eq('group_id', groupFromDb.id)
  }
  let { data: allTargetAssignments } = await allTargetAssignmentsQuery

  // When group filter yielded zero, retry without group so partial completion still produces a report
  if (groupFromDb?.id && (!allTargetAssignments || allTargetAssignments.length === 0)) {
    const { data: fallbackAssignments } = await adminClient
      .from('assignments')
      .select(`
        id,
        user_id,
        target_id,
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
    allTargetAssignments = fallbackAssignments || []
  }

  // Use linked group when present; otherwise synthetic group so report can still generate (e.g. Vercel when group not linked)
  const group = groupFromDb ?? { id: '', name: '360 participants', target_id: assignment.target_id }

  // Get all dimensions for this assessment (needed for both full and partial report)
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

  // When no completed assignments, return a partial report so the UI can show "no data yet" instead of throwing
  const completedCount = allTargetAssignments?.length ?? 0
  if (completedCount === 0) {
    const { data: benchmarks } = await adminClient
      .from('benchmarks')
      .select('dimension_id, value')
      .in('dimension_id', dimensionIds)
    const benchmarkMapPartial = new Map<string, number>()
    benchmarks?.forEach((b) => {
      benchmarkMapPartial.set(b.dimension_id, b.value)
    })
    const emptyRaterBreakdown = {
      peer: null,
      direct_report: null,
      supervisor: null,
      self: null,
      other: null,
      all_raters: null,
    }
    const dimensionReportsPartial: DimensionReport[] = dimensions.map((dim) => ({
      dimension_id: dim.id,
      dimension_name: dim.name,
      dimension_code: dim.code,
      overall_score: 0,
      rater_breakdown: emptyRaterBreakdown,
      industry_benchmark: benchmarkMapPartial.get(dim.id) ?? null,
      geonorm: null,
      geonorm_participant_count: 0,
      improvement_needed: false,
      text_feedback: [],
      feedback: { Self: [], 'Direct Report': [], Others: [] },
    }))
    let totalExpected = 0
    if (group.id) {
      const { data: groupMembers } = await adminClient
        .from('group_members')
        .select('profile_id')
        .eq('group_id', group.id)
      totalExpected = groupMembers?.length ?? 0
    }
    return {
      assignment_id: assignmentId,
      target_id: assignment.target_id,
      target_name: targetData?.name || 'Unknown',
      target_email: targetData?.email || '',
      assessment_id: assignment.assessment_id,
      assessment_title: assessmentData?.title || 'Unknown Assessment',
      group_id: group.id,
      group_name: group.name,
      overall_score: 0,
      dimensions: dimensionReportsPartial,
      generated_at: new Date().toISOString(),
      partial: true,
      participant_response_summary: { completed: 0, total: totalExpected },
    }
  }

  // Get group members with their positions (raters) when we have a real group; otherwise infer from assignments
  const raterMap = new Map<string, 'peer' | 'direct_report' | 'supervisor' | 'self' | 'other'>()
  if (group.id) {
    const { data: groupMembers } = await adminClient
      .from('group_members')
      .select('profile_id, position')
      .eq('group_id', group.id)
    groupMembers?.forEach((gm) => {
      raterMap.set(gm.profile_id, mapPositionToRaterType(gm.position))
    })
  }
  if (raterMap.size === 0) {
    allTargetAssignments!.forEach((a) => raterMap.set(a.user_id, 'other'))
  }

  // Get all dimension scores for all target assignments
  const assignmentIds = allTargetAssignments!.map((a) => a.id)
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

  // Get description fields (rich_text) for each dimension
  const { data: descriptionFields } = await adminClient
    .from('fields')
    .select('dimension_id, content')
    .eq('assessment_id', assignment.assessment_id)
    .eq('type', 'rich_text')
    .in('dimension_id', dimensionIds)
  
  const descriptionByDimension = new Map<string, string>()
  descriptionFields?.forEach((field) => {
    if (field.dimension_id && field.content) {
      // If multiple description fields exist for a dimension, use the first one
      if (!descriptionByDimension.has(field.dimension_id)) {
        descriptionByDimension.set(field.dimension_id, field.content)
      }
    }
  })

  // Get text feedback from 360 responses
  const { data: textAnswers } = await adminClient
    .from('answers')
    .select(`
      value,
      assignment_id,
      user_id,
      field:fields!answers_field_id_fkey(
        dimension_id,
        type
      )
    `)
    .in('assignment_id', assignmentIds)
    .eq('fields.type', 'text_input')

  // Group text feedback by dimension and rater type
  // Structure: dimensionId -> { Self: [], Direct Report: [], Others: [] }
  const textFeedbackByDimension = new Map<string, { Self: string[]; 'Direct Report': string[]; Others: string[] }>()
  
  textAnswers?.forEach((answer) => {
    // Type assertion for nested object (Supabase returns arrays for relations)
    const field = (answer.field as unknown) as { dimension_id: string | null; type: string } | null
    const dimensionId = field?.dimension_id || 'overall'
    
    if (!textFeedbackByDimension.has(dimensionId)) {
      textFeedbackByDimension.set(dimensionId, { Self: [], 'Direct Report': [], Others: [] })
    }
    
    if (!answer.value) return
    
    // Find the assignment to get rater type
    const answerAssignment = allTargetAssignments?.find((a) => a.id === answer.assignment_id)
    if (!answerAssignment) return
    
    // Determine rater type
    // All assignments have the same target_id (the person being rated)
    // Check if the user_id (rater) matches the target_id (self-assessment)
    let raterType: 'Self' | 'Direct Report' | 'Others'
    const targetId = assignment.target_id // All assignments have the same target_id
    if (answerAssignment.user_id === targetId) {
      raterType = 'Self'
    } else {
      const raterTypeFromMap = raterMap.get(answerAssignment.user_id) || 'other'
      if (raterTypeFromMap === 'direct_report') {
        raterType = 'Direct Report'
      } else {
        raterType = 'Others'
      }
    }
    
    textFeedbackByDimension.get(dimensionId)![raterType].push(answer.value)
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
    // This will be the same as all_raters, but we calculate it here for consistency
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

    // Track all scores for "All Raters" calculation
    const allRaterScores: number[] = []
    
    scoresForDimension.forEach((ds) => {
      const assignment = allTargetAssignments?.find((a) => a.id === ds.assignment_id)
      if (!assignment) return

      // Check for self-assessment first (user rating themselves)
      let raterType: 'peer' | 'direct_report' | 'supervisor' | 'self' | 'other'
      if (assignment.user_id === assignment.target_id) {
        raterType = 'self'
      } else {
        // Use position mapping from group_members
        raterType = raterMap.get(assignment.user_id) || 'other'
      }
      
      const score = ds.avg_score || 0
      raterBreakdown[raterType].push(score)
      allRaterScores.push(score) // Add to all raters for overall calculation
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
      // Add "All Raters" score (average of all rater types combined)
      all_raters: allRaterScores.length > 0
        ? allRaterScores.reduce((sum, s) => sum + s, 0) / allRaterScores.length
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

    // Get text feedback for this dimension (organized by rater type)
    const textFeedbackData = textFeedbackByDimension.get(dimension.id) || { Self: [], 'Direct Report': [], Others: [] }
    const allTextFeedback = [...textFeedbackData.Self, ...textFeedbackData['Direct Report'], ...textFeedbackData.Others]
    
    // Get description field for this dimension
    const description = descriptionByDimension.get(dimension.id)

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
      text_feedback: allTextFeedback, // Keep for backward compatibility
      description: description,
      feedback: textFeedbackData, // Organized by rater type
    })
  }

  // Calculate overall score (mean of all dimension scores)
  const overallScore =
    dimensionReports.length > 0
      ? dimensionReports.reduce((sum, dr) => sum + dr.overall_score, 0) /
        dimensionReports.length
      : 0

  let totalExpected = 0
  if (group.id) {
    const { data: groupMembers } = await adminClient
      .from('group_members')
      .select('profile_id')
      .eq('group_id', group.id)
    totalExpected = groupMembers?.length ?? 0
  }
  const isPartial = totalExpected > 0 && completedCount < totalExpected

  return {
    assignment_id: assignmentId,
    target_id: assignment.target_id,
    target_name: targetData?.name || 'Unknown',
    target_email: targetData?.email || '',
    assessment_id: assignment.assessment_id,
    assessment_title: assessmentData?.title || 'Unknown Assessment',
    group_id: group.id,
    group_name: group.name,
    overall_score: overallScore,
    dimensions: dimensionReports,
    generated_at: new Date().toISOString(),
    ...(isPartial && {
      partial: true,
      participant_response_summary: { completed: completedCount, total: totalExpected },
    }),
  }
}
