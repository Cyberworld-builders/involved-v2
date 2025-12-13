import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as createUser } from '../route'
import { PATCH as updateUser } from '../[id]/route'
import { POST as bulkCreateUsers } from '../bulk/route'
import { mockUser } from '@/__tests__/fixtures/users'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

// Default to an admin actor for RBAC checks in these route tests.
const mockActorProfile = { role: 'admin', client_id: 'test-client-id' }

function attachActorProfileSelect(chain: Record<string, unknown>) {
  const originalSelect = (chain as { select?: unknown }).select

  const actorSelectChain = {
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockActorProfile,
        error: null,
      }),
    }),
  }

  const wrappedSelect = vi.fn((columns?: unknown) => {
    // Only intercept the *actor* lookup: `.select('role, client_id')`
    if (typeof columns === 'string' && columns.replace(/\s+/g, '') === 'role,client_id') {
      return actorSelectChain
    }
    if (typeof originalSelect === 'function') {
      return (originalSelect as (arg?: unknown) => unknown)(columns)
    }
    return {
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
      }),
    }
  })

  ;(chain as { select?: unknown }).select = wrappedSelect
  return chain
}

// Wrap any per-test .from mocks so RBAC actor profile lookup always works.
let _fromImpl = mockSupabaseClient.from
Object.defineProperty(mockSupabaseClient, 'from', {
  get() {
    return _fromImpl
  },
  set(nextFrom) {
    _fromImpl = ((...args: unknown[]) => {
      const result = (nextFrom as (...a: unknown[]) => unknown)(...args)
      if (result && typeof result === 'object') {
        return attachActorProfileSelect(result as Record<string, unknown>)
      }
      return result
    }) as unknown as typeof mockSupabaseClient.from
  },
})

// Mock Admin Client
const mockAdminClient = {
  auth: {
    admin: {
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    },
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

vi.mock('@/lib/utils/username-generation', () => ({
  generateUsernameFromName: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '')),
  generateUniqueUsername: vi.fn((base: string) => Promise.resolve(base)),
}))

describe('API User Status Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/users - Status field', () => {
    it('should create a user with default status "active" when status is not provided', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
        }),
      })

      await createUser(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      )
    })

    it('should create a user with status "active"', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockUser, status: 'active' },
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          status: 'active',
        }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      )
    })

    it('should create a user with status "inactive"', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockUser, status: 'inactive' },
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          status: 'inactive',
        }),
      })

      const response = await createUser(request)

      expect(response.status).toBe(201)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'inactive',
        })
      )
    })

    it('should create a user with status "suspended"', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockUser, status: 'suspended' },
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          status: 'suspended',
        }),
      })

      const response = await createUser(request)

      expect(response.status).toBe(201)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'suspended',
        })
      )
    })

    it('should return 400 for invalid status value', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          status: 'invalid-status',
        }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid status. Must be one of: active, inactive, suspended')
    })
  })

  describe('PATCH /api/users/[id] - Status field', () => {
    it('should update user status to "inactive"', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, status: 'inactive' },
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'inactive' }),
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'inactive',
        })
      )
    })

    it('should update user status to "suspended"', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, status: 'suspended' },
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended' }),
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'suspended',
        })
      )
    })

    it('should update user status back to "active"', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, status: 'active' },
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      )
    })

    it('should return 400 for invalid status value', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'pending' }),
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid status. Must be one of: active, inactive, suspended')
    })

    it('should allow updating other fields along with status', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, name: 'Updated Name', status: 'inactive' },
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name', status: 'inactive' }),
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          status: 'inactive',
        })
      )
    })

    it('should allow updating status to the same value', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, status: 'active' },
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      })

      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })

      expect(response.status).toBe(200)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      )
    })
  })

  describe('POST /api/users/bulk - Status field', () => {
    it('should create multiple users with default status "active"', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockUser, id: 'new-user-id' },
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            { name: 'User 1', email: 'user1@example.com' },
            { name: 'User 2', email: 'user2@example.com' },
          ],
        }),
      })

      await bulkCreateUsers(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      )
    })

    it('should create multiple users with different statuses', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockUser, id: 'new-user-id' },
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            { name: 'User 1', email: 'user1@example.com', status: 'active' },
            { name: 'User 2', email: 'user2@example.com', status: 'inactive' },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.created).toBe(2)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      )
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'inactive',
        })
      )
    })

    it('should skip users with invalid status', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            { name: 'User 1', email: 'user1@example.com', status: 'invalid' },
            { name: 'User 2', email: 'user2@example.com', status: 'active' },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results[0].success).toBe(false)
      expect(data.results[0].error).toBe('Invalid status. Must be one of: active, inactive, suspended')
    })
  })
})
