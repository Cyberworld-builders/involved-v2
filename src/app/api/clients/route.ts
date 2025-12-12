import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { sanitizeHexColor } from '@/lib/utils/color-validation'

type ClientInsert = Database['public']['Tables']['clients']['Insert']

/**
 * GET /api/clients
 * Fetches all clients from the database
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all clients
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients
 * Creates a new client in the database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    // Validate and sanitize colors if provided
    let sanitizedPrimaryColor: string | null = null
    let sanitizedAccentColor: string | null = null

    if (primary_color) {
      sanitizedPrimaryColor = sanitizeHexColor(primary_color)
      if (!sanitizedPrimaryColor) {
        return NextResponse.json(
          { error: 'Invalid primary color format. Must be a valid hex color (e.g., #2D2E30 or #FFF)' },
          { status: 400 }
        )
      }
    }

    if (accent_color) {
      sanitizedAccentColor = sanitizeHexColor(accent_color)
      if (!sanitizedAccentColor) {
        return NextResponse.json(
          { error: 'Invalid accent color format. Must be a valid hex color (e.g., #FFBA00 or #FFF)' },
          { status: 400 }
        )
      }
    }

    // Prepare client data
    const clientData: ClientInsert = {
      name: name.trim(),
      address: address || null,
      logo: logo || null,
      background: background || null,
      primary_color: sanitizedPrimaryColor,
      accent_color: sanitizedAccentColor,
      require_profile: require_profile ?? false,
      require_research: require_research ?? false,
      whitelabel: whitelabel ?? false,
    }

    // Insert client into database
    const { data: client, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
