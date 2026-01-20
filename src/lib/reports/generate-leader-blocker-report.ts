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

interface DimensionReport {
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
  dimensions: DimensionReport[]
  overall_feedback: string | null
  overall_feedback_id: string | null
  generated_at: string
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
      assessment_id,
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

  // Get dimension scores for this assignment
  const { data: dimensionScores } = await adminClient
    .from('assignment_dimension_scores')
    .select('dimension_id, avg_score')
    .eq('assignment_id', assignmentId)
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

  // Calculate GEOnorms if group exists
  let geonorms = new Map<string, { avg_score: number; participant_count: number }>()
  if (group) {
    geonorms = await calculateGEOnorms(group.id, assignment.assessment_id, dimensionIds)
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

  // Build dimension reports
  const dimensionReports: DimensionReport[] = []

  for (const dimension of dimensions) {
    const scoreData = dimensionScores?.find((ds) => ds.dimension_id === dimension.id)
    if (!scoreData) continue

    const targetScore = scoreData.avg_score || 0
    const industryBenchmark = benchmarkMap.get(dimension.id) || null
    const geonorm = geonorms.get(dimension.id)

    // Determine if improvement is needed
    const improvementNeeded =
      (industryBenchmark !== null && targetScore < industryBenchmark) ||
      (geonorm !== undefined && targetScore < geonorm.avg_score)

    // Get specific feedback for this dimension
    const specificFeedback = assignedFeedback.find(
      (f) => f.dimension_id === dimension.id && f.type === 'specific'
    )

    dimensionReports.push({
      dimension_id: dimension.id,
      dimension_name: dimension.name,
      dimension_code: dimension.code,
      target_score: targetScore,
      industry_benchmark: industryBenchmark,
      geonorm: geonorm?.avg_score || null,
      geonorm_participant_count: geonorm?.participant_count || 0,
      improvement_needed: improvementNeeded,
      specific_feedback: specificFeedback?.feedback_content || null,
      specific_feedback_id: specificFeedback?.feedback_id || null,
    })
  }

  // Calculate overall score (mean of all dimension scores)
  const overallScore =
    dimensionReports.length > 0
      ? dimensionReports.reduce((sum, dr) => sum + dr.target_score, 0) /
        dimensionReports.length
      : 0

  // Get overall feedback
  const overallFeedback = assignedFeedback.find(
    (f) => f.dimension_id === null && f.type === 'overall'
  )

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
    overall_feedback: overallFeedback?.feedback_content || null,
    overall_feedback_id: overallFeedback?.feedback_id || null,
    generated_at: new Date().toISOString(),
  }
}
