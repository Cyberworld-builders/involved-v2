import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  getUsersByClientId,
  getClientByUserId,
  assignUserToClient,
  unassignUserFromClient,
  getUsersByIndustryId,
  getIndustryByUserId,
  assignUserToIndustry,
  unassignUserFromIndustry,
  getUsersByGroupId,
  getGroupsByUserId,
  assignUserToGroup,
  removeUserFromGroup,
  getManagersByGroupId,
  getGroupsWhereUserIsManager,
  assignManagerToGroup,
  removeManagerFromGroup,
} from '../relationship-queries'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

type Profile = Database['public']['Tables']['profiles']['Row']
type GroupMember = Database['public']['Tables']['group_members']['Row']

describe('User-Client Assignment Queries', () => {
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  describe('getUsersByClientId', () => {
    it('should fetch users assigned to a specific client', async () => {
      const mockProfiles: Profile[] = [
        {
          id: 'user1',
          auth_user_id: 'auth1',
          username: 'user1',
          name: 'User One',
          email: 'user1@test.com',
          client_id: 'client1',
          industry_id: null,
          language_id: null,
          last_login_at: null,
          completed_profile: false,
          accepted_terms: null,
          accepted_at: null,
          accepted_signature: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'user2',
          auth_user_id: 'auth2',
          username: 'user2',
          name: 'User Two',
          email: 'user2@test.com',
          client_id: 'client1',
          industry_id: null,
          language_id: null,
          last_login_at: null,
          completed_profile: false,
          accepted_terms: null,
          accepted_at: null,
          accepted_signature: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockProfiles, error: null })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getUsersByClientId(mockSupabase, 'client1')

      expect(result).toEqual(mockProfiles)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should return empty array when no users found', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getUsersByClientId(mockSupabase, 'client1')

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({ data: null, error: { message: 'Database error' } })
            ),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(getUsersByClientId(mockSupabase, 'client1')).rejects.toThrow(
        'Failed to fetch users by client: Database error'
      )
    })

    it('should return empty array when data is null', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getUsersByClientId(mockSupabase, 'client1')

      expect(result).toEqual([])
    })
  })

  describe('getClientByUserId', () => {
    it('should fetch client information for a specific user', async () => {
      const mockProfile: Profile = {
        id: 'user1',
        auth_user_id: 'auth1',
        username: 'user1',
        name: 'User One',
        email: 'user1@test.com',
        client_id: 'client1',
        industry_id: null,
        language_id: null,
        last_login_at: null,
        completed_profile: false,
        accepted_terms: null,
        accepted_at: null,
        accepted_signature: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockProfile, error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getClientByUserId(mockSupabase, 'user1')

      expect(result).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should throw error when user not found', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: null, error: { message: 'User not found' } })
              ),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(getClientByUserId(mockSupabase, 'user1')).rejects.toThrow(
        'Failed to fetch client by user: User not found'
      )
    })
  })

  describe('assignUserToClient', () => {
    it('should assign a user to a client', async () => {
      const mockProfile: Profile = {
        id: 'user1',
        auth_user_id: 'auth1',
        username: 'user1',
        name: 'User One',
        email: 'user1@test.com',
        client_id: 'client1',
        industry_id: null,
        language_id: null,
        last_login_at: null,
        completed_profile: false,
        accepted_terms: null,
        accepted_at: null,
        accepted_signature: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockProfile, error: null })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await assignUserToClient(mockSupabase, 'user1', 'client1')

      expect(result).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should throw error when assignment fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: null, error: { message: 'Assignment failed' } })
                ),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(assignUserToClient(mockSupabase, 'user1', 'client1')).rejects.toThrow(
        'Failed to assign user to client: Assignment failed'
      )
    })
  })

  describe('unassignUserFromClient', () => {
    it('should unassign a user from their client', async () => {
      const mockProfile: Profile = {
        id: 'user1',
        auth_user_id: 'auth1',
        username: 'user1',
        name: 'User One',
        email: 'user1@test.com',
        client_id: null,
        industry_id: null,
        language_id: null,
        last_login_at: null,
        completed_profile: false,
        accepted_terms: null,
        accepted_at: null,
        accepted_signature: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockProfile, error: null })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await unassignUserFromClient(mockSupabase, 'user1')

      expect(result).toEqual(mockProfile)
      expect(result.client_id).toBeNull()
    })

    it('should throw error when unassignment fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: null, error: { message: 'Unassignment failed' } })
                ),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(unassignUserFromClient(mockSupabase, 'user1')).rejects.toThrow(
        'Failed to unassign user from client: Unassignment failed'
      )
    })
  })
})

