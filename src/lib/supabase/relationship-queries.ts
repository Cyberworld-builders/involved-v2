import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Relationship Query Management
 * Functions for managing and querying relationships between entities
 */

type Profile = Database['public']['Tables']['profiles']['Row']
type GroupMember = Database['public']['Tables']['group_members']['Row']

/**
 * User-Client Assignment Queries
 */

/**
 * Get all users assigned to a specific client
 * @param supabase - Supabase client instance
 * @param clientId - The client UUID
 * @returns Array of profiles assigned to the client
 */
export async function getUsersByClientId(
  supabase: SupabaseClient<Database>,
  clientId: string
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('client_id', clientId)

  if (error) {
    throw new Error(`Failed to fetch users by client: ${error.message}`)
  }

  return data || []
}

/**
 * Get the client assigned to a specific user
 * @param supabase - Supabase client instance
 * @param userId - The user/profile UUID
 * @returns Profile with client information
 */
export async function getClientByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch client by user: ${error.message}`)
  }

  return data
}

/**
 * Assign a user to a client
 * @param supabase - Supabase client instance
 * @param userId - The user/profile UUID
 * @param clientId - The client UUID
 * @returns Updated profile
 */
export async function assignUserToClient(
  supabase: SupabaseClient<Database>,
  userId: string,
  clientId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ client_id: clientId })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to assign user to client: ${error.message}`)
  }

  return data
}

/**
 * Unassign a user from their client
 * @param supabase - Supabase client instance
 * @param userId - The user/profile UUID
 * @returns Updated profile
 */
export async function unassignUserFromClient(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ client_id: null })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to unassign user from client: ${error.message}`)
  }

  return data
}

/**
 * User-Industry Assignment Queries
 */

/**
 * Get all users assigned to a specific industry
 * @param supabase - Supabase client instance
 * @param industryId - The industry UUID
 * @returns Array of profiles assigned to the industry
 */
export async function getUsersByIndustryId(
  supabase: SupabaseClient<Database>,
  industryId: string
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('industry_id', industryId)

  if (error) {
    throw new Error(`Failed to fetch users by industry: ${error.message}`)
  }

  return data || []
}

/**
 * Get the industry assigned to a specific user
 * @param supabase - Supabase client instance
 * @param userId - The user/profile UUID
 * @returns Profile with industry information
 */
export async function getIndustryByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch industry by user: ${error.message}`)
  }

  return data
}

/**
 * Assign a user to an industry
 * @param supabase - Supabase client instance
 * @param userId - The user/profile UUID
 * @param industryId - The industry UUID
 * @returns Updated profile
 */
export async function assignUserToIndustry(
  supabase: SupabaseClient<Database>,
  userId: string,
  industryId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ industry_id: industryId })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to assign user to industry: ${error.message}`)
  }

  return data
}

/**
 * Unassign a user from their industry
 * @param supabase - Supabase client instance
 * @param userId - The user/profile UUID
 * @returns Updated profile
 */
export async function unassignUserFromIndustry(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ industry_id: null })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to unassign user from industry: ${error.message}`)
  }

  return data
}

/**
 * Group-User Assignment Queries
 */

/**
 * Get all users in a specific group
 * @param supabase - Supabase client instance
 * @param groupId - The group UUID
 * @returns Array of group members
 */
export async function getUsersByGroupId(
  supabase: SupabaseClient<Database>,
  groupId: string
): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)

  if (error) {
    throw new Error(`Failed to fetch users by group: ${error.message}`)
  }

  return data || []
}

/**
 * Get all groups a user is a member of
 * @param supabase - Supabase client instance
 * @param userId - The user/profile UUID
 * @returns Array of group memberships
 */
export async function getGroupsByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('profile_id', userId)

  if (error) {
    throw new Error(`Failed to fetch groups by user: ${error.message}`)
  }

  return data || []
}

/**
 * Assign a user to a group
 * @param supabase - Supabase client instance
 * @param groupId - The group UUID
 * @param userId - The user/profile UUID
 * @param position - The position/relationship in the group (optional, for 360 reports)
 * @returns Created group member record
 */
export async function assignUserToGroup(
  supabase: SupabaseClient<Database>,
  groupId: string,
  userId: string,
  position?: string | null
): Promise<GroupMember> {
  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      profile_id: userId,
      position: position || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to assign user to group: ${error.message}`)
  }

  return data
}

/**
 * Remove a user from a group
 * @param supabase - Supabase client instance
 * @param groupId - The group UUID
 * @param userId - The user/profile UUID
 * @returns Deleted group member record
 */
export async function removeUserFromGroup(
  supabase: SupabaseClient<Database>,
  groupId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('profile_id', userId)

  if (error) {
    throw new Error(`Failed to remove user from group: ${error.message}`)
  }
}

/**
 * Group-Manager Assignment Queries
 */

/**
 * Get all managers in a specific group
 * @param supabase - Supabase client instance
 * @param groupId - The group UUID
 * @returns Array of group members with leader flag set to true
 */
export async function getManagersByGroupId(
  supabase: SupabaseClient<Database>,
  groupId: string
): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('leader', true)

  if (error) {
    throw new Error(`Failed to fetch managers by group: ${error.message}`)
  }

  return data || []
}

/**
 * Get all groups where a user is a manager
 * @param supabase - Supabase client instance
 * @param userId - The user/profile UUID
 * @returns Array of group memberships where user is a leader
 */
export async function getGroupsWhereUserIsManager(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('profile_id', userId)
    .eq('leader', true)

  if (error) {
    throw new Error(`Failed to fetch managed groups by user: ${error.message}`)
  }

  return data || []
}

/**
 * Assign a user as a manager to a group
 * @param supabase - Supabase client instance
 * @param groupId - The group UUID
 * @param userId - The user/profile UUID
 * @returns Created or updated group member record with leader flag set to true
 */
export async function assignManagerToGroup(
  supabase: SupabaseClient<Database>,
  groupId: string,
  userId: string
): Promise<GroupMember> {
  // Check if user is already in the group
  const { data: existing } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('profile_id', userId)
    .single()

  if (existing) {
    // Update existing membership to set leader flag
    const { data, error } = await supabase
      .from('group_members')
      .update({ leader: true })
      .eq('group_id', groupId)
      .eq('profile_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update user to manager: ${error.message}`)
    }

    return data
  } else {
    // Create new membership with leader flag set
    const { data, error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        profile_id: userId,
        leader: true,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to assign manager to group: ${error.message}`)
    }

    return data
  }
}

/**
 * Remove a manager from a group (sets leader flag to false)
 * @param supabase - Supabase client instance
 * @param groupId - The group UUID
 * @param userId - The user/profile UUID
 * @returns Updated group member record
 */
export async function removeManagerFromGroup(
  supabase: SupabaseClient<Database>,
  groupId: string,
  userId: string
): Promise<GroupMember> {
  const { data, error } = await supabase
    .from('group_members')
    .update({ leader: false })
    .eq('group_id', groupId)
    .eq('profile_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to remove manager from group: ${error.message}`)
  }

  return data
}
