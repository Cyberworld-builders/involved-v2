/**
 * Raw survey data CSV export
 *
 * Exports individual user responses for a survey — not aggregated scores.
 * Each row is one user's answer to one question.
 * This is for internal data verification only, never shown to clients.
 */

import { createAdminClient } from '@/lib/supabase/admin'

function escapeCsv(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function exportSurveyRawCSV(surveyId: string): Promise<string> {
  const adminClient = createAdminClient()

  // Get survey metadata
  const { data: survey } = await adminClient
    .from('surveys')
    .select('id, assessment_id, client_id, name, created_at, assessment:assessments(title)')
    .eq('id', surveyId)
    .single()

  if (!survey) throw new Error('Survey not found')

  // Get all assignments for this survey with user and target info
  const { data: assignments } = await adminClient
    .from('assignments')
    .select(`
      id, user_id, target_id, completed, started_at, completed_at,
      user:profiles!assignments_user_id_fkey(id, name, email),
      target:profiles!assignments_target_id_fkey(id, name, email)
    `)
    .eq('survey_id', surveyId)

  if (!assignments || assignments.length === 0) {
    return 'No assignments found for this survey'
  }

  // Get all fields (questions) for the assessment
  const { data: fields } = await adminClient
    .from('fields')
    .select('id, type, content, dimension_id, order')
    .eq('assessment_id', survey.assessment_id)
    .in('type', ['multiple_choice', 'text_input'])
    .order('order')

  // Get dimensions for name lookup
  const { data: dimensions } = await adminClient
    .from('dimensions')
    .select('id, name, code')
    .eq('assessment_id', survey.assessment_id)

  const dimMap = new Map((dimensions || []).map(d => [d.id, d]))

  // Get all answers for these assignments
  const assignmentIds = assignments.map(a => a.id)
  let allAnswers: Array<{ assignment_id: string; field_id: string; value: string; time?: number }> = []
  for (let i = 0; i < assignmentIds.length; i += 20) {
    const batch = assignmentIds.slice(i, i + 20)
    const { data } = await adminClient
      .from('answers')
      .select('assignment_id, field_id, value, time')
      .in('assignment_id', batch)
    if (data) allAnswers = allAnswers.concat(data)
  }

  // Build answer lookup: assignment_id:field_id -> answer
  const answerMap = new Map<string, { value: string; time?: number }>()
  for (const a of allAnswers) {
    answerMap.set(`${a.assignment_id}:${a.field_id}`, { value: a.value, time: a.time })
  }

  // Get anchors for multiple choice fields to resolve numeric values to labels
  const { data: mcFields } = await adminClient
    .from('fields')
    .select('id, anchors')
    .eq('assessment_id', survey.assessment_id)
    .eq('type', 'multiple_choice')

  const anchorMap = new Map<string, Array<{ name: string; value: number }>>()
  for (const f of mcFields || []) {
    if (f.anchors && Array.isArray(f.anchors)) {
      anchorMap.set(f.id, f.anchors as Array<{ name: string; value: number }>)
    }
  }

  // Build CSV
  const lines: string[] = []

  // Header
  const assessmentTitle = ((survey.assessment as unknown) as { title: string })?.title || 'Unknown'
  lines.push(`Survey Raw Data Export`)
  lines.push(`Assessment: ${escapeCsv(assessmentTitle)}`)
  lines.push(`Survey ID: ${escapeCsv(survey.id)}`)
  lines.push(`Exported: ${new Date().toISOString()}`)
  lines.push('')

  // Column headers
  lines.push([
    'User Name',
    'User Email',
    'Target Name',
    'Target Email',
    'Assignment Status',
    'Dimension',
    'Dimension Code',
    'Question Type',
    'Question',
    'Raw Value',
    'Label',
    'Response Time (s)',
  ].map(escapeCsv).join(','))

  // Data rows: one per user per question
  for (const assignment of assignments) {
    const user = (assignment.user as unknown) as { name: string; email: string } | null
    const target = (assignment.target as unknown) as { name: string; email: string } | null
    const status = assignment.completed ? 'Completed' : (assignment.started_at ? 'In Progress' : 'Not Started')

    for (const field of fields || []) {
      const dim = field.dimension_id ? dimMap.get(field.dimension_id) : null
      const answer = answerMap.get(`${assignment.id}:${field.id}`)

      // Strip HTML from question content for CSV
      const questionText = (field.content || '').replace(/<[^>]+>/g, '').substring(0, 200)

      let rawValue = answer?.value ?? ''
      let label = ''

      if (field.type === 'multiple_choice' && answer) {
        const anchors = anchorMap.get(field.id)
        const idx = parseInt(answer.value)
        if (anchors && !isNaN(idx) && idx >= 0 && idx < anchors.length) {
          label = anchors[idx].name
        }
        rawValue = answer.value
      } else if (field.type === 'text_input' && answer) {
        rawValue = answer.value
        label = answer.value
      }

      lines.push([
        user?.name || '',
        user?.email || '',
        target?.name || '',
        target?.email || '',
        status,
        dim?.name || '',
        dim?.code || '',
        field.type,
        questionText,
        rawValue,
        label,
        answer?.time?.toString() || '',
      ].map(escapeCsv).join(','))
    }
  }

  return lines.join('\n')
}
