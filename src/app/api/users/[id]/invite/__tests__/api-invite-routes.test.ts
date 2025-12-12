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

describe('POST /api/users/[id]/invite', () => {
  let mockSupabaseClient: any
  let mockAdminClient: any
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }
    
    // Setup mock Admin client
    mockAdminClient = {
      from: vi.fn(),
    }
    
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabaseClient)
    vi.mocked(supabaseAdmin.createAdminClient).mockReturnValue(mockAdminClient)
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.NEXT_PUBLIC_APP_NAME = 'Involved Talent'
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should send invite email successfully', async () => {
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    
    // Mock user profile fetch
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      },
      error: null,
    })
    
    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      single: mockSingle,
    })
    
    // Mock invite token generation
    const mockToken = 'a'.repeat(64)
    const mockExpiresAt = new Date('2024-01-08T00:00:00Z')
    vi.mocked(inviteTokenGeneration.generateInviteTokenWithExpiration).mockReturnValue({
      token: mockToken,
      expiresAt: mockExpiresAt,
    })
    
    // Mock invite insertion
    const mockAdminSelect = vi.fn().mockResolvedValue({
      data: {
        id: 'invite-123',
        profile_id: 'user-123',
        token: mockToken,
        expires_at: mockExpiresAt.toISOString(),
        status: 'pending',
      },
      error: null,
    })
    
    const mockAdminInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockAdminSelect,
      }),
    })
    
    mockAdminClient.from.mockReturnValue({
      insert: mockAdminInsert,
    })
    
    // Mock email sending
    vi.mocked(emailService.sendInviteEmail).mockResolvedValue({
      success: true,
      messageId: 'mock-message-id',
    })
    
    // Create request
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'POST',
    })
    
    const params = { id: 'user-123' }
    
    // Call endpoint
    const response = await POST(request, { params })
    const data = await response.json()
    
    // Assertions
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.invite).toBeDefined()
    expect(data.messageId).toBe('mock-message-id')
    expect(emailService.sendInviteEmail).toHaveBeenCalledWith({
      recipientEmail: 'john@example.com',
      recipientName: 'John Doe',
      inviteToken: mockToken,
      inviteUrl: `http://localhost:3000/auth/invite?token=${mockToken}`,
      expirationDate: mockExpiresAt,
      organizationName: 'Involved Talent',
    })
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

  it('should return 404 if user not found', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('User not found'),
    })
    
    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      single: mockSingle,
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/nonexistent/invite', {
      method: 'POST',
    })
    
    const params = { id: 'nonexistent' }
    const response = await POST(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('should return 500 if invite creation fails', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      },
      error: null,
    })
    
    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      single: mockSingle,
    })
    
    vi.mocked(inviteTokenGeneration.generateInviteTokenWithExpiration).mockReturnValue({
      token: 'a'.repeat(64),
      expiresAt: new Date('2024-01-08T00:00:00Z'),
    })
    
    const mockAdminSelect = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    })
    
    const mockAdminInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockAdminSelect,
      }),
    })
    
    mockAdminClient.from.mockReturnValue({
      insert: mockAdminInsert,
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'POST',
    })
    
    const params = { id: 'user-123' }
    const response = await POST(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create invite')
  })

  it('should still return success if email sending fails', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      },
      error: null,
    })
    
    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      single: mockSingle,
    })
    
    vi.mocked(inviteTokenGeneration.generateInviteTokenWithExpiration).mockReturnValue({
      token: 'a'.repeat(64),
      expiresAt: new Date('2024-01-08T00:00:00Z'),
    })
    
    const mockAdminSelect = vi.fn().mockResolvedValue({
      data: {
        id: 'invite-123',
        profile_id: 'user-123',
        token: 'a'.repeat(64),
        expires_at: new Date('2024-01-08T00:00:00Z').toISOString(),
        status: 'pending',
      },
      error: null,
    })
    
    const mockAdminInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockAdminSelect,
      }),
    })
    
    mockAdminClient.from.mockReturnValue({
      insert: mockAdminInsert,
    })
    
    vi.mocked(emailService.sendInviteEmail).mockResolvedValue({
      success: false,
      error: 'Email service error',
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'POST',
    })
    
    const params = { id: 'user-123' }
    const response = await POST(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.warning).toBe('Invite created but email sending failed')
  })
})

describe('GET /api/users/[id]/invite', () => {
  let mockSupabaseClient: any
  
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

  it('should get invites for a user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'invite-1',
          profile_id: 'user-123',
          token: 'token1',
          expires_at: '2024-01-08T00:00:00Z',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'invite-2',
          profile_id: 'user-123',
          token: 'token2',
          expires_at: '2024-01-07T00:00:00Z',
          status: 'expired',
          created_at: '2023-12-31T00:00:00Z',
        },
      ],
      error: null,
    })
    
    const mockEq = vi.fn().mockReturnValue({
      order: mockOrder,
    })
    
    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    })
    
    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'GET',
    })
    
    const params = { id: 'user-123' }
    const response = await GET(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.invites).toHaveLength(2)
    expect(data.invites[0].id).toBe('invite-1')
    expect(data.invites[1].id).toBe('invite-2')
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

  it('should return 500 if database query fails', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    })
    
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    })
    
    const mockEq = vi.fn().mockReturnValue({
      order: mockOrder,
    })
    
    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    })
    
    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    })
    
    const request = new NextRequest('http://localhost:3000/api/users/user-123/invite', {
      method: 'GET',
    })
    
    const params = { id: 'user-123' }
    const response = await GET(request, { params })
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch invites')
  })
})
