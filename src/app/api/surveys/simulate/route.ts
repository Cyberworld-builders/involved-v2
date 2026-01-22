import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/surveys/simulate
 * Simulate a survey by automatically completing assessments for all users in a group
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Verify user is authenticated and is super_admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('access_level')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.access_level !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { group_id, assessment_id } = body

    if (!group_id || !assessment_id) {
      return NextResponse.json(
        { error: 'group_id and assessment_id are required' },
        { status: 400 }
      )
    }

    // Fetch group with members
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
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Type assertion for nested objects
    const groupMembers = (group.group_members as unknown) as Array<{
      id: string
      profile_id: string
      position: string | null
      leader: boolean
    }> | null

    if (!groupMembers || groupMembers.length === 0) {
      return NextResponse.json(
        { error: 'Group has no members' },
        { status: 400 }
      )
    }

    // Fetch assessment
    const { data: assessment, error: assessmentError } = await adminClient
      .from('assessments')
      .select('id, title, is_360')
      .eq('id', assessment_id)
      .single()

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    // Fetch all fields for the assessment (questions)
    const { data: fields, error: fieldsError } = await adminClient
      .from('fields')
      .select('id, type, dimension_id, anchors, content, order')
      .eq('assessment_id', assessment_id)
      .order('order', { ascending: true })

    if (fieldsError) {
      return NextResponse.json(
        { error: 'Failed to fetch assessment fields' },
        { status: 500 }
      )
    }

    // Filter out non-answerable fields
    const answerableFields = (fields || []).filter(
      (field) => field.type === 'multiple_choice' || field.type === 'text_input'
    )

    if (answerableFields.length === 0) {
      return NextResponse.json(
        { error: 'Assessment has no answerable questions' },
        { status: 400 }
      )
    }

    const assignmentIds: string[] = []
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Generate a survey_id for this batch of assignments
    const surveyId = crypto.randomUUID()

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simulate/route.ts:123',message:'Generated survey_id for batch',data:{surveyId,group_id,assessment_id,memberCount:groupMembers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Create assignments and generate answers for each group member
    for (const member of groupMembers) {
      // Check if assignment already exists
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
        // Delete existing answers if assignment exists
        await adminClient.from('answers').delete().eq('assignment_id', assignmentId)
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simulate/route.ts:136',message:'Using existing assignment',data:{assignmentId,hasSurveyId:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Update existing assignment with survey_id
        await adminClient
          .from('assignments')
          .update({ survey_id: surveyId })
          .eq('id', assignmentId)
      } else {
        // Create new assignment
        // For all assessments (360, Leaders, Blockers), use group.target_id to identify who is being rated
        const targetIdForAssignment = group.target_id || null
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simulate/route.ts:158',message:'Creating assignment',data:{memberId:member.profile_id,assessmentId:assessment_id,is360:assessment.is_360,groupTargetId:group.target_id,targetIdForAssignment},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        const { data: newAssignment, error: assignError } = await adminClient
          .from('assignments')
          .insert({
            user_id: member.profile_id,
            assessment_id: assessment_id,
            target_id: targetIdForAssignment,
            survey_id: surveyId,
            expires: expiresAt.toISOString(),
            completed: false,
            started_at: new Date().toISOString(),
          })
          .select('id, survey_id, user_id, target_id')
          .single()

        if (assignError || !newAssignment) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simulate/route.ts:175',message:'Failed to create assignment',data:{error:assignError?.message,memberId:member.profile_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          console.error(`Failed to create assignment for user ${member.profile_id}:`, assignError)
          continue
        }

        assignmentId = newAssignment.id
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'simulate/route.ts:185',message:'Created assignment',data:{assignmentId,surveyId:newAssignment.survey_id,userId:newAssignment.user_id,targetId:newAssignment.target_id,is360:assessment.is_360},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        // Create assignment_fields entries
        const assignmentFields = answerableFields.map((field, index) => ({
          assignment_id: assignmentId,
          field_id: field.id,
          order: index + 1,
        }))

        await adminClient.from('assignment_fields').insert(assignmentFields)
      }

      assignmentIds.push(assignmentId)

      // Generate answers for each field
      for (const field of answerableFields) {
        let answerValue: string
        let time: number

        if (field.type === 'multiple_choice') {
          // Get anchors array
          const anchors = field.anchors as Array<{ value: number; label: string }> | null
          if (anchors && anchors.length > 0) {
            // Select random anchor index
            const randomIndex = Math.floor(Math.random() * anchors.length)
            answerValue = randomIndex.toString()
          } else {
            // Fallback: random value 0-4
            answerValue = Math.floor(Math.random() * 5).toString()
          }
          time = Math.floor(Math.random() * 30) + 10 // 10-40 seconds
        } else if (field.type === 'text_input') {
          // 70% chance of providing feedback
          if (Math.random() < 0.7) {
            // Get dimension name if available
            let dimensionName = 'this assessment'
            if (field.dimension_id) {
              const { data: dimension } = await adminClient
                .from('dimensions')
                .select('name')
                .eq('id', field.dimension_id)
                .single()
              if (dimension) {
                dimensionName = dimension.name
              }
            }
            answerValue = `This is test feedback for ${dimensionName}.`
          } else {
            // Skip this text input (don't create answer)
            continue
          }
          time = Math.floor(Math.random() * 60) + 20 // 20-80 seconds
        } else {
          // Skip other field types
          continue
        }

        // Insert answer
        await adminClient.from('answers').insert({
          assignment_id: assignmentId,
          field_id: field.id,
          user_id: member.profile_id,
          value: answerValue,
          time: time,
        })
      }

      // Complete the assignment
      await adminClient
        .from('assignments')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
    }

    // Generate reports for all completed assignments
    const reportErrors: string[] = []
    for (const assignmentId of assignmentIds) {
      try {
        // Call the report generation API endpoint
        // We need to construct the full URL and pass authentication cookies
        const baseUrl = request.nextUrl.origin
        const reportResponse = await fetch(`${baseUrl}/api/reports/generate/${assignmentId}`, {
          method: 'POST',
          headers: {
            'Cookie': request.headers.get('cookie') || '',
            'Content-Type': 'application/json',
          },
        })

        if (!reportResponse.ok) {
          const errorData = await reportResponse.json().catch(() => ({}))
          reportErrors.push(`Assignment ${assignmentId.substring(0, 8)}: ${errorData.error || 'Failed to generate report'}`)
        }
      } catch (error) {
        reportErrors.push(`Assignment ${assignmentId.substring(0, 8)}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      assignment_ids: assignmentIds,
      assignments_created: assignmentIds.length,
      reports_generated: assignmentIds.length - reportErrors.length,
      report_errors: reportErrors.length > 0 ? reportErrors : undefined,
    })
  } catch (error) {
    console.error('Error simulating survey:', error)
    return NextResponse.json(
      {
        error: 'Failed to simulate survey',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
