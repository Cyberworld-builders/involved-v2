/**
 * Generate Leader/Blocker assessment report data
 * 
 * Leader/Blocker reports show:
 * - Overall score (mean of all dimension scores)
 * - Per dimension:
 *   - Target's score
 *   - Industry benchmark comparison
 *   - GEOnorm comparison
 *   - Visual comparison (bar chart data)
 *   - ONE randomly selected specific feedback entry
 * - Overall feedback section:
 *   - ONE randomly selected overall feedback entry
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { calculateGEOnorms } from './calculate-geonorms'

interface SubdimensionReport {
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
}

interface DimensionReport {
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
  subdimensions?: SubdimensionReport[]
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
  dimensions: DimensionReport[]
  overall_feedback: string | null
  overall_feedback_id: string | null
  generated_at: string
  is_blocker?: boolean
}

/**
 * Generate Leader/Blocker report data for an assignment
 */
export async function generateLeaderBlockerReport(
  assignmentId: string
): Promise<ReportLeaderBlockerData> {
  const adminClient = createAdminClient()

  // Get assignment with user and assessment info
  const { data: assignment, error: assignmentError } = await adminClient
    .from('assignments')
    .select(`
      id,
      user_id,
      target_id,
      assessment_id,
      created_at,
      user:profiles!assignments_user_id_fkey(
        id,
        name,
        email,
        client_id
      ),
      assessment:assessments!assignments_assessment_id_fkey(
        id,
        title,
        is_360
      )
    `)
    .eq('id', assignmentId)
    .single()

  if (assignmentError || !assignment) {
    throw new Error('Assignment not found')
  }

  // Type assertions for nested objects (Supabase returns arrays for relations, but .single() should return objects)
  const assessmentData = (assignment.assessment as unknown) as { id: string; title: string; is_360: boolean } | null
  const userData = (assignment.user as unknown) as { id: string; name: string; email: string; client_id: string | null } | null

  if (assessmentData?.is_360) {
    throw new Error('This is a 360 assessment. Use generate360Report instead.')
  }

  // Get user's group (if any) for GEOnorm calculation
  const { data: userGroups } = await adminClient
    .from('group_members')
    .select(`
      group_id,
      group:groups!group_members_group_id_fkey(
        id,
        name
      )
    `)
    .eq('profile_id', assignment.user_id)
    .limit(1)

  // Type assertion for nested object (Supabase returns arrays for relations)
  const groupRaw = userGroups?.[0]?.group
  const group = groupRaw ? ((groupRaw as unknown) as { id: string; name: string }) : null

  // Determine if this is a Blockers assessment
  const isBlocker = assessmentData?.title.toLowerCase().includes('blocker') || false

  // Get ALL dimensions for this assessment (both parent and child)
  const { data: allDimensions } = await adminClient
    .from('dimensions')
    .select('id, name, code, parent_id')
    .eq('assessment_id', assignment.assessment_id)
    .order('name', { ascending: true })

  if (!allDimensions || allDimensions.length === 0) {
    throw new Error('This assessment has no dimensions configured. Please add dimensions to the assessment before generating a report.')
  }

  // Build hierarchical structure
  const parentDimensions = allDimensions.filter(d => !d.parent_id)
  const childDimensions = allDimensions.filter(d => d.parent_id)
  
  // Group children by parent_id
  const childrenByParent = new Map<string, typeof childDimensions>()
  childDimensions.forEach(child => {
    if (child.parent_id) {
      if (!childrenByParent.has(child.parent_id)) {
        childrenByParent.set(child.parent_id, [])
      }
      childrenByParent.get(child.parent_id)!.push(child)
    }
  })

  // For Leaders: use parent dimensions with their children as subdimensions
  // For Blockers: use all dimensions (should be flat, no children)
  const topLevelDimensions = isBlocker ? allDimensions : parentDimensions
  
  if (topLevelDimensions.length === 0) {
    throw new Error('This assessment has dimensions but no top-level (parent) dimensions. Reports require at least one top-level dimension.')
  }

  // Get all dimension IDs (parent + child) for score fetching
  const allDimensionIds = allDimensions.map((d) => d.id)

  // Get dimension scores for this assignment (all dimensions, parent + child)
  const { data: dimensionScores } = await adminClient
    .from('assignment_dimension_scores')
    .select('dimension_id, avg_score')
    .eq('assignment_id', assignmentId)
    .in('dimension_id', allDimensionIds)

  // Get industry benchmarks (all dimensions)
  const { data: benchmarks } = await adminClient
    .from('benchmarks')
    .select('dimension_id, value')
    .in('dimension_id', allDimensionIds)

  const benchmarkMap = new Map<string, number>()
  benchmarks?.forEach((b) => {
    benchmarkMap.set(b.dimension_id, b.value)
  })

  // Calculate GEOnorms if group exists (all dimensions)
  let geonorms = new Map<string, { avg_score: number; participant_count: number }>()
  if (group) {
    geonorms = await calculateGEOnorms(group.id, assignment.assessment_id, allDimensionIds)
  }

  // Get all assignments in the same batch for group score calculation
  // For Leaders/Blockers: Group scores are calculated across all targets in the group
  // Same assessment_id and created_at (same assessment batch)
  // The target's own score comes from all assignments that rated this target (handled separately)
  const batchCreatedAt = assignment.created_at

  const { data: assignmentBatch } = await adminClient
    .from('assignments')
    .select('id, user_id, target_id, created_at')
    .eq('assessment_id', assignment.assessment_id)
    .eq('completed', true)
    .eq('created_at', batchCreatedAt)
    .limit(1000) // Reasonable limit

  const batchAssignments = assignmentBatch || []
  
  // Calculate group scores for all dimensions
  const groupScores = new Map<string, number>()
  if (batchAssignments.length > 0) {
    // Get all dimension scores for all users in the batch (including current user)
    const batchAssignmentIds = batchAssignments.map(a => a.id)
    const { data: batchScores } = await adminClient
      .from('assignment_dimension_scores')
      .select('assignment_id, dimension_id, avg_score')
      .in('assignment_id', batchAssignmentIds)
      .in('dimension_id', allDimensionIds)

    // Group scores by dimension_id and calculate averages
    const scoresByDimension = new Map<string, number[]>()
    batchScores?.forEach(score => {
      if (!scoresByDimension.has(score.dimension_id)) {
        scoresByDimension.set(score.dimension_id, [])
      }
      scoresByDimension.get(score.dimension_id)!.push(score.avg_score || 0)
    })

    // Calculate average for each dimension
    scoresByDimension.forEach((scores, dimensionId) => {
      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
      groupScores.set(dimensionId, avg)
    })
  }

  // Get assigned feedback from report_data
  const { data: reportData } = await adminClient
    .from('report_data')
    .select('feedback_assigned')
    .eq('assignment_id', assignmentId)
    .single()

  const assignedFeedback = (reportData?.feedback_assigned as Array<{
    dimension_id: string | null
    feedback_id?: string
    feedback_content: string
    type: 'overall' | 'specific'
  }>) || []

  // Helper function to build a dimension report (used for both parent and child dimensions)
  const buildDimensionReport = (
    dimension: { id: string; name: string; code: string; parent_id: string | null },
    isSubdimension: boolean = false
  ): DimensionReport | SubdimensionReport | null => {
    const scoreData = dimensionScores?.find((ds) => ds.dimension_id === dimension.id)
    if (!scoreData) return null

    const targetScore = scoreData.avg_score || 0
    const industryBenchmark = benchmarkMap.get(dimension.id) || null
    const geonorm = geonorms.get(dimension.id)
    const groupScore = groupScores.get(dimension.id) || null

    // Determine if improvement is needed
    // For Blockers: higher is worse, so flag when score > benchmark/geonorm
    // For Leaders: lower is worse, so flag when score < benchmark/geonorm
    let improvementNeeded: boolean
    if (isBlocker) {
      improvementNeeded =
        (industryBenchmark !== null && targetScore > industryBenchmark) ||
        (geonorm !== undefined && targetScore > geonorm.avg_score)
    } else {
      // Leaders: also check against group score if available
      improvementNeeded =
        (industryBenchmark !== null && targetScore < industryBenchmark) ||
        (geonorm !== undefined && targetScore < geonorm.avg_score) ||
        (groupScore !== null && targetScore < (groupScore - 0.49))
    }

    // Get overall feedback for this dimension (only for parent dimensions)
    const overallFeedback = !isSubdimension ? assignedFeedback.find(
      (f) => f.dimension_id === dimension.id && f.type === 'overall'
    ) : null

    // Get specific feedback for this dimension
    const specificFeedback = assignedFeedback.find(
      (f) => f.dimension_id === dimension.id && f.type === 'specific'
    )

    const baseReport = {
      dimension_id: dimension.id,
      dimension_name: dimension.name,
      dimension_code: dimension.code,
      target_score: targetScore,
      industry_benchmark: industryBenchmark,
      geonorm: geonorm?.avg_score || null,
      improvement_needed: improvementNeeded,
      group_score: groupScore,
      specific_feedback: specificFeedback?.feedback_content || null,
      specific_feedback_id: specificFeedback?.feedback_id || null,
    }

    if (isSubdimension) {
      return baseReport as SubdimensionReport
    }

    return {
      ...baseReport,
      geonorm_participant_count: geonorm?.participant_count || 0,
      overall_feedback: overallFeedback?.feedback_content || null,
      overall_feedback_id: overallFeedback?.feedback_id || null,
    } as DimensionReport
  }

  // Build dimension reports with hierarchy
  const dimensionReports: DimensionReport[] = []

  for (const dimension of topLevelDimensions) {
    const parentReport = buildDimensionReport(dimension, false)
    if (!parentReport) continue

    // For Leaders: add subdimensions if they exist
    if (!isBlocker && childrenByParent.has(dimension.id)) {
      const subdimensions: SubdimensionReport[] = []
      const children = childrenByParent.get(dimension.id)!
      
      for (const child of children) {
        const subdimReport = buildDimensionReport(child, true)
        if (subdimReport) {
          subdimensions.push(subdimReport as SubdimensionReport)
        }
      }

      if (subdimensions.length > 0) {
        (parentReport as DimensionReport).subdimensions = subdimensions
      }
    }

    dimensionReports.push(parentReport as DimensionReport)
  }

  // Calculate overall score
  // For Blockers: average of all dimension scores (overall blocker score)
  // For Leaders: mean of all top-level dimension scores
  const overallScore =
    dimensionReports.length > 0
      ? dimensionReports.reduce((sum, dr) => sum + dr.target_score, 0) /
        dimensionReports.length
      : 0

  // Overall feedback is now dimension-specific, so we don't have assessment-wide overall feedback
  // Set to null to maintain API compatibility
  return {
    assignment_id: assignmentId,
    user_id: assignment.user_id,
    user_name: userData?.name || 'Unknown',
    user_email: userData?.email || '',
    assessment_id: assignment.assessment_id,
    assessment_title: assessmentData?.title || 'Unknown Assessment',
    group_id: group?.id || null,
    group_name: group?.name || null,
    overall_score: overallScore,
    dimensions: dimensionReports,
    overall_feedback: null, // Overall feedback is now dimension-specific
    overall_feedback_id: null,
    generated_at: new Date().toISOString(),
    is_blocker: isBlocker,
  }
}
