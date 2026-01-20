import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/templates/:id/set-default
 * Set template as default for its assessment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get existing template
    const { data: existingTemplate, error: getError } = await adminClient
      .from('report_templates')
      .select('assessment_id, assessment:assessments!report_templates_assessment_id_fkey(created_by)')
      .eq('id', id)
      .single()

    if (getError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Verify user has access
    if (existingTemplate.assessment?.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Unset other defaults for this assessment
    await adminClient
      .from('report_templates')
      .update({ is_default: false })
      .eq('assessment_id', existingTemplate.assessment_id)
      .eq('is_default', true)
      .neq('id', id)

    // Set this template as default
    const { data: updatedTemplate, error: updateError } = await adminClient
      .from('report_templates')
      .update({ is_default: true })
      .eq('id', id)
      .select(`
        *,
        assessment:assessments!report_templates_assessment_id_fkey(
          id,
          title
        )
      `)
      .single()

    if (updateError) {
      console.error('Error setting default template:', updateError)
      return NextResponse.json(
        { error: 'Failed to set default template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template: updatedTemplate })
  } catch (error) {
    console.error('Error in POST /api/templates/:id/set-default:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
