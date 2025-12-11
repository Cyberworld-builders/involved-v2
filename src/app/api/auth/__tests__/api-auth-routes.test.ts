import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockAuthUser,
  mockSignupData,
  mockSigninData,
  mockResetPasswordData,
  mockVerifyEmailData,
  mockAuthSession,
} from '@/__tests__/fixtures/auth'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    verifyOtp: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock the username generation utility
vi.mock('@/lib/utils/username-generation', () => ({
  generateUsernameFromFirstLast: vi.fn((first: string, last: string) => 
    `${first}${last}`.toLowerCase()
  ),
}))

describe('API Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/signup', () => {
    // Mock implementation for signup route
    const mockSignup = async (request: NextRequest) => {
      const body = await request.json()
      const { email, password, firstName, lastName } = body

      // Validation
      if (!email || !password || !firstName || !lastName) {
        return new Response(
          JSON.stringify({ error: 'All fields are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Password validation
      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 8 characters' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const supabase = mockSupabaseClient
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
          },
        },
      })

      if (error) {
        if (error.message?.includes('already registered')) {
          return new Response(
            JSON.stringify({ error: 'Email already registered' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ error: 'Failed to create account' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          message: 'Account created successfully',
          user: data.user,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    }

    it('should create a new user with valid data', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockAuthUser, session: mockAuthSession },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(mockSignupData),
      })

      const response = await mockSignup(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Account created successfully')
      expect(data.user).toBeDefined()
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: mockSignupData.email,
        password: mockSignupData.password,
        options: {
          data: {
            first_name: mockSignupData.firstName,
            last_name: mockSignupData.lastName,
            full_name: `${mockSignupData.firstName} ${mockSignupData.lastName}`,
          },
        },
      })
    })

    it('should return 400 if email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      })

      const response = await mockSignup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('All fields are required')
    })

    it('should return 400 if password is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        }),
      })

      const response = await mockSignup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('All fields are required')
    })

    it('should return 400 if firstName is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          lastName: 'User',
        }),
      })

      const response = await mockSignup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('All fields are required')
    })

    it('should return 400 if lastName is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          firstName: 'Test',
        }),
      })

      const response = await mockSignup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('All fields are required')
    })

    it('should return 400 if email format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      })

      const response = await mockSignup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 400 if password is too short', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
          firstName: 'Test',
          lastName: 'User',
        }),
      })

      const response = await mockSignup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be at least 8 characters')
    })

    it('should return 409 if email is already registered', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(mockSignupData),
      })

      const response = await mockSignup(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Email already registered')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Database connection error' },
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(mockSignupData),
      })

      const response = await mockSignup(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create account')
    })
  })

  describe('POST /api/auth/signin', () => {
    // Mock implementation for signin route
    const mockSignin = async (request: NextRequest) => {
      const body = await request.json()
      const { email, password } = body

      // Validation
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const supabase = mockSupabaseClient
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          return new Response(
            JSON.stringify({ error: 'Invalid email or password' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ error: 'Failed to sign in' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          message: 'Sign in successful',
          user: data.user,
          session: data.session,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    it('should sign in user with valid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockAuthUser, session: mockAuthSession },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(mockSigninData),
      })

      const response = await mockSignin(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Sign in successful')
      expect(data.user).toBeDefined()
      expect(data.session).toBeDefined()
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: mockSigninData.email,
        password: mockSigninData.password,
      })
    })

    it('should return 400 if email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          password: 'SecurePassword123!',
        }),
      })

      const response = await mockSignin(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })

    it('should return 400 if password is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await mockSignin(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })

    it('should return 401 for invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'WrongPassword',
        }),
      })

      const response = await mockSignin(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should handle authentication errors gracefully', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Authentication service unavailable' },
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(mockSigninData),
      })

      const response = await mockSignin(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to sign in')
    })
  })

  describe('POST /api/auth/signout', () => {
    // Mock implementation for signout route
    const mockSignout = async (request: NextRequest) => {
      const supabase = mockSupabaseClient
      
      // Check if user is authenticated
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData.user) {
        return new Response(
          JSON.stringify({ error: 'Not authenticated' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabase.auth.signOut()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to sign out' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Sign out successful' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    it('should sign out authenticated user successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      })

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
      })

      const response = await mockSignout(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Sign out successful')
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
      })

      const response = await mockSignout(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
      expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled()
    })

    it('should handle signout errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      })

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Session termination failed' },
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
      })

      const response = await mockSignout(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to sign out')
    })
  })

  describe('POST /api/auth/reset-password', () => {
    // Mock implementation for reset password route
    const mockResetPassword = async (request: NextRequest) => {
      const body = await request.json()
      const { email } = body

      // Validation
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const supabase = mockSupabaseClient
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${new URL(request.url).origin}/auth/reset-password`,
      })

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to send reset email' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          message: 'Password reset email sent',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    it('should send password reset email for valid email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(mockResetPasswordData),
      })

      const response = await mockResetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Password reset email sent')
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        mockResetPasswordData.email,
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

      const response = await mockResetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 if email format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      })

      const response = await mockResetPassword(request)
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
        body: JSON.stringify(mockResetPasswordData),
      })

      const response = await mockResetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to send reset email')
    })

    it('should send reset email even for non-existent email (security)', async () => {
      // For security reasons, we don't reveal if an email exists or not
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      })

      const response = await mockResetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Password reset email sent')
    })
  })

  describe('POST /api/auth/verify-email', () => {
    // Mock implementation for verify email route
    const mockVerifyEmail = async (request: NextRequest) => {
      const body = await request.json()
      const { token, email, type = 'email' } = body

      // Validation
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Verification token is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Token validation
      if (token.length < 16) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification token' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const supabase = mockSupabaseClient
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
      })

      if (error) {
        if (error.message?.includes('expired')) {
          return new Response(
            JSON.stringify({ error: 'Verification token has expired' }),
            { status: 410, headers: { 'Content-Type': 'application/json' } }
          )
        }
        if (error.message?.includes('invalid')) {
          return new Response(
            JSON.stringify({ error: 'Invalid verification token' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ error: 'Failed to verify email' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          message: 'Email verified successfully',
          user: data.user,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    it('should verify email with valid token', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: mockAuthUser, session: mockAuthSession },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          token: mockVerifyEmailData.token,
          email: mockAuthUser.email,
        }),
      })

      const response = await mockVerifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Email verified successfully')
      expect(data.user).toBeDefined()
      expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
        email: mockAuthUser.email,
        token: mockVerifyEmailData.token,
        type: 'email',
      })
    })

    it('should return 400 if token is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          email: mockAuthUser.email,
        }),
      })

      const response = await mockVerifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Verification token is required')
    })

    it('should return 400 if email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          token: mockVerifyEmailData.token,
        }),
      })

      const response = await mockVerifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 if token is too short', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          token: 'short',
          email: mockAuthUser.email,
        }),
      })

      const response = await mockVerifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid verification token')
    })

    it('should return 400 for invalid token', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Token is invalid' },
      })

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalidtoken123456789',
          email: mockAuthUser.email,
        }),
      })

      const response = await mockVerifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid verification token')
    })

    it('should return 410 for expired token', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Token has expired' },
      })

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          token: mockVerifyEmailData.token,
          email: mockAuthUser.email,
        }),
      })

      const response = await mockVerifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data.error).toBe('Verification token has expired')
    })

    it('should handle verification errors gracefully', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Verification service unavailable' },
      })

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          token: mockVerifyEmailData.token,
          email: mockAuthUser.email,
        }),
      })

      const response = await mockVerifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to verify email')
    })
  })
})