describe('User-Industry Assignment Queries', () => {
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUsersByIndustryId', () => {
    it('should fetch users assigned to a specific industry', async () => {
      const mockProfiles: Profile[] = [
        {
          id: 'user1',
          auth_user_id: 'auth1',
          username: 'user1',
          name: 'User One',
          email: 'user1@test.com',
          client_id: null,
          industry_id: 'industry1',
          language_id: null,
          last_login_at: null,
          completed_profile: false,
          accepted_terms: null,
          accepted_at: null,
          accepted_signature: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockProfiles, error: null })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getUsersByIndustryId(mockSupabase, 'industry1')

      expect(result).toEqual(mockProfiles)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should return empty array when no users found', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getUsersByIndustryId(mockSupabase, 'industry1')

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({ data: null, error: { message: 'Database error' } })
            ),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(getUsersByIndustryId(mockSupabase, 'industry1')).rejects.toThrow(
        'Failed to fetch users by industry: Database error'
      )
    })
  })

  describe('getIndustryByUserId', () => {
    it('should fetch industry information for a specific user', async () => {
      const mockProfile: Profile = {
        id: 'user1',
        auth_user_id: 'auth1',
        username: 'user1',
        name: 'User One',
        email: 'user1@test.com',
        client_id: null,
        industry_id: 'industry1',
        language_id: null,
        last_login_at: null,
        completed_profile: false,
        accepted_terms: null,
        accepted_at: null,
        accepted_signature: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockProfile, error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getIndustryByUserId(mockSupabase, 'user1')

      expect(result).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should throw error when user not found', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: null, error: { message: 'User not found' } })
              ),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(getIndustryByUserId(mockSupabase, 'user1')).rejects.toThrow(
        'Failed to fetch industry by user: User not found'
      )
    })
  })

  describe('assignUserToIndustry', () => {
    it('should assign a user to an industry', async () => {
      const mockProfile: Profile = {
        id: 'user1',
        auth_user_id: 'auth1',
        username: 'user1',
        name: 'User One',
        email: 'user1@test.com',
        client_id: null,
        industry_id: 'industry1',
        language_id: null,
        last_login_at: null,
        completed_profile: false,
        accepted_terms: null,
        accepted_at: null,
        accepted_signature: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockProfile, error: null })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await assignUserToIndustry(mockSupabase, 'user1', 'industry1')

      expect(result).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should throw error when assignment fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: null, error: { message: 'Assignment failed' } })
                ),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(
        assignUserToIndustry(mockSupabase, 'user1', 'industry1')
      ).rejects.toThrow('Failed to assign user to industry: Assignment failed')
    })
  })

  describe('unassignUserFromIndustry', () => {
    it('should unassign a user from their industry', async () => {
      const mockProfile: Profile = {
        id: 'user1',
        auth_user_id: 'auth1',
        username: 'user1',
        name: 'User One',
        email: 'user1@test.com',
        client_id: null,
        industry_id: null,
        language_id: null,
        last_login_at: null,
        completed_profile: false,
        accepted_terms: null,
        accepted_at: null,
        accepted_signature: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockProfile, error: null })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await unassignUserFromIndustry(mockSupabase, 'user1')

      expect(result).toEqual(mockProfile)
      expect(result.industry_id).toBeNull()
    })

    it('should throw error when unassignment fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: null, error: { message: 'Unassignment failed' } })
                ),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(unassignUserFromIndustry(mockSupabase, 'user1')).rejects.toThrow(
        'Failed to unassign user from industry: Unassignment failed'
      )
    })
  })
})

