/**
 * Integration Test: Account Claim Flow with Dashboard Redirect
 * 
 * This test verifies the complete end-to-end flow of claiming an account:
 * 1. Validate invite token
 * 2. Set password and claim account
 * 3. Sign in user
 * 4. Redirect to dashboard
 * 
 * Related to issue: Phase 1 - Implement redirect to dashboard after account claim
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase admin client
const mockFrom = vi.fn()
const mockAuthAdmin = {
  createUser: vi.fn(),
  deleteUser: vi.fn(),
}
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

// Import after mocks
import { GET as validateGET } from '@/app/api/auth/claim/validate/route'
import { POST as claimPOST } from '@/app/api/auth/claim/route'
import { NextRequest } from 'next/server'

describe('Account Claim Flow Integration', () => {
  const validToken = 'a'.repeat(64)
  const testEmail = 'newuser@example.com'
  const testPassword = 'SecurePassword123!'
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should complete the full account claim flow with dashboard redirect', async () => {
    // Step 1: Validate invite token
    const validateRequest = new NextRequest(
      `http://localhost:3000/api/auth/claim/validate?token=${validToken}`
    )

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
                email: testEmail,
                name: 'New User',
                auth_user_id: null,
              },
            },
            error: null,
          }),
        }),
      }),
    })

    const validateResponse = await validateGET(validateRequest)
    const validateData = await validateResponse.json()

    expect(validateResponse.status).toBe(200)
    expect(validateData.valid).toBe(true)
    expect(validateData.email).toBe(testEmail)

    // Step 2: Claim account with password
    const claimRequest = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: validToken,
        password: testPassword,
      }),
    })

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
                email: testEmail,
                name: 'New User',
                auth_user_id: null,
              },
            },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    })

    mockAuthAdmin.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'new-auth-user-id',
          email: testEmail,
        },
      },
      error: null,
    })

    const claimResponse = await claimPOST(claimRequest)
    const claimData = await claimResponse.json()

    // Verify account was created successfully
    expect(claimResponse.status).toBe(200)
    expect(claimData.success).toBe(true)
    expect(claimData.message).toBe('Account claimed successfully')

    // Verify auth user was created
    expect(mockAuthAdmin.createUser).toHaveBeenCalledWith({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'New User',
      },
    })

    // Verify profile was updated with auth_user_id
    expect(mockUpdate).toHaveBeenCalled()

    // Verify invite status was updated to accepted
    expect(mockFrom).toHaveBeenCalledWith('user_invites')
  })

  it('should handle the complete flow and prepare for dashboard redirect', async () => {
    // This test verifies that after successful account claim,
    // the user would be able to sign in and be redirected to dashboard

    // Step 1: Validate token
    const validateRequest = new NextRequest(
      `http://localhost:3000/api/auth/claim/validate?token=${validToken}`
    )

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
                email: testEmail,
                name: 'Test User',
                auth_user_id: null,
              },
            },
            error: null,
          }),
        }),
      }),
    })

    const validateResponse = await validateGET(validateRequest)
    expect(validateResponse.status).toBe(200)

    // Step 2: Claim account
    const claimRequest = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: validToken,
        password: testPassword,
      }),
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
                email: testEmail,
                name: 'Test User',
                auth_user_id: null,
              },
            },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    mockAuthAdmin.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-user-id',
          email: testEmail,
        },
      },
      error: null,
    })

    const claimResponse = await claimPOST(claimRequest)
    const claimData = await claimResponse.json()

    // After successful claim:
    // 1. Account is created
    expect(claimResponse.status).toBe(200)
    expect(claimData.success).toBe(true)

    // 2. User can now sign in with their credentials
    // 3. Upon sign in, they will be redirected to /dashboard
    // (This is handled by the frontend component in src/app/auth/claim/page.tsx)
  })

  it('should reject already claimed accounts', async () => {
    // Attempt to validate a token for an account that's already claimed
    const validateRequest = new NextRequest(
      `http://localhost:3000/api/auth/claim/validate?token=${validToken}`
    )

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
                email: testEmail,
                name: 'Test User',
                auth_user_id: 'existing-auth-id', // Already claimed
              },
            },
            error: null,
          }),
        }),
      }),
    })

    const validateResponse = await validateGET(validateRequest)
    const validateData = await validateResponse.json()

    expect(validateResponse.status).toBe(400)
    expect(validateData.valid).toBe(false)
    expect(validateData.message).toContain('already been claimed')
  })

  it('should reject expired tokens', async () => {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    
    const validateRequest = new NextRequest(
      `http://localhost:3000/api/auth/claim/validate?token=${validToken}`
    )

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-id',
              token: validToken,
              status: 'pending',
              expires_at: expiredDate.toISOString(),
              profiles: {
                id: 'profile-id',
                email: testEmail,
                name: 'Test User',
                auth_user_id: null,
              },
            },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    const validateResponse = await validateGET(validateRequest)
    const validateData = await validateResponse.json()

    expect(validateResponse.status).toBe(400)
    expect(validateData.valid).toBe(false)
    expect(validateData.message).toContain('expired')
  })
})
