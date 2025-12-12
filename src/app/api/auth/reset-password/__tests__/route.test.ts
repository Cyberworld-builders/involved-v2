/**
 * Unit Tests for Password Reset API Route
 * 
 * Tests the password reset request functionality:
 * - Validates email format
 * - Sends password reset email via Supabase
 * - Handles errors appropriately
 * 
 * Related Issues: #51, #52 - Password reset after account claim
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    resetPasswordForEmail: vi.fn(),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}))

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send password reset email for valid email', async () => {
    mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Password reset email sent')
    expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/reset-password'),
      })
    )
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

  it('should handle email service errors gracefully', async () => {
    mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'Email service unavailable' },
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to send reset email')
  })

  it('should send reset email for user who claimed account via invite', async () => {
    // This test verifies that users who claimed their account via invite
    // can successfully request a password reset
    mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    })

    const claimedUserEmail = 'invited-user@example.com'
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: claimedUserEmail }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Password reset email sent')
    expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      claimedUserEmail,
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/reset-password'),
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
    mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    })

    for (const email of validEmails) {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Password reset email sent')
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

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should include redirect URL in password reset request', async () => {
    mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    await POST(request)

    // Verify the redirect URL is included in the request
    expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({
        redirectTo: expect.stringMatching(/\/auth\/reset-password$/),
      })
    )
  })
})