describe('Group-User Assignment Queries', () => {
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUsersByGroupId', () => {
    it('should fetch all users in a specific group', async () => {
      const mockGroupMembers: GroupMember[] = [
        {
          id: 'member1',
          group_id: 'group1',
          profile_id: 'user1',
          position: null,
          leader: false,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'member2',
          group_id: 'group1',
          profile_id: 'user2',
          position: null,
          leader: false,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockGroupMembers, error: null })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getUsersByGroupId(mockSupabase, 'group1')

      expect(result).toEqual(mockGroupMembers)
      expect(mockSupabase.from).toHaveBeenCalledWith('group_members')
    })

    it('should return empty array when no members found', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getUsersByGroupId(mockSupabase, 'group1')

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({ data: null, error: { message: 'Database error' } })
            ),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(getUsersByGroupId(mockSupabase, 'group1')).rejects.toThrow(
        'Failed to fetch users by group: Database error'
      )
    })
  })

  describe('getGroupsByUserId', () => {
    it('should fetch all groups a user is a member of', async () => {
      const mockGroupMembers: GroupMember[] = [
        {
          id: 'member1',
          group_id: 'group1',
          profile_id: 'user1',
          position: null,
          leader: false,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'member2',
          group_id: 'group2',
          profile_id: 'user1',
          position: null,
          leader: false,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockGroupMembers, error: null })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getGroupsByUserId(mockSupabase, 'user1')

      expect(result).toEqual(mockGroupMembers)
      expect(mockSupabase.from).toHaveBeenCalledWith('group_members')
    })

    it('should return empty array when user is not in any groups', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getGroupsByUserId(mockSupabase, 'user1')

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({ data: null, error: { message: 'Database error' } })
            ),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(getGroupsByUserId(mockSupabase, 'user1')).rejects.toThrow(
        'Failed to fetch groups by user: Database error'
      )
    })
  })

  describe('assignUserToGroup', () => {
    it('should assign a user to a group without position', async () => {
      const mockGroupMember: GroupMember = {
        id: 'member1',
        group_id: 'group1',
        profile_id: 'user1',
        position: null,
        leader: false,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockGroupMember, error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await assignUserToGroup(mockSupabase, 'group1', 'user1')

      expect(result).toEqual(mockGroupMember)
      expect(result.position).toBeNull()
    })

    it('should assign a user to a group with position', async () => {
      const mockGroupMember: GroupMember = {
        id: 'member1',
        group_id: 'group1',
        profile_id: 'user1',
        position: 'Peer',
        leader: false,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockGroupMember, error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await assignUserToGroup(mockSupabase, 'group1', 'user1', 'Peer')

      expect(result).toEqual(mockGroupMember)
      expect(result.position).toBe('Peer')
    })

    it('should throw error when assignment fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: null, error: { message: 'Assignment failed' } })
              ),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(assignUserToGroup(mockSupabase, 'group1', 'user1')).rejects.toThrow(
        'Failed to assign user to group: Assignment failed'
      )
    })
  })

  describe('removeUserFromGroup', () => {
    it('should remove a user from a group', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(
        removeUserFromGroup(mockSupabase, 'group1', 'user1')
      ).resolves.not.toThrow()

      expect(mockSupabase.from).toHaveBeenCalledWith('group_members')
    })

    it('should throw error when removal fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: { message: 'Removal failed' } })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(removeUserFromGroup(mockSupabase, 'group1', 'user1')).rejects.toThrow(
        'Failed to remove user from group: Removal failed'
      )
    })
  })
})

