/**
 * Extract subjects/targets from survey assignments
 * 
 * For all assessments (360, Leaders, Blockers): Returns targets (people being rated)
 * Multiple assignments can rate the same target, and assignment_count shows how many data points each target has
 */

import { createAdminClient } from '@/lib/supabase/admin'

// Note: This function uses admin client and should only be called from server-side code
// If called from client components, use an API route wrapper instead

export interface Subject {
  id: string
  name: string
  email: string
  assignment_count: number
  assignment_ids: string[]
}

export async function getSurveySubjects(
  assignments: Array<{
    id: string
    user_id: string
    target_id: string | null
    completed: boolean
  }>,
  assessment: { is_360: boolean }
): Promise<Subject[]> {
  const adminClient = createAdminClient()

  // For all assessments (360, Leaders, Blockers): Extract unique targets from target_id
  // Multiple assignments can rate the same target, showing multiple data points per target
  const targetIds = new Set<string>()
  const targetAssignmentMap = new Map<string, string[]>() // target_id -> assignment_ids

  assignments.forEach(assignment => {
    if (assignment.target_id) {
      targetIds.add(assignment.target_id)
      if (!targetAssignmentMap.has(assignment.target_id)) {
        targetAssignmentMap.set(assignment.target_id, [])
      }
      targetAssignmentMap.get(assignment.target_id)!.push(assignment.id)
    }
  })

  if (targetIds.size === 0) {
    return []
  }

  // Load target profiles
  const { data: targets, error } = await adminClient
    .from('profiles')
    .select('id, name, email')
    .in('id', Array.from(targetIds))

  if (error || !targets) {
    console.error('Error loading targets:', error)
    return []
  }

  // Build subjects array
  return targets.map(target => ({
    id: target.id,
    name: target.name || 'Unknown',
    email: target.email || '',
    assignment_count: targetAssignmentMap.get(target.id)?.length || 0,
    assignment_ids: targetAssignmentMap.get(target.id) || [],
  }))
}
