import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'
import * as supabaseServer from '@/lib/supabase/server'
import * as supabaseAdmin from '@/lib/supabase/admin'
import * as inviteTokenGeneration from '@/lib/utils/invite-token-generation'
import * as emailService from '@/lib/services/email-service'

// Mock modules
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/admin')
vi.mock('@/lib/utils/invite-token-generation')
vi.mock('@/lib/services/email-service')

type MockSupabaseClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
}

type MockAdminClient = {
  from: ReturnType<typeof vi.fn>
}

describe('POST /api/users/[id]/invite', () => {
  let mockSupabaseClient: MockSupabaseClient
  let mockAdminClient: MockAdminClient
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }
    
    mockAdminClient = {
      from: vi.fn(),
    }
    
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabaseClient)
    vi.mocked(supabaseAdmin.createAdminClient).mockReturnValue(mockAdminClient)
    
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.NEXT_PUBLIC_APP_NAME = 'Involved Talent'
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should send invite email successfully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  name: 'John Doe',
                  email: 'john@example.com',
                  client_id: 'client-1',
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
                  id: 'current-user-123',
                  client_id: 'client-1',
                },
                error: null,
              }),
            }),
          }),
        }
      }
    })
    
    const mockToken = 'a'.repeat(64)
    const mockExpiresAt = new Date('2024-01-08T00:00:00Z')
    vi.mocked(inviteTokenGeneration.generateInviteTokenWithExpiration).mockReturnValue({
      token: mockToken,
      expiresAt: mockExpiresAt,
    })
    
    // Mock existing invites check
    const selectChain = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    }

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-123',
              profile_id: 'user-123',
              token: mockToken,
              expires_at: mockExpiresAt.toISOString(),
              status: 'pending',
            },
            error: null,
          }),
        }),
      }),
    })
    
    vi.mocked(emailService.sendInviteEmail).mockResolvedValue({
      success: true,
      messageId: 'mock-message-id',
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'POST',
    })
    
    const params = { id: 'user-123' }
    const response = await POST(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.invite).toBeDefined()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'POST',
    })
    
    const params = { id: 'user-123' }
    const response = await POST(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 if users are from different clients', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  name: 'John Doe',
                  email: 'john@example.com',
                  client_id: 'client-1',
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
                  id: 'current-user-123',
                  client_id: 'client-2',
                },
                error: null,
              }),
            }),
          }),
        }
      }
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'POST',
    })
    
    const params = { id: 'user-123' }
    const response = await POST(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(403)
    expect(data.error).toContain('Not authorized')
  })
})

describe('GET /api/users/[id]/invite', () => {
  let mockSupabaseClient: MockSupabaseClient
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }
    
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabaseClient)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should get invites for a user in same client', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    
    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'current-user-123',
                  client_id: 'client-1',
                },
                error: null,
              }),
            }),
          }),
        }
      } else if (fromCallCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  client_id: 'client-1',
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
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'invite-1',
                    profile_id: 'user-123',
                    token: 'token1',
                    expires_at: '2024-01-08T00:00:00Z',
                    status: 'pending',
                    created_at: '2024-01-01T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'GET',
    })
    
    const params = { id: 'user-123' }
    const response = await GET(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.invites).toHaveLength(1)
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'GET',
    })
    
    const params = { id: 'user-123' }
    const response = await GET(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})
