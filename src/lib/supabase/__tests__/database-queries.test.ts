import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import {
  // Client operations
  selectClients,
  selectClientById,
  insertClient,
  updateClient,
  deleteClient,
  // User operations
  selectUsers,
  selectUserById,
  selectUserByEmail,
  insertUser,
  updateUser,
  deleteUser,
  // Group operations
  selectGroups,
  selectGroupById,
  insertGroup,
  updateGroup,
  deleteGroup,
  // Industry operations
  selectIndustries,
  selectIndustryById,
  insertIndustry,
  updateIndustry,
  deleteIndustry,
  // Benchmark operations
  selectBenchmarks,
  selectBenchmarkById,
  insertBenchmark,
  updateBenchmark,
  deleteBenchmark,
} from '../database-queries'

// Mock Supabase client
function createMockSupabaseClient() {
  const mockFrom = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()
  const mockEq = vi.fn()
  const mockNeq = vi.fn()
  const mockGt = vi.fn()
  const mockGte = vi.fn()
  const mockLt = vi.fn()
  const mockLte = vi.fn()
  const mockLike = vi.fn()
  const mockIlike = vi.fn()
  const mockOrder = vi.fn()
  const mockSingle = vi.fn()

  // Create a chainable query builder that returns itself for all filter methods
  const createChainableQuery = () => ({
    eq: mockEq,
    neq: mockNeq,
    gt: mockGt,
    gte: mockGte,
    lt: mockLt,
    lte: mockLte,
    like: mockLike,
    ilike: mockIlike,
    order: mockOrder,
    single: mockSingle,
    select: mockSelect,
  })

  const chainableQuery = createChainableQuery()

  // Chain methods
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })

  mockSelect.mockReturnValue(chainableQuery)
  mockInsert.mockReturnValue({ select: mockSelect })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })

  // All filter methods return the chainable query to support chaining
  mockEq.mockReturnValue(chainableQuery)
  mockNeq.mockReturnValue(chainableQuery)
  mockGt.mockReturnValue(chainableQuery)
  mockGte.mockReturnValue(chainableQuery)
  mockLt.mockReturnValue(chainableQuery)
  mockLte.mockReturnValue(chainableQuery)
  mockLike.mockReturnValue(chainableQuery)
  mockIlike.mockReturnValue(chainableQuery)
  mockOrder.mockReturnValue(chainableQuery)

  return {
    from: mockFrom,
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    neq: mockNeq,
    gt: mockGt,
    gte: mockGte,
    lt: mockLt,
    lte: mockLte,
    like: mockLike,
    ilike: mockIlike,
    order: mockOrder,
    single: mockSingle,
  }
}

