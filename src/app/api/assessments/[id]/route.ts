import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to check assessment and verify ownership
    const adminClient = createAdminClient()
    
    // Check if assessment exists and get created_by
    const { data: assessment, error: fetchError } = await adminClient
      .from('assessments')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Verify user owns the assessment (or is super admin - you can add that check if needed)
    if (assessment.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this assessment' },
        { status: 403 }
      )
    }

    // Delete the assessment (cascading deletes will handle fields, dimensions, etc.)
    const { error: deleteError } = await adminClient
      .from('assessments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting assessment:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete assessment: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting assessment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete assessment' },
      { status: 500 }
    )
  }
}
