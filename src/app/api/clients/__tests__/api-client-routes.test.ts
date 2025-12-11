import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getClients, POST as createClient } from '../route'
import { GET as getClient, PATCH as updateClient, DELETE as deleteClient } from '../[id]/route'
import { mockClient, mockClients } from '@/__tests__/fixtures/clients'

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

describe('API Client Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/clients', () => {
    it('should create a new client with valid data', async () => {
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
              data: mockClient,
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Client',
          address: '123 Test St',
          primary_color: '#2D2E30',
          accent_color: '#FFBA00',
        }),
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.client).toBeDefined()
      expect(data.client.name).toBe('Test Client')
      expect(mockFrom).toHaveBeenCalledWith('clients')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Client' }),
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if name is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({ address: '123 Test St' }),
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client name is required')
    })

    it('should return 400 if name is empty string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client name is required')
    })

    it('should return 400 if name is not a string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name: 123 }),
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client name is required')
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

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Client' }),
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create client')
    })

    it('should set default values for boolean fields', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockClient,
            error: null,
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Client' }),
      })

      await createClient(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          require_profile: false,
          require_research: false,
          whitelabel: false,
        })
      )
    })

    it('should trim whitespace from name', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockClient,
            error: null,
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name: '  Test Client  ' }),
      })

      await createClient(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Client',
        })
      )
    })
  })

  describe('GET /api/clients', () => {
    it('should return all clients', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockClients,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const response = await getClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients).toEqual(mockClients)
      expect(mockFrom).toHaveBeenCalledWith('clients')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const response = await getClients()
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

      const response = await getClients()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch clients')
    })

    it('should order clients by created_at descending', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const orderMock = vi.fn().mockResolvedValue({
        data: mockClients,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: orderMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      await getClients()

      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    })
  })

  describe('GET /api/clients/[id]', () => {
    it('should return a single client by id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockClient,
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/clients/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.client).toEqual(mockClient)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/clients/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if client is not found', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/clients/nonexistent')
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await getClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found')
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

      const request = new NextRequest('http://localhost:3000/api/clients/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch client')
    })
  })

  describe('PATCH /api/clients/[id]', () => {
    it('should update a client with valid data', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updatedClient = { ...mockClient, name: 'Updated Client' }
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedClient,
                error: null,
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Client' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.client.name).toBe('Updated Client')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Client' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if client is not found', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/clients/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Client' }),
      })
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await updateClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found')
    })

    it('should return 400 if name is empty string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: '   ' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client name cannot be empty')
    })

    it('should return 400 if no fields to update', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateClient(request, { params })
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
              data: mockClient,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ primary_color: '#000000' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateClient(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          primary_color: '#000000',
          updated_at: expect.any(String),
        })
      )
    })

    it('should trim whitespace from name when updating', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockClient,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: '  Updated Name  ' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateClient(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
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

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Client' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update client')
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
              data: mockClient,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Client' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateClient(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      )
    })
  })

  describe('DELETE /api/clients/[id]', () => {
    it('should delete a client successfully', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Client deleted successfully')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteClient(request, { params })
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

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteClient(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete client')
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

      const request = new NextRequest('http://localhost:3000/api/clients/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      await deleteClient(request, { params })

      expect(mockFrom).toHaveBeenCalledWith('clients')
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

      const request = new NextRequest('http://localhost:3000/api/clients/test-id-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id-123' })
      await deleteClient(request, { params })

      expect(eqMock).toHaveBeenCalledWith('id', 'test-id-123')
    })
  })
})
