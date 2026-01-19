/**
 * Calculate GEOnorms (group norms) on-demand for report generation
 * 
 * GEOnorms are calculated from all completed assignments in a group for a specific
 * assessment and dimension. This provides a snapshot of historical data at the
 * time the report is generated.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface GEOnorm {
  dimension_id: string
  avg_score: number
  participant_count: number
}

/**
 * Calculate GEOnorms for a group, assessment, and set of dimensions
 * 
 * @param groupId - The group ID
 * @param assessmentId - The assessment ID
 * @param dimensionIds - Array of dimension IDs to calculate norms for
 * @returns Map of dimension_id -> GEOnorm
 */
export async function calculateGEOnorms(
  groupId: string,
  assessmentId: string,
  dimensionIds: string[]
): Promise<Map<string, GEOnorm>> {
  const adminClient = createAdminClient()

  if (dimensionIds.length === 0) {
    return new Map()
  }

  // Get all group members
  const { data: groupMembers } = await adminClient
    .from('group_members')
    .select('profile_id')
    .eq('group_id', groupId)

  if (!groupMembers || groupMembers.length === 0) {
    return new Map()
  }

  const memberIds = groupMembers.map((gm) => gm.profile_id)

  // Get all completed assignments for group members and this assessment
  const { data: assignments } = await adminClient
    .from('assignments')
    .select('id, user_id')
    .in('user_id', memberIds)
    .eq('assessment_id', assessmentId)
    .eq('completed', true)

  if (!assignments || assignments.length === 0) {
    return new Map()
  }

  const assignmentIds = assignments.map((a) => a.id)

  // Get dimension scores for all these assignments
  const { data: dimensionScores } = await adminClient
    .from('assignment_dimension_scores')
    .select('assignment_id, dimension_id, avg_score')
    .in('assignment_id', assignmentIds)
    .in('dimension_id', dimensionIds)

  if (!dimensionScores || dimensionScores.length === 0) {
    return new Map()
  }

  // Calculate average score per dimension
  const geonorms = new Map<string, GEOnorm>()

  for (const dimensionId of dimensionIds) {
    const scoresForDimension = dimensionScores.filter(
      (ds) => ds.dimension_id === dimensionId
    )

    if (scoresForDimension.length === 0) {
      continue
    }

    const avgScore =
      scoresForDimension.reduce((sum, ds) => sum + (ds.avg_score || 0), 0) /
      scoresForDimension.length

    geonorms.set(dimensionId, {
      dimension_id: dimensionId,
      avg_score: avgScore,
      participant_count: scoresForDimension.length,
    })
  }

  return geonorms
}

/**
 * Calculate GEOnorm for a single dimension
 * 
 * @param groupId - The group ID
 * @param assessmentId - The assessment ID
 * @param dimensionId - The dimension ID
 * @returns GEOnorm or null if no data
 */
export async function calculateGEOnormForDimension(
  groupId: string,
  assessmentId: string,
  dimensionId: string
): Promise<GEOnorm | null> {
  const geonorms = await calculateGEOnorms(groupId, assessmentId, [dimensionId])
  return geonorms.get(dimensionId) || null
}
