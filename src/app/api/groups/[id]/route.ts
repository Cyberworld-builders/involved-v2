import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type GroupUpdate = Database['public']['Tables']['groups']['Update']

/**
 * GET /api/groups/[id]
 * Fetches a single group by ID
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

    // Fetch group by ID
    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      console.error('Error fetching group:', error)
      return NextResponse.json(
        { error: 'Failed to fetch group' },
        { status: 500 }
      )
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/groups/[id]
 * Updates an existing group
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
    const { name, client_id, description } = body

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Group name cannot be empty' },
        { status: 400 }
      )
    }

    // Validate client_id if provided
    if (client_id !== undefined && (typeof client_id !== 'string' || client_id.trim() === '')) {
      return NextResponse.json(
        { error: 'Client ID cannot be empty' },
        { status: 400 }
      )
    }

    // Prepare update data - only include fields that are provided
    const updateData: GroupUpdate = {}
    if (name !== undefined) updateData.name = name.trim()
    if (client_id !== undefined) updateData.client_id = client_id.trim()
    if (description !== undefined) updateData.description = description || null

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update the group
    updateData.updated_at = new Date().toISOString()

    const { data: group, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      console.error('Error updating group:', error)
      return NextResponse.json(
        { error: 'Failed to update group' },
        { status: 500 }
      )
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/groups/[id]
 * Deletes a group from the database
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

    // Delete the group
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting group:', error)
      return NextResponse.json(
        { error: 'Failed to delete group' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
