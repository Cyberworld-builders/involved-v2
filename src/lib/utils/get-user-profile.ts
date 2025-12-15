/**
 * Get user profile with access level
 * Helper function to fetch user profile and determine access level
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface UserProfile extends ProfileRow {
  access_level: 'member' | 'client_admin' | 'super_admin'
}

/**
 * Get user profile with access level
 * @param supabase - Supabase client
 * @param userId - Auth user ID
 * @returns User profile with access level
 */
export async function getUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .single()

  if (error || !profile) {
    return null
  }

  // Derive access level
  const accessLevel: 'member' | 'client_admin' | 'super_admin' =
    profile.access_level ||
    (profile.role === 'admin'
      ? 'super_admin'
      : profile.role === 'manager' || profile.role === 'client'
        ? 'client_admin'
        : 'member')

  return {
    ...profile,
    access_level: accessLevel,
  }
}
