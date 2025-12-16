import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getUsers, POST as createUser } from '../route'
import { GET as getUser, PATCH as updateUser, DELETE as deleteUser } from '../[id]/route'
import { POST as bulkCreateUsers } from '../bulk/route'
import { mockUser, mockUsers } from '@/__tests__/fixtures/users'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

// Default to a super admin actor for RBAC checks in these route tests.
const mockActorProfile = { access_level: 'super_admin', role: 'admin', client_id: 'test-client-id' }

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

  // Ensure select exists and returns a chain with eq/single for actor profile lookup.
  const wrappedSelect = vi.fn((columns?: unknown) => {
    // Only intercept the *actor* lookup: `.select('access_level, role, client_id')`
    if (typeof columns === 'string' && columns.replace(/\s+/g, '') === 'access_level,role,client_id') {
      return actorSelectChain
    }
    if (typeof originalSelect === 'function') {
      return (originalSelect as (arg?: unknown) => unknown)(columns)
    }
    // Fallback: PATCH routes now fetch a target profile before updating.
    // If a test only mocks `update()` without providing a `select()` chain,
    // return a default profile so the route doesn't 404.
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
      listUsers: vi.fn().mockResolvedValue({
        data: { users: [] },
        error: null,
      }),
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
  generateUsernameFromName: vi.fn((name: string) => {
    const result = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    return result
  }),
  generateUsernameFromEmail: vi.fn((email: string) => email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')),
  generateUniqueUsername: vi.fn((base: string) => Promise.resolve(base)),
}))

