import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SurveyDetailClient from './survey-detail-client'
import { getSurveySubjects, Subject } from '@/lib/reports/get-survey-subjects'
import { getSurveyScores, ScoreData } from '@/lib/reports/get-survey-scores'

interface SurveyDetailPageProps {
  params: Promise<{
    id: string
    surveyId: string
  }>
}

export default async function SurveyDetailPage({ params }: SurveyDetailPageProps) {
  const { id: clientId, surveyId } = await params
  const adminClient = createAdminClient()

  // Validate survey exists and get first assignment to determine assessment
  const { data: firstAssignment, error: assignmentError } = await adminClient
    .from('assignments')
    .select(`
      id,
      assessment_id,
      created_at,
      assessment:assessments!assignments_assessment_id_fkey(
        id,
        title,
        is_360
      )
    `)
    .eq('survey_id', surveyId)
    .limit(1)
    .single()

  if (assignmentError || !firstAssignment) {
    redirect(`/dashboard/clients/${clientId}?tab=reports`)
  }

  // Get all assignments for this survey (with rater and target names for Data Collection Status)
  const { data: assignments, error: assignmentsError } = await adminClient
    .from('assignments')
    .select(`
      id,
      user_id,
      target_id,
      assessment_id,
      completed,
      completed_at,
      created_at,
      started_at,
      user:profiles!assignments_user_id_fkey(id, name, email),
      target:profiles!assignments_target_id_fkey(id, name, email)
    `)
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: true })

  if (assignmentsError || !assignments) {
    redirect(`/dashboard/clients/${clientId}?tab=reports`)
  }

  // Verify all assignments belong to this client
  const { data: clientUsers } = await adminClient
    .from('profiles')
    .select('id')
    .eq('client_id', clientId)

  if (!clientUsers) {
    redirect(`/dashboard/clients/${clientId}?tab=reports`)
  }

  const clientUserIds = new Set(clientUsers.map(u => u.id))
  const validAssignmentsRaw = assignments.filter(a => clientUserIds.has(a.user_id))

  if (validAssignmentsRaw.length === 0) {
    redirect(`/dashboard/clients/${clientId}?tab=reports`)
  }

  // Normalize assignments for client: flatten user/target relation (Supabase may return array or object)
  type AssignmentRow = (typeof assignments)[0] & {
    user?: { id: string; name: string; email: string } | Array<{ id: string; name: string; email: string }>
    target?: { id: string; name: string; email: string } | Array<{ id: string; name: string; email: string }> | null
    started_at?: string | null
  }
  const validAssignments = validAssignmentsRaw.map((a) => {
    const row = a as unknown as AssignmentRow
    const user = row.user != null ? (Array.isArray(row.user) ? row.user[0] : row.user) : null
    const target = row.target != null ? (Array.isArray(row.target) ? row.target[0] : row.target) : null
    return {
      id: row.id,
      user_id: row.user_id,
      target_id: row.target_id,
      assessment_id: row.assessment_id,
      completed: row.completed,
      completed_at: row.completed_at,
      created_at: row.created_at,
      started_at: row.started_at ?? null,
      user_name: user?.name ?? null,
      user_email: user?.email ?? null,
      target_name: target?.name ?? null,
      target_email: target?.email ?? null,
    }
  })

  // Type assertion for assessment
  const assessment = (firstAssignment.assessment as unknown) as {
    id: string
    title: string
    is_360: boolean
  } | null

  if (!assessment) {
    redirect(`/dashboard/clients/${clientId}?tab=reports`)
  }

  // Get subjects and scores on the server (these functions use admin client)
  let subjects: Subject[] = []
  let scores: Map<string, ScoreData> = new Map()
  
  // #region agent log
  console.log('[DEBUG] About to get subjects', {
    validAssignmentCount: validAssignments.length,
    assessmentId: assessment.id,
    is360: assessment.is_360,
    assignmentUserIds: validAssignments.map(a => a.user_id),
    assignmentTargetIds: validAssignments.map(a => a.target_id).filter(Boolean)
  })
  // #endregion
  
  try {
    subjects = await getSurveySubjects(validAssignments)
    
    // #region agent log
    console.log('[DEBUG] Got subjects', {
      subjectCount: subjects.length,
      subjects: subjects.map(s => ({ id: s.id, name: s.name, assignmentCount: s.assignment_count }))
    })
    // #endregion
    
    scores = await getSurveyScores(subjects, validAssignments, assessment)
    
    // #region agent log
    console.log('[DEBUG] Got scores', { scoresCount: scores.size })
    // #endregion
  } catch (error) {
    // #region agent log
    console.error('[DEBUG] Error getting subjects/scores', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    })
    // #endregion
    console.error('Error loading survey subjects/scores:', error)
    // Continue with empty data rather than redirecting - let the client handle the error display
  }

  // Convert Map to plain object for serialization
  const scoresObject: Record<string, ScoreData> = {}
  scores.forEach((value, key) => {
    scoresObject[key] = value
  })

  // #region agent log
  console.log('[DEBUG] SurveyDetailPage: Passing data to client', {
    subjectCount: subjects.length,
    subjects: subjects.map(s => ({ id: s.id, name: s.name })),
    assignmentCount: validAssignments.length,
    scoresCount: scores.size,
    scoresObjectKeys: Object.keys(scoresObject)
  })
  // #endregion

  return (
    <SurveyDetailClient
      clientId={clientId}
      surveyId={surveyId}
      assessment={assessment}
      assignments={validAssignments}
      initialSubjects={subjects}
      initialScores={scoresObject}
    />
  )
}
