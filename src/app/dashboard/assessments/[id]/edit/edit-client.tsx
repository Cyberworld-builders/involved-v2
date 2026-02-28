'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AssessmentForm, { AssessmentFormData, QuestionType } from '@/components/forms/assessment-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Database } from '@/types/database'

interface EditAssessmentClientProps {
  id: string
}

export default function EditAssessmentClient({ id }: EditAssessmentClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [message, setMessage] = useState('')
  const [initialData, setInitialData] = useState<Partial<AssessmentFormData> | null>(null)
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const [existingBackgroundUrl, setExistingBackgroundUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        // Load assessment with dimensions and fields
        // Explicitly select all columns including number_of_questions
        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', id)
          .single()

        if (assessmentError || !assessment) {
          throw new Error(`Failed to load assessment: ${assessmentError?.message || 'Assessment not found'}`)
        }

        // Debug: Log the number_of_questions value from database
        console.log('Loaded assessment number_of_questions:', assessment.number_of_questions, typeof assessment.number_of_questions)
        console.log('Loaded assessment dimension_question_counts:', assessment.dimension_question_counts, typeof assessment.dimension_question_counts)

        // Load dimensions
        const { data: dimensions, error: dimensionsError } = await supabase
          .from('dimensions')
          .select('*')
          .eq('assessment_id', id)
          .order('created_at', { ascending: true })

        if (dimensionsError) {
          console.error('Error loading dimensions:', dimensionsError)
        }

        // Load fields (questions) - order by the 'order' column which is the source of truth
        const { data: fields, error: fieldsError } = await supabase
          .from('fields')
          .select('*')
          .eq('assessment_id', id)
          .order('order', { ascending: true })
        
        // Log the loaded order for debugging
        if (fields && fields.length > 0) {
          type FieldRow = Database['public']['Tables']['fields']['Row']
          console.log('Loaded fields order:', fields.map(f => ({ 
            id: f.id, 
            order: f.order, 
            number: (f as FieldRow & { number?: number }).number, 
            content: f.content?.substring(0, 30) 
          })))
        }
        
        // Don't re-sort - use the order from the database query
        // The 'order' column is the source of truth for question sequence

        if (fieldsError) {
          console.error('Error loading fields:', fieldsError)
        }

        // Store existing image URLs
        setExistingLogoUrl(assessment.logo)
        setExistingBackgroundUrl(assessment.background)

        // Parse custom_fields from JSON
        let customFields: Array<{ tag: string; default: string }> = []
        if (assessment.custom_fields) {
          try {
            const cf = assessment.custom_fields as { tag?: string[]; default?: string[] }
            if (cf.tag && cf.default && cf.tag.length === cf.default.length) {
              customFields = cf.tag.map((tag, idx) => ({
                tag,
                default: cf.default?.[idx] || '',
              }))
            }
          } catch (e) {
            console.error('Error parsing custom_fields:', e)
          }
        }
        
        // Convert target from legacy format (0=self, 1=other_user, 2=group_leader)
        let targetValue: 'self' | 'other_user' | 'group_leader' | '' = ''
        if (assessment.target === '0' || assessment.target === 0) targetValue = 'self'
        else if (assessment.target === '1' || assessment.target === 1) targetValue = 'other_user'
        else if (assessment.target === '2' || assessment.target === 2) targetValue = 'group_leader'
        else if (assessment.target) targetValue = assessment.target as 'self' | 'other_user' | 'group_leader'

        // Convert to form data format
        setInitialData({
          title: assessment.title,
          description: assessment.description || '',
          logo: null, // Will be set from URL preview if needed
          background: null, // Will be set from URL preview if needed
          primary_color: assessment.primary_color || '#2D2E30',
          accent_color: assessment.accent_color || '#FFBA00',
          status: (assessment.status as 'draft' | 'active' | 'completed' | 'archived') || 'draft',
          split_questions: assessment.split_questions || false,
          questions_per_page: assessment.questions_per_page || 10,
          timed: assessment.timed || false,
          time_limit: assessment.time_limit,
          target: targetValue,
          is_360: assessment.is_360 ?? false,
          number_of_questions: assessment.number_of_questions ?? null,
          dimension_question_counts: (() => {
            const counts = assessment.dimension_question_counts
            // Handle null, undefined, or empty
            if (!counts || counts === null) {
              console.log('dimension_question_counts is null/undefined, returning empty object')
              return {}
            }
            
            // Handle JSONB - it might be a string that needs parsing, or already an object
            if (typeof counts === 'string') {
              try {
                const parsed = JSON.parse(counts)
                // Ensure it's an object with string keys and number values
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                  const result: Record<string, number> = {}
                  for (const [key, value] of Object.entries(parsed)) {
                    if (typeof value === 'number') {
                      result[key] = value
                    }
                  }
                  console.log('Parsed dimension_question_counts from string:', result)
                  return result
                }
                console.log('Parsed dimension_question_counts is not a valid object')
                return {}
              } catch (e) {
                console.error('Error parsing dimension_question_counts string:', e)
                return {}
              }
            }
            
            // Already an object
            if (typeof counts === 'object' && counts !== null && !Array.isArray(counts)) {
              const result: Record<string, number> = {}
              for (const [key, value] of Object.entries(counts)) {
                if (typeof value === 'number') {
                  result[key] = value
                }
              }
              console.log('Parsed dimension_question_counts from object:', result)
              return result
            }
            
            console.log('dimension_question_counts is in unexpected format:', typeof counts, counts)
            return {}
          })(),
          show_question_numbers: assessment.show_question_numbers !== undefined ? assessment.show_question_numbers : true,
          use_custom_fields: assessment.use_custom_fields ?? false,
          custom_fields: customFields,
          dimensions: (dimensions || []).map(dim => ({
            id: dim.id,
            name: dim.name,
            code: dim.code,
            parent_id: dim.parent_id,
          })),
          // Map fields preserving the order from the database query
          // The fields are already sorted by 'order' column, so we preserve that order
          fields: (fields || []).map((field, index) => {
            type FieldRow = Database['public']['Tables']['fields']['Row']
            const fieldWithExtras = field as FieldRow & { number?: number; practice?: boolean; required?: boolean }
            return {
              id: field.id,
              type: field.type as QuestionType,
              content: field.content,
              dimension_id: field.dimension_id,
              anchors: (field.anchors || []) as Array<{
                id: string
                name: string
                value: number
                practice: boolean
              }>,
              // Use the order from database, but ensure it matches array position
              // This handles any inconsistencies
              order: field.order || index + 1,
              number: fieldWithExtras.number || field.order || index + 1,
              required: fieldWithExtras.required !== undefined ? fieldWithExtras.required : true,
              practice: fieldWithExtras.practice || false,
              insights_table: (() => {
                const fieldWithInsights = field as FieldRow & { insights_table?: unknown }
                if (fieldWithInsights.insights_table) {
                  if (typeof fieldWithInsights.insights_table === 'string') {
                    try {
                      return JSON.parse(fieldWithInsights.insights_table) as string[][]
                    } catch {
                      return undefined
                    }
                  }
                  if (Array.isArray(fieldWithInsights.insights_table)) {
                    return fieldWithInsights.insights_table as string[][]
                  }
                }
                return undefined
              })(),
            }
          }),
        })
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to load assessment')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadAssessment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSubmit = async (data: AssessmentFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        console.log('Demo mode - Assessment update data:', data)
        setMessage('Demo mode: Assessment update data logged to console.')
        return
      }

      // Handle image uploads if changed
      let logoUrl: string | null = existingLogoUrl || null
      let backgroundUrl: string | null = existingBackgroundUrl || null

      // Check if user wants to remove images
      if (data.removeLogo) {
        logoUrl = null
      } else if (data.logo) {
        const logoExt = data.logo.name.split('.').pop()
        const logoFileName = `assessment-logo-${Date.now()}.${logoExt}`
        const { error: logoError } = await supabase.storage
          .from('assessment-assets')
          .upload(logoFileName, data.logo)

        if (logoError) {
          throw new Error(`Failed to upload logo: ${logoError.message}`)
        }

        const { data: logoUrlData } = supabase.storage
          .from('assessment-assets')
          .getPublicUrl(logoFileName)
        logoUrl = logoUrlData.publicUrl
      }

      if (data.removeBackground) {
        backgroundUrl = null
      } else if (data.background) {
        const backgroundExt = data.background.name.split('.').pop()
        const backgroundFileName = `assessment-background-${Date.now()}.${backgroundExt}`
        const { error: backgroundError } = await supabase.storage
          .from('assessment-assets')
          .upload(backgroundFileName, data.background)

        if (backgroundError) {
          throw new Error(`Failed to upload background: ${backgroundError.message}`)
        }

        const { data: backgroundUrlData } = supabase.storage
          .from('assessment-assets')
          .getPublicUrl(backgroundFileName)
        backgroundUrl = backgroundUrlData.publicUrl
      }

      // Prepare custom_fields for database
      let customFieldsJson: { tag: string[]; default: string[] } | null = null
      if (data.use_custom_fields && data.custom_fields.length > 0) {
        customFieldsJson = {
          tag: data.custom_fields.map(cf => cf.tag),
          default: data.custom_fields.map(cf => cf.default),
        }
      }
      
      // Convert target to legacy format (0=self, 1=other_user, 2=group_leader)
      let targetValue: string | null = null
      if (data.target === 'self') targetValue = '0'
      else if (data.target === 'other_user') targetValue = '1'
      else if (data.target === 'group_leader') targetValue = '2'

      // Build update object with all fields
      type AssessmentRow = Database['public']['Tables']['assessments']['Row']
      type AssessmentUpdate = Partial<Omit<AssessmentRow, 'id' | 'created_at'>> & {
        use_custom_fields?: boolean
        custom_fields?: { tag: string[]; default: string[] } | null
        number_of_questions?: number | null
        dimension_question_counts?: Record<string, number> | null
        show_question_numbers?: boolean
      }
      
      const updateData: AssessmentUpdate = {
        title: data.title,
        description: data.description || null,
        primary_color: data.primary_color,
        accent_color: data.accent_color,
        status: data.status || 'draft',
        split_questions: data.split_questions,
        questions_per_page: data.questions_per_page,
        timed: data.timed,
        time_limit: data.time_limit ?? null,
        is_360: data.is_360,
        type: data.is_360 ? '360' : 'custom',
        updated_at: new Date().toISOString(),
      }
      
      // Set logo/background (null if removed, new URL if uploaded, existing if unchanged)
      updateData.logo = logoUrl
      updateData.background = backgroundUrl
      
      // Always include target (can be null)
      updateData.target = targetValue
      updateData.is_360 = data.is_360
      updateData.number_of_questions = data.number_of_questions ?? null
      // Store dimension_question_counts temporarily - will be mapped after dimensions are created
      const originalDimensionCounts = data.dimension_question_counts || {}
      updateData.show_question_numbers = data.show_question_numbers !== undefined ? data.show_question_numbers : true
      
      // Include custom_fields columns (will fail if migration 007 hasn't been run)
      // Try with custom_fields first, fall back to without if columns don't exist
      updateData.use_custom_fields = data.use_custom_fields || false
      updateData.custom_fields = customFieldsJson

      // Update assessment record
      let { error: assessmentError } = await supabase
        .from('assessments')
        .update(updateData)
        .eq('id', id)

      // If error is about missing columns, retry without them
      if (assessmentError) {
        const errorMessage = assessmentError.message || JSON.stringify(assessmentError)
        // Type guard for Supabase error with code property
        type SupabaseError = { code?: string; details?: string; hint?: string }
        const supabaseError = assessmentError as SupabaseError
        const errorCode = supabaseError?.code || ''
        
        // Check if error is about missing columns
        const isMissingColumnError = 
          errorMessage.includes("custom_fields") ||
          errorMessage.includes("number_of_questions") ||
          errorCode === '42703' // PostgreSQL undefined column error code
        
        if (isMissingColumnError) {
          console.warn('Some columns may not exist - migrations may need to be applied. Retrying without optional columns...')
          const updateDataWithoutOptionalFields = { ...updateData }
          
          // Remove optional fields that might not exist
          if (errorMessage.includes("custom_fields") || errorCode === '42703') {
            delete updateDataWithoutOptionalFields.use_custom_fields
            delete updateDataWithoutOptionalFields.custom_fields
          }
          if (errorMessage.includes("number_of_questions") || errorCode === '42703') {
            delete updateDataWithoutOptionalFields.number_of_questions
          }
          
          const { error: retryError } = await supabase
            .from('assessments')
            .update(updateDataWithoutOptionalFields)
            .eq('id', id)
          
          if (retryError) {
            assessmentError = retryError
          } else {
            assessmentError = null
            setMessage('Assessment updated (some optional features require migrations to be applied)')
          }
        }
      }

      if (assessmentError) {
        console.error('Assessment update error:', assessmentError)
        // Type guard for Supabase error with code property
        type SupabaseError = { code?: string; details?: string; hint?: string }
        const supabaseError = assessmentError as SupabaseError
        console.error('Error details:', {
          message: assessmentError.message,
          code: supabaseError?.code,
          details: supabaseError?.details,
          hint: supabaseError?.hint,
          fullError: JSON.stringify(assessmentError, null, 2)
        })
        console.error('Update data:', updateData)
        const errorMessage = assessmentError.message || 'Unknown error occurred'
        throw new Error(`Failed to update assessment: ${errorMessage}`)
      }

      // Delete existing dimensions and fields, then recreate
      // (Simpler than trying to match and update individual items)
      {
        const { error: deleteDimensionsError } = await supabase
          .from('dimensions')
          .delete()
          .eq('assessment_id', id)
        if (deleteDimensionsError) {
          throw new Error(`Failed to delete dimensions: ${deleteDimensionsError.message}`)
        }
      }

      {
        const { error: deleteFieldsError } = await supabase
          .from('fields')
          .delete()
          .eq('assessment_id', id)
        if (deleteFieldsError) {
          throw new Error(`Failed to delete fields: ${deleteFieldsError.message}`)
        }
      }

      // Create dimensions
      // We need to handle parent_id references properly since temporary IDs need to be mapped to database UUIDs
      // Map temporary dimension IDs to database UUIDs (will be populated as we insert dimensions)
      const tempIdToDbIdMap = new Map<string, string>()
      
      if (data.dimensions.length > 0) {
        // Build a map of temporary IDs to dimension data
        const tempIdMap = new Map<string, { name: string; code: string; parent_id: string | null }>()
        data.dimensions
          .filter(dim => dim.name && dim.code)
          .forEach(dim => {
            tempIdMap.set(dim.id, {
              name: dim.name,
              code: dim.code,
              parent_id: dim.parent_id,
            })
          })

        // Organize dimensions into levels (parents first, then children)
        const getDimensionLevel = (dimId: string, visited = new Set<string>()): number => {
          if (visited.has(dimId)) return 0 // Circular reference protection
          visited.add(dimId)
          const dim = tempIdMap.get(dimId)
          if (!dim || !dim.parent_id || !tempIdMap.has(dim.parent_id)) return 0
          return 1 + getDimensionLevel(dim.parent_id, visited)
        }

        // Sort dimensions by level (parents first)
        const sortedDimensions = Array.from(tempIdMap.entries())
          .sort(([idA], [idB]) => getDimensionLevel(idA) - getDimensionLevel(idB))

        // Insert dimensions level by level, mapping temporary IDs to database UUIDs

        // Track original form order for sort_order
        const originalOrder = data.dimensions
          .filter(dim => dim.name && dim.code)
          .map(dim => dim.id)

        for (const [tempId, dimData] of sortedDimensions) {
          // Map parent_id from temporary ID to database UUID if it exists
          let parentId: string | null = null
          if (dimData.parent_id && tempIdToDbIdMap.has(dimData.parent_id)) {
            parentId = tempIdToDbIdMap.get(dimData.parent_id)!
          } else if (dimData.parent_id) {
            // Parent not yet inserted - this shouldn't happen with proper sorting, but handle gracefully
            console.warn(`Parent dimension ${dimData.parent_id} not found for ${tempId}, setting to null`)
            parentId = null
          }

          const { data: insertedDimension, error: insertError } = await supabase
            .from('dimensions')
            .insert({
              assessment_id: id,
              name: dimData.name,
              code: dimData.code,
              parent_id: parentId,
              sort_order: originalOrder.indexOf(tempId) + 1,
            })
            .select('id')
            .single()

          if (insertError) {
            throw new Error(`Failed to update dimensions: ${insertError.message}`)
          }

          // Map temporary ID to database UUID
          if (insertedDimension) {
            tempIdToDbIdMap.set(tempId, insertedDimension.id)
          }
        }
      }

      // Create fields
      if (data.fields.length > 0) {
        // Use the tempIdToDbIdMap we created when inserting dimensions
        // If it's empty (no dimensions were inserted), rebuild it from database
        if (tempIdToDbIdMap.size === 0 && data.dimensions.length > 0) {
          const { data: dimensions } = await supabase
            .from('dimensions')
            .select('id, code')
            .eq('assessment_id', id)

          dimensions?.forEach(dbDim => {
            // Find the matching dimension in form data by code (since code is unique)
            const formDim = data.dimensions.find(d => d.code === dbDim.code)
            if (formDim) {
              tempIdToDbIdMap.set(formDim.id, dbDim.id)
            }
          })
        }

        // Preserve the exact order from the form data array
        // The array order reflects the current visual order after drag-and-drop
        const fieldsToInsert = data.fields.map((field, index) => {
            let dimensionId = null
            if (field.dimension_id) {
              // Map temporary dimension ID to database UUID
              dimensionId = tempIdToDbIdMap.get(field.dimension_id) || null
            }

            // Use the array index + 1 as the order to preserve the exact order from the form
            // This ensures the visual order matches the saved order
            const orderValue = index + 1
            // Number should match order for consistency
            const numberValue = orderValue

            console.log(`Saving field ${field.id}: order=${orderValue}, arrayIndex=${index}, content="${field.content?.substring(0, 30)}..."`)

            return {
              assessment_id: id,
              dimension_id: dimensionId,
              type: field.type,
              // Allow saving "empty" fields so users can scaffold lots of questions.
              // DB requires NOT NULL, so empty string is valid.
              content: field.content ?? '',
              order: orderValue,
              number: numberValue,
              required: field.required !== undefined ? field.required : true,
              practice: field.practice || false,
              anchors: field.anchors || [],
              insights_table: field.insights_table || undefined,
            }
          })

        if (fieldsToInsert.length > 0) {
          const { error: fieldsError } = await supabase
            .from('fields')
            .insert(fieldsToInsert)

          if (fieldsError) {
            throw new Error(`Failed to update fields: ${fieldsError.message}`)
          }
        }
      }

      // Map dimension_question_counts from temporary IDs to database UUIDs
      if (Object.keys(originalDimensionCounts).length > 0) {
        // Rebuild tempIdToDbIdMap if needed (in case no new dimensions were created)
        if (tempIdToDbIdMap.size === 0 && data.dimensions.length > 0) {
          const { data: dimensions } = await supabase
            .from('dimensions')
            .select('id, code')
            .eq('assessment_id', id)

          dimensions?.forEach(dbDim => {
            // Find the matching dimension in form data by code (since code is unique)
            const formDim = data.dimensions.find(d => d.code === dbDim.code)
            if (formDim) {
              tempIdToDbIdMap.set(formDim.id, dbDim.id)
            }
          })
        }

        // Map dimension_question_counts keys from temporary IDs to database UUIDs
        const mappedDimensionCounts: Record<string, number> = {}
        for (const [tempId, count] of Object.entries(originalDimensionCounts)) {
          if (typeof count === 'number' && count > 0) {
            const dbId = tempIdToDbIdMap.get(tempId)
            if (dbId) {
              mappedDimensionCounts[dbId] = count
            } else {
              // If temp ID not found in map, it might already be a database UUID
              // (e.g., when editing existing assessment without changing dimensions)
              // Check if it's a valid UUID format
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
              if (uuidRegex.test(tempId)) {
                // Already a UUID, use it directly
                mappedDimensionCounts[tempId] = count
              } else {
                console.warn(`Dimension ID ${tempId} not found in tempIdToDbIdMap and is not a UUID, skipping`)
              }
            }
          }
        }

        // Update assessment with mapped dimension_question_counts
        if (Object.keys(mappedDimensionCounts).length > 0) {
          const { error: updateCountsError } = await supabase
            .from('assessments')
            .update({ dimension_question_counts: mappedDimensionCounts })
            .eq('id', id)

          if (updateCountsError) {
            console.error('Error updating dimension_question_counts:', updateCountsError)
            // Don't throw - this is not critical, assessment is already saved
          }
        } else {
          // No valid counts, set to null
          const { error: updateCountsError } = await supabase
            .from('assessments')
            .update({ dimension_question_counts: null })
            .eq('id', id)

          if (updateCountsError) {
            console.error('Error clearing dimension_question_counts:', updateCountsError)
          }
        }
      } else {
        // No dimension counts in form data, clear it
        const { error: updateCountsError } = await supabase
          .from('assessments')
          .update({ dimension_question_counts: null })
          .eq('id', id)

        if (updateCountsError) {
          console.error('Error clearing dimension_question_counts:', updateCountsError)
        }
      }

      setMessage('Assessment updated successfully!')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading assessment...</p>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
        <p className="text-gray-600 mb-4">The assessment you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/assessments">
          <Button>Back to Assessments</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Assessment</h1>
            <p className="text-gray-600">Update assessment details and settings.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/dashboard/assessments/${id}/preview`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Link href="/dashboard/assessments">
              <Button variant="outline">Back to Assessments</Button>
            </Link>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Assessment Form */}
        <AssessmentForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitText="Update Assessment"
          existingLogoUrl={existingLogoUrl}
          existingBackgroundUrl={existingBackgroundUrl}
        />
      </div>
  )
}