describe('Group-Manager Assignment Queries', () => {
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getManagersByGroupId', () => {
    it('should fetch all managers in a specific group', async () => {
      const mockManagers: GroupMember[] = [
        {
          id: 'member1',
          group_id: 'group1',
          profile_id: 'user1',
          position: null,
          leader: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'member2',
          group_id: 'group1',
          profile_id: 'user2',
          position: null,
          leader: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockManagers, error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getManagersByGroupId(mockSupabase, 'group1')

      expect(result).toEqual(mockManagers)
      expect(mockSupabase.from).toHaveBeenCalledWith('group_members')
    })

    it('should return empty array when no managers found', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getManagersByGroupId(mockSupabase, 'group1')

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({ data: null, error: { message: 'Database error' } })
              ),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(getManagersByGroupId(mockSupabase, 'group1')).rejects.toThrow(
        'Failed to fetch managers by group: Database error'
      )
    })
  })

  describe('getGroupsWhereUserIsManager', () => {
    it('should fetch all groups where user is a manager', async () => {
      const mockManagedGroups: GroupMember[] = [
        {
          id: 'member1',
          group_id: 'group1',
          profile_id: 'user1',
          position: null,
          leader: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'member2',
          group_id: 'group2',
          profile_id: 'user1',
          position: null,
          leader: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockManagedGroups, error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getGroupsWhereUserIsManager(mockSupabase, 'user1')

      expect(result).toEqual(mockManagedGroups)
      expect(mockSupabase.from).toHaveBeenCalledWith('group_members')
    })

    it('should return empty array when user manages no groups', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await getGroupsWhereUserIsManager(mockSupabase, 'user1')

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({ data: null, error: { message: 'Database error' } })
              ),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(getGroupsWhereUserIsManager(mockSupabase, 'user1')).rejects.toThrow(
        'Failed to fetch managed groups by user: Database error'
      )
    })
  })

  describe('assignManagerToGroup', () => {
    it('should create new membership when user is not in group', async () => {
      const mockGroupMember: GroupMember = {
        id: 'member1',
        group_id: 'group1',
        profile_id: 'user1',
        position: null,
        leader: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'group_members') {
            const selectFn = vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
              })),
            }))
            const insertFn = vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockGroupMember, error: null })),
              })),
            }))
            return {
              select: selectFn,
              insert: insertFn,
            }
          }
          return {}
        }),
      } as unknown as SupabaseClient<Database>

      const result = await assignManagerToGroup(mockSupabase, 'group1', 'user1')

      expect(result).toEqual(mockGroupMember)
      expect(result.leader).toBe(true)
    })

    it('should update existing membership to manager role', async () => {
      const existingMember: GroupMember = {
        id: 'member1',
        group_id: 'group1',
        profile_id: 'user1',
        position: null,
        leader: false,
        created_at: '2024-01-01T00:00:00Z',
      }

      const updatedMember: GroupMember = {
        ...existingMember,
        leader: true,
      }

      mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'group_members') {
            const selectFn = vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({ data: existingMember, error: null })
                  ),
                })),
              })),
            }))
            const updateFn = vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(() =>
                      Promise.resolve({ data: updatedMember, error: null })
                    ),
                  })),
                })),
              })),
            }))
            return {
              select: selectFn,
              update: updateFn,
            }
          }
          return {}
        }),
      } as unknown as SupabaseClient<Database>

      const result = await assignManagerToGroup(mockSupabase, 'group1', 'user1')

      expect(result).toEqual(updatedMember)
      expect(result.leader).toBe(true)
    })

    it('should throw error when update fails', async () => {
      const existingMember: GroupMember = {
        id: 'member1',
        group_id: 'group1',
        profile_id: 'user1',
        position: null,
        leader: false,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'group_members') {
            const selectFn = vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({ data: existingMember, error: null })
                  ),
                })),
              })),
            }))
            const updateFn = vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(() =>
                      Promise.resolve({ data: null, error: { message: 'Update failed' } })
                    ),
                  })),
                })),
              })),
            }))
            return {
              select: selectFn,
              update: updateFn,
            }
          }
          return {}
        }),
      } as unknown as SupabaseClient<Database>

      await expect(
        assignManagerToGroup(mockSupabase, 'group1', 'user1')
      ).rejects.toThrow('Failed to update user to manager: Update failed')
    })

    it('should throw error when insert fails', async () => {
      mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'group_members') {
            const selectFn = vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
              })),
            }))
            const insertFn = vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: null, error: { message: 'Insert failed' } })
                ),
              })),
            }))
            return {
              select: selectFn,
              insert: insertFn,
            }
          }
          return {}
        }),
      } as unknown as SupabaseClient<Database>

      await expect(
        assignManagerToGroup(mockSupabase, 'group1', 'user1')
      ).rejects.toThrow('Failed to assign manager to group: Insert failed')
    })
  })

  describe('removeManagerFromGroup', () => {
    it('should remove a manager from a group by setting leader to false', async () => {
      const updatedMember: GroupMember = {
        id: 'member1',
        group_id: 'group1',
        profile_id: 'user1',
        position: null,
        leader: false,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: updatedMember, error: null })),
                })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      const result = await removeManagerFromGroup(mockSupabase, 'group1', 'user1')

      expect(result).toEqual(updatedMember)
      expect(result.leader).toBe(false)
      expect(mockSupabase.from).toHaveBeenCalledWith('group_members')
    })

    it('should throw error when removal fails', async () => {
      mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({ data: null, error: { message: 'Removal failed' } })
                  ),
                })),
              })),
            })),
          })),
        })),
      } as unknown as SupabaseClient<Database>

      await expect(
        removeManagerFromGroup(mockSupabase, 'group1', 'user1')
      ).rejects.toThrow('Failed to remove manager from group: Removal failed')
    })
  })
})
