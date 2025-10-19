import { createClient } from '@/lib/supabase/server'

/**
 * Ensures a user profile exists in our users table
 * This is a fallback for when the database trigger doesn't work
 */
export async function ensureUserProfile(authUserId: string, userEmail?: string, userMetadata?: any) {
  const supabase = await createClient()

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  if (existingProfile) {
    return { success: true, profile: existingProfile }
  }

  // Create profile if it doesn't exist
  console.log('Creating user profile for:', authUserId)
  
  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert({
      auth_user_id: authUserId,
      username: userEmail?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Date.now()}`,
      name: userMetadata?.full_name || userEmail?.split('@')[0] || 'User',
      email: userEmail || '',
      language_id: null, // Default to English
      completed_profile: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create user profile:', error)
    return { success: false, error }
  }

  console.log('User profile created successfully')
  return { success: true, profile: newProfile }
}
