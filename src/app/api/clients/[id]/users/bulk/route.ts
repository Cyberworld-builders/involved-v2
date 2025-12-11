import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateUsernameFromName, generateUniqueUsername } from '@/lib/utils/username-generation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { users } = body

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'Users array is required' }, { status: 400 })
    }

    // Get industries for mapping
    const { data: industries, error: industriesError } = await supabase
      .from('industries')
      .select('id, name')

    if (industriesError) {
      return NextResponse.json({ error: industriesError.message }, { status: 500 })
    }

    // Create admin client for auth operations
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (error) {
      console.error('Failed to create admin client:', error)
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to initialize admin client',
          details: 'Make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables'
        },
        { status: 500 }
      )
    }

    // Create users
    const results = []
    
    for (const userData of users) {
      const industry = industries?.find(i => 
        i.name.toLowerCase() === userData.Industry.toLowerCase() || 
        userData.Industry === 'N/A'
      )

      // Check if profile already exists by email
      const { data: existingProfileByEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userData.Email)
        .single()

      if (existingProfileByEmail) {
        results.push({ 
          user: userData.Email, 
          success: false, 
          error: 'User with this email already exists' 
        })
        continue
      }

      // Generate username if not provided
      const baseUsername = userData.Username || generateUsernameFromName(userData.Name)

      // Generate unique username, checking for duplicates
      const checkUsernameExists = async (username: string): Promise<boolean> => {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single()
        return !!data
      }

      const finalUsername = await generateUniqueUsername(baseUsername, checkUsernameExists)

      try {
        // Create auth user using admin client
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: userData.Email,
          password: 'temp123', // Default password - user should change on first login
          email_confirm: true,
          user_metadata: {
            full_name: userData.Name,
            username: finalUsername
          }
        })

        if (authError || !authData.user) {
          const errorMsg = authError?.message || 'Failed to create auth user'
          console.error(`[Bulk Create] Auth error for ${userData.Email}:`, errorMsg)
          results.push({ 
            user: userData.Email, 
            success: false, 
            error: errorMsg
          })
          continue
        }

        // Create profile using admin client to bypass RLS
        const { error: profileError } = await adminClient
          .from('profiles')
          .insert({
            auth_user_id: authData.user.id,
            username: finalUsername,
            name: userData.Name,
            email: userData.Email,
            client_id: id,
            industry_id: industry?.id || null,
            completed_profile: false,
          })

        if (profileError) {
          const errorMsg = `Profile creation failed: ${profileError.message}`
          console.error(`[Bulk Create] Profile error for ${userData.Email}:`, profileError)
          results.push({ 
            user: userData.Email, 
            success: false, 
            error: errorMsg
          })
          // Try to clean up auth user if profile creation failed
          try {
            await adminClient.auth.admin.deleteUser(authData.user.id)
          } catch (deleteError) {
            console.error(`[Bulk Create] Failed to cleanup auth user for ${userData.Email}:`, deleteError)
          }
        } else {
          console.log(`[Bulk Create] Successfully created user: ${userData.Email}`)
          results.push({ 
            user: userData.Email, 
            success: true 
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[Bulk Create] Unexpected error for ${userData.Email}:`, error)
        results.push({ 
          user: userData.Email, 
          success: false, 
          error: errorMsg
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    // Log summary for debugging
    console.log(`[Bulk Create] Summary: ${successCount} succeeded, ${failCount} failed`)
    if (failCount > 0) {
      console.log('[Bulk Create] First 5 failures:', results.filter(r => !r.success).slice(0, 5))
    }

    return NextResponse.json({
      success: true,
      created: successCount,
      failed: failCount,
      results: results.map(r => ({
        user: r.user,
        success: r.success,
        error: r.error || null,
        profileId: 'profileId' in r ? r.profileId || null : null
      }))
    })
  } catch (error) {
    console.error('Bulk user creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

