import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'
import * as supabaseServer from '@/lib/supabase/server'
import * as supabaseAdmin from '@/lib/supabase/admin'

// Mock modules
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/admin')

describe('POST /api/auth/update-password', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabaseClient: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAdminClient: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
        updateUser: vi.fn(),
      },
    }
    
    mockAdminClient = {
      auth: {
        signInWithPassword: vi.fn(),
      },
    }
    
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabaseClient)
    vi.mocked(supabaseAdmin.createAdminClient).mockReturnValue(mockAdminClient)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return error when current password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: 'NewPassword123!' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Current password is required')
  })

  it('should return error when new password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'OldPassword123!' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('New password is required')
  })

  it('should return error when new password is too short', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword: 'OldPassword123!',
        newPassword: 'short',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('New password must be at least 8 characters long')
  })

  it('should return error when new password is same as current password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword: 'Password123!',
        newPassword: 'Password123!',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('New password must be different from current password')
  })

  it('should return error when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(401)
    expect(data.error).toBe('Not authenticated')
  })

  it('should return error when current password is incorrect', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    })
    
    mockAdminClient.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Current password is incorrect')
  })

  it('should successfully update password when all validations pass', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    })
    
    mockAdminClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
          refresh_token: 'refresh',
        },
      },
      error: null,
    })
    
    mockSupabaseClient.auth.updateUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Password updated successfully')
    expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
      password: 'NewPassword123!',
    })
  })

  it('should return error when password update fails', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    })
    
    mockAdminClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
          refresh_token: 'refresh',
        },
      },
      error: null,
    })
    
    mockSupabaseClient.auth.updateUser.mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update password')
  })

  it('should validate password is a string type', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword: 123,
        newPassword: 'NewPassword123!',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Current password is required')
  })

  it('should handle empty string passwords', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword: '',
        newPassword: 'NewPassword123!',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Current password is required')
  })

  it('should handle exactly 8 character passwords', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    })
    
    mockAdminClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
          refresh_token: 'refresh',
        },
      },
      error: null,
    })
    
    mockSupabaseClient.auth.updateUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    })
    
    const request = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ 
        currentPassword: 'OldPass1',
        newPassword: 'NewPass1',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
