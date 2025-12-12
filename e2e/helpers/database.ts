import { createClient } from '@supabase/supabase-js'

/**
 * Database helpers for E2E tests
 * 
 * These helpers provide utilities for managing test data in Supabase.
 * Uses service role key for admin operations (bypasses RLS for test setup).
 */

let adminClient: ReturnType<typeof createClient> | null = null

/**
 * Get or create Supabase admin client
 * 
 * Uses service role key for admin operations (create users, bypass RLS, etc.)
 * This should only be used in test setup/teardown, never in application code.
 * 
 * @returns Supabase admin client or null if service key not available
 */
export function getAdminClient() {
  if (adminClient) return adminClient
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }
  
  adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  
  return adminClient
}

/**
 * Create a test user with profile
 * 
 * Creates both the auth user and the corresponding profile record.
 * This is a common pattern in Supabase applications.
 * 
 * Note: The profiles table does not have a role field. Roles are managed
 * through group_members if needed, or through application-level logic.
 * 
 * @param email - User email
 * @param password - User password
 * @param role - User role (optional, currently unused - profiles table has no role field)
 * @param firstName - First name (default: 'Test')
 * @param lastName - Last name (default: 'User')
 * @returns Created user data or null if failed
 */
export async function createTestUser(
  email: string,
  password: string,
  role?: string, // Currently unused - profiles table has no role field
  firstName: string = 'Test',
  lastName: string = 'User'
) {
  const client = getAdminClient()
  if (!client) {
    console.warn('Admin client not available - cannot create test user')
    return null
  }
  
  try {
    // Check if user already exists
    const { data: usersList } = await client.auth.admin.listUsers()
    const existingUser = usersList?.users?.find((user: { email?: string }) => user.email === email)
    
    if (existingUser) {
      console.log(`User ${email} already exists: ${existingUser.id}`)
      // Update password in case it changed
      await client.auth.admin.updateUserById(existingUser.id, {
        password,
      })
      return { user: existingUser, created: false }
    }
    
    // Create new user
    const { data: newUser, error: createError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for testing
    })
    
    if (createError) {
      console.error(`Failed to create user: ${createError.message}`)
      return null
    }
    
    if (!newUser.user) {
      console.error('User creation returned no user data')
      return null
    }
    
    // Create profile
    // Note: Using type assertion because admin client doesn't have full type definitions
    // Generate username from email if not provided
    const username = email.split('@')[0] || `testuser_${Date.now()}`
    const fullName = `${firstName} ${lastName}`
    
    const profileData = {
      id: newUser.user.id,
      auth_user_id: newUser.user.id,
      username,
      name: fullName,
      email,
      client_id: null,
      industry_id: null,
      language_id: null,
      completed_profile: true,
      accepted_terms: true,
      accepted_at: new Date().toISOString(),
    }
    // Type assertion needed because admin client doesn't have full type definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (client.from('profiles') as any).upsert(profileData)
    
    if (profileError) {
      console.warn(`Failed to create profile: ${profileError.message}`)
      // User created but profile failed - still return user
    }
    
    console.log(`✅ Created test user: ${email} (${newUser.user.id})`)
    return { user: newUser.user, created: true }
  } catch (error) {
    console.error('Error creating test user:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Delete a test user
 * 
 * Removes both the profile and the auth user.
 * Useful for test cleanup.
 * 
 * @param userId - User ID to delete
 * @returns true if successful
 */
export async function deleteTestUser(userId: string): Promise<boolean> {
  const client = getAdminClient()
  if (!client) {
    console.warn('Admin client not available - cannot delete test user')
    return false
  }
  
  try {
    // Delete profile first (foreign key constraint)
    await client.from('profiles').delete().eq('id', userId)
    
    // Delete auth user
    const { error } = await client.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error(`Failed to delete user: ${error.message}`)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error deleting test user:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

/**
 * Create a test user invitation
 * 
 * Creates a user profile and an invitation token for account claim testing.
 * 
 * @param email - User email
 * @param name - User name
 * @param status - Invite status (default: 'pending')
 * @param expiresInDays - Days until expiration (default: 7)
 * @returns Created invite data with token or null if failed
 */
export async function createTestInvite(
  email: string,
  name: string,
  status: 'pending' | 'accepted' | 'expired' | 'revoked' = 'pending',
  expiresInDays: number = 7
) {
  const client = getAdminClient()
  if (!client) {
    console.warn('Admin client not available - cannot create test invite')
    return null
  }
  
  try {
    // Generate a secure token (32 bytes = 64 hex characters)
    const buffer = new Uint8Array(32)
    crypto.getRandomValues(buffer)
    const token = Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    
    // Create a profile for the invited user (without auth_user_id)
    const emailLocal = email.split('@')[0]
    const username = (emailLocal && emailLocal.length > 0) ? emailLocal : `testuser_${Date.now()}`
    const profileData = {
      username,
      name,
      email,
      client_id: null,
      industry_id: null,
      language_id: null,
      completed_profile: false,
      accepted_terms: false,
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await (client.from('profiles') as any)
      .insert(profileData)
      .select()
      .single()
    
    if (profileError || !profile) {
      console.error(`Failed to create test profile: ${profileError?.message}`)
      return null
    }
    
    // Create the invitation
    const inviteData = {
      token,
      profile_id: profile.id,
      invited_by: null, // Could be set to an admin user ID if needed
      expires_at: expiresAt.toISOString(),
      status,
      accepted_at: status === 'accepted' ? new Date().toISOString() : null,
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invite, error: inviteError } = await (client.from('user_invites') as any)
      .insert(inviteData)
      .select()
      .single()
    
    if (inviteError || !invite) {
      console.error(`Failed to create test invite: ${inviteError?.message}`)
      // Clean up the profile
      await client.from('profiles').delete().eq('id', profile.id)
      return null
    }
    
    console.log(`✅ Created test invite for: ${email} with token: ${token.substring(0, 16)}...`)
    return {
      token,
      profileId: profile.id,
      inviteId: invite.id,
      email,
      name,
      expiresAt,
    }
  } catch (error) {
    console.error('Error creating test invite:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Delete a test invitation and associated profile
 * 
 * @param profileId - Profile ID to delete
 * @returns true if successful
 */
export async function deleteTestInvite(profileId: string): Promise<boolean> {
  const client = getAdminClient()
  if (!client) {
    console.warn('Admin client not available - cannot delete test invite')
    return false
  }
  
  try {
    // Delete invitation (will cascade based on DB constraints)
    await client.from('user_invites').delete().eq('profile_id', profileId)
    
    // Delete profile
    await client.from('profiles').delete().eq('id', profileId)
    
    return true
  } catch (error) {
    console.error('Error deleting test invite:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

/**
 * Clean up test data
 * 
 * Removes test data created during test runs.
 * Can be customized based on your test data patterns.
 * 
 * @param testIdentifier - Unique identifier for this test run (e.g., timestamp, run ID)
 */
export async function cleanupTestData(testIdentifier?: string) {
  const client = getAdminClient()
  if (!client) {
    return
  }
  
  // Example: Delete test clients created during this run
  // You can customize this based on your needs
  if (testIdentifier) {
    try {
      // Delete test clients with identifier in name
      await client
        .from('clients')
        .delete()
        .like('name', `%${testIdentifier}%`)
      
      console.log(`Cleaned up test data for: ${testIdentifier}`)
    } catch (error) {
      console.warn('Error cleaning up test data:', error instanceof Error ? error.message : 'Unknown error')
    }
  }
}
