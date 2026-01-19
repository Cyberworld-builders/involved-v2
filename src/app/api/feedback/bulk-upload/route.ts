import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/feedback/bulk-upload
 * Bulk upload feedback entries from CSV/Excel file
 * 
 * Expected CSV/Excel format:
 * - Assessment (name or ID)
 * - Dimension (name/code or "Overall" for overall feedback)
 * - Type (Overall/Specific)
 * - Feedback (text content)
 * - Min Score (optional)
 * - Max Score (optional)
 */
export async function POST(request: NextRequest) {
  try {
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

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Read file content
    const text = await file.text()
    const lines = text.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'File must contain at least a header row and one data row' },
        { status: 400 }
      )
    }

    // Parse CSV (simple CSV parser - can be enhanced)
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const requiredHeaders = ['assessment', 'type', 'feedback']
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingHeaders.join(', ')}`,
          expectedColumns: ['Assessment', 'Dimension', 'Type', 'Feedback', 'Min Score', 'Max Score'],
        },
        { status: 400 }
      )
    }

    // Get all assessments and dimensions for mapping
    const { data: allAssessments } = await adminClient
      .from('assessments')
      .select('id, title')
      .eq('created_by', user.id)

    const { data: allDimensions } = await adminClient
      .from('dimensions')
      .select('id, name, code, assessment_id')

    // Create lookup maps
    const assessmentMap = new Map<string, string>()
    allAssessments?.forEach((a) => {
      assessmentMap.set(a.title.toLowerCase(), a.id)
      assessmentMap.set(a.id, a.id) // Also support ID
    })

    const dimensionMap = new Map<string, Map<string, string>>() // assessment_id -> dimension lookup
    allDimensions?.forEach((d) => {
      if (!dimensionMap.has(d.assessment_id)) {
        dimensionMap.set(d.assessment_id, new Map())
      }
      const dimMap = dimensionMap.get(d.assessment_id)!
      dimMap.set(d.name.toLowerCase(), d.id)
      dimMap.set(d.code.toLowerCase(), d.id)
      dimMap.set(d.id, d.id) // Also support ID
    })

    // Parse rows
    const feedbackEntries: Array<{
      assessment_id: string
      dimension_id: string | null
      type: 'overall' | 'specific'
      feedback: string
      min_score: number | null
      max_score: number | null
      created_by: string
    }> = []

    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Simple CSV parsing (handles quoted values)
      const values: string[] = []
      let current = ''
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim()) // Add last value

      if (values.length < headers.length) {
        errors.push(`Row ${i + 1}: Not enough columns`)
        continue
      }

      // Map values to headers
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      // Validate and map assessment
      const assessmentName = row.assessment?.trim()
      if (!assessmentName) {
        errors.push(`Row ${i + 1}: Assessment is required`)
        continue
      }

      const assessmentId = assessmentMap.get(assessmentName.toLowerCase())
      if (!assessmentId) {
        errors.push(`Row ${i + 1}: Assessment "${assessmentName}" not found`)
        continue
      }

      // Validate type
      const type = row.type?.trim().toLowerCase()
      if (!type || !['overall', 'specific'].includes(type)) {
        errors.push(`Row ${i + 1}: Type must be "Overall" or "Specific"`)
        continue
      }

      // Map dimension (if specific)
      let dimensionId: string | null = null
      if (type === 'specific') {
        const dimensionName = row.dimension?.trim()
        if (!dimensionName || dimensionName.toLowerCase() === 'overall') {
          errors.push(`Row ${i + 1}: Dimension is required for specific feedback`)
          continue
        }

        const dimMap = dimensionMap.get(assessmentId)
        if (dimMap) {
          dimensionId = dimMap.get(dimensionName.toLowerCase()) || null
          if (!dimensionId) {
            errors.push(`Row ${i + 1}: Dimension "${dimensionName}" not found for assessment`)
            continue
          }
        } else {
          errors.push(`Row ${i + 1}: No dimensions found for assessment`)
          continue
        }
      }

      // Get feedback content
      const feedback = row.feedback?.trim()
      if (!feedback) {
        errors.push(`Row ${i + 1}: Feedback content is required`)
        continue
      }

      // Parse optional score ranges
      const minScore = row['min score'] || row.min_score
      const maxScore = row['max score'] || row.max_score

      feedbackEntries.push({
        assessment_id: assessmentId,
        dimension_id: dimensionId,
        type: type as 'overall' | 'specific',
        feedback,
        min_score: minScore ? parseFloat(minScore) : null,
        max_score: maxScore ? parseFloat(maxScore) : null,
        created_by: user.id,
      })
    }

    if (errors.length > 0 && feedbackEntries.length === 0) {
      return NextResponse.json(
        {
          error: 'All rows had errors',
          errors,
        },
        { status: 400 }
      )
    }

    // Insert feedback entries
    if (feedbackEntries.length > 0) {
      const { data: inserted, error: insertError } = await adminClient
        .from('feedback_library')
        .insert(feedbackEntries)
        .select()

      if (insertError) {
        console.error('Error inserting feedback:', insertError)
        return NextResponse.json(
          { error: 'Failed to insert feedback entries', details: insertError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        inserted: inserted?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
      })
    }

    return NextResponse.json({
      success: false,
      error: 'No valid feedback entries to insert',
      errors,
    })
  } catch (error) {
    console.error('Error in bulk upload:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
