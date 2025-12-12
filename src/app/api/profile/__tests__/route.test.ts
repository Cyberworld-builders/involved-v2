import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '../route'
import { NextRequest } from 'next/server'

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/utils/email-validation', () => ({
  isValidEmail: vi.fn((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }),
}))

describe('Profile API Route', () => {
  let mockSupabase: {
    auth: { getUser: ReturnType<typeof vi.fn> }
    from: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
  })

  describe('GET /api/profile', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return user profile successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'profile-123',
        auth_user_id: 'user-123',
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      })

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        single: mockSingle,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.profile).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockEq).toHaveBeenCalledWith('auth_user_id', 'user-123')
    })

    it('should return 404 if profile not found', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        single: mockSingle,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Profile not found')
    })
  })

  describe('PATCH /api/profile', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if name is empty', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: '' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name cannot be empty')
    })

    it('should return 400 if email is invalid', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'invalid-email' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 409 if email is already in use', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      // Mock email check
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { id: 'other-profile', auth_user_id: 'other-user' },
        error: null,
      })

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        single: mockSingle,
      })

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'taken@example.com' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Email is already in use')
    })

    it('should return 409 if username is already taken', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      // Mock username check
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { id: 'other-profile', auth_user_id: 'other-user' },
        error: null,
      })

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        single: mockSingle,
      })

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ username: 'takenuser' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Username is already taken')
    })

    it('should successfully update profile', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const updatedProfile = {
        id: 'profile-123',
        auth_user_id: 'user-123',
        name: 'Updated Name',
        username: 'updateduser',
        email: 'updated@example.com',
        updated_at: new Date().toISOString(),
      }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      // Mock email check (not found - available)
      let mockSelect = vi.fn().mockReturnThis()
      let mockEq = vi.fn().mockReturnThis()
      let mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        single: mockSingle,
      })

      // Mock username check (not found - available)
      mockSelect = vi.fn().mockReturnThis()
      mockEq = vi.fn().mockReturnThis()
      mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        single: mockSingle,
      })

      // Mock update
      const mockUpdate = vi.fn().mockReturnThis()
      mockEq = vi.fn().mockReturnThis()
      mockSelect = vi.fn().mockReturnThis()
      mockSingle = vi.fn().mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
      })

      mockSupabase.from.mockReturnValueOnce({
        update: mockUpdate,
      })
      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        single: mockSingle,
      })

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Name',
          username: 'updateduser',
          email: 'updated@example.com',
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.profile).toEqual(updatedProfile)
    })

    it('should return 400 if no fields to update', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No fields to update')
    })

    it('should trim whitespace from input values', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const updatedProfile = {
        id: 'profile-123',
        auth_user_id: 'user-123',
        name: 'Trimmed Name',
        username: 'trimmeduser',
        email: 'trimmed@example.com',
        updated_at: new Date().toISOString(),
      }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      // Mock checks and update (similar to successful update test)
      // Email check
      let mockSelect = vi.fn().mockReturnThis()
      let mockEq = vi.fn().mockReturnThis()
      let mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        single: mockSingle,
      })

      // Username check
      mockSelect = vi.fn().mockReturnThis()
      mockEq = vi.fn().mockReturnThis()
      mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        single: mockSingle,
      })

      // Update mock
      const mockUpdate = vi.fn().mockReturnThis()
      mockEq = vi.fn().mockReturnThis()
      mockSelect = vi.fn().mockReturnThis()
      mockSingle = vi.fn().mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
      })

      mockSupabase.from.mockReturnValueOnce({
        update: mockUpdate,
      })
      mockUpdate.mockReturnValueOnce({
        eq: mockEq,
      })
      mockEq.mockReturnValueOnce({
        select: mockSelect,
      })
      mockSelect.mockReturnValueOnce({
        single: mockSingle,
      })

      const request = new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: '  Trimmed Name  ',
          username: '  trimmeduser  ',
          email: '  trimmed@example.com  ',
        }),
      })

      const response = await PATCH(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.profile).toBeDefined()
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Trimmed Name',
          username: 'trimmeduser',
          email: 'trimmed@example.com',
        })
      )
    })
  })
})
