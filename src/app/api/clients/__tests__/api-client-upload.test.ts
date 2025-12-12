import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as createClient } from '../route'
import { PATCH as updateClient } from '../[id]/route'
import { mockClient } from '@/__tests__/fixtures/clients'

// Helper to create a mock File
function createMockFile(name: string, type: string, size: number): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

describe('Client Logo Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/clients with file upload', () => {
    it('should accept FormData with logo file', async () => {
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
              data: { ...mockClient, id: 'new-client-id' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...mockClient,
                  id: 'new-client-id',
                  logo: 'https://storage.example.com/logo.png',
                },
                error: null,
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      // Mock storage upload
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://storage.example.com/logo.png' } }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })
      mockSupabaseClient.storage.from = mockStorageFrom

      // Create FormData with logo
      const formData = new FormData()
      formData.append('name', 'Test Client')
      formData.append('address', '123 Test St')
      formData.append('logo', createMockFile('logo.png', 'image/png', 1024 * 1024))
      formData.append('primary_color', '#2D2E30')
      formData.append('accent_color', '#FFBA00')
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: formData,
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.client).toBeDefined()
      expect(mockStorageFrom).toHaveBeenCalledWith('client-assets')
    })

    it('should reject logo file that exceeds size limit', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Create FormData with oversized logo (3MB, limit is 2MB)
      const formData = new FormData()
      formData.append('name', 'Test Client')
      formData.append('logo', createMockFile('logo.png', 'image/png', 3 * 1024 * 1024))
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: formData,
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Logo validation failed')
      expect(data.error).toContain('size exceeds')
    })

    it('should reject logo file with invalid type', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Create FormData with invalid file type
      const formData = new FormData()
      formData.append('name', 'Test Client')
      formData.append('logo', createMockFile('logo.pdf', 'application/pdf', 1024 * 1024))
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: formData,
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Logo validation failed')
      expect(data.error).toContain('Invalid file type')
    })

    it('should accept background file within size limit', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock database insert
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockClient, id: 'new-client-id' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...mockClient,
                  id: 'new-client-id',
                  background: 'https://storage.example.com/background.png',
                },
                error: null,
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      // Mock storage upload
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://storage.example.com/background.png' } }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })
      mockSupabaseClient.storage.from = mockStorageFrom

      // Create FormData with background (4MB, limit is 5MB)
      const formData = new FormData()
      formData.append('name', 'Test Client')
      formData.append('background', createMockFile('background.jpg', 'image/jpeg', 4 * 1024 * 1024))
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: formData,
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.client).toBeDefined()
    })

    it('should reject background file that exceeds size limit', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Create FormData with oversized background (6MB, limit is 5MB)
      const formData = new FormData()
      formData.append('name', 'Test Client')
      formData.append('background', createMockFile('background.jpg', 'image/jpeg', 6 * 1024 * 1024))
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: formData,
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Background validation failed')
      expect(data.error).toContain('size exceeds')
    })

    it('should accept both logo and background files', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock database insert
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockClient, id: 'new-client-id' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...mockClient,
                  id: 'new-client-id',
                  logo: 'https://storage.example.com/logo.png',
                  background: 'https://storage.example.com/background.jpg',
                },
                error: null,
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      // Mock storage upload
      let callCount = 0
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockImplementation(() => {
          callCount++
          return {
            data: {
              publicUrl:
                callCount === 1
                  ? 'https://storage.example.com/logo.png'
                  : 'https://storage.example.com/background.jpg',
            },
          }
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })
      mockSupabaseClient.storage.from = mockStorageFrom

      // Create FormData with both files
      const formData = new FormData()
      formData.append('name', 'Test Client')
      formData.append('logo', createMockFile('logo.png', 'image/png', 1024 * 1024))
      formData.append('background', createMockFile('background.jpg', 'image/jpeg', 3 * 1024 * 1024))
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: formData,
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.client).toBeDefined()
      expect(data.client.logo).toBeDefined()
      expect(data.client.background).toBeDefined()
    })

    it('should still work with JSON (backward compatibility)', async () => {
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
        }),
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.client).toBeDefined()
    })

    it('should cleanup client record if logo upload fails', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock database insert
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockClient, id: 'new-client-id' },
              error: null,
            }),
          }),
        }),
        delete: mockDelete,
      })
      mockSupabaseClient.from = mockFrom

      // Mock storage upload with error
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage quota exceeded' },
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })
      mockSupabaseClient.storage.from = mockStorageFrom

      // Create FormData with logo
      const formData = new FormData()
      formData.append('name', 'Test Client')
      formData.append('logo', createMockFile('logo.png', 'image/png', 1024 * 1024))
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: formData,
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to upload logo')
      expect(mockDelete).toHaveBeenCalled()
    })

    it('should cleanup client and logo if background upload fails', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock database insert
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockClient, id: 'new-client-id' },
              error: null,
            }),
          }),
        }),
        delete: mockDelete,
      })
      mockSupabaseClient.from = mockFrom

      // Mock storage upload - logo succeeds, background fails
      let uploadCallCount = 0
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: vi.fn().mockImplementation(() => {
          uploadCallCount++
          if (uploadCallCount === 1) {
            // Logo upload succeeds
            return Promise.resolve({ data: null, error: null })
          } else {
            // Background upload fails
            return Promise.resolve({
              data: null,
              error: { message: 'Storage quota exceeded' },
            })
          }
        }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://storage.example.com/logo.png' } }),
        remove: mockRemove,
      })
      mockSupabaseClient.storage.from = mockStorageFrom

      // Create FormData with both files
      const formData = new FormData()
      formData.append('name', 'Test Client')
      formData.append('logo', createMockFile('logo.png', 'image/png', 1024 * 1024))
      formData.append('background', createMockFile('background.jpg', 'image/jpeg', 3 * 1024 * 1024))
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: formData,
      })

      const response = await createClient(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to upload background')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockRemove).toHaveBeenCalled()
    })
  })

  describe('PATCH /api/clients/[id] with file upload', () => {
    it('should update client with new logo file', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock storage upload
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://storage.example.com/new-logo.png' } }),
      })
      mockSupabaseClient.storage.from = mockStorageFrom

      // Mock database update
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...mockClient,
                  logo: 'https://storage.example.com/new-logo.png',
                },
                error: null,
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      // Create FormData with new logo
      const formData = new FormData()
      formData.append('name', 'Updated Client')
      formData.append('logo', createMockFile('new-logo.png', 'image/png', 1024 * 1024))
      formData.append('require_profile', 'true')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients/test-client-id', {
        method: 'PATCH',
        body: formData,
      })

      const response = await updateClient(request, {
        params: Promise.resolve({ id: 'test-client-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.client).toBeDefined()
      expect(data.client.logo).toBeDefined()
      expect(mockStorageFrom).toHaveBeenCalledWith('client-assets')
    })

    it('should reject logo file that exceeds size limit on update', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Create FormData with oversized logo and valid name
      const formData = new FormData()
      formData.append('name', 'Updated Client')
      formData.append('logo', createMockFile('logo.png', 'image/png', 3 * 1024 * 1024))
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients/test-client-id', {
        method: 'PATCH',
        body: formData,
      })

      const response = await updateClient(request, {
        params: Promise.resolve({ id: 'test-client-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Logo validation failed')
    })

    it('should handle storage upload errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock storage upload with error
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage quota exceeded' },
        }),
      })
      mockSupabaseClient.storage.from = mockStorageFrom

      // Create FormData with logo
      const formData = new FormData()
      formData.append('name', 'Test Client')
      formData.append('logo', createMockFile('logo.png', 'image/png', 1024 * 1024))
      formData.append('require_profile', 'false')
      formData.append('require_research', 'false')
      formData.append('whitelabel', 'false')

      const request = new NextRequest('http://localhost:3000/api/clients/test-client-id', {
        method: 'PATCH',
        body: formData,
      })

      const response = await updateClient(request, {
        params: Promise.resolve({ id: 'test-client-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to upload logo')
    })

    it('should still work with JSON on update (backward compatibility)', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock database update
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockClient, name: 'Updated Client' },
                error: null,
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/clients/test-client-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Client' }),
      })

      const response = await updateClient(request, {
        params: Promise.resolve({ id: 'test-client-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.client).toBeDefined()
    })
  })
})
