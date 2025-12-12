import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import {
  validateLogoFile,
  validateBackgroundImage,
  generateLogoStoragePath,
  generateBackgroundStoragePath,
} from '@/lib/utils/file-upload-utilities'

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
 * Accepts either JSON or FormData (for file uploads)
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

    // Check content type to determine how to parse the body
    const contentType = request.headers.get('content-type') || ''
    let name: string
    let address: string | undefined
    let logoFile: File | null = null
    let backgroundFile: File | null = null
    let primary_color: string | undefined
    let accent_color: string | undefined
    let require_profile: boolean
    let require_research: boolean
    let whitelabel: boolean

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData()
      name = formData.get('name') as string
      address = formData.get('address') as string | undefined
      logoFile = formData.get('logo') as File | null
      backgroundFile = formData.get('background') as File | null
      primary_color = formData.get('primary_color') as string | undefined
      accent_color = formData.get('accent_color') as string | undefined
      require_profile = formData.get('require_profile') === 'true'
      require_research = formData.get('require_research') === 'true'
      whitelabel = formData.get('whitelabel') === 'true'

      // Filter out empty file objects
      if (logoFile && (!logoFile.name || logoFile.size === 0)) {
        logoFile = null
      }
      if (backgroundFile && (!backgroundFile.name || backgroundFile.size === 0)) {
        backgroundFile = null
      }
    } else {
      // Handle JSON (backward compatibility)
      const body = await request.json()
      name = body.name
      address = body.address
      primary_color = body.primary_color
      accent_color = body.accent_color
      require_profile = body.require_profile ?? false
      require_research = body.require_research ?? false
      whitelabel = body.whitelabel ?? false
    }

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    // Validate logo file if provided
    if (logoFile) {
      const validation = validateLogoFile(logoFile)
      if (!validation.isValid) {
        return NextResponse.json(
          { error: `Logo validation failed: ${validation.error}` },
          { status: 400 }
        )
      }
    }

    // Validate background file if provided
    if (backgroundFile) {
      const validation = validateBackgroundImage(backgroundFile)
      if (!validation.isValid) {
        return NextResponse.json(
          { error: `Background validation failed: ${validation.error}` },
          { status: 400 }
        )
      }
    }

    // First, insert client to get the ID
    const clientData: ClientInsert = {
      name: name.trim(),
      address: address || null,
      logo: null,
      background: null,
      primary_color: primary_color || null,
      accent_color: accent_color || null,
      require_profile: require_profile ?? false,
      require_research: require_research ?? false,
      whitelabel: whitelabel ?? false,
    }

    const { data: client, error: insertError } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating client:', insertError)
      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      )
    }

    // Upload files if provided
    let logoUrl: string | null = null
    let backgroundUrl: string | null = null

    if (logoFile) {
      const logoPath = generateLogoStoragePath(client.id, logoFile.name)
      const { error: logoUploadError } = await supabase.storage
        .from('client-assets')
        .upload(logoPath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        })

      if (logoUploadError) {
        console.error('Error uploading logo:', logoUploadError)
        // Don't fail the entire operation, just log the error
        // In production, you might want to delete the client record or handle this differently
      } else {
        const { data: logoUrlData } = supabase.storage
          .from('client-assets')
          .getPublicUrl(logoPath)
        logoUrl = logoUrlData.publicUrl
      }
    }

    if (backgroundFile) {
      const backgroundPath = generateBackgroundStoragePath(client.id, backgroundFile.name)
      const { error: backgroundUploadError } = await supabase.storage
        .from('client-assets')
        .upload(backgroundPath, backgroundFile, {
          contentType: backgroundFile.type,
          upsert: false,
        })

      if (backgroundUploadError) {
        console.error('Error uploading background:', backgroundUploadError)
        // Don't fail the entire operation, just log the error
      } else {
        const { data: backgroundUrlData } = supabase.storage
          .from('client-assets')
          .getPublicUrl(backgroundPath)
        backgroundUrl = backgroundUrlData.publicUrl
      }
    }

    // Update client with file URLs if any were uploaded
    if (logoUrl || backgroundUrl) {
      const updateData: Partial<ClientInsert> = {}
      if (logoUrl) updateData.logo = logoUrl
      if (backgroundUrl) updateData.background = backgroundUrl

      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', client.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating client with file URLs:', updateError)
        // Return the client without the URLs rather than failing
        return NextResponse.json({ client }, { status: 201 })
      }

      return NextResponse.json({ client: updatedClient }, { status: 201 })
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
