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

  // Fetch survey metadata from the surveys table
  const { data: surveyRow, error: surveyError } = await adminClient
    .from('surveys')
    .select(`
      id,
      name,
      assessment_id,
      created_at,
      assessment:assessments!surveys_assessment_id_fkey(
        id,
        title,
        is_360
      )
    `)
    .eq('id', surveyId)
    .single()

  if (surveyError || !surveyRow) {
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
      expires,
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
    expires?: string | null
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
      expires: row.expires ?? null,
      user_name: user?.name ?? null,
      user_email: user?.email ?? null,
      target_name: target?.name ?? null,
      target_email: target?.email ?? null,
    }
  })

  // Type assertion for assessment
  const assessment = (surveyRow.assessment as unknown) as {
    id: string
    title: string
    is_360: boolean
  } | null

  if (!assessment) {
    redirect(`/dashboard/clients/${clientId}?tab=reports`)
  }

  // Build survey metadata for the client component
  const surveyMeta = {
    id: surveyRow.id,
    name: surveyRow.name as string | null,
    created_at: surveyRow.created_at,
  }

  // Get subjects and scores on the server (these functions use admin client)
  let subjects: Subject[] = []
  let scores: Map<string, ScoreData> = new Map()
  
  try {
    subjects = await getSurveySubjects(validAssignments)
    scores = await getSurveyScores(subjects, validAssignments, assessment)
  } catch (error) {
    console.error('Error loading survey subjects/scores:', error)
    // Continue with empty data rather than redirecting - let the client handle the error display
  }

  // Convert Map to plain object for serialization
  const scoresObject: Record<string, ScoreData> = {}
  scores.forEach((value, key) => {
    scoresObject[key] = value
  })

  return (
    <SurveyDetailClient
      clientId={clientId}
      surveyId={surveyId}
      surveyMeta={surveyMeta}
      assessment={assessment}
      assignments={validAssignments}
      initialSubjects={subjects}
      initialScores={scoresObject}
    />
  )
}
