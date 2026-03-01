import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/assessments/:id/dimensions
 * Get all dimensions for an assessment
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

    // Get dimensions for the assessment
    const { data: dimensions, error: dimensionsError } = await adminClient
      .from('dimensions')
      .select('id, name, code, parent_id, sort_order')
      .eq('assessment_id', id)
      .is('parent_id', null) // Only get top-level dimensions (or all if needed)
      .order('sort_order', { ascending: true })

    if (dimensionsError) {
      console.error('Error fetching dimensions:', dimensionsError)
      return NextResponse.json(
        { error: 'Failed to fetch dimensions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      dimensions: dimensions || [],
    })
  } catch (error) {
    console.error('Error in GET /api/assessments/[id]/dimensions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