describe('API User Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset listUsers to default
    mockAdminClient.auth.admin.listUsers = vi.fn().mockResolvedValue({
      data: { users: [] },
      error: null,
    })
  })

  describe('POST /api/users', () => {
    it('should create a new user with valid data', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })

      // Mock no existing user with email
      const mockSelectChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }
      mockSupabaseClient.from = vi.fn().mockReturnValue(mockSelectChain)

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      // Mock profile creation
      // Mock profile existence check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          username: 'testuser',
          client_id: 'test-client-id',
          password: 'password123',
        }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user).toBeDefined()
      expect(data.user.name).toBe('Test User')
    })

    it('should auto-generate username from name when username is not provided', async () => {
      const { generateUsernameFromName, generateUniqueUsername } = await import('@/lib/utils/username-generation')

      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })

      // Mock no existing user with email or username
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockUser, username: 'testuser' },
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
          client_id: 'test-client-id',
          password: 'password123',
          // No username provided
        }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user).toBeDefined()
      
      // Verify username generation functions were called
      expect(generateUsernameFromName).toHaveBeenCalledWith('Test User')
      expect(generateUniqueUsername).toHaveBeenCalled()
      
      // Verify the profile was created with a username
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.any(String),
          name: 'Test User',
          email: 'test@example.com',
        })
      )
    })

    it('should handle username uniqueness when auto-generating', async () => {
      const { generateUniqueUsername } = await import('@/lib/utils/username-generation')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })

      let checkCount = 0
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => {
              checkCount++
              // First check is for email (return no user)
              // Second check is for username (simulate username exists)
              // Third check is for username1 (return no user)
              if (checkCount === 2) {
                return Promise.resolve({ data: { id: 'existing-id' }, error: null })
              }
              return Promise.resolve({ data: null, error: null })
            }),
          }),
        }),
      })

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockUser, username: 'testuser1' },
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
          // No username provided
        }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user).toBeDefined()
      
      // Verify generateUniqueUsername was called to handle collision
      expect(generateUniqueUsername).toHaveBeenCalled()
    })

    it('should fallback to email-based username when name generates empty username', async () => {
      const { generateUsernameFromName, generateUsernameFromEmail, generateUniqueUsername } = await import('@/lib/utils/username-generation')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      })

      // Mock no existing user
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockUser, username: 'testuser' },
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      })

      // Name with only special characters will generate empty username
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: '!@#$%',
          email: 'testuser@example.com',
          // No username provided
        }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user).toBeDefined()
      
      // Verify both generation functions were called
      expect(generateUsernameFromName).toHaveBeenCalledWith('!@#$%')
      expect(generateUsernameFromEmail).toHaveBeenCalledWith('testuser@example.com')
      expect(generateUniqueUsername).toHaveBeenCalled()
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test User', email: 'test@example.com' }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if name is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User name is required')
    })

    it('should return 400 if name is empty string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: '   ', email: 'test@example.com' }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User name is required')
    })

    it('should return 400 if email is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test User' }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User email is required')
    })

    it('should return 400 if email format is invalid', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test User', email: 'invalid-email' }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 409 if user with email already exists', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock existing user with email
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'existing-user-id' },
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test User', email: 'test@example.com' }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('User with this email already exists')
    })

    it('should trim whitespace from name and email', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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
      mockAdminClient.auth.admin.listUsers = vi.fn().mockResolvedValue({
        data: { users: [] },
        error: null,
      })

      // Mock profile creation and existing profile check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        insert: insertMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: '  Test User  ', email: '  test@example.com  ' }),
      })

      await createUser(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
        })
      )
    })

    it('should handle auth user creation errors', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test User', email: 'test@example.com' }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create auth user')
    })

    it('should cleanup auth user if profile creation fails', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      const authUserId = 'new-auth-user-id'
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: authUserId } },
        error: null,
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile creation failed' },
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test User', email: 'test@example.com' }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create user profile')
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(authUserId)
    })

    it('should create a user with specified role', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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
            data: { ...mockUser, role: 'admin' },
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
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
        }),
      })

      const response = await createUser(request)

      expect(response.status).toBe(201)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        })
      )
    })

    it('should default to user role when role is not provided', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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
      mockAdminClient.auth.admin.listUsers = vi.fn().mockResolvedValue({
        data: { users: [] },
        error: null,
      })

      // Mock profile creation and existing profile check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
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
          role: 'user',
        })
      )
    })

    it('should return 400 for invalid role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          role: 'invalid-role',
        }),
      })

      const response = await createUser(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid role. Must be one of: admin, manager, client, user, unverified')
    })

    // User-Client Assignment Tests
    describe('User-Client Assignment during creation', () => {
      it('should create user with client_id when provided', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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
              data: { ...mockUser, client_id: 'test-client-id' },
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
            username: 'testuser',
            client_id: 'test-client-id',
          }),
        })

        const response = await createUser(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: 'test-client-id',
          })
        )
        expect(data.user.client_id).toBe('test-client-id')
      })

      it('should create user with null client_id when not provided', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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
              data: { ...mockUser, client_id: null },
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
            username: 'testuser',
          }),
        })

        const response = await createUser(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: null,
          })
        )
      })

      it('should create user with empty string client_id converted to null', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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
              data: { ...mockUser, client_id: null },
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
            username: 'testuser',
            client_id: '',
          }),
        })

        const response = await createUser(request)

        expect(response.status).toBe(201)
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: null,
          })
        )
      })

      it('should create user with both client_id and industry_id', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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
              data: { ...mockUser, client_id: 'test-client-id', industry_id: 'test-industry-id' },
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
            username: 'testuser',
            client_id: 'test-client-id',
            industry_id: 'test-industry-id',
          }),
        })

        const response = await createUser(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: 'test-client-id',
            industry_id: 'test-industry-id',
          })
        )
      })
    })
  })

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const response = await getUsers()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toEqual(mockUsers)
      expect(mockFrom).toHaveBeenCalledWith('profiles')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const response = await getUsers()
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

      const response = await getUsers()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch users')
    })

    it('should order users by created_at descending', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const orderMock = vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: orderMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      await getUsers()

      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should return users array in response body', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const response = await getUsers()
      const data = await response.json()

      expect(data).toHaveProperty('users')
      expect(Array.isArray(data.users)).toBe(true)
      expect(data.users.length).toBe(2)
    })

    it('should return empty array when no users exist', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const response = await getUsers()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toEqual([])
      expect(Array.isArray(data.users)).toBe(true)
    })
  })

  describe('GET /api/users/[id]', () => {
    it('should return a single user by id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/users/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUser)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user is not found', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent')
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await getUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
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

      const request = new NextRequest('http://localhost:3000/api/users/test-id')
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch user')
    })
  })

  describe('PATCH /api/users/[id]', () => {
    it('should update a user with valid data', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updatedUser = { ...mockUser, name: 'Updated User' }
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedUser,
                error: null,
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated User' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.name).toBe('Updated User')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated User' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if user is not found', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated User' }),
      })
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 400 if name is empty string', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: '   ' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User name cannot be empty')
    })

    it('should return 400 if email format is invalid', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'invalid-email' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 400 if no fields to update', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
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
              data: mockUser,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ client_id: 'new-client-id' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateUser(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'new-client-id',
          updated_at: expect.any(String),
        })
      )
    })

    // User-Client Assignment Update Tests
    describe('User-Client Assignment updates', () => {
      it('should update client_id to null (unassign from client)', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id' } },
          error: null,
        })

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUser, client_id: null },
                error: null,
              }),
            }),
          }),
        })

        const mockFrom = vi.fn().mockReturnValue({
          update: updateMock,
        })
        mockSupabaseClient.from = mockFrom

        const request = new NextRequest('http://localhost:3000/api/users/test-id', {
          method: 'PATCH',
          body: JSON.stringify({ client_id: null }),
        })
        const params = Promise.resolve({ id: 'test-id' })
        const response = await updateUser(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: null,
            updated_at: expect.any(String),
          })
        )
        expect(data.user.client_id).toBeNull()
      })

      it('should update client_id to empty string as null', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id' } },
          error: null,
        })

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUser, client_id: '' },
                error: null,
              }),
            }),
          }),
        })

        const mockFrom = vi.fn().mockReturnValue({
          update: updateMock,
        })
        mockSupabaseClient.from = mockFrom

        const request = new NextRequest('http://localhost:3000/api/users/test-id', {
          method: 'PATCH',
          body: JSON.stringify({ client_id: '' }),
        })
        const params = Promise.resolve({ id: 'test-id' })
        await updateUser(request, { params })

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: '',
            updated_at: expect.any(String),
          })
        )
      })

      it('should update client_id from one client to another', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id' } },
          error: null,
        })

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUser, client_id: 'new-client-id' },
                error: null,
              }),
            }),
          }),
        })

        const mockFrom = vi.fn().mockReturnValue({
          update: updateMock,
        })
        mockSupabaseClient.from = mockFrom

        const request = new NextRequest('http://localhost:3000/api/users/test-id', {
          method: 'PATCH',
          body: JSON.stringify({ client_id: 'new-client-id' }),
        })
        const params = Promise.resolve({ id: 'test-id' })
        const response = await updateUser(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: 'new-client-id',
          })
        )
        expect(data.user.client_id).toBe('new-client-id')
      })

      it('should update both client_id and industry_id in same request', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id' } },
          error: null,
        })

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { 
                  ...mockUser, 
                  client_id: 'new-client-id',
                  industry_id: 'new-industry-id'
                },
                error: null,
              }),
            }),
          }),
        })

        const mockFrom = vi.fn().mockReturnValue({
          update: updateMock,
        })
        mockSupabaseClient.from = mockFrom

        const request = new NextRequest('http://localhost:3000/api/users/test-id', {
          method: 'PATCH',
          body: JSON.stringify({ 
            client_id: 'new-client-id',
            industry_id: 'new-industry-id'
          }),
        })
        const params = Promise.resolve({ id: 'test-id' })
        const response = await updateUser(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: 'new-client-id',
            industry_id: 'new-industry-id',
            updated_at: expect.any(String),
          })
        )
      })

      it('should update user profile fields while preserving client_id', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id' } },
          error: null,
        })

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { 
                  ...mockUser, 
                  name: 'Updated Name',
                  client_id: 'existing-client-id'
                },
                error: null,
              }),
            }),
          }),
        })

        const mockFrom = vi.fn().mockReturnValue({
          update: updateMock,
        })
        mockSupabaseClient.from = mockFrom

        const request = new NextRequest('http://localhost:3000/api/users/test-id', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name' }),
        })
        const params = Promise.resolve({ id: 'test-id' })
        const response = await updateUser(request, { params })

        expect(response.status).toBe(200)
        // Verify client_id is not modified when not in request
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Name',
            updated_at: expect.any(String),
          })
        )
        expect(updateMock).toHaveBeenCalledWith(
          expect.not.objectContaining({
            client_id: expect.anything(),
          })
        )
      })
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
              data: mockUser,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: '  Updated Name  ' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateUser(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
        })
      )
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
              data: mockUser,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated User' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      await updateUser(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
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

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated User' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update user')
    })

    it('should update user role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, role: 'admin' },
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.role).toBe('admin')
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
          updated_at: expect.any(String),
        })
      )
    })

    it('should return 400 for invalid role on update', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'superuser' }),
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid role. Must be one of: admin, manager, client, user, unverified')
    })

    it('should allow updating role to different valid roles', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const roles = ['admin', 'manager', 'client', 'user', 'unverified']
      
      for (const role of roles) {
        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUser, role },
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
          body: JSON.stringify({ role }),
        })
        const params = Promise.resolve({ id: 'test-id' })
        const response = await updateUser(request, { params })

        expect(response.status).toBe(200)
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            role,
          })
        )
      }
    })
  })

  describe('DELETE /api/users/[id]', () => {
    it('should delete a user successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock getting user's auth_user_id
      const selectMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { auth_user_id: 'auth-user-id' },
              error: null,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from = selectMock

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('User deleted successfully')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const selectMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      mockSupabaseClient.from = selectMock

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteUser(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete user')
    })

    it('should delete from the correct table', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      await deleteUser(request, { params })

      expect(mockFrom).toHaveBeenCalledWith('profiles')
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
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/users/test-id-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id-123' })
      await deleteUser(request, { params })

      expect(eqMock).toHaveBeenCalledWith('id', 'test-id-123')
    })

    it('should attempt to delete auth user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const authUserId = 'auth-user-id'
      const selectMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { auth_user_id: authUserId },
              error: null,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from = selectMock

      const request = new NextRequest('http://localhost:3000/api/users/test-id', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'test-id' })
      await deleteUser(request, { params })

      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(authUserId)
    })
  })

  describe('POST /api/users/bulk', () => {
    it('should create multiple users successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock no existing users
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      // Mock profile creation
      // Mock profile existence check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, id: 'new-user-id' },
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            {
              name: 'User 1',
              email: 'user1@example.com',
              username: 'user1',
            },
            {
              name: 'User 2',
              email: 'user2@example.com',
              username: 'user2',
            },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.created).toBe(2)
      expect(data.failed).toBe(0)
      expect(data.results).toHaveLength(2)
      expect(data.results[0].success).toBe(true)
      expect(data.results[1].success).toBe(true)
    })

    it('should auto-generate usernames when not provided in bulk creation', async () => {
      const { generateUsernameFromName, generateUniqueUsername } = await import('@/lib/utils/username-generation')
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock no existing users
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      // Mock profile existence check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockUser, id: 'new-user-id' },
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        insert: insertMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            {
              name: 'User One',
              email: 'user1@example.com',
              // No username provided
            },
            {
              name: 'User Two',
              email: 'user2@example.com',
              // No username provided
            },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.created).toBe(2)
      expect(data.failed).toBe(0)
      
      // Verify username generation functions were called for each user
      expect(generateUsernameFromName).toHaveBeenCalledWith('User One')
      expect(generateUsernameFromName).toHaveBeenCalledWith('User Two')
      expect(generateUniqueUsername).toHaveBeenCalled()
      
      // Verify profiles were created with usernames
      expect(insertMock).toHaveBeenCalledTimes(2)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.any(String),
          name: 'User One',
          email: 'user1@example.com',
        })
      )
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [{ name: 'User 1', email: 'user1@example.com' }],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if users array is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Users array is required and must not be empty')
    })

    it('should return 400 if users array is empty', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ users: [] }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Users array is required and must not be empty')
    })

    it('should skip users with missing required fields', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            { email: 'user1@example.com' }, // Missing name
            { name: 'User 2' }, // Missing email
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.created).toBe(0)
      expect(data.failed).toBe(2)
      expect(data.results[0].success).toBe(false)
      expect(data.results[0].error).toBe('User name is required')
      expect(data.results[1].success).toBe(false)
      expect(data.results[1].error).toBe('User email is required')
    })

    it('should skip users with invalid email format', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            {
              name: 'User 1',
              email: 'invalid-email',
            },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.created).toBe(0)
      expect(data.failed).toBe(1)
      expect(data.results[0].success).toBe(false)
      expect(data.results[0].error).toBe('Invalid email format')
    })

    it('should skip users with existing email', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock existing user for first email
      let callCount = 0
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => {
              callCount++
              if (callCount === 1) {
                // First call - existing user
                return Promise.resolve({
                  data: { id: 'existing-user-id' },
                  error: null,
                })
              }
              // Subsequent calls - no user found
              return Promise.resolve({
                data: null,
                error: null,
              })
            }),
            maybeSingle: vi.fn().mockImplementation(() => {
              callCount++
              if (callCount === 1) {
                // First call - existing user
                return Promise.resolve({
                  data: { id: 'existing-user-id' },
                  error: null,
                })
              }
              // Subsequent calls - no user found
              return Promise.resolve({
                data: null,
                error: null,
              })
            }),
          }),
        }),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      // Mock profile existence check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            {
              name: 'User 1',
              email: 'existing@example.com',
            },
            {
              name: 'User 2',
              email: 'new@example.com',
            },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.created).toBe(1)
      expect(data.failed).toBe(1)
      expect(data.results[0].success).toBe(false)
      expect(data.results[0].error).toBe('User with this email already exists')
      expect(data.results[1].success).toBe(true)
    })

    it('should handle auth creation errors gracefully', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock profile existence check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            {
              name: 'User 1',
              email: 'user1@example.com',
            },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.created).toBe(0)
      expect(data.failed).toBe(1)
      expect(data.results[0].success).toBe(false)
      expect(data.results[0].error).toBe('Failed to create auth user')
    })

    it('should cleanup auth user if profile creation fails', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      const authUserId = 'new-auth-user-id'
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: authUserId } },
        error: null,
      })

      // Mock profile existence check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile creation failed' },
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            {
              name: 'User 1',
              email: 'user1@example.com',
            },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.created).toBe(0)
      expect(data.failed).toBe(1)
      expect(data.results[0].success).toBe(false)
      expect(data.results[0].error).toBe('Failed to create user profile')
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(authUserId)
    })

    it('should return correct counts for mixed success/failure', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Track calls to distinguish between users
      let emailCheckCount = 0
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => {
              emailCheckCount++
              if (emailCheckCount === 2) {
                // Second user already exists
                return Promise.resolve({
                  data: { id: 'existing-user-id' },
                  error: null,
                })
              }
              // Other users don't exist
              return Promise.resolve({
                data: null,
                error: null,
              })
            }),
            maybeSingle: vi.fn().mockImplementation(() => {
              emailCheckCount++
              if (emailCheckCount === 2) {
                // Second user already exists
                return Promise.resolve({
                  data: { id: 'existing-user-id' },
                  error: null,
                })
              }
              // Other users don't exist
              return Promise.resolve({
                data: null,
                error: null,
              })
            }),
          }),
        }),
      })

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-auth-user-id' } },
        error: null,
      })

      // Mock profile existence check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            { name: 'User 1', email: 'user1@example.com' },
            { name: 'User 2', email: 'existing@example.com' },
            { name: 'User 3', email: 'user3@example.com' },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.created).toBe(2)
      expect(data.failed).toBe(1)
    })

    it('should create users with specified roles in bulk', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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
      mockAdminClient.auth.admin.listUsers = vi.fn().mockResolvedValue({
        data: { users: [] },
        error: null,
      })

      // Mock profile creation and existing profile check
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      })

      mockAdminClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        insert: insertMock,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            {
              name: 'Admin User',
              email: 'admin@example.com',
              role: 'admin',
            },
            {
              name: 'Client User',
              email: 'client@example.com',
              role: 'client',
            },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.created).toBe(2)
      expect(data.failed).toBe(0)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        })
      )
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'client',
        })
      )
    })

    it('should reject bulk creation with invalid role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: [
            {
              name: 'User 1',
              email: 'user1@example.com',
              role: 'superadmin',
            },
          ],
        }),
      })

      const response = await bulkCreateUsers(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.created).toBe(0)
      expect(data.failed).toBe(1)
      expect(data.results[0].success).toBe(false)
      expect(data.results[0].error).toBe('Invalid role. Must be one of: admin, manager, client, user, unverified')
    })
  })

  describe('User-Industry Assignment', () => {
    describe('POST /api/users with industry_id', () => {
      it('should create a new user with industry_id', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'auth-user-id' } },
          error: null,
        })

        // Mock no existing user with email
        const mockSelectChain = {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }
        mockSupabaseClient.from = vi.fn().mockReturnValue(mockSelectChain)

        // Mock auth user creation
        mockAdminClient.auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'new-auth-user-id' } },
          error: null,
        })

        const insertMock = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, industry_id: 'test-industry-id' },
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
            username: 'testuser',
            industry_id: 'test-industry-id',
            password: 'password123',
          }),
        })

        const response = await createUser(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.user).toBeDefined()
        expect(data.user.industry_id).toBe('test-industry-id')
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            industry_id: 'test-industry-id',
          })
        )
      })

      it('should create a new user without industry_id (null)', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'auth-user-id' } },
          error: null,
        })

        const mockSelectChain = {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }
        mockSupabaseClient.from = vi.fn().mockReturnValue(mockSelectChain)

        mockAdminClient.auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'new-auth-user-id' } },
          error: null,
        })

        const insertMock = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, industry_id: null },
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
            username: 'testuser',
            password: 'password123',
          }),
        })

        const response = await createUser(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.user).toBeDefined()
        expect(data.user.industry_id).toBeNull()
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            industry_id: null,
          })
        )
      })
    })

    describe('PATCH /api/users/[id] with industry_id', () => {
      it('should update a user with industry_id', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id' } },
          error: null,
        })

        const updatedUser = { ...mockUser, industry_id: 'new-industry-id' }
        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedUser,
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
          body: JSON.stringify({ industry_id: 'new-industry-id' }),
        })
        const params = Promise.resolve({ id: 'test-id' })
        const response = await updateUser(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.user.industry_id).toBe('new-industry-id')
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            industry_id: 'new-industry-id',
            updated_at: expect.any(String),
          })
        )
      })

      it('should update a user to remove industry_id (set to null)', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id' } },
          error: null,
        })

        const updatedUser = { ...mockUser, industry_id: null }
        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedUser,
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
          body: JSON.stringify({ industry_id: null }),
        })
        const params = Promise.resolve({ id: 'test-id' })
        const response = await updateUser(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.user.industry_id).toBeNull()
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            industry_id: null,
            updated_at: expect.any(String),
          })
        )
      })

      it('should update user with both name and industry_id', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id' } },
          error: null,
        })

        const updatedUser = { 
          ...mockUser, 
          name: 'Updated Name',
          industry_id: 'new-industry-id' 
        }
        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedUser,
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
          body: JSON.stringify({ 
            name: 'Updated Name',
            industry_id: 'new-industry-id' 
          }),
        })
        const params = Promise.resolve({ id: 'test-id' })
        const response = await updateUser(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.user.name).toBe('Updated Name')
        expect(data.user.industry_id).toBe('new-industry-id')
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Name',
            industry_id: 'new-industry-id',
            updated_at: expect.any(String),
          })
        )
      })
    })

    describe('POST /api/users/bulk with industry_id', () => {
      it('should create multiple users with industry_id', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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

        // Mock profile existence check
        const selectChain = {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }

        const insertMock = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockUser, id: 'new-user-id' },
              error: null,
            }),
          }),
        })

        mockAdminClient.from = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectChain),
          insert: insertMock,
        })

        const request = new NextRequest('http://localhost:3000/api/users/bulk', {
          method: 'POST',
          body: JSON.stringify({
            users: [
              {
                name: 'User 1',
                email: 'user1@example.com',
                username: 'user1',
                industry_id: 'industry-1',
              },
              {
                name: 'User 2',
                email: 'user2@example.com',
                username: 'user2',
                industry_id: 'industry-2',
              },
            ],
          }),
        })

        const response = await bulkCreateUsers(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(2)
        expect(data.failed).toBe(0)
        expect(insertMock).toHaveBeenCalledTimes(2)
        
        // Verify first call had industry_id
        const firstCallArg = insertMock.mock.calls[0][0]
        expect(firstCallArg).toMatchObject({
          industry_id: 'industry-1',
        })
        
        // Verify second call had industry_id
        const secondCallArg = insertMock.mock.calls[1][0]
        expect(secondCallArg).toMatchObject({
          industry_id: 'industry-2',
        })
      })

      it('should create multiple users with mixed industry_id values', async () => {
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
            maybeSingle: vi.fn().mockResolvedValue({
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

        // Mock profile existence check
        const selectChain = {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }

        const insertMock = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        })

        mockAdminClient.from = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectChain),
          insert: insertMock,
        })

        const request = new NextRequest('http://localhost:3000/api/users/bulk', {
          method: 'POST',
          body: JSON.stringify({
            users: [
              {
                name: 'User 1',
                email: 'user1@example.com',
                username: 'user1',
                industry_id: 'industry-1',
              },
              {
                name: 'User 2',
                email: 'user2@example.com',
                username: 'user2',
                // No industry_id - should default to null
              },
              {
                name: 'User 3',
                email: 'user3@example.com',
                username: 'user3',
                industry_id: null,
              },
            ],
          }),
        })

        const response = await bulkCreateUsers(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.created).toBe(3)
        expect(data.failed).toBe(0)
        expect(insertMock).toHaveBeenCalledTimes(3)
        
        // Verify first user has industry_id
        const firstCallArg = insertMock.mock.calls[0][0]
        expect(firstCallArg).toMatchObject({
          industry_id: 'industry-1',
        })
        
        // Verify second user has null industry_id
        const secondCallArg = insertMock.mock.calls[1][0]
        expect(secondCallArg).toMatchObject({
          industry_id: null,
        })
        
        // Verify third user has null industry_id
        const thirdCallArg = insertMock.mock.calls[2][0]
        expect(thirdCallArg).toMatchObject({
          industry_id: null,
        })
      })
    })
  })
})
