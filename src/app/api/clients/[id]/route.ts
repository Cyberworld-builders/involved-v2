import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import {
  validateLogoFile,
  validateBackgroundImage,
  generateLogoStoragePath,
  generateBackgroundStoragePath,
} from '@/lib/utils/file-upload-utilities'

type ClientUpdate = Database['public']['Tables']['clients']['Update']

/**
 * GET /api/clients/[id]
 * Fetches a single client by ID
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

    // Fetch client by ID
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      console.error('Error fetching client:', error)
      return NextResponse.json(
        { error: 'Failed to fetch client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clients/[id]
 * Updates an existing client
 * Accepts either JSON or FormData (for file uploads)
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

    // Check content type to determine how to parse the body
    const contentType = request.headers.get('content-type') || ''
    let name: string | undefined
    let address: string | undefined
    let logoFile: File | null = null
    let backgroundFile: File | null = null
    let logo: string | null | undefined
    let background: string | null | undefined
    let primary_color: string | undefined
    let accent_color: string | undefined
    let require_profile: boolean | undefined
    let require_research: boolean | undefined
    let whitelabel: boolean | undefined

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData()
      name = formData.get('name') as string | undefined
      address = formData.get('address') as string | undefined
      logoFile = formData.get('logo') as File | null
      backgroundFile = formData.get('background') as File | null
      primary_color = formData.get('primary_color') as string | undefined
      accent_color = formData.get('accent_color') as string | undefined
      
      const requireProfileValue = formData.get('require_profile')
      const requireResearchValue = formData.get('require_research')
      const whitelabelValue = formData.get('whitelabel')
      
      require_profile = requireProfileValue === 'true' ? true : requireProfileValue === 'false' ? false : undefined
      require_research = requireResearchValue === 'true' ? true : requireResearchValue === 'false' ? false : undefined
      whitelabel = whitelabelValue === 'true' ? true : whitelabelValue === 'false' ? false : undefined

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
      logo = body.logo
      background = body.background
      primary_color = body.primary_color
      accent_color = body.accent_color
      require_profile = body.require_profile
      require_research = body.require_research
      whitelabel = body.whitelabel
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Client name cannot be empty' },
        { status: 400 }
      )
    }

    // For JSON requests, only allow clearing logo/background (set to null).
    // Setting these via JSON is not supported because uploads should be handled
    // via multipart/form-data file uploads.
    if (logo !== undefined && logo !== null) {
      return NextResponse.json(
        { error: 'Logo must be uploaded as a file or set to null' },
        { status: 400 }
      )
    }
    if (background !== undefined && background !== null) {
      return NextResponse.json(
        { error: 'Background must be uploaded as a file or set to null' },
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

    // Prepare update data - only include fields that are provided
    const updateData: ClientUpdate = {}
    if (name !== undefined) updateData.name = name.trim()
    if (address !== undefined) updateData.address = address || null
    if (logo !== undefined) updateData.logo = logo
    if (background !== undefined) updateData.background = background
    if (primary_color !== undefined) updateData.primary_color = primary_color || null
    if (accent_color !== undefined) updateData.accent_color = accent_color || null
    if (require_profile !== undefined) updateData.require_profile = require_profile
    if (require_research !== undefined) updateData.require_research = require_research
    if (whitelabel !== undefined) updateData.whitelabel = whitelabel

    // Upload files if provided
    if (logoFile) {
      const logoPath = generateLogoStoragePath(id, logoFile.name)
      const { error: logoUploadError } = await supabase.storage
        .from('client-assets')
        .upload(logoPath, logoFile, {
          contentType: logoFile.type,
          upsert: true, // Allow replacing existing files on update
        })

      if (logoUploadError) {
        console.error('Error uploading logo:', logoUploadError)
        return NextResponse.json(
          { error: `Failed to upload logo: ${logoUploadError.message}` },
          { status: 500 }
        )
      }

      const { data: logoUrlData } = supabase.storage
        .from('client-assets')
        .getPublicUrl(logoPath)
      updateData.logo = logoUrlData.publicUrl
    }

    if (backgroundFile) {
      const backgroundPath = generateBackgroundStoragePath(id, backgroundFile.name)
      const { error: backgroundUploadError } = await supabase.storage
        .from('client-assets')
        .upload(backgroundPath, backgroundFile, {
          contentType: backgroundFile.type,
          upsert: true, // Allow replacing existing files on update
        })

      if (backgroundUploadError) {
        console.error('Error uploading background:', backgroundUploadError)
        return NextResponse.json(
          { error: `Failed to upload background: ${backgroundUploadError.message}` },
          { status: 500 }
        )
      }

      const { data: backgroundUrlData } = supabase.storage
        .from('client-assets')
        .getPublicUrl(backgroundPath)
      updateData.background = backgroundUrlData.publicUrl
    }

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update the client
    updateData.updated_at = new Date().toISOString()

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      console.error('Error updating client:', error)
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clients/[id]
 * Deletes a client from the database
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

    // Delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting client:', error)
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
