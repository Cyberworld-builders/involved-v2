import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseGroupSpreadsheet } from '@/lib/utils/spreadsheet-parsing'
import { Database } from '@/types/database'

type GroupInsert = Database['public']['Tables']['groups']['Insert']

/**
 * POST /api/groups/upload
 * Creates multiple groups from CSV spreadsheet upload
 * 
 * Expected request body: 
 * - csvContent: string (CSV text content)
 * 
 * CSV Format:
 * - Required columns: Name
 * - Optional columns: Description, Client Name (or client_name)
 * 
 * Returns: { groups: Group[], count: number, message: string }
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
    const { csvContent } = body

    // Validate CSV content
    if (!csvContent || typeof csvContent !== 'string' || csvContent.trim() === '') {
      return NextResponse.json(
        { error: 'CSV content is required' },
        { status: 400 }
      )
    }

    // Parse CSV using the spreadsheet parsing utility
    const parseResult = parseGroupSpreadsheet(csvContent)

    // Check for parsing errors
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'CSV parsing failed', 
          details: parseResult.errors 
        },
        { status: 400 }
      )
    }

    // Check if any groups were parsed
    if (parseResult.data.length === 0) {
      return NextResponse.json(
        { error: 'No valid groups found in CSV' },
        { status: 400 }
      )
    }

    // Fetch all clients to map client names to IDs
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')

    if (clientsError) {
      console.error('Error fetching clients:', clientsError)
      return NextResponse.json(
        { error: 'Failed to fetch clients for mapping' },
        { status: 500 }
      )
    }

    // Map parsed groups to database inserts
    const validationErrors: string[] = []
    const groupInserts: GroupInsert[] = []

    parseResult.data.forEach((group, index) => {
      // Client name is required for groups
      if (!group.client_name) {
        validationErrors.push(
          `Row ${index + 2}: Client name is required (column: 'Client Name' or 'client_name')`
        )
        return
      }

      // Store client name for type safety
      const clientName = group.client_name

      // Find the matching client
      const client = clients?.find(
        c => c.name.toLowerCase() === clientName.toLowerCase()
      )

      if (!client) {
        validationErrors.push(
          `Row ${index + 2}: Client '${clientName}' not found`
        )
        return
      }

      groupInserts.push({
        name: group.name,
        description: group.description || null,
        client_id: client.id,
      })
    })

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationErrors 
        },
        { status: 400 }
      )
    }

    // Insert all groups into database
    const { data: createdGroups, error: insertError } = await supabase
      .from('groups')
      .insert(groupInserts)
      .select()

    if (insertError) {
      console.error('Error creating groups:', insertError)
      
      // Check for common errors
      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        return NextResponse.json(
          { error: 'One or more groups already exist with the same name for the client' },
          { status: 409 }
        )
      }

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
