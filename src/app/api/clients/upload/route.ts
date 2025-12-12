import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  validateLogoFile,
  validateBackgroundImage,
  generateStoragePath,
} from '@/lib/utils/file-upload-utilities'

/**
 * POST /api/clients/upload
 * Uploads a client logo or background image to Supabase Storage
 * 
 * Expected request body: FormData with:
 * - file: File (required)
 * - fileType: 'logo' | 'background' (required)
 * - clientId: string (required) - used for organizing files in storage
 * 
 * Returns: { url: string } - the public URL of the uploaded file
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileType = formData.get('fileType') as 'logo' | 'background' | null
    const clientId = formData.get('clientId') as string | null

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    if (!fileType || (fileType !== 'logo' && fileType !== 'background')) {
      return NextResponse.json(
        { error: 'File type must be either "logo" or "background"' },
        { status: 400 }
      )
    }

    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Validate file based on type
    const validation = fileType === 'logo' 
      ? validateLogoFile(file)
      : validateBackgroundImage(file)

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Generate storage path
    const storagePath = generateStoragePath(clientId, file.name, fileType)

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('client-assets')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('client-assets')
      .getPublicUrl(storagePath)

    return NextResponse.json({ url: urlData.publicUrl }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
