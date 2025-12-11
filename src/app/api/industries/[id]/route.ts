import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type IndustryUpdate = Database['public']['Tables']['industries']['Update']

/**
 * GET /api/industries/[id]
 * Fetches a single industry by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch industry by ID
    const { data: industry, error } = await supabase
      .from('industries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Industry not found' }, { status: 404 })
      }
      console.error('Error fetching industry:', error)
      return NextResponse.json(
        { error: 'Failed to fetch industry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ industry })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/industries/[id]
 * Updates an existing industry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { name } = body

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Industry name cannot be empty' },
        { status: 400 }
      )
    }

    // Prepare update data - only include fields that are provided
    const updateData: IndustryUpdate = {}
    if (name !== undefined) updateData.name = name.trim()

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update the industry
    updateData.updated_at = new Date().toISOString()

    const { data: industry, error } = await supabase
      .from('industries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Industry not found' }, { status: 404 })
      }
      console.error('Error updating industry:', error)
      return NextResponse.json(
        { error: 'Failed to update industry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ industry })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/industries/[id]
 * Deletes an industry from the database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the industry
    const { error } = await supabase
      .from('industries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting industry:', error)
      return NextResponse.json(
        { error: 'Failed to delete industry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Industry deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
