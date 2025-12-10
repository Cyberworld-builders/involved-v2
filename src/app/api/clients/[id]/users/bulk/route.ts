import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

      // Generate username if not provided
      const username = userData.Username || userData.Name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20)

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

      // Check if username already exists and generate unique one if needed
      let finalUsername = username
      const { data: existingProfileByUsername } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()

      if (existingProfileByUsername) {
        // Generate unique username by appending a number
        let counter = 1
        let found = true
        while (found && counter < 1000) {
          finalUsername = `${username}${counter}`
          const { data: check } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', finalUsername)
            .single()
          if (!check) {
            found = false
          } else {
            counter++
          }
        }
        if (found) {
          // Fallback to timestamp if we can't find a unique username
          finalUsername = `${username}${Date.now()}`
        }
      }

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
            client_id: params.id,
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
        profileId: r.profileId || null
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

