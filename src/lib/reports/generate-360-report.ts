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

  // Find the group that has this target (exactly one group per target_id for 360)
  const { data: groupFromDb, error: groupError } = await adminClient
    .from('groups')
    .select('id, name, target_id')
    .eq('target_id', assignment.target_id)
    .single()

  // #region agent log
  const groupErrorDetails = groupError ? (groupError as unknown as { details?: string; message?: string }).details ?? (groupError as Error).message : null;
  fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-360-report.ts:groupLookup',message:'Group lookup by target_id',data:{assignmentId,targetId:assignment.target_id,groupFound:!!groupFromDb,groupErrorDetails,hasError:!!groupError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (groupError && !groupFromDb) {
    const details = (groupError as unknown as { details?: string }).details ?? '';
    const isMultiple = /multiple|contain \d+ rows/i.test(details) && !/0 rows/.test(details);
    const isZero = /0 rows|no rows/i.test(details);
    if (isMultiple) {
      throw new Error(
        'Multiple groups are linked to this 360 target. Only one group per target person is supported. Use a different group or remove the duplicate target from the other group.'
      )
    }
    if (isZero) {
      throw new Error(
        'No group is linked to this 360 target. Ensure the group has its target (person being rated) set, and that assignments were created from that group.'
      )
    }
    throw new Error(`Group lookup failed for 360 target: ${groupError.message}`)
  }

  // Get all assignments for this target (all raters' assessments)
  const { data: allTargetAssignments } = await adminClient
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

  if (!allTargetAssignments || allTargetAssignments.length === 0) {
    throw new Error('No completed assignments found for 360 target')
  }

  // Use linked group when present; otherwise synthetic group so report can still generate (e.g. Vercel when group not linked)
  const group = groupFromDb ?? { id: '', name: '360 participants', target_id: assignment.target_id }

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
    allTargetAssignments.forEach((a) => raterMap.set(a.user_id, 'other'))
  }

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
    const answerAssignment = allTargetAssignments.find((a) => a.id === answer.assignment_id)
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
      const assignment = allTargetAssignments.find((a) => a.id === ds.assignment_id)
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
  }
}
