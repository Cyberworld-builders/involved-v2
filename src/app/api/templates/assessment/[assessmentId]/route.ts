import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/templates/assessment/:assessmentId
 * Get all templates for an assessment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get templates for assessment
    const { data: templates, error: templatesError } = await adminClient
      .from('report_templates')
      .select(`
        *,
        assessment:assessments!report_templates_assessment_id_fkey(
          id,
          title
        )
      `)
      .eq('assessment_id', assessmentId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      templates: templates || [],
      count: templates?.length || 0,
    })
  } catch (error) {
    console.error('Error in GET /api/templates/assessment/:assessmentId:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
