import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import EditIndustryPage from '../[id]/edit/page'
import { useRouter, useParams } from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}))

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

vi.mock('@/components/layout/dashboard-layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/forms/industry-form', () => ({
  default: ({ 
    onSubmit, 
    isLoading, 
    initialData 
  }: { 
    onSubmit: (data: { name: string }) => void
    isLoading?: boolean
    initialData?: { name: string }
  }) => (
    <div>
      <div>Initial: {initialData?.name || 'No data'}</div>
      <button disabled={isLoading} onClick={() => onSubmit({ name: 'Updated Technology' })}>
        Submit
      </button>
    </div>
  ),
}))

describe('EditIndustryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as any)
    vi.mocked(useParams).mockReturnValue({ id: 'industry-123' })

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    // Mock Supabase query chain for fetching industry
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'industry-123', name: 'Technology', created_at: '2024-01-01', updated_at: '2024-01-01' },
            error: null,
          }),
        }),
      }),
    })

    global.fetch = vi.fn()
  })

  it('should load existing industry data and display in form', async () => {
    render(<EditIndustryPage />)

    await waitFor(() => {
      expect(screen.getByText('Initial: Technology')).toBeInTheDocument()
    })
  })

  it('should call PATCH /api/industries/[id] and show success message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ industry: { id: 'industry-123', name: 'Updated Technology' } }),
    } as Response)

    render(<EditIndustryPage />)

    await waitFor(() => {
      expect(screen.getByText('Initial: Technology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/industries/industry-123',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Updated Technology' }),
        })
      )
    })

    expect(screen.getByText('Industry updated successfully!')).toBeInTheDocument()
  })

  it('should show API error message when PATCH fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Industry name cannot be empty' }),
    } as Response)

    render(<EditIndustryPage />)

    await waitFor(() => {
      expect(screen.getByText('Initial: Technology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      expect(screen.getByText('Industry name cannot be empty')).toBeInTheDocument()
    })
  })

  it('should redirect to industries list after successful update', async () => {
    const mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ industry: { id: 'industry-123', name: 'Updated Technology' } }),
    } as Response)

    render(<EditIndustryPage />)

    await waitFor(() => {
      expect(screen.getByText('Initial: Technology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      expect(screen.getByText('Industry updated successfully!')).toBeInTheDocument()
    })

    // Wait for the timeout redirect
    await new Promise(resolve => setTimeout(resolve, 2100))

    expect(mockPush).toHaveBeenCalledWith('/dashboard/industries')
  })

  it('should handle network errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<EditIndustryPage />)

    await waitFor(() => {
      expect(screen.getByText('Initial: Technology')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should show error message when industry fails to load', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    })

    render(<EditIndustryPage />)

    await waitFor(() => {
      expect(screen.getByText('Industry not found')).toBeInTheDocument()
    })
  })

  it('should redirect to login if user is not authenticated', async () => {
    const mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    render(<EditIndustryPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })
  })

  it('should show loading state while checking authentication', () => {
    mockSupabase.auth.getUser.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<EditIndustryPage />)

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
  })

  it('should show loading state while fetching industry', () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(
            () => new Promise(resolve => setTimeout(resolve, 1000))
          ),
        }),
      }),
    })

    render(<EditIndustryPage />)

    waitFor(() => {
      expect(screen.getByText('Loading industry...')).toBeInTheDocument()
    })
  })
})
