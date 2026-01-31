import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/templates
 * List templates with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const assessmentId = searchParams.get('assessment_id')

    // Build query
    let query = adminClient
      .from('report_templates')
      .select(`
        *,
        assessment:assessments!report_templates_assessment_id_fkey(
          id,
          title
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (assessmentId) {
      query = query.eq('assessment_id', assessmentId)
    }

    const { data: templates, error: templatesError } = await query

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
    console.error('Error in GET /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Create new template
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { assessment_id, name, is_default, components, labels, styling } = body

    // Validate required fields
    if (!assessment_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: assessment_id, name' },
        { status: 400 }
      )
    }

    // Verify user has access to the assessment
    const { data: assessment } = await adminClient
      .from('assessments')
      .select('id, created_by')
      .eq('id', assessment_id)
      .single()

    if (!assessment || assessment.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Assessment not found or access denied' },
        { status: 404 }
      )
    }

    // If setting as default, unset other defaults for this assessment
    if (is_default) {
      await adminClient
        .from('report_templates')
        .update({ is_default: false })
        .eq('assessment_id', assessment_id)
        .eq('is_default', true)
    }

    // Create template
    const { data: newTemplate, error: createError } = await adminClient
      .from('report_templates')
      .insert({
        assessment_id,
        name,
        is_default: is_default || false,
        components: components || {},
        labels: labels || {},
        styling: styling || {},
        created_by: user.id,
      })
      .select(`
        *,
        assessment:assessments!report_templates_assessment_id_fkey(
          id,
          title
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating template:', createError)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { template: newTemplate },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
