import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type BenchmarkInsert = Database['public']['Tables']['benchmarks']['Insert']

/**
 * GET /api/benchmarks
 * Fetches all benchmarks from the database with optional filtering
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const assessmentId = searchParams.get('assessment_id')
    const industryId = searchParams.get('industry_id')
    const dimensionId = searchParams.get('dimension_id')

    // Build query with filters
    // When filtering by assessment_id, we need to join with dimensions table
    let query = assessmentId
      ? supabase
          .from('benchmarks')
          .select('*, dimensions!inner(assessment_id)')
      : supabase.from('benchmarks').select('*')

    // Apply assessment_id filter through the dimensions join
    if (assessmentId) {
      query = query.eq('dimensions.assessment_id', assessmentId)
    }

    if (industryId) {
      query = query.eq('industry_id', industryId)
    }

    if (dimensionId) {
      query = query.eq('dimension_id', dimensionId)
    }

    const { data: benchmarks, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      console.error('Error fetching benchmarks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch benchmarks' },
        { status: 500 }
      )
    }

    return NextResponse.json({ benchmarks })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/benchmarks
 * Creates a new benchmark in the database
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
    const { dimension_id, industry_id, value } = body

    // Validate required fields
    if (!dimension_id || typeof dimension_id !== 'string') {
      return NextResponse.json(
        { error: 'Dimension ID is required' },
        { status: 400 }
      )
    }

    if (!industry_id || typeof industry_id !== 'string') {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      )
    }

    if (value === undefined || typeof value !== 'number') {
      return NextResponse.json(
        { error: 'Value is required and must be a number' },
        { status: 400 }
      )
    }

    // Validate value range (assuming 0-100)
    if (value < 0 || value > 100) {
      return NextResponse.json(
        { error: 'Value must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Prepare benchmark data
    const benchmarkData: BenchmarkInsert = {
      dimension_id,
      industry_id,
      value,
    }

    // Insert benchmark into database
    const { data: benchmark, error } = await supabase
      .from('benchmarks')
      .insert(benchmarkData)
      .select()
      .single()

    if (error) {
      console.error('Error creating benchmark:', error)
      return NextResponse.json(
        { error: 'Failed to create benchmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({ benchmark }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
