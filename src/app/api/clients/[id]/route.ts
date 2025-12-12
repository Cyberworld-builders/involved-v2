import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { sanitizeHexColor } from '@/lib/utils/color-validation'

type ClientUpdate = Database['public']['Tables']['clients']['Update']

/**
 * GET /api/clients/[id]
 * Fetches a single client by ID
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

    // Fetch client by ID
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      console.error('Error fetching client:', error)
      return NextResponse.json(
        { error: 'Failed to fetch client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clients/[id]
 * Updates an existing client
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
    const { name, address, logo, background, primary_color, accent_color, require_profile, require_research, whitelabel } = body

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Client name cannot be empty' },
        { status: 400 }
      )
    }

    // Validate and sanitize colors if provided
    if (primary_color !== undefined && primary_color !== null && primary_color !== '') {
      const sanitizedColor = sanitizeHexColor(primary_color)
      if (!sanitizedColor) {
        return NextResponse.json(
          { error: 'Invalid primary color format. Must be a valid hex color (e.g., #2D2E30 or #FFF)' },
          { status: 400 }
        )
      }
    }

    if (accent_color !== undefined && accent_color !== null && accent_color !== '') {
      const sanitizedColor = sanitizeHexColor(accent_color)
      if (!sanitizedColor) {
        return NextResponse.json(
          { error: 'Invalid accent color format. Must be a valid hex color (e.g., #FFBA00 or #FFF)' },
          { status: 400 }
        )
      }
    }

    // Prepare update data - only include fields that are provided
    const updateData: ClientUpdate = {}
    if (name !== undefined) updateData.name = name.trim()
    if (address !== undefined) updateData.address = address || null
    if (logo !== undefined) updateData.logo = logo || null
    if (background !== undefined) updateData.background = background || null
    if (primary_color !== undefined) {
      updateData.primary_color = primary_color ? sanitizeHexColor(primary_color) : null
    }
    if (accent_color !== undefined) {
      updateData.accent_color = accent_color ? sanitizeHexColor(accent_color) : null
    }
    if (require_profile !== undefined) updateData.require_profile = require_profile
    if (require_research !== undefined) updateData.require_research = require_research
    if (whitelabel !== undefined) updateData.whitelabel = whitelabel

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update the client
    updateData.updated_at = new Date().toISOString()

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      console.error('Error updating client:', error)
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clients/[id]
 * Deletes a client from the database
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

    // Delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting client:', error)
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
