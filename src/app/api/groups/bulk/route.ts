import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type GroupInsert = Database['public']['Tables']['groups']['Insert']

/**
 * POST /api/groups/bulk
 * Creates multiple groups from bulk upload
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
    const { groups } = body

    // Validate groups array
    if (!Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json(
        { error: 'Groups array is required' },
        { status: 400 }
      )
    }

    // Validate each group
    const validationErrors: string[] = []
    const validGroups: GroupInsert[] = []

    groups.forEach((group, index) => {
      const errors: string[] = []

      if (!group.name || typeof group.name !== 'string' || group.name.trim() === '') {
        errors.push(`Group ${index + 1}: name is required`)
      }

      if (!group.client_id || typeof group.client_id !== 'string' || group.client_id.trim() === '') {
        errors.push(`Group ${index + 1}: client_id is required`)
      }

      if (errors.length > 0) {
        validationErrors.push(...errors)
      } else {
        validGroups.push({
          name: group.name.trim(),
          client_id: group.client_id.trim(),
          description: group.description && group.description.trim() !== '' ? group.description.trim() : null,
          target_id: group.target_id && typeof group.target_id === 'string' && group.target_id.trim() !== '' ? group.target_id.trim() : null,
        })
      }
    })

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Insert all groups into database
    const { data: createdGroups, error } = await supabase
      .from('groups')
      .insert(validGroups)
      .select()

    if (error) {
      console.error('Error creating groups in bulk:', error)
      return NextResponse.json(
        { error: 'Failed to create groups' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        groups: createdGroups,
        count: createdGroups?.length || 0,
        message: `Successfully created ${createdGroups?.length || 0} groups`
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
