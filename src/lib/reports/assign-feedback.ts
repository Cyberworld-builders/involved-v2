/**
 * Assign feedback to an assignment's report
 * 
 * For non-360 assessments:
 * - Randomly selects ONE specific feedback entry for each dimension
 * - Randomly selects ONE overall feedback entry
 * 
 * For 360 assessments:
 * - Uses text input answers from assessments (no feedback library)
 */

import { createAdminClient } from '@/lib/supabase/admin'

interface FeedbackAssignment {
  dimension_id: string | null
  feedback_id: string
  feedback_content: string
  type: 'overall' | 'specific'
}

/**
 * Assign feedback to a non-360 assessment report
 */
export async function assignFeedbackToReport(
  assignmentId: string,
  assessmentId: string
): Promise<FeedbackAssignment[]> {
  const adminClient = createAdminClient()

  // Get all dimension scores for this assignment
  const { data: dimensionScores } = await adminClient
    .from('assignment_dimension_scores')
    .select('dimension_id, avg_score')
    .eq('assignment_id', assignmentId)

  if (!dimensionScores || dimensionScores.length === 0) {
    return []
  }

  const assignedFeedback: FeedbackAssignment[] = []

  // For each dimension, assign overall and specific feedback
  for (const dimensionScore of dimensionScores) {
    if (!dimensionScore.dimension_id) continue

    // Get overall feedback for this dimension (should be only one)
    const { data: overallFeedback } = await adminClient
      .from('feedback_library')
      .select('id, feedback, min_score, max_score')
      .eq('assessment_id', assessmentId)
      .eq('dimension_id', dimensionScore.dimension_id)
      .eq('type', 'overall')
      .maybeSingle()

    // Assign overall feedback if it exists and score matches (if score range specified)
    if (overallFeedback) {
      const score = dimensionScore.avg_score
      let eligible = true
      if (overallFeedback.min_score !== null && score < overallFeedback.min_score) eligible = false
      if (overallFeedback.max_score !== null && score > overallFeedback.max_score) eligible = false

      if (eligible) {
        assignedFeedback.push({
          dimension_id: dimensionScore.dimension_id,
          feedback_id: overallFeedback.id,
          feedback_content: overallFeedback.feedback,
          type: 'overall',
        })
      }
    }

    // Get all specific feedback entries for this dimension and assessment
    const { data: specificFeedback } = await adminClient
      .from('feedback_library')
      .select('id, feedback, min_score, max_score')
      .eq('assessment_id', assessmentId)
      .eq('dimension_id', dimensionScore.dimension_id)
      .eq('type', 'specific')

    if (!specificFeedback || specificFeedback.length === 0) {
      continue
    }

    // Filter by score range if specified
    const eligibleFeedback = specificFeedback.filter((f) => {
      const score = dimensionScore.avg_score
      if (f.min_score !== null && score < f.min_score) return false
      if (f.max_score !== null && score > f.max_score) return false
      return true
    })

    if (eligibleFeedback.length === 0) {
      continue
    }

    // Randomly select ONE specific feedback entry
    const selected = eligibleFeedback[Math.floor(Math.random() * eligibleFeedback.length)]

    assignedFeedback.push({
      dimension_id: dimensionScore.dimension_id,
      feedback_id: selected.id,
      feedback_content: selected.feedback,
      type: 'specific',
    })
  }

  return assignedFeedback
}

/**
 * Get text feedback from 360 assessment answers
 */
export async function get360TextFeedback(
  assignmentId: string,
  targetId: string
): Promise<Array<{ dimension_id: string | null; feedback: string }>> {
  const adminClient = createAdminClient()

  // Get all assignments for this target (360 assessments)
  const { data: targetAssignments } = await adminClient
    .from('assignments')
    .select('id, assessment_id')
    .eq('target_id', targetId)
    .eq('completed', true)

  if (!targetAssignments || targetAssignments.length === 0) {
    return []
  }

  // Get all text input answers from these assignments
  const { data: textAnswers } = await adminClient
    .from('answers')
    .select(`
      value,
      field:fields!answers_field_id_fkey(
        dimension_id,
        type
      )
    `)
    .in('assignment_id', targetAssignments.map((a) => a.id))
    .eq('fields.type', 'text_input')

  if (!textAnswers || textAnswers.length === 0) {
    return []
  }

  // Group by dimension
  const feedbackByDimension = new Map<string | null, string[]>()
  
  textAnswers.forEach((answer) => {
    // Type assertion for nested object (Supabase returns arrays for relations)
    const field = (answer.field as unknown) as { dimension_id: string | null; type: string } | null
    const dimensionId = field?.dimension_id || null
    if (!feedbackByDimension.has(dimensionId)) {
      feedbackByDimension.set(dimensionId, [])
    }
    feedbackByDimension.get(dimensionId)!.push(answer.value)
  })

  // Convert to array format
  const feedback: Array<{ dimension_id: string | null; feedback: string }> = []
  feedbackByDimension.forEach((texts, dimensionId) => {
    feedback.push({
      dimension_id: dimensionId,
      feedback: texts.join('\n\n'), // Combine multiple text inputs
    })
  })

  return feedback
}
