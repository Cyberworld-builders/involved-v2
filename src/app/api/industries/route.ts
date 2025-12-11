import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type IndustryInsert = Database['public']['Tables']['industries']['Insert']

/**
 * GET /api/industries
 * Fetches all industries from the database
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

    // Fetch all industries
    const { data: industries, error } = await supabase
      .from('industries')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching industries:', error)
      return NextResponse.json(
        { error: 'Failed to fetch industries' },
        { status: 500 }
      )
    }

    return NextResponse.json({ industries })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/industries
 * Creates a new industry in the database
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
    const { name } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Industry name is required' },
        { status: 400 }
      )
    }

    // Prepare industry data
    const industryData: IndustryInsert = {
      name: name.trim(),
    }

    // Insert industry into database
    const { data: industry, error } = await supabase
      .from('industries')
      .insert(industryData)
      .select()
      .single()

    if (error) {
      console.error('Error creating industry:', error)
      return NextResponse.json(
        { error: 'Failed to create industry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ industry }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
