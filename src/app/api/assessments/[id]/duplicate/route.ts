import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalAssessmentId } = await params
    const supabase = createAdminClient()

    // Load original assessment
    const { data: originalAssessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', originalAssessmentId)
      .single()

    if (assessmentError || !originalAssessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Load original dimensions
    const { data: originalDimensions, error: dimensionsError } = await supabase
      .from('dimensions')
      .select('*')
      .eq('assessment_id', originalAssessmentId)
      .order('created_at', { ascending: true })

    if (dimensionsError) {
      console.error('Error loading dimensions:', dimensionsError)
    }

    // Load original fields (questions)
    const { data: originalFields, error: fieldsError } = await supabase
      .from('fields')
      .select('*')
      .eq('assessment_id', originalAssessmentId)
      .order('order', { ascending: true })

    if (fieldsError) {
      console.error('Error loading fields:', fieldsError)
    }

    // Get the current user for created_by
    const authHeader = request.headers.get('authorization')
    let createdBy: string | null = null
    if (authHeader) {
      // Extract user ID from auth token if available
      // For now, we'll use the original assessment's created_by
      createdBy = originalAssessment.created_by
    }

    // Create new assessment with "[DUPLICATE]" appended to title
    const duplicateTitle = `${originalAssessment.title} [DUPLICATE]`
    
    const { data: newAssessment, error: createError } = await supabase
      .from('assessments')
      .insert([
        {
          created_by: createdBy || originalAssessment.created_by,
          title: duplicateTitle,
          description: originalAssessment.description,
          logo: originalAssessment.logo, // Copy image URLs (images are shared)
          background: originalAssessment.background,
          primary_color: originalAssessment.primary_color,
          accent_color: originalAssessment.accent_color,
          status: 'draft', // Always start duplicates as draft
          split_questions: originalAssessment.split_questions,
          questions_per_page: originalAssessment.questions_per_page,
          timed: originalAssessment.timed,
          time_limit: originalAssessment.time_limit,
          target: originalAssessment.target,
          is_360: originalAssessment.is_360,
          number_of_questions: originalAssessment.number_of_questions,
          type: originalAssessment.type,
          use_custom_fields: originalAssessment.use_custom_fields,
          custom_fields: originalAssessment.custom_fields,
        },
      ])
      .select()
      .single()

    if (createError || !newAssessment) {
      return NextResponse.json(
        { error: `Failed to create duplicate assessment: ${createError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    // Create dimensions for the duplicate
    const dimensionIdMap = new Map<string, string>()
    
    if (originalDimensions && originalDimensions.length > 0) {
      // First pass: create all dimensions without parent_id
      const dimensionsWithoutParent = originalDimensions.filter(d => !d.parent_id)
      const dimensionsWithParent = originalDimensions.filter(d => d.parent_id)

      if (dimensionsWithoutParent.length > 0) {
        const newDimensionsWithoutParent = dimensionsWithoutParent.map(dim => ({
          assessment_id: newAssessment.id,
          name: dim.name,
          code: dim.code,
          parent_id: null,
        }))

        const { data: insertedDimensions, error: dimError } = await supabase
          .from('dimensions')
          .insert(newDimensionsWithoutParent)
          .select()

        if (dimError) {
          console.error('Error creating dimensions:', dimError)
          return NextResponse.json(
            { error: `Failed to create duplicate dimensions: ${dimError.message}` },
            { status: 500 }
          )
        }
        
        if (insertedDimensions) {
          // Map old IDs to new IDs
          dimensionsWithoutParent.forEach((oldDim, idx) => {
            if (insertedDimensions[idx]) {
              dimensionIdMap.set(oldDim.id, insertedDimensions[idx].id)
            }
          })
        }
      }

      // Second pass: create dimensions with parent_id (using mapped IDs)
      if (dimensionsWithParent.length > 0) {
        const newDimensionsWithParent = dimensionsWithParent.map(dim => ({
          assessment_id: newAssessment.id,
          name: dim.name,
          code: dim.code,
          parent_id: dim.parent_id ? dimensionIdMap.get(dim.parent_id) || null : null,
        }))

        const { data: insertedDimensions, error: dimError } = await supabase
          .from('dimensions')
          .insert(newDimensionsWithParent)
          .select()

        if (dimError) {
          console.error('Error creating dimensions with parent:', dimError)
          return NextResponse.json(
            { error: `Failed to create duplicate dimensions with parent: ${dimError.message}` },
            { status: 500 }
          )
        }
        
        if (insertedDimensions) {
          // Map old IDs to new IDs for parent dimensions
          dimensionsWithParent.forEach((oldDim, idx) => {
            if (insertedDimensions[idx]) {
              dimensionIdMap.set(oldDim.id, insertedDimensions[idx].id)
            }
          })
        }
      }
    }

    // Create fields (questions) for the duplicate (regardless of whether dimensions exist)
    if (originalFields && originalFields.length > 0) {
      let dimensionCodeMap = new Map<string, string>()
      let oldDimensionMap = new Map<string, string>()

      // Only get dimension mapping if dimensions exist
      if (originalDimensions && originalDimensions.length > 0) {
        // Get new dimension IDs for mapping
        const { data: newDimensions } = await supabase
          .from('dimensions')
          .select('id, code')
          .eq('assessment_id', newAssessment.id)

        dimensionCodeMap = new Map(
          newDimensions?.map(d => [d.code, d.id]) || []
        )

        // Create a map from old dimension IDs to new dimension codes
        oldDimensionMap = new Map(
          originalDimensions.map(d => [d.id, d.code])
        )
      }

      const fieldsToInsert = originalFields.map((field, index) => {
        let dimensionId = null
        if (field.dimension_id && oldDimensionMap.size > 0) {
          const oldDimensionCode = oldDimensionMap.get(field.dimension_id)
          if (oldDimensionCode) {
            dimensionId = dimensionCodeMap.get(oldDimensionCode) || null
          }
        }

        return {
          assessment_id: newAssessment.id,
          dimension_id: dimensionId,
          type: field.type,
          content: field.content ?? '',
          order: field.order ?? index + 1,
          number: field.number ?? index + 1,
          practice: field.practice ?? false,
          anchors: field.anchors || [],
          insights_table: field.insights_table || null,
        }
      })

      if (fieldsToInsert.length > 0) {
        const { error: fieldsInsertError } = await supabase
          .from('fields')
          .insert(fieldsToInsert)

        if (fieldsInsertError) {
          console.error('Error creating fields:', fieldsInsertError)
          return NextResponse.json(
            { error: `Failed to create duplicate fields: ${fieldsInsertError.message}` },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      assessment: newAssessment,
    })
  } catch (error) {
    console.error('Error duplicating assessment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to duplicate assessment' },
      { status: 500 }
    )
  }
}

