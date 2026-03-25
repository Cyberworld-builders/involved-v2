import { SupabaseClient } from '@supabase/supabase-js'

export interface SurveySnapshot {
  snapshot_version: 1
  exported_at: string
  survey_id: string
  client_id: string
  assessment_id: string
  created_by: string
  label?: string

  assessment: Record<string, unknown>
  dimensions: Record<string, unknown>[]
  fields: Record<string, unknown>[]
  benchmarks: Record<string, unknown>[]
  industries: Record<string, unknown>[]
  clients: Record<string, unknown>[]
  groups: Record<string, unknown>[]
  group_members: Record<string, unknown>[]
  profiles: Record<string, unknown>[]
  assignments: Record<string, unknown>[]
  answers: Record<string, unknown>[]
  report_data: Record<string, unknown>[]
  assignment_dimension_scores: Record<string, unknown>[]

  pdfs: { assignment_id: string; original_path: string; snapshot_path: string }[]
}

/**
 * Collect all data for a survey into a snapshot object.
 * Uses the admin client to bypass RLS.
 */
export async function collectSurveyData(
  adminClient: SupabaseClient,
  surveyId: string,
  clientId: string,
  assessmentId: string,
  createdBy: string,
  label?: string
): Promise<SurveySnapshot> {
  // Get assessment
  const { data: assessment } = await adminClient
    .from('assessments')
    .select('*')
    .eq('id', assessmentId)
    .single()
  if (!assessment) throw new Error('Assessment not found')

  // Get dimensions
  const { data: dimensions } = await adminClient
    .from('dimensions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('sort_order')

  // Get fields (questions + definitions)
  const { data: fields } = await adminClient
    .from('fields')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('order')

  // Get benchmarks via dimension IDs
  const dimIds = (dimensions || []).map((d: Record<string, unknown>) => d.id as string)
  let benchmarks: Record<string, unknown>[] = []
  if (dimIds.length > 0) {
    const { data } = await adminClient.from('benchmarks').select('*').in('dimension_id', dimIds)
    benchmarks = data || []
  }

  // Get industries referenced by benchmarks
  const industryIds = [...new Set(benchmarks.map(b => b.industry_id as string).filter(Boolean))]
  let industries: Record<string, unknown>[] = []
  if (industryIds.length > 0) {
    const { data } = await adminClient.from('industries').select('*').in('id', industryIds)
    industries = data || []
  }

  // Get assignments for this survey
  const { data: assignments } = await adminClient
    .from('assignments')
    .select('*')
    .eq('survey_id', surveyId)

  const assignmentIds = (assignments || []).map((a: Record<string, unknown>) => a.id as string)

  // Get answers (paginated for large surveys)
  let allAnswers: Record<string, unknown>[] = []
  if (assignmentIds.length > 0) {
    for (let i = 0; i < assignmentIds.length; i += 20) {
      const batch = assignmentIds.slice(i, i + 20)
      const { data } = await adminClient.from('answers').select('*').in('assignment_id', batch)
      if (data) allAnswers = allAnswers.concat(data)
    }
  }

  // Get report_data
  let reportData: Record<string, unknown>[] = []
  if (assignmentIds.length > 0) {
    const { data } = await adminClient.from('report_data').select('*').in('assignment_id', assignmentIds)
    reportData = data || []
  }

  // Get assignment_dimension_scores
  let dimScores: Record<string, unknown>[] = []
  if (assignmentIds.length > 0) {
    const { data } = await adminClient.from('assignment_dimension_scores').select('*').in('assignment_id', assignmentIds)
    dimScores = data || []
  }

  // Get groups referenced by assignments
  const groupIds = [...new Set((assignments || []).map((a: Record<string, unknown>) => a.group_id as string).filter(Boolean))]
  let groups: Record<string, unknown>[] = []
  let groupMembers: Record<string, unknown>[] = []
  if (groupIds.length > 0) {
    const { data: g } = await adminClient.from('groups').select('*').in('id', groupIds)
    groups = g || []
    const { data: gm } = await adminClient.from('group_members').select('*').in('group_id', groupIds)
    groupMembers = gm || []
  }

  // Collect all user IDs
  const userIds = [...new Set([
    ...(assignments || []).map((a: Record<string, unknown>) => a.user_id as string),
    ...(assignments || []).map((a: Record<string, unknown>) => a.target_id as string).filter(Boolean),
    ...groupMembers.map((m: Record<string, unknown>) => m.profile_id as string),
  ])]

  let profiles: Record<string, unknown>[] = []
  if (userIds.length > 0) {
    const { data } = await adminClient
      .from('profiles')
      .select('id, name, email, client_id, access_level')
      .in('id', userIds)
    profiles = data || []
  }

  // Get client
  const { data: client } = await adminClient.from('clients').select('*').eq('id', clientId).single()

  return {
    snapshot_version: 1,
    exported_at: new Date().toISOString(),
    survey_id: surveyId,
    client_id: clientId,
    assessment_id: assessmentId,
    created_by: createdBy,
    label,

    assessment,
    dimensions: dimensions || [],
    fields: fields || [],
    benchmarks,
    industries,
    clients: client ? [client] : [],
    groups,
    group_members: groupMembers,
    profiles,
    assignments: assignments || [],
    answers: allAnswers,
    report_data: reportData,
    assignment_dimension_scores: dimScores,

    pdfs: [], // Populated separately after JSON upload
  }
}
