import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import ClaimAccountPage from '../page'

// Mock fetch
global.fetch = vi.fn()

// Mock Supabase client
const mockSignInWithPassword = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

// Mock Next.js navigation
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
  }
})

describe('ClaimAccountPage', () => {
  const mockPush = vi.fn()
  const mockGet = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as ReturnType<typeof useRouter>)
    
    vi.mocked(useSearchParams).mockReturnValue({
      get: mockGet,
    } as ReturnType<typeof useSearchParams>)
  })

  it('should render loading state initially', () => {
    mockGet.mockReturnValue('a'.repeat(64))
    
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<ClaimAccountPage />)
    
    expect(screen.getByText('Claim Your Account')).toBeInTheDocument()
    expect(screen.getByText('Validating your invite...')).toBeInTheDocument()
  })

  it('should show error when token is missing', async () => {
    mockGet.mockReturnValue(null)

    render(<ClaimAccountPage />)

    await waitFor(() => {
      expect(screen.getByText('Unable to claim account')).toBeInTheDocument()
      expect(screen.getByText(/Invalid or missing invite link/i)).toBeInTheDocument()
    })
  })

  it('should redirect to dashboard after successful claim', async () => {
    const validToken = 'a'.repeat(64)
    mockGet.mockReturnValue(validToken)

    // Mock token validation
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: true,
        email: 'test@example.com',
        name: 'Test User',
      }),
    } as Response)

    render(<ClaimAccountPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    // Mock account claim
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Account claimed successfully',
      }),
    } as Response)

    // Mock sign in
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Claim Account/i })

    fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: validToken,
          password: 'Password123!',
        }),
      })
    })

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/Account claimed successfully.*Redirecting to dashboard/i)).toBeInTheDocument()
    })

    // Wait for redirect
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    }, { timeout: 3000 })
  })
})
