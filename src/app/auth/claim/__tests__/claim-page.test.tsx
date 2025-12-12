import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import ClaimAccountPage from '../page'

// Mock Next.js navigation
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
  }
})

// Mock fetch
global.fetch = vi.fn()

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
    } as unknown as ReturnType<typeof useSearchParams>)
  })

  it('should render loading state initially', () => {
    mockGet.mockReturnValue('valid-token')
    
    // Mock fetch to never resolve (stay in loading state)
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}))
    
    render(<ClaimAccountPage />)
    
    expect(screen.getByText('Account Claim')).toBeInTheDocument()
    expect(screen.getByText('Validating your invitation...')).toBeInTheDocument()
  })

  it('should show error when token is missing', async () => {
    mockGet.mockReturnValue(null)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid Invitation')).toBeInTheDocument()
      expect(screen.getByText(/Invalid invitation link. No token provided/i)).toBeInTheDocument()
    })
  })

  it('should show error when token validation fails', async () => {
    mockGet.mockReturnValue('invalid-token')
    
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid token' }),
    } as Response)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid Invitation')).toBeInTheDocument()
      expect(screen.getByText(/Invalid token/i)).toBeInTheDocument()
    })
  })

  it('should show error when token is expired', async () => {
    mockGet.mockReturnValue('expired-token')
    
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Token has expired' }),
    } as Response)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid Invitation')).toBeInTheDocument()
      expect(screen.getByText(/Token has expired/i)).toBeInTheDocument()
    })
  })

  it('should display claim form when token is valid', async () => {
    mockGet.mockReturnValue('valid-token')
    
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        profile: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      }),
    } as Response)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Claim Your Account')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText(/john@example.com/i)).toBeInTheDocument()
    })
    
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Claim Account/i })).toBeInTheDocument()
  })

  it('should show error when passwords do not match', async () => {
    mockGet.mockReturnValue('valid-token')
    
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        profile: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      }),
    } as Response)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })
    
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Claim Account/i })
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('should show error when password is too short', async () => {
    mockGet.mockReturnValue('valid-token')
    
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        profile: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      }),
    } as Response)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })
    
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Claim Account/i })
    
    fireEvent.change(passwordInput, { target: { value: 'short' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters long/i)).toBeInTheDocument()
    })
  })

  it('should successfully claim account and redirect to dashboard', async () => {
    mockGet.mockReturnValue('valid-token')
    
    // Mock validation response
    const mockFetch = vi.mocked(global.fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          profile: {
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
          },
        }),
      } as Response)
      // Mock claim response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Account claimed successfully',
          session: { access_token: 'token' },
        }),
      } as Response)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })
    
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Claim Account/i })
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Account claimed successfully! Redirecting to dashboard.../i)).toBeInTheDocument()
    })
    
    // Wait for redirect
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    }, { timeout: 3000 })
  })

  it('should show error when claim fails', async () => {
    mockGet.mockReturnValue('valid-token')
    
    const mockFetch = vi.mocked(global.fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          profile: {
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Failed to create user account',
        }),
      } as Response)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })
    
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: /Claim Account/i })
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to create user account/i)).toBeInTheDocument()
    })
    
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should handle network errors gracefully', async () => {
    mockGet.mockReturnValue('valid-token')
    
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to validate invitation. Please try again./i)).toBeInTheDocument()
    })
  })

  it('should disable form inputs while submitting', async () => {
    mockGet.mockReturnValue('valid-token')
    
    const mockFetch = vi.mocked(global.fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          profile: {
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
          },
        }),
      } as Response)
      .mockImplementationOnce(() => new Promise(() => {})) // Never resolves
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })
    
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    const confirmPasswordInput = screen.getByLabelText('Confirm Password') as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /Claim Account/i }) as HTMLButtonElement
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(passwordInput.disabled).toBe(true)
      expect(confirmPasswordInput.disabled).toBe(true)
      expect(submitButton.disabled).toBe(true)
      expect(screen.getByText('Claiming Account...')).toBeInTheDocument()
    })
  })

  it('should render navigation links on error page', async () => {
    mockGet.mockReturnValue(null)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Go to Login')).toBeInTheDocument()
      expect(screen.getByText('Back to Home')).toBeInTheDocument()
    })
  })

  it('should show error when invite is already used', async () => {
    mockGet.mockReturnValue('used-token')
    
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'This invite has already been used' }),
    } as Response)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/This invite has already been used/i)).toBeInTheDocument()
    })
  })

  it('should show error when invite is revoked', async () => {
    mockGet.mockReturnValue('revoked-token')
    
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'This invite has been revoked' }),
    } as Response)
    
    render(<ClaimAccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/This invite has been revoked/i)).toBeInTheDocument()
    })
  })
})
