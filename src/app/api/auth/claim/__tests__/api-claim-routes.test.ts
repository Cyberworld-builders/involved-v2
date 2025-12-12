/**
 * Unit Tests: Account Claim API Route
 * 
 * Tests the /api/auth/claim endpoint for claiming accounts with invite tokens.
 * 
 * Related to Phase 1 Issue: Implement login after account claim
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/utils/invite-token-generation', () => ({
  validateInviteToken: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { validateInviteToken } from '@/lib/utils/invite-token-generation'

describe('Account Claim API Route', () => {
  const mockToken = 'a'.repeat(64)
  const mockPassword = 'TestPassword123!'
  const mockEmail = 'invited@example.com'
  const mockProfileId = 'profile-123'
  const mockInviteId = 'invite-123'

  const mockProfile = {
    id: mockProfileId,
    auth_user_id: null,
    username: 'invited',
    name: 'Invited User',
    email: mockEmail,
    client_id: null,
    industry_id: null,
    language_id: null,
    last_login_at: null,
    completed_profile: false,
    accepted_terms: null,
    accepted_at: null,
    accepted_signature: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const mockInvite = {
    id: mockInviteId,
    profile_id: mockProfileId,
    token: mockToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending' as const,
    invited_by: 'admin-123',
    accepted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let mockAdminClient: any

  beforeEach(() => {
    // Create a simple mock that returns appropriate responses
    mockAdminClient = {
      from: vi.fn((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn(),
        }
        return chain
      }),
      auth: {
        admin: {
          createUser: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
    }

    vi.mocked(createAdminClient).mockReturnValue(mockAdminClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/claim', () => {
    it('should reject claim with missing token', async () => {
      const request = new NextRequest('http://localhost/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({ password: mockPassword }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token is required')
    })

    it('should reject claim with missing password', async () => {
      const request = new NextRequest('http://localhost/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({ token: mockToken }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password is required')
    })

    it('should reject claim with short password', async () => {
      const request = new NextRequest('http://localhost/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({ token: mockToken, password: 'short' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be at least 8 characters long')
    })

    it('should reject claim with invalid token', async () => {
      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      })

      const request = new NextRequest('http://localhost/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token', password: mockPassword }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Invalid or expired invitation link')
    })

    it('should reject claim with already accepted invite', async () => {
      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockInvite, status: 'accepted' },
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({ token: mockToken, password: mockPassword }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This invitation has already been used')
    })

    it('should reject claim with expired token', async () => {
      const expiredInvite = {
        ...mockInvite,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      }

      let callCount = 0
      mockAdminClient.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call - fetch invite
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: expiredInvite,
              error: null,
            }),
          }
        } else {
          // Second call - update invite status
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }
        }
      })

      vi.mocked(validateInviteToken).mockReturnValue({
        valid: false,
        reason: 'expired',
      })

      const request = new NextRequest('http://localhost/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({ token: mockToken, password: mockPassword }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This invitation has expired')
    })

    it('should reject claim if profile not found', async () => {
      let callCount = 0
      mockAdminClient.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call - fetch invite
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockInvite,
              error: null,
            }),
          }
        } else {
          // Second call - fetch profile
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }
        }
      })

      vi.mocked(validateInviteToken).mockReturnValue({
        valid: true,
        reason: null,
      })

      const request = new NextRequest('http://localhost/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({ token: mockToken, password: mockPassword }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User profile not found')
    })

    it('should reject claim if account already claimed', async () => {
      let callCount = 0
      mockAdminClient.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call - fetch invite
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockInvite,
              error: null,
            }),
          }
        } else {
          // Second call - fetch profile
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { ...mockProfile, auth_user_id: 'existing-auth-id' },
              error: null,
            }),
          }
        }
      })

      vi.mocked(validateInviteToken).mockReturnValue({
        valid: true,
        reason: null,
      })

      const request = new NextRequest('http://localhost/api/auth/claim', {
        method: 'POST',
        body: JSON.stringify({ token: mockToken, password: mockPassword }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This account has already been claimed')
    })
  })

  describe('GET /api/auth/claim', () => {
    it('should validate a valid token', async () => {
      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockInvite,
            profiles: mockProfile,
          },
          error: null,
        }),
      })

      vi.mocked(validateInviteToken).mockReturnValue({
        valid: true,
        reason: null,
      })

      const request = new NextRequest(`http://localhost/api/auth/claim?token=${mockToken}`)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.invite.email).toBe(mockEmail)
      expect(data.invite.name).toBe(mockProfile.name)
    })

    it('should reject validation with missing token', async () => {
      const request = new NextRequest('http://localhost/api/auth/claim')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token is required')
    })

    it('should reject validation with invalid token', async () => {
      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      })

      const request = new NextRequest('http://localhost/api/auth/claim?token=invalid')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.valid).toBe(false)
      expect(data.error).toBe('Invalid invitation link')
    })

    it('should reject validation for already accepted invite', async () => {
      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockInvite,
            status: 'accepted',
            profiles: mockProfile,
          },
          error: null,
        }),
      })

      const request = new NextRequest(`http://localhost/api/auth/claim?token=${mockToken}`)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.error).toBe('This invitation has already been used')
    })

    it('should reject validation for expired token', async () => {
      let callCount = 0
      mockAdminClient.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call - fetch invite
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                ...mockInvite,
                expires_at: new Date(Date.now() - 1000).toISOString(),
                profiles: mockProfile,
              },
              error: null,
            }),
          }
        } else {
          // Second call - update invite status
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }
        }
      })

      vi.mocked(validateInviteToken).mockReturnValue({
        valid: false,
        reason: 'expired',
      })

      const request = new NextRequest(`http://localhost/api/auth/claim?token=${mockToken}`)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.error).toBe('This invitation has expired')
    })

    it('should reject validation for already claimed account', async () => {
      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockInvite,
            profiles: { ...mockProfile, auth_user_id: 'existing-auth-id' },
          },
          error: null,
        }),
      })

      vi.mocked(validateInviteToken).mockReturnValue({
        valid: true,
        reason: null,
      })

      const request = new NextRequest(`http://localhost/api/auth/claim?token=${mockToken}`)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.error).toBe('This account has already been claimed')
    })
  })
})
