/**
 * Get scores for subjects in a survey
 * 
 * For 360: Aggregates scores across all raters for each target
 * For Leaders/Blockers: Gets score for each subject's assignment
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { Subject } from './get-survey-subjects'

export interface ScoreData {
  overall_score: number | null
  dimension_scores: Record<string, number>
  has_report: boolean
}

export async function getSurveyScores(
  subjects: Subject[],
  assignments: Array<{
    id: string
    user_id: string
    target_id: string | null
    assessment_id: string
  }>,
  assessment: { is_360: boolean }
): Promise<Map<string, ScoreData>> {
  const adminClient = createAdminClient()
  const scoresMap = new Map<string, ScoreData>()

  if (assessment.is_360) {
    // For 360: Aggregate scores across all raters for each target
    for (const subject of subjects) {
      // Get all assignments that rated this target
      const targetAssignments = assignments.filter(a => 
        a.target_id === subject.id && subject.assignment_ids.includes(a.id)
      )

      if (targetAssignments.length === 0) {
        scoresMap.set(subject.id, {
          overall_score: null,
          dimension_scores: {},
          has_report: false,
        })
        continue
      }

      const assignmentIds = targetAssignments.map(a => a.id)

      // Get report_data for these assignments
      const { data: reportData } = await adminClient
        .from('report_data')
        .select('assignment_id, overall_score, dimension_scores')
        .in('assignment_id', assignmentIds)

      if (!reportData || reportData.length === 0) {
        // Try calculating from assignment_dimension_scores
        const { data: dimensionScores } = await adminClient
          .from('assignment_dimension_scores')
          .select('dimension_id, avg_score')
          .in('assignment_id', assignmentIds)

        if (dimensionScores && dimensionScores.length > 0) {
          // Calculate average across all dimensions and all assignments
          const allScores = dimensionScores.map(ds => ds.avg_score || 0)
          const overallScore = allScores.length > 0
            ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
            : null

          // Group by dimension
          const dimScores: Record<string, number> = {}
          dimensionScores.forEach(ds => {
            if (ds.dimension_id && ds.avg_score !== null) {
              dimScores[ds.dimension_id] = ds.avg_score
            }
          })

          scoresMap.set(subject.id, {
            overall_score: overallScore,
            dimension_scores: dimScores,
            has_report: false,
          })
        } else {
          scoresMap.set(subject.id, {
            overall_score: null,
            dimension_scores: {},
            has_report: false,
          })
        }
      } else {
        // Aggregate scores from report_data
        const validScores = reportData
          .map(rd => rd.overall_score)
          .filter((score): score is number => score !== null)

        const overallScore = validScores.length > 0
          ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length
          : null

        // Aggregate dimension scores
        const dimScores: Record<string, number[]> = {}
        reportData.forEach(rd => {
          if (rd.dimension_scores && typeof rd.dimension_scores === 'object') {
            Object.entries(rd.dimension_scores).forEach(([dimId, score]) => {
              if (typeof score === 'number') {
                if (!dimScores[dimId]) {
                  dimScores[dimId] = []
                }
                dimScores[dimId].push(score)
              }
            })
          }
        })

        const aggregatedDimScores: Record<string, number> = {}
        Object.entries(dimScores).forEach(([dimId, scores]) => {
          aggregatedDimScores[dimId] = scores.reduce((sum, s) => sum + s, 0) / scores.length
        })

        scoresMap.set(subject.id, {
          overall_score: overallScore,
          dimension_scores: aggregatedDimScores,
          has_report: true,
        })
      }
    }
  } else {
    // For Leaders/Blockers: Get score for each subject's assignment
    for (const subject of subjects) {
      // Get the assignment for this subject (should be one for self-assessment)
      const subjectAssignment = assignments.find(a => 
        a.user_id === subject.id && subject.assignment_ids.includes(a.id)
      )

      if (!subjectAssignment) {
        scoresMap.set(subject.id, {
          overall_score: null,
          dimension_scores: {},
          has_report: false,
        })
        continue
      }

      // Get report_data for this assignment
      const { data: reportData } = await adminClient
        .from('report_data')
        .select('overall_score, dimension_scores')
        .eq('assignment_id', subjectAssignment.id)
        .single()

      if (reportData) {
        const dimScores: Record<string, number> = {}
        if (reportData.dimension_scores && typeof reportData.dimension_scores === 'object') {
          Object.entries(reportData.dimension_scores).forEach(([dimId, score]) => {
            if (typeof score === 'number') {
              dimScores[dimId] = score
            }
          })
        }

        scoresMap.set(subject.id, {
          overall_score: reportData.overall_score,
          dimension_scores: dimScores,
          has_report: true,
        })
      } else {
        // Try calculating from assignment_dimension_scores
        const { data: dimensionScores } = await adminClient
          .from('assignment_dimension_scores')
          .select('dimension_id, avg_score')
          .eq('assignment_id', subjectAssignment.id)

        if (dimensionScores && dimensionScores.length > 0) {
          const allScores = dimensionScores.map(ds => ds.avg_score || 0)
          const overallScore = allScores.length > 0
            ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
            : null

          const dimScores: Record<string, number> = {}
          dimensionScores.forEach(ds => {
            if (ds.dimension_id && ds.avg_score !== null) {
              dimScores[ds.dimension_id] = ds.avg_score
            }
          })

          scoresMap.set(subject.id, {
            overall_score: overallScore,
            dimension_scores: dimScores,
            has_report: false,
          })
        } else {
          scoresMap.set(subject.id, {
            overall_score: null,
            dimension_scores: {},
            has_report: false,
          })
        }
      }
    }
  }

  return scoresMap
}
