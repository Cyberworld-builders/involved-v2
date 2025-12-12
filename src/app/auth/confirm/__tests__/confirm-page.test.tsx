import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import ConfirmEmailPage from '../page'

// Mock Supabase client
const mockVerifyOtp = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      verifyOtp: mockVerifyOtp,
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

describe('ConfirmEmailPage', () => {
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
    } as any)
    
    vi.mocked(useSearchParams).mockReturnValue({
      get: mockGet,
    } as any)
  })

  it('should render loading state initially', () => {
    mockGet.mockImplementation((param: string) => {
      if (param === 'token_hash') return 'valid-token-hash'
      if (param === 'type') return 'email'
      return null
    })
    
    mockVerifyOtp.mockImplementation(() => new Promise(() => {})) // Never resolves, stays loading
    
    render(<ConfirmEmailPage />)
    
    expect(screen.getByText('Email Confirmation')).toBeInTheDocument()
    expect(screen.getByText('Confirming your email address...')).toBeInTheDocument()
  })

  it('should show error when token_hash is missing', async () => {
    mockGet.mockImplementation((param: string) => {
      if (param === 'token_hash') return null
      if (param === 'type') return 'email'
      return null
    })

    render(<ConfirmEmailPage />)

    await waitFor(() => {
      expect(screen.getByText('Confirmation failed')).toBeInTheDocument()
      expect(screen.getByText(/Invalid confirmation link/i)).toBeInTheDocument()
    })

    expect(mockVerifyOtp).not.toHaveBeenCalled()
  })

  it('should show error when type is not email', async () => {
    mockGet.mockImplementation((param: string) => {
      if (param === 'token_hash') return 'valid-token-hash'
      if (param === 'type') return 'invalid-type'
      return null
    })

    render(<ConfirmEmailPage />)

    await waitFor(() => {
      expect(screen.getByText('Confirmation failed')).toBeInTheDocument()
      expect(screen.getByText(/Invalid confirmation link/i)).toBeInTheDocument()
    })

    expect(mockVerifyOtp).not.toHaveBeenCalled()
  })

  it('should successfully confirm email with valid token', async () => {
    mockGet.mockImplementation((param: string) => {
      if (param === 'token_hash') return 'valid-token-hash'
      if (param === 'type') return 'email'
      return null
    })

    mockVerifyOtp.mockResolvedValue({ error: null })

    render(<ConfirmEmailPage />)

    await waitFor(() => {
      expect(screen.getByText('Email confirmed successfully')).toBeInTheDocument()
      expect(screen.getByText(/Your email has been confirmed successfully/i)).toBeInTheDocument()
    })

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'valid-token-hash',
      type: 'email',
    })

    // Verify redirect happens after delay
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    }, { timeout: 3000 })
  })

  it('should show error when verification fails', async () => {
    mockGet.mockImplementation((param: string) => {
      if (param === 'token_hash') return 'invalid-token-hash'
      if (param === 'type') return 'email'
      return null
    })

    mockVerifyOtp.mockResolvedValue({
      error: { message: 'Token has expired' },
    })

    render(<ConfirmEmailPage />)

    await waitFor(() => {
      expect(screen.getByText('Confirmation failed')).toBeInTheDocument()
      expect(screen.getByText(/Token has expired/i)).toBeInTheDocument()
    })

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'invalid-token-hash',
      type: 'email',
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should show error when API throws exception', async () => {
    mockGet.mockImplementation((param: string) => {
      if (param === 'token_hash') return 'valid-token-hash'
      if (param === 'type') return 'email'
      return null
    })

    mockVerifyOtp.mockRejectedValue(new Error('Network error'))

    render(<ConfirmEmailPage />)

    await waitFor(() => {
      expect(screen.getByText('Confirmation failed')).toBeInTheDocument()
      expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument()
    })
  })

  it('should render navigation buttons on error', async () => {
    mockGet.mockReturnValue(null)

    render(<ConfirmEmailPage />)

    await waitFor(() => {
      expect(screen.getByText('Back to Sign Up')).toBeInTheDocument()
      expect(screen.getByText('Go to Login')).toBeInTheDocument()
    })
  })

  it('should handle generic error message from Supabase', async () => {
    mockGet.mockImplementation((param: string) => {
      if (param === 'token_hash') return 'invalid-token'
      if (param === 'type') return 'email'
      return null
    })

    mockVerifyOtp.mockResolvedValue({
      error: { message: null },
    })

    render(<ConfirmEmailPage />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to confirm email/i)).toBeInTheDocument()
    })
  })

  it('should display success icon on successful confirmation', async () => {
    mockGet.mockImplementation((param: string) => {
      if (param === 'token_hash') return 'valid-token-hash'
      if (param === 'type') return 'email'
      return null
    })

    mockVerifyOtp.mockResolvedValue({ error: null })

    render(<ConfirmEmailPage />)

    await waitFor(() => {
      const successIcon = screen.getByText(/Your email has been confirmed successfully/i)
      expect(successIcon).toBeInTheDocument()
    })
  })

  it('should display error icon on failed confirmation', async () => {
    mockGet.mockImplementation((param: string) => {
      if (param === 'token_hash') return 'invalid-token-hash'
      if (param === 'type') return 'email'
      return null
    })

    mockVerifyOtp.mockResolvedValue({
      error: { message: 'Invalid token' },
    })

    render(<ConfirmEmailPage />)

    await waitFor(() => {
      const errorMessage = screen.getByText(/Invalid token/i)
      expect(errorMessage).toBeInTheDocument()
    })
  })
})
