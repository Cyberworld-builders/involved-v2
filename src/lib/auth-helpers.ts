import { createClient } from '@/lib/supabase/client'

/**
 * Creates a user profile in our custom users table linked to Supabase Auth
 * Note: This is mainly for admin-created users. Regular signups are handled by database trigger.
 */
export async function createUserProfile(authUser: { id: string; email: string; user_metadata?: { full_name?: string } }, additionalData?: {
  client_id?: string
  industry_id?: string
  username?: string
}) {
  const supabase = createClient()

  // Generate username from email if not provided
  const username = additionalData?.username || 
    authUser.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 
    'user' + Date.now()

  const { data, error } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.id,
      username: username,
      name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email,
      client_id: additionalData?.client_id || null,
      industry_id: additionalData?.industry_id || null,
      language_id: null, // Default to English
      completed_profile: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating user profile:', error)
    throw new Error(`Failed to create user profile: ${error.message}`)
  }

  return data
}

/**
 * Gets the user profile linked to the current auth user
 */
export async function getUserProfile(authUserId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

/**
 * Checks if a user has a profile in our custom users table
 */
export async function hasUserProfile(authUserId: string): Promise<boolean> {
  const profile = await getUserProfile(authUserId)
  return profile !== null
}
