import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/surveys
 * Create a new survey (returns the survey ID for subsequent assignment creation)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { client_id, assessment_id, name } = await request.json()
  if (!client_id || !assessment_id) {
    return NextResponse.json({ error: 'client_id and assessment_id are required' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: survey, error } = await adminClient
    .from('surveys')
    .insert({
      client_id,
      assessment_id,
      name: name || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ survey_id: survey.id })
}
