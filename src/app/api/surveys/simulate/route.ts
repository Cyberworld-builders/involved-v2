import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type WriteLine = (text: string) => void

async function runSimulation(
  request: NextRequest,
  body: { group_id: string; assessment_id: string },
  writeLine: WriteLine
) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    writeLine(JSON.stringify({ done: true, error: 'Unauthorized' }))
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('access_level')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.access_level !== 'super_admin') {
    writeLine(JSON.stringify({ done: true, error: 'Forbidden: Super admin access required' }))
    return
  }

  const { group_id, assessment_id } = body

  if (!group_id || !assessment_id) {
    writeLine(JSON.stringify({ done: true, error: 'group_id and assessment_id are required' }))
    return
  }

  writeLine('Starting simulation...')

  const { data: group, error: groupError } = await adminClient
    .from('groups')
    .select(`
      id,
      name,
      client_id,
      target_id,
      group_members(
        id,
        profile_id,
        position,
        leader
      )
    `)
    .eq('id', group_id)
    .single()

  if (groupError || !group) {
    writeLine(JSON.stringify({ done: true, error: 'Group not found' }))
    return
  }

  const groupMembers = (group.group_members as unknown) as Array<{
    id: string
    profile_id: string
    position: string | null
    leader: boolean
  }> | null

  if (!groupMembers || groupMembers.length === 0) {
    writeLine(JSON.stringify({ done: true, error: 'Group has no members' }))
    return
  }

  writeLine(`Fetched group "${group.name}" with ${groupMembers.length} member(s).`)

  const { data: assessment, error: assessmentError } = await adminClient
    .from('assessments')
    .select('id, title, is_360')
    .eq('id', assessment_id)
    .single()

  if (assessmentError || !assessment) {
    writeLine(JSON.stringify({ done: true, error: 'Assessment not found' }))
    return
  }

  // Validation: block re-simulation for same group + assessment (existing completed assignments)
  const memberIds = groupMembers.map((m) => m.profile_id)
  let existingQuery = adminClient
    .from('assignments')
    .select('id')
    .eq('assessment_id', assessment_id)
    .eq('completed', true)
    .in('user_id', memberIds)
  if (group.target_id != null) {
    existingQuery = existingQuery.eq('target_id', group.target_id)
  } else {
    existingQuery = existingQuery.is('target_id', null)
  }
  const { data: existingForGroup } = await existingQuery.limit(1)
  if (existingForGroup && existingForGroup.length > 0) {
    writeLine(JSON.stringify({
      done: true,
      error: 'This group has already been simulated for this assessment. Delete the existing test data first (e.g. "Delete Test Data" on the report page) or choose a different group.',
    }))
    return
  }

  const { data: fields, error: fieldsError } = await adminClient
    .from('fields')
    .select('id, type, dimension_id, anchors, content, order')
    .eq('assessment_id', assessment_id)
    .order('order', { ascending: true })

  if (fieldsError) {
    writeLine(JSON.stringify({ done: true, error: 'Failed to fetch assessment fields' }))
    return
  }

  const answerableFields = (fields || []).filter(
    (field) => field.type === 'multiple_choice' || field.type === 'text_input'
  )

  if (answerableFields.length === 0) {
    writeLine(JSON.stringify({ done: true, error: 'Assessment has no answerable questions' }))
    return
  }

  writeLine(`Fetched assessment "${assessment.title}" with ${answerableFields.length} answerable question(s).`)

  const assignmentIds: string[] = []
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)
  const surveyId = crypto.randomUUID()

  writeLine('Creating assignments and answers...')

  const total = groupMembers.length
  for (let i = 0; i < groupMembers.length; i++) {
    const member = groupMembers[i]
    const num = i + 1
    writeLine(`  Member ${num}/${total}: profile ${member.profile_id.slice(0, 8)}...`)

    const { data: existingAssignment } = await adminClient
      .from('assignments')
      .select('id')
      .eq('user_id', member.profile_id)
      .eq('assessment_id', assessment_id)
      .eq('target_id', group.target_id || null)
      .single()

    let assignmentId: string

    if (existingAssignment) {
      assignmentId = existingAssignment.id
      await adminClient.from('answers').delete().eq('assignment_id', assignmentId)
      await adminClient
        .from('assignments')
        .update({ survey_id: surveyId, group_id: group.id })
        .eq('id', assignmentId)
      writeLine(`    Using existing assignment ${assignmentId.slice(0, 8)}...`)
    } else {
      const targetIdForAssignment = group.target_id || null
      const { data: newAssignment, error: assignError } = await adminClient
        .from('assignments')
        .insert({
          user_id: member.profile_id,
          assessment_id: assessment_id,
          target_id: targetIdForAssignment,
          group_id: group.id,
          survey_id: surveyId,
          expires: expiresAt.toISOString(),
          completed: false,
          started_at: new Date().toISOString(),
        })
        .select('id, survey_id, user_id, target_id')
        .single()

      if (assignError || !newAssignment) {
        writeLine(`    Failed to create assignment: ${assignError?.message ?? 'Unknown error'}`)
        continue
      }

      assignmentId = newAssignment.id
      writeLine(`    Created assignment ${assignmentId.slice(0, 8)}...`)

      const assignmentFields = answerableFields.map((field, index) => ({
        assignment_id: assignmentId,
        field_id: field.id,
        order: index + 1,
      }))
      await adminClient.from('assignment_fields').insert(assignmentFields)
    }

    assignmentIds.push(assignmentId)

    for (const field of answerableFields) {
      let answerValue: string
      let time: number

      if (field.type === 'multiple_choice') {
        const anchors = field.anchors as Array<{ value: number; label: string }> | null
        if (anchors && anchors.length > 0) {
          const randomIndex = Math.floor(Math.random() * anchors.length)
          answerValue = randomIndex.toString()
        } else {
          answerValue = Math.floor(Math.random() * 5).toString()
        }
        time = Math.floor(Math.random() * 30) + 10
      } else if (field.type === 'text_input') {
        if (Math.random() < 0.7) {
          let dimensionName = 'this assessment'
          if (field.dimension_id) {
            const { data: dimension } = await adminClient
              .from('dimensions')
              .select('name')
              .eq('id', field.dimension_id)
              .single()
            if (dimension) dimensionName = dimension.name
          }
          answerValue = `This is test feedback for ${dimensionName}.`
        } else {
          continue
        }
        time = Math.floor(Math.random() * 60) + 20
      } else {
        continue
      }

      await adminClient.from('answers').insert({
        assignment_id: assignmentId,
        field_id: field.id,
        user_id: member.profile_id,
        value: answerValue,
        time: time,
      })
    }

    writeLine(`    Inserted answers.`)

    await adminClient
      .from('assignments')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)

    writeLine(`    Completed assignment.`)
  }

  writeLine(`Generating reports (${assignmentIds.length} assignment(s))...`)

  const reportErrors: string[] = []
  const baseUrl = request.nextUrl.origin
  for (let i = 0; i < assignmentIds.length; i++) {
    const assignmentId = assignmentIds[i]
    const num = i + 1
    writeLine(`  Report ${num}/${assignmentIds.length}: assignment ${assignmentId.slice(0, 8)}...`)

    try {
      const reportResponse = await fetch(`${baseUrl}/api/reports/generate/${assignmentId}`, {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          'Content-Type': 'application/json',
        },
      })

      if (!reportResponse.ok) {
        const errorData = await reportResponse.json().catch(() => ({}))
        const errMsg = errorData.error || 'Failed to generate report'
        reportErrors.push(`Assignment ${assignmentId.substring(0, 8)}: ${errMsg}`)
        writeLine(`    Failed: ${errMsg}`)
      } else {
        writeLine(`    OK`)
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      reportErrors.push(`Assignment ${assignmentId.substring(0, 8)}: ${errMsg}`)
      writeLine(`    Error: ${errMsg}`)
    }
  }

  const reportsGenerated = assignmentIds.length - reportErrors.length
  writeLine(`Done. Created ${assignmentIds.length} assignment(s), generated ${reportsGenerated} report(s).`)

  writeLine(
    JSON.stringify({
      done: true,
      success: true,
      assignment_ids: assignmentIds,
      assignments_created: assignmentIds.length,
      reports_generated: reportsGenerated,
      report_errors: reportErrors.length > 0 ? reportErrors : undefined,
    })
  )
}

/**
 * POST /api/surveys/simulate
 * Simulate a survey by automatically completing assessments for all users in a group.
 * Returns a streaming response with progress lines; final line is JSON with result.
 */
export async function POST(request: NextRequest) {
  let body: { group_id?: string; assessment_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body?.group_id || !body?.assessment_id) {
    return NextResponse.json(
      { error: 'group_id and assessment_id are required' },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const writeLine = (text: string) => {
        controller.enqueue(encoder.encode(text + '\n'))
      }

      runSimulation(request, { group_id: body.group_id!, assessment_id: body.assessment_id! }, writeLine)
        .then(() => controller.close())
        .catch((err) => {
          writeLine(
            JSON.stringify({
              done: true,
              error: err instanceof Error ? err.message : 'Failed to simulate survey',
            })
          )
          controller.close()
        })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
