/**
 * Unit Tests for Password Reset API Route
 * 
 * Tests the password reset request functionality:
 * - Validates email format
 * - Generates password reset link via Supabase Admin API
 * - Sends password reset email via our email service
 * - Handles errors appropriately
 * 
 * Related Issues: #51, #52 - Password reset after account claim
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

const mockGenerateLink = vi.fn()
const mockAdminClient = {
  auth: {
    admin: {
      generateLink: mockGenerateLink,
    },
  },
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

const mockSendEmail = vi.fn()
vi.mock('@/lib/services/email-service', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send password reset email for valid email', async () => {
    mockGenerateLink.mockResolvedValue({
      data: {
        properties: {
          action_link: 'http://localhost:3000/auth/reset-password#access_token=abc&refresh_token=def&type=recovery',
        },
      },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('If an account exists with this email, a password reset link has been sent.')
    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recovery',
        email: 'user@example.com',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password'),
        }),
      })
    )
    expect(mockSendEmail).toHaveBeenCalled()
  })

  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email is required')
  })

  it('should return 400 if email format is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid email format')
  })

  it('should return 200 even if email sending fails (no user enumeration)', async () => {
    mockGenerateLink.mockResolvedValue({
      data: {
        properties: {
          action_link: 'http://localhost:3000/auth/reset-password#access_token=abc&refresh_token=def&type=recovery',
        },
      },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ success: false, error: 'Email service unavailable' })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('If an account exists with this email, a password reset link has been sent.')
  })

  it('should send reset email for user who claimed account via invite', async () => {
    // This test verifies that users who claimed their account via invite
    // can successfully request a password reset
    mockGenerateLink.mockResolvedValue({
      data: {
        properties: {
          action_link: 'http://localhost:3000/auth/reset-password#access_token=abc&refresh_token=def&type=recovery',
        },
      },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' })

    const claimedUserEmail = 'invited-user@example.com'
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: claimedUserEmail }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('If an account exists with this email, a password reset link has been sent.')
    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recovery',
        email: claimedUserEmail,
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password'),
        }),
      })
    )
  })

  it('should validate various email formats correctly', async () => {
    const validEmails = [
      'user@example.com',
      'test.user@company.co.uk',
      'firstname.lastname@subdomain.domain.com',
      'user+tag@example.com',
    ]

    // Mock setup once for all iterations
    mockGenerateLink.mockResolvedValue({
      data: {
        properties: {
          action_link: 'http://localhost:3000/auth/reset-password#access_token=abc&refresh_token=def&type=recovery',
        },
      },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' })

    for (const email of validEmails) {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('If an account exists with this email, a password reset link has been sent.')
    }
  })

  it('should reject invalid email formats', async () => {
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@',
      'user@.com',
      'user',
      'user@domain',
    ]

    for (const email of invalidEmails) {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    }
  })

  it('should handle malformed JSON request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: 'invalid-json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON body')
  })

  it('should include redirect URL in password reset request', async () => {
    mockGenerateLink.mockResolvedValue({
      data: {
        properties: {
          action_link: 'http://localhost:3000/auth/reset-password#access_token=abc&refresh_token=def&type=recovery',
        },
      },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'test-id' })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    await POST(request)

    // Verify the redirect URL is included in the request
    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: expect.stringMatching(/\/auth\/reset-password$/),
        }),
      })
    )
  })
})
