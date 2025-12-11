import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getGroups, POST as createGroup } from '../route'
import { GET as getGroup, PATCH as updateGroup, DELETE as deleteGroup } from '../[id]/route'
import { POST as bulkCreateGroups } from '../bulk/route'
import { mockGroup, mockGroups } from '@/__tests__/fixtures/groups'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

describe('API Group Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/groups', () => {
    it('should create a new group with valid data', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock database insert
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Group',
          client_id: 'test-client-id',
          description: 'A test group',
        }),
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.group).toBeDefined()
      expect(data.group.name).toBe('Test Group')
      expect(mockFrom).toHaveBeenCalledWith('groups')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Group', client_id: 'test-client-id' }),
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if name is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'test-client-id' }),
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Group name is required')
    })

    it('should return 400 if name is empty string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: '   ', client_id: 'test-client-id' }),
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Group name is required')
    })

    it('should return 400 if name is not a string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: 123, client_id: 'test-client-id' }),
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Group name is required')
    })

    it('should return 400 if client_id is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Group' }),
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client ID is required')
    })

    it('should return 400 if client_id is empty string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Group', client_id: '   ' }),
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client ID is required')
    })

    it('should return 400 if client_id is not a string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Group', client_id: 123 }),
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client ID is required')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Group', client_id: 'test-client-id' }),
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create group')
    })

    it('should trim whitespace from name and client_id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockGroup,
            error: null,
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: '  Test Group  ', client_id: '  test-client-id  ' }),
      })

      await createGroup(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Group',
          client_id: 'test-client-id',
        })
      )
    })

    it('should set description to null if not provided', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockGroup,
            error: null,
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Group', client_id: 'test-client-id' }),
      })

      await createGroup(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        })
      )
    })
  })

  describe('GET /api/groups', () => {
    it('should return all groups', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGroups,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const response = await getGroups()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.groups).toEqual(mockGroups)
      expect(mockFrom).toHaveBeenCalledWith('groups')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const response = await getGroups()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const response = await getGroups()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch groups')
    })

    it('should order groups by created_at descending', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const orderMock = vi.fn().mockResolvedValue({
        data: mockGroups,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: orderMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      await getGroups()

      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    })
  })

  describe('GET /api/groups/[id]', () => {
    it('should return a single group by id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.group).toEqual(mockGroup)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/groups/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if group is not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/nonexistent')
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await getGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Group not found')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch group')
    })
  })

  describe('PATCH /api/groups/[id]', () => {
    it('should update a group with valid data', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updatedGroup = { ...mockGroup, name: 'Updated Group' }
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedGroup,
                error: null,
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Group' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.group.name).toBe('Updated Group')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Group' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if group is not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Group' }),
      })
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await updateGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Group not found')
    })

    it('should return 400 if name is empty string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: '   ' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Group name cannot be empty')
    })

    it('should return 400 if client_id is empty string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ client_id: '   ' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client ID cannot be empty')
    })

    it('should return 400 if no fields to update', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No fields to update')
    })

    it('should handle partial updates', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ description: 'Updated description' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateGroup(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Updated description',
          updated_at: expect.any(String),
        })
      )
    })

    it('should trim whitespace from name and client_id when updating', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: '  Updated Name  ', client_id: '  updated-client-id  ' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateGroup(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          client_id: 'updated-client-id',
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Group' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update group')
    })

    it('should update updated_at timestamp', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Group' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateGroup(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      )
    })

    it('should set description to null when empty string is provided', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ description: '' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateGroup(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        })
      )
    })
  })

  describe('DELETE /api/groups/[id]', () => {
    it('should delete a group successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Group deleted successfully')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteGroup(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete group')
    })

    it('should delete from the correct table', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      await deleteGroup(request, { params })

      expect(mockFrom).toHaveBeenCalledWith('groups')
    })

    it('should use the correct id when deleting', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const eqMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/test-id-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id-123' })
      await deleteGroup(request, { params })

      expect(eqMock).toHaveBeenCalledWith('id', 'test-id-123')
    })
  })

  describe('POST /api/groups/bulk', () => {
    it('should create multiple groups successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mockGroups,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [
            { name: 'Group 1', client_id: 'client-1', description: 'Description 1' },
            { name: 'Group 2', client_id: 'client-2', description: 'Description 2' },
            { name: 'Group 3', client_id: 'client-3' },
          ],
        }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.groups).toEqual(mockGroups)
      expect(data.count).toBe(mockGroups.length)
      expect(data.message).toContain('Successfully created')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [{ name: 'Group 1', client_id: 'client-1' }],
        }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if groups array is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Groups array is required')
    })

    it('should return 400 if groups array is empty', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({ groups: [] }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Groups array is required')
    })

    it('should return 400 if groups is not an array', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({ groups: 'not-an-array' }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Groups array is required')
    })

    it('should return 400 if a group is missing name', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [
            { client_id: 'client-1' },
            { name: 'Group 2', client_id: 'client-2' },
          ],
        }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('Group 1: name is required')
    })

    it('should return 400 if a group is missing client_id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [
            { name: 'Group 1' },
            { name: 'Group 2', client_id: 'client-2' },
          ],
        }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('Group 1: client_id is required')
    })

    it('should return 400 if a group has empty name', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [
            { name: '   ', client_id: 'client-1' },
            { name: 'Group 2', client_id: 'client-2' },
          ],
        }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('Group 1: name is required')
    })

    it('should return 400 if a group has empty client_id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [
            { name: 'Group 1', client_id: '   ' },
            { name: 'Group 2', client_id: 'client-2' },
          ],
        }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('Group 1: client_id is required')
    })

    it('should return 400 with multiple validation errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [
            { client_id: 'client-1' },
            { name: 'Group 2' },
            { name: 'Group 3', client_id: 'client-3' },
          ],
        }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('Group 1: name is required')
      expect(data.details).toContain('Group 2: client_id is required')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [
            { name: 'Group 1', client_id: 'client-1' },
            { name: 'Group 2', client_id: 'client-2' },
          ],
        }),
      })

      const response = await bulkCreateGroups(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create groups')
    })

    it('should trim whitespace from group data', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockGroups,
          error: null,
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [
            { name: '  Group 1  ', client_id: '  client-1  ', description: '  Description 1  ' },
            { name: '  Group 2  ', client_id: '  client-2  ' },
          ],
        }),
      })

      await bulkCreateGroups(request)

      expect(insertMock).toHaveBeenCalledWith([
        { name: 'Group 1', client_id: 'client-1', description: '  Description 1  ' },
        { name: 'Group 2', client_id: 'client-2', description: null },
      ])
    })

    it('should set description to null if not provided', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockGroups,
          error: null,
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/groups/bulk', {
        method: 'POST',
        body: JSON.stringify({
          groups: [
            { name: 'Group 1', client_id: 'client-1' },
            { name: 'Group 2', client_id: 'client-2', description: 'Has description' },
          ],
        }),
      })

      await bulkCreateGroups(request)

      expect(insertMock).toHaveBeenCalledWith([
        { name: 'Group 1', client_id: 'client-1', description: null },
        { name: 'Group 2', client_id: 'client-2', description: 'Has description' },
      ])
    })
  })
})
