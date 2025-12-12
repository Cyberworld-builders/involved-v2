import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'
import * as supabaseServer from '@/lib/supabase/server'
import * as supabaseAdmin from '@/lib/supabase/admin'
import * as inviteTokenGeneration from '@/lib/utils/invite-token-generation'

// Mock modules
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/admin')
vi.mock('@/lib/utils/invite-token-generation', async () => {
  const actual = await vi.importActual('@/lib/utils/invite-token-generation')
  return {
    ...actual,
    validateInviteToken: vi.fn(),
  }
})

describe('GET /api/auth/claim', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAdminClient: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockAdminClient = {
      from: vi.fn(),
      auth: {
        admin: {
          createUser: vi.fn(),
          updateUserById: vi.fn(),
        },
      },
    }
    
    vi.mocked(supabaseAdmin.createAdminClient).mockReturnValue(mockAdminClient)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return error when token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/claim')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Token is required')
  })

  it('should return error when token is invalid', async () => {
    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/claim?token=invalid-token')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(404)
    expect(data.error).toBe('Invalid token')
  })

  it('should return error when invite is already accepted', async () => {
    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-123',
              profile_id: 'user-123',
              expires_at: '2025-12-31T23:59:59Z',
              status: 'accepted',
            },
            error: null,
          }),
        }),
      }),
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/claim?token=used-token')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('This invite has already been used')
  })

  it('should return error when invite is revoked', async () => {
    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-123',
              profile_id: 'user-123',
              expires_at: '2025-12-31T23:59:59Z',
              status: 'revoked',
            },
            error: null,
          }),
        }),
      }),
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/claim?token=revoked-token')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('This invite has been revoked')
  })

  it('should return error when token is expired', async () => {
    let fromCallCount = 0
    mockAdminClient.from.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'invite-123',
                  profile_id: 'user-123',
                  expires_at: '2020-01-01T00:00:00Z',
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
        }
      } else {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
    })
    
    vi.mocked(inviteTokenGeneration.validateInviteToken).mockReturnValue({
      valid: false,
      reason: 'expired',
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/claim?token=expired-token')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Token has expired')
  })

  it('should return user profile for valid token', async () => {
    let fromCallCount = 0
    mockAdminClient.from.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'invite-123',
                  profile_id: 'user-123',
                  expires_at: '2025-12-31T23:59:59Z',
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
        }
      } else {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  name: 'John Doe',
                  email: 'john@example.com',
                },
                error: null,
              }),
            }),
          }),
        }
      }
    })
    
    vi.mocked(inviteTokenGeneration.validateInviteToken).mockReturnValue({
      valid: true,
      reason: null,
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/claim?token=valid-token')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.profile).toEqual({
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
    })
  })
})

describe('POST /api/auth/claim', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAdminClient: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabaseClient: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockAdminClient = {
      from: vi.fn(),
      auth: {
        admin: {
          createUser: vi.fn(),
          updateUserById: vi.fn(),
        },
      },
    }
    
    mockSupabaseClient = {
      auth: {
        signInWithPassword: vi.fn(),
      },
    }
    
    vi.mocked(supabaseAdmin.createAdminClient).mockReturnValue(mockAdminClient)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabaseClient)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return error when token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Token is required')
  })

  it('should return error when password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Password must be at least 8 characters long')
  })

  it('should return error when password is too short', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token', password: 'short' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Password must be at least 8 characters long')
  })

  it('should successfully claim account for new user', async () => {
    let fromCallCount = 0
    mockAdminClient.from.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        // First call: get invite
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'invite-123',
                  profile_id: 'user-123',
                  expires_at: '2025-12-31T23:59:59Z',
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
        }
      } else if (fromCallCount === 2) {
        // Second call: get profile
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  email: 'john@example.com',
                  auth_user_id: null,
                },
                error: null,
              }),
            }),
          }),
        }
      } else if (fromCallCount === 3) {
        // Third call: update profile with auth_user_id
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      } else {
        // Fourth call: update invite status
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
    })
    
    vi.mocked(inviteTokenGeneration.validateInviteToken).mockReturnValue({
      valid: true,
      reason: null,
    })
    
    mockAdminClient.auth.admin.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-user-123',
          email: 'john@example.com',
        },
      },
      error: null,
    })
    
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
          refresh_token: 'refresh',
        },
      },
      error: null,
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token', password: 'password123' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Account claimed successfully')
    expect(data.session).toBeDefined()
  })

  it('should successfully claim account for existing user with auth account', async () => {
    let fromCallCount = 0
    mockAdminClient.from.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        // First call: get invite
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'invite-123',
                  profile_id: 'user-123',
                  expires_at: '2025-12-31T23:59:59Z',
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
        }
      } else if (fromCallCount === 2) {
        // Second call: get profile
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  email: 'john@example.com',
                  auth_user_id: 'existing-auth-id',
                },
                error: null,
              }),
            }),
          }),
        }
      } else {
        // Third call: update invite status
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
    })
    
    vi.mocked(inviteTokenGeneration.validateInviteToken).mockReturnValue({
      valid: true,
      reason: null,
    })
    
    mockAdminClient.auth.admin.updateUserById.mockResolvedValue({
      data: {
        user: {
          id: 'existing-auth-id',
          email: 'john@example.com',
        },
      },
      error: null,
    })
    
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
          refresh_token: 'refresh',
        },
      },
      error: null,
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token', password: 'newpassword123' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      'existing-auth-id',
      { password: 'newpassword123' }
    )
  })

  it('should return error when invite is already accepted', async () => {
    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-123',
              profile_id: 'user-123',
              expires_at: '2025-12-31T23:59:59Z',
              status: 'accepted',
            },
            error: null,
          }),
        }),
      }),
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'used-token', password: 'password123' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('This invite has already been used')
  })

  it('should return error when token is expired', async () => {
    let fromCallCount = 0
    mockAdminClient.from.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'invite-123',
                  profile_id: 'user-123',
                  expires_at: '2020-01-01T00:00:00Z',
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
        }
      } else {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
    })
    
    vi.mocked(inviteTokenGeneration.validateInviteToken).mockReturnValue({
      valid: false,
      reason: 'expired',
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'expired-token', password: 'password123' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Token has expired')
  })
})
