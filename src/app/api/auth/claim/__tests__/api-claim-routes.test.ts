import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as validateGET } from '../validate/route'
import { POST as claimPOST } from '../route'
import { NextRequest } from 'next/server'

// Mock Supabase admin client
const mockFrom = vi.fn()
const mockAuthAdmin = vi.fn()
const mockAdminClient = {
  from: mockFrom,
  auth: {
    admin: mockAuthAdmin,
  },
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

// Mock invite token validation
vi.mock('@/lib/utils/invite-token-generation', () => ({
  validateInviteToken: vi.fn((token: string, expiresAt: Date) => {
    const now = new Date()
    if (expiresAt < now) {
      return { valid: false, reason: 'expired' }
    }
    return { valid: true, reason: null }
  }),
}))

describe('Claim API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/auth/claim/validate', () => {
    it('should validate a valid token', async () => {
      const validToken = 'a'.repeat(64)
      const request = new NextRequest(`http://localhost:3000/api/auth/claim/validate?token=${validToken}`)

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'invite-id',
                token: validToken,
                status: 'pending',
                expires_at: futureDate.toISOString(),
                profiles: {
                  id: 'profile-id',
                  email: 'test@example.com',
                  name: 'Test User',
                  auth_user_id: null,
                },
              },
              error: null,
            }),
          }),
        }),
      })

      const response = await validateGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.email).toBe('test@example.com')
      expect(data.name).toBe('Test User')
    })

    it('should reject missing token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/claim/validate')

      const response = await validateGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.message).toContain('Token is required')
    })

    it('should reject invalid token format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/claim/validate?token=invalid')

      const response = await validateGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.message).toContain('Invalid token format')
    })

    it('should reject already claimed invite', async () => {
      const validToken = 'a'.repeat(64)
      const request = new NextRequest(`http://localhost:3000/api/auth/claim/validate?token=${validToken}`)

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'invite-id',
                token: validToken,
                status: 'pending',
                expires_at: futureDate.toISOString(),
                profiles: {
                  id: 'profile-id',
                  email: 'test@example.com',
                  name: 'Test User',
                  auth_user_id: 'existing-auth-id',
                },
              },
              error: null,
            }),
          }),
        }),
      })

      const response = await validateGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.message).toContain('already been claimed')
    })
  })

  describe('POST /api/auth/claim', () => {
    it('should claim account with valid token and password', async () => {
      const validToken = 'a'.repeat(64)
      const request = new NextRequest('http://localhost:3000/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({
          token: validToken,
          password: 'Password123!',
        }),
      })

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      
      // Mock invite lookup
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'invite-id',
                token: validToken,
                status: 'pending',
                expires_at: futureDate.toISOString(),
                profiles: {
                  id: 'profile-id',
                  email: 'test@example.com',
                  name: 'Test User',
                  auth_user_id: null,
                },
              },
              error: null,
            }),
          }),
        }),
        update: mockUpdate,
      })

      // Mock auth user creation
      mockAuthAdmin.mockReturnValue({
        createUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'new-auth-id',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      })

      const response = await claimPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Account claimed successfully')
    })

    it('should reject claim with missing password', async () => {
      const validToken = 'a'.repeat(64)
      const request = new NextRequest('http://localhost:3000/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({
          token: validToken,
        }),
      })

      const response = await claimPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Token and password are required')
    })

    it('should reject claim with short password', async () => {
      const validToken = 'a'.repeat(64)
      const request = new NextRequest('http://localhost:3000/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({
          token: validToken,
          password: 'short',
        }),
      })

      const response = await claimPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Password must be at least 8 characters')
    })
  })
})
