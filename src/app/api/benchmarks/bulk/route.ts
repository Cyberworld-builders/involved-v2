import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type BenchmarkInsert = Database['public']['Tables']['benchmarks']['Insert']

/**
 * POST /api/benchmarks/bulk
 * Creates multiple benchmarks in the database
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
    const { benchmarks } = body

    // Validate benchmarks array
    if (!Array.isArray(benchmarks)) {
      return NextResponse.json(
        { error: 'Benchmarks must be an array' },
        { status: 400 }
      )
    }

    if (benchmarks.length === 0) {
      return NextResponse.json(
        { error: 'At least one benchmark is required' },
        { status: 400 }
      )
    }

    // Validate each benchmark
    const validatedBenchmarks: BenchmarkInsert[] = []
    const errors: string[] = []

    benchmarks.forEach((benchmark: any, index: number) => {
      const { dimension_id, industry_id, value } = benchmark

      // Validate required fields
      if (!dimension_id || typeof dimension_id !== 'string') {
        errors.push(`Benchmark ${index + 1}: Dimension ID is required`)
        return
      }

      if (!industry_id || typeof industry_id !== 'string') {
        errors.push(`Benchmark ${index + 1}: Industry ID is required`)
        return
      }

      if (value === undefined || typeof value !== 'number') {
        errors.push(
          `Benchmark ${index + 1}: Value is required and must be a number`
        )
        return
      }

      // Validate value range
      if (value < 0 || value > 100) {
        errors.push(`Benchmark ${index + 1}: Value must be between 0 and 100`)
        return
      }

      validatedBenchmarks.push({
        dimension_id,
        industry_id,
        value,
      })
    })

    // Return validation errors if any
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    // Insert benchmarks into database
    const { data: createdBenchmarks, error } = await supabase
      .from('benchmarks')
      .insert(validatedBenchmarks)
      .select()

    if (error) {
      console.error('Error creating benchmarks:', error)
      return NextResponse.json(
        { error: 'Failed to create benchmarks' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        benchmarks: createdBenchmarks,
        count: createdBenchmarks.length,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