describe('Client CRUD Operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let supabase: SupabaseClient<Database>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    supabase = mockSupabase as unknown as SupabaseClient<Database>
  })

  describe('selectClients', () => {
    it('should fetch all clients with default sorting', async () => {
      const mockClients = [
        { id: '1', name: 'Client 1', created_at: '2024-01-01' },
        { id: '2', name: 'Client 2', created_at: '2024-01-02' },
      ]
      mockSupabase.order.mockResolvedValue({ data: mockClients, error: null })

      const result = await selectClients(supabase)

      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result.data).toEqual(mockClients)
      expect(result.error).toBeNull()
    })

    it('should fetch all clients with custom sorting', async () => {
      const mockClients = [
        { id: '1', name: 'Client A', created_at: '2024-01-01' },
        { id: '2', name: 'Client B', created_at: '2024-01-02' },
      ]
      mockSupabase.order.mockResolvedValue({ data: mockClients, error: null })

      const result = await selectClients(supabase, { column: 'name', ascending: true })

      expect(mockSupabase.order).toHaveBeenCalledWith('name', { ascending: true })
      expect(result.data).toEqual(mockClients)
      expect(result.error).toBeNull()
    })

    it('should handle error when fetching clients', async () => {
      const mockError = { message: 'Database error' }
      mockSupabase.order.mockResolvedValue({ data: null, error: mockError })

      const result = await selectClients(supabase)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Database error')
    })

    it('should handle unexpected errors', async () => {
      mockSupabase.order.mockRejectedValue(new Error('Network error'))

      const result = await selectClients(supabase)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Network error')
    })
  })

  describe('selectClientById', () => {
    it('should fetch a single client by ID', async () => {
      const mockClient = { id: '1', name: 'Test Client', created_at: '2024-01-01' }
      mockSupabase.single.mockResolvedValue({ data: mockClient, error: null })

      const result = await selectClientById(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(mockSupabase.single).toHaveBeenCalled()
      expect(result.data).toEqual(mockClient)
      expect(result.error).toBeNull()
    })

    it('should handle error when client not found', async () => {
      const mockError = { message: 'Client not found', code: 'PGRST116' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await selectClientById(supabase, '999')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Client not found')
    })
  })

  describe('insertClient', () => {
    it('should insert a new client', async () => {
      const clientData = { name: 'New Client' }
      const mockClient = { id: '1', name: 'New Client', created_at: '2024-01-01' }
      mockSupabase.single.mockResolvedValue({ data: mockClient, error: null })

      const result = await insertClient(supabase, clientData)

      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
      expect(mockSupabase.insert).toHaveBeenCalledWith(clientData)
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.single).toHaveBeenCalled()
      expect(result.data).toEqual(mockClient)
      expect(result.error).toBeNull()
    })

    it('should handle error when inserting client', async () => {
      const clientData = { name: 'New Client' }
      const mockError = { message: 'Validation error' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await insertClient(supabase, clientData)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Validation error')
    })
  })

  describe('updateClient', () => {
    it('should update a client by ID', async () => {
      const updates = { name: 'Updated Client' }
      const mockClient = { id: '1', name: 'Updated Client', updated_at: expect.any(String) }
      mockSupabase.single.mockResolvedValue({ data: mockClient, error: null })

      const result = await updateClient(supabase, '1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Client',
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toEqual(mockClient)
      expect(result.error).toBeNull()
    })

    it('should handle error when updating client', async () => {
      const updates = { name: 'Updated Client' }
      const mockError = { message: 'Update failed' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await updateClient(supabase, '1', updates)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Update failed')
    })
  })

  describe('deleteClient', () => {
    it('should delete a client by ID', async () => {
      mockSupabase.eq.mockResolvedValue({ data: null, error: null })

      const result = await deleteClient(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should handle error when deleting client', async () => {
      const mockError = { message: 'Delete failed' }
      mockSupabase.eq.mockResolvedValue({ data: null, error: mockError })

      const result = await deleteClient(supabase, '1')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Delete failed')
    })
  })
})

describe('User CRUD Operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let supabase: SupabaseClient<Database>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    supabase = mockSupabase as unknown as SupabaseClient<Database>
  })

  describe('selectUsers', () => {
    it('should fetch all users with default sorting', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@test.com', created_at: '2024-01-01' },
        { id: '2', name: 'User 2', email: 'user2@test.com', created_at: '2024-01-02' },
      ]
      mockSupabase.order.mockResolvedValue({ data: mockUsers, error: null })

      const result = await selectUsers(supabase)

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result.data).toEqual(mockUsers)
      expect(result.error).toBeNull()
    })

    it('should fetch users with filters', async () => {
      const mockUsers = [{ id: '1', name: 'User 1', client_id: 'client-1' }]
      mockSupabase.order.mockResolvedValue({ data: mockUsers, error: null })

      const result = await selectUsers(
        supabase,
        undefined,
        [{ column: 'client_id', value: 'client-1', operator: 'eq' }]
      )

      expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', 'client-1')
      expect(result.data).toEqual(mockUsers)
      expect(result.error).toBeNull()
    })

    it('should fetch users with multiple filters', async () => {
      const mockUsers = [{ id: '1', name: 'User 1', client_id: 'client-1' }]
      mockSupabase.order.mockResolvedValue({ data: mockUsers, error: null })

      const result = await selectUsers(
        supabase,
        undefined,
        [
          { column: 'client_id', value: 'client-1', operator: 'eq' },
          { column: 'completed_profile', value: true, operator: 'eq' },
        ]
      )

      expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', 'client-1')
      expect(mockSupabase.eq).toHaveBeenCalledWith('completed_profile', true)
      expect(result.data).toEqual(mockUsers)
    })

    it('should handle like filter operator', async () => {
      const mockUsers = [{ id: '1', name: 'John Doe' }]
      mockSupabase.order.mockResolvedValue({ data: mockUsers, error: null })

      const result = await selectUsers(
        supabase,
        undefined,
        [{ column: 'name', value: '%John%', operator: 'like' }]
      )

      expect(mockSupabase.like).toHaveBeenCalledWith('name', '%John%')
      expect(result.data).toEqual(mockUsers)
    })

    it('should handle ilike filter operator', async () => {
      const mockUsers = [{ id: '1', name: 'John Doe' }]
      mockSupabase.order.mockResolvedValue({ data: mockUsers, error: null })

      const result = await selectUsers(
        supabase,
        undefined,
        [{ column: 'name', value: '%john%', operator: 'ilike' }]
      )

      expect(mockSupabase.ilike).toHaveBeenCalledWith('name', '%john%')
      expect(result.data).toEqual(mockUsers)
    })

    it('should handle gt filter operator', async () => {
      const mockUsers = [{ id: '1', created_at: '2024-01-02' }]
      mockSupabase.order.mockResolvedValue({ data: mockUsers, error: null })

      const result = await selectUsers(
        supabase,
        undefined,
        [{ column: 'created_at', value: '2024-01-01', operator: 'gt' }]
      )

      expect(mockSupabase.gt).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(result.data).toEqual(mockUsers)
    })

    it('should handle custom sorting', async () => {
      const mockUsers = [{ id: '1', name: 'User A' }, { id: '2', name: 'User B' }]
      mockSupabase.order.mockResolvedValue({ data: mockUsers, error: null })

      const result = await selectUsers(supabase, { column: 'name', ascending: true })

      expect(mockSupabase.order).toHaveBeenCalledWith('name', { ascending: true })
      expect(result.data).toEqual(mockUsers)
    })
  })

  describe('selectUserById', () => {
    it('should fetch a single user by ID', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@test.com' }
      mockSupabase.single.mockResolvedValue({ data: mockUser, error: null })

      const result = await selectUserById(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(mockSupabase.single).toHaveBeenCalled()
      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle error when user not found', async () => {
      const mockError = { message: 'User not found', code: 'PGRST116' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await selectUserById(supabase, '999')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('User not found')
    })
  })

  describe('selectUserByEmail', () => {
    it('should fetch a single user by email', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@test.com' }
      mockSupabase.single.mockResolvedValue({ data: mockUser, error: null })

      const result = await selectUserByEmail(supabase, 'test@test.com')

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'test@test.com')
      expect(mockSupabase.single).toHaveBeenCalled()
      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle error when user not found', async () => {
      const mockError = { message: 'User not found' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await selectUserByEmail(supabase, 'notfound@test.com')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('insertUser', () => {
    it('should insert a new user', async () => {
      const userData = { name: 'New User', email: 'new@test.com', username: 'newuser' }
      const mockUser = { id: '1', ...userData, created_at: '2024-01-01' }
      mockSupabase.single.mockResolvedValue({ data: mockUser, error: null })

      const result = await insertUser(supabase, userData)

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.insert).toHaveBeenCalledWith(userData)
      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle error when inserting user', async () => {
      const userData = { name: 'New User', email: 'new@test.com', username: 'newuser' }
      const mockError = { message: 'Duplicate email' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await insertUser(supabase, userData)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Duplicate email')
    })
  })

  describe('updateUser', () => {
    it('should update a user by ID', async () => {
      const updates = { name: 'Updated User' }
      const mockUser = { id: '1', name: 'Updated User', updated_at: expect.any(String) }
      mockSupabase.single.mockResolvedValue({ data: mockUser, error: null })

      const result = await updateUser(supabase, '1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated User',
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle error when updating user', async () => {
      const updates = { name: 'Updated User' }
      const mockError = { message: 'Update failed' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await updateUser(supabase, '1', updates)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('deleteUser', () => {
    it('should delete a user by ID', async () => {
      mockSupabase.eq.mockResolvedValue({ data: null, error: null })

      const result = await deleteUser(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should handle error when deleting user', async () => {
      const mockError = { message: 'Delete failed' }
      mockSupabase.eq.mockResolvedValue({ data: null, error: mockError })

      const result = await deleteUser(supabase, '1')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })
})

describe('Group CRUD Operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let supabase: SupabaseClient<Database>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    supabase = mockSupabase as unknown as SupabaseClient<Database>
  })

  describe('selectGroups', () => {
    it('should fetch all groups with default sorting', async () => {
      const mockGroups = [
        { id: '1', name: 'Group 1', client_id: 'client-1', created_at: '2024-01-01' },
        { id: '2', name: 'Group 2', client_id: 'client-1', created_at: '2024-01-02' },
      ]
      mockSupabase.order.mockResolvedValue({ data: mockGroups, error: null })

      const result = await selectGroups(supabase)

      expect(mockSupabase.from).toHaveBeenCalledWith('groups')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result.data).toEqual(mockGroups)
      expect(result.error).toBeNull()
    })

    it('should fetch groups with filters', async () => {
      const mockGroups = [{ id: '1', name: 'Group 1', client_id: 'client-1' }]
      mockSupabase.order.mockResolvedValue({ data: mockGroups, error: null })

      const result = await selectGroups(
        supabase,
        undefined,
        [{ column: 'client_id', value: 'client-1', operator: 'eq' }]
      )

      expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', 'client-1')
      expect(result.data).toEqual(mockGroups)
    })

    it('should fetch groups with custom sorting', async () => {
      const mockGroups = [{ id: '1', name: 'Group A' }, { id: '2', name: 'Group B' }]
      mockSupabase.order.mockResolvedValue({ data: mockGroups, error: null })

      const result = await selectGroups(supabase, { column: 'name', ascending: true })

      expect(mockSupabase.order).toHaveBeenCalledWith('name', { ascending: true })
      expect(result.data).toEqual(mockGroups)
    })

    it('should handle neq filter operator', async () => {
      const mockGroups = [{ id: '1', name: 'Group 1' }]
      mockSupabase.order.mockResolvedValue({ data: mockGroups, error: null })

      const result = await selectGroups(
        supabase,
        undefined,
        [{ column: 'client_id', value: 'exclude-client', operator: 'neq' }]
      )

      expect(mockSupabase.neq).toHaveBeenCalledWith('client_id', 'exclude-client')
      expect(result.data).toEqual(mockGroups)
    })
  })

  describe('selectGroupById', () => {
    it('should fetch a single group by ID', async () => {
      const mockGroup = { id: '1', name: 'Test Group', client_id: 'client-1' }
      mockSupabase.single.mockResolvedValue({ data: mockGroup, error: null })

      const result = await selectGroupById(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('groups')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toEqual(mockGroup)
      expect(result.error).toBeNull()
    })

    it('should handle error when group not found', async () => {
      const mockError = { message: 'Group not found' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await selectGroupById(supabase, '999')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('insertGroup', () => {
    it('should insert a new group', async () => {
      const groupData = { name: 'New Group', client_id: 'client-1' }
      const mockGroup = { id: '1', ...groupData, created_at: '2024-01-01' }
      mockSupabase.single.mockResolvedValue({ data: mockGroup, error: null })

      const result = await insertGroup(supabase, groupData)

      expect(mockSupabase.from).toHaveBeenCalledWith('groups')
      expect(mockSupabase.insert).toHaveBeenCalledWith(groupData)
      expect(result.data).toEqual(mockGroup)
      expect(result.error).toBeNull()
    })

    it('should handle error when inserting group', async () => {
      const groupData = { name: 'New Group', client_id: 'client-1' }
      const mockError = { message: 'Validation error' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await insertGroup(supabase, groupData)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('updateGroup', () => {
    it('should update a group by ID', async () => {
      const updates = { name: 'Updated Group' }
      const mockGroup = { id: '1', name: 'Updated Group', updated_at: expect.any(String) }
      mockSupabase.single.mockResolvedValue({ data: mockGroup, error: null })

      const result = await updateGroup(supabase, '1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('groups')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Group',
          updated_at: expect.any(String),
        })
      )
      expect(result.data).toEqual(mockGroup)
      expect(result.error).toBeNull()
    })
  })

  describe('deleteGroup', () => {
    it('should delete a group by ID', async () => {
      mockSupabase.eq.mockResolvedValue({ data: null, error: null })

      const result = await deleteGroup(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('groups')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })
})

describe('Industry CRUD Operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let supabase: SupabaseClient<Database>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    supabase = mockSupabase as unknown as SupabaseClient<Database>
  })

  describe('selectIndustries', () => {
    it('should fetch all industries with default sorting', async () => {
      const mockIndustries = [
        { id: '1', name: 'Technology', created_at: '2024-01-01' },
        { id: '2', name: 'Healthcare', created_at: '2024-01-02' },
      ]
      mockSupabase.order.mockResolvedValue({ data: mockIndustries, error: null })

      const result = await selectIndustries(supabase)

      expect(mockSupabase.from).toHaveBeenCalledWith('industries')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result.data).toEqual(mockIndustries)
      expect(result.error).toBeNull()
    })

    it('should fetch industries with custom sorting', async () => {
      const mockIndustries = [
        { id: '1', name: 'Healthcare' },
        { id: '2', name: 'Technology' },
      ]
      mockSupabase.order.mockResolvedValue({ data: mockIndustries, error: null })

      const result = await selectIndustries(supabase, { column: 'name', ascending: true })

      expect(mockSupabase.order).toHaveBeenCalledWith('name', { ascending: true })
      expect(result.data).toEqual(mockIndustries)
    })

    it('should handle error when fetching industries', async () => {
      const mockError = { message: 'Database error' }
      mockSupabase.order.mockResolvedValue({ data: null, error: mockError })

      const result = await selectIndustries(supabase)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('selectIndustryById', () => {
    it('should fetch a single industry by ID', async () => {
      const mockIndustry = { id: '1', name: 'Technology' }
      mockSupabase.single.mockResolvedValue({ data: mockIndustry, error: null })

      const result = await selectIndustryById(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('industries')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toEqual(mockIndustry)
      expect(result.error).toBeNull()
    })

    it('should handle error when industry not found', async () => {
      const mockError = { message: 'Industry not found' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await selectIndustryById(supabase, '999')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('insertIndustry', () => {
    it('should insert a new industry', async () => {
      const industryData = { name: 'Manufacturing' }
      const mockIndustry = { id: '1', name: 'Manufacturing', created_at: '2024-01-01' }
      mockSupabase.single.mockResolvedValue({ data: mockIndustry, error: null })

      const result = await insertIndustry(supabase, industryData)

      expect(mockSupabase.from).toHaveBeenCalledWith('industries')
      expect(mockSupabase.insert).toHaveBeenCalledWith(industryData)
      expect(result.data).toEqual(mockIndustry)
      expect(result.error).toBeNull()
    })

    it('should handle error when inserting industry', async () => {
      const industryData = { name: 'Manufacturing' }
      const mockError = { message: 'Duplicate name' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await insertIndustry(supabase, industryData)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('updateIndustry', () => {
    it('should update an industry by ID', async () => {
      const updates = { name: 'Updated Industry' }
      const mockIndustry = { id: '1', name: 'Updated Industry', updated_at: expect.any(String) }
      mockSupabase.single.mockResolvedValue({ data: mockIndustry, error: null })

      const result = await updateIndustry(supabase, '1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('industries')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Industry',
          updated_at: expect.any(String),
        })
      )
      expect(result.data).toEqual(mockIndustry)
      expect(result.error).toBeNull()
    })
  })

  describe('deleteIndustry', () => {
    it('should delete an industry by ID', async () => {
      mockSupabase.eq.mockResolvedValue({ data: null, error: null })

      const result = await deleteIndustry(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('industries')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })
})

describe('Benchmark CRUD Operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let supabase: SupabaseClient<Database>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    supabase = mockSupabase as unknown as SupabaseClient<Database>
  })

  describe('selectBenchmarks', () => {
    it('should fetch all benchmarks with default sorting', async () => {
      const mockBenchmarks = [
        { id: '1', dimension_id: 'dim-1', industry_id: 'ind-1', value: 75 },
        { id: '2', dimension_id: 'dim-2', industry_id: 'ind-1', value: 80 },
      ]
      mockSupabase.order.mockResolvedValue({ data: mockBenchmarks, error: null })

      const result = await selectBenchmarks(supabase)

      expect(mockSupabase.from).toHaveBeenCalledWith('benchmarks')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result.data).toEqual(mockBenchmarks)
      expect(result.error).toBeNull()
    })

    it('should fetch benchmarks with filters', async () => {
      const mockBenchmarks = [
        { id: '1', dimension_id: 'dim-1', industry_id: 'ind-1', value: 75 },
      ]
      mockSupabase.order.mockResolvedValue({ data: mockBenchmarks, error: null })

      const result = await selectBenchmarks(
        supabase,
        undefined,
        [{ column: 'industry_id', value: 'ind-1', operator: 'eq' }]
      )

      expect(mockSupabase.eq).toHaveBeenCalledWith('industry_id', 'ind-1')
      expect(result.data).toEqual(mockBenchmarks)
    })

    it('should fetch benchmarks with value range filters', async () => {
      const mockBenchmarks = [{ id: '1', value: 80 }]
      mockSupabase.order.mockResolvedValue({ data: mockBenchmarks, error: null })

      const result = await selectBenchmarks(
        supabase,
        undefined,
        [
          { column: 'value', value: 50, operator: 'gte' },
          { column: 'value', value: 90, operator: 'lte' },
        ]
      )

      expect(mockSupabase.gte).toHaveBeenCalledWith('value', 50)
      expect(mockSupabase.lte).toHaveBeenCalledWith('value', 90)
      expect(result.data).toEqual(mockBenchmarks)
    })

    it('should fetch benchmarks with custom sorting', async () => {
      const mockBenchmarks = [
        { id: '1', value: 70 },
        { id: '2', value: 80 },
      ]
      mockSupabase.order.mockResolvedValue({ data: mockBenchmarks, error: null })

      const result = await selectBenchmarks(supabase, { column: 'value', ascending: true })

      expect(mockSupabase.order).toHaveBeenCalledWith('value', { ascending: true })
      expect(result.data).toEqual(mockBenchmarks)
    })
  })

  describe('selectBenchmarkById', () => {
    it('should fetch a single benchmark by ID', async () => {
      const mockBenchmark = {
        id: '1',
        dimension_id: 'dim-1',
        industry_id: 'ind-1',
        value: 75,
      }
      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null })

      const result = await selectBenchmarkById(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('benchmarks')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toEqual(mockBenchmark)
      expect(result.error).toBeNull()
    })

    it('should handle error when benchmark not found', async () => {
      const mockError = { message: 'Benchmark not found' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await selectBenchmarkById(supabase, '999')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('insertBenchmark', () => {
    it('should insert a new benchmark', async () => {
      const benchmarkData = {
        dimension_id: 'dim-1',
        industry_id: 'ind-1',
        value: 75,
      }
      const mockBenchmark = { id: '1', ...benchmarkData, created_at: '2024-01-01' }
      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null })

      const result = await insertBenchmark(supabase, benchmarkData)

      expect(mockSupabase.from).toHaveBeenCalledWith('benchmarks')
      expect(mockSupabase.insert).toHaveBeenCalledWith(benchmarkData)
      expect(result.data).toEqual(mockBenchmark)
      expect(result.error).toBeNull()
    })

    it('should handle error when inserting benchmark', async () => {
      const benchmarkData = {
        dimension_id: 'dim-1',
        industry_id: 'ind-1',
        value: 75,
      }
      const mockError = { message: 'Foreign key constraint violation' }
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      const result = await insertBenchmark(supabase, benchmarkData)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('updateBenchmark', () => {
    it('should update a benchmark by ID', async () => {
      const updates = { value: 85 }
      const mockBenchmark = { id: '1', value: 85, updated_at: expect.any(String) }
      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null })

      const result = await updateBenchmark(supabase, '1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('benchmarks')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 85,
          updated_at: expect.any(String),
        })
      )
      expect(result.data).toEqual(mockBenchmark)
      expect(result.error).toBeNull()
    })
  })

  describe('deleteBenchmark', () => {
    it('should delete a benchmark by ID', async () => {
      mockSupabase.eq.mockResolvedValue({ data: null, error: null })

      const result = await deleteBenchmark(supabase, '1')

      expect(mockSupabase.from).toHaveBeenCalledWith('benchmarks')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1')
      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })
})

describe('Filtering and Sorting', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let supabase: SupabaseClient<Database>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    supabase = mockSupabase as unknown as SupabaseClient<Database>
  })

  it('should apply multiple filter operators correctly', async () => {
    mockSupabase.order.mockResolvedValue({ data: [], error: null })

    await selectUsers(
      supabase,
      undefined,
      [
        { column: 'completed_profile', value: true, operator: 'eq' },
        { column: 'created_at', value: '2024-01-01', operator: 'gte' },
        { column: 'name', value: '%test%', operator: 'ilike' },
      ]
    )

    expect(mockSupabase.eq).toHaveBeenCalledWith('completed_profile', true)
    expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
    expect(mockSupabase.ilike).toHaveBeenCalledWith('name', '%test%')
  })

  it('should combine filtering and sorting', async () => {
    mockSupabase.order.mockResolvedValue({ data: [], error: null })

    await selectBenchmarks(
      supabase,
      { column: 'value', ascending: false },
      [{ column: 'industry_id', value: 'ind-1', operator: 'eq' }]
    )

    expect(mockSupabase.eq).toHaveBeenCalledWith('industry_id', 'ind-1')
    expect(mockSupabase.order).toHaveBeenCalledWith('value', { ascending: false })
  })

  it('should handle sorting with ascending false by default', async () => {
    mockSupabase.order.mockResolvedValue({ data: [], error: null })

    await selectClients(supabase, { column: 'name' })

    expect(mockSupabase.order).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('should handle all comparison operators', async () => {
    mockSupabase.order.mockResolvedValue({ data: [], error: null })

    await selectBenchmarks(
      supabase,
      undefined,
      [
        { column: 'value', value: 50, operator: 'gt' },
        { column: 'value', value: 100, operator: 'lt' },
      ]
    )

    expect(mockSupabase.gt).toHaveBeenCalledWith('value', 50)
    expect(mockSupabase.lt).toHaveBeenCalledWith('value', 100)
  })
})
