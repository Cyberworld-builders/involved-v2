import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportSurveyRawCSV } from '@/lib/reports/export-survey-csv'

/**
 * GET /api/clients/[id]/surveys/[surveyId]/export-csv
 * Export raw survey data as CSV (individual user responses)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  const { id: clientId, surveyId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user has access to this client
  const { data: profile } = await supabase
    .from('profiles')
    .select('access_level, client_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isSuperAdmin = profile.access_level === 'super_admin'
  if (!isSuperAdmin && profile.client_id !== clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const csv = await exportSurveyRawCSV(surveyId)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="survey-${surveyId.substring(0, 8)}-raw-data.csv"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
