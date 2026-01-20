import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/templates/:id
 * Get a specific template
 */
export async function GET(
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

    // Get template
    const { data: template, error: templateError } = await adminClient
      .from('report_templates')
      .select(`
        *,
        assessment:assessments!report_templates_assessment_id_fkey(
          id,
          title
        )
      `)
      .eq('id', id)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error in GET /api/templates/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/templates/:id
 * Update template
 */
export async function PUT(
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

    const body = await request.json()
    const { name, is_default, components, labels, styling } = body

    // If setting as default, unset other defaults for this assessment
    if (is_default) {
      await adminClient
        .from('report_templates')
        .update({ is_default: false })
        .eq('assessment_id', existingTemplate.assessment_id)
        .eq('is_default', true)
        .neq('id', id)
    }

    // Update template
    const updateData: {
      name?: string
      is_default?: boolean
      components?: Record<string, any>
      labels?: Record<string, any>
      styling?: Record<string, any>
    } = {}

    if (name !== undefined) updateData.name = name
    if (is_default !== undefined) updateData.is_default = is_default
    if (components !== undefined) updateData.components = components
    if (labels !== undefined) updateData.labels = labels
    if (styling !== undefined) updateData.styling = styling

    const { data: updatedTemplate, error: updateError } = await adminClient
      .from('report_templates')
      .update(updateData)
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
      console.error('Error updating template:', updateError)
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template: updatedTemplate })
  } catch (error) {
    console.error('Error in PUT /api/templates/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/templates/:id
 * Delete template
 */
export async function DELETE(
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

    // Delete template
    const { error: deleteError } = await adminClient
      .from('report_templates')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting template:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/templates/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
