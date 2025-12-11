import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type BenchmarkUpdate = Database['public']['Tables']['benchmarks']['Update']

/**
 * GET /api/benchmarks/[id]
 * Fetches a single benchmark by ID
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

    // Fetch benchmark by ID
    const { data: benchmark, error } = await supabase
      .from('benchmarks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Benchmark not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching benchmark:', error)
      return NextResponse.json(
        { error: 'Failed to fetch benchmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({ benchmark })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/benchmarks/[id]
 * Updates an existing benchmark
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
    const { dimension_id, industry_id, value } = body

    // Validate fields if provided
    if (dimension_id !== undefined && typeof dimension_id !== 'string') {
      return NextResponse.json(
        { error: 'Dimension ID must be a string' },
        { status: 400 }
      )
    }

    if (industry_id !== undefined && typeof industry_id !== 'string') {
      return NextResponse.json(
        { error: 'Industry ID must be a string' },
        { status: 400 }
      )
    }

    if (value !== undefined && typeof value !== 'number') {
      return NextResponse.json(
        { error: 'Value must be a number' },
        { status: 400 }
      )
    }

    // Validate value range if provided
    if (value !== undefined && (value < 0 || value > 100)) {
      return NextResponse.json(
        { error: 'Value must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Prepare update data - only include fields that are provided
    const updateData: BenchmarkUpdate = {}
    if (dimension_id !== undefined) updateData.dimension_id = dimension_id
    if (industry_id !== undefined) updateData.industry_id = industry_id
    if (value !== undefined) updateData.value = value

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update the benchmark
    updateData.updated_at = new Date().toISOString()

    const { data: benchmark, error } = await supabase
      .from('benchmarks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Benchmark not found' },
          { status: 404 }
        )
      }
      console.error('Error updating benchmark:', error)
      return NextResponse.json(
        { error: 'Failed to update benchmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({ benchmark })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/benchmarks/[id]
 * Deletes a benchmark from the database
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

    // Delete the benchmark
    const { error } = await supabase.from('benchmarks').delete().eq('id', id)

    if (error) {
      console.error('Error deleting benchmark:', error)
      return NextResponse.json(
        { error: 'Failed to delete benchmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Benchmark deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
