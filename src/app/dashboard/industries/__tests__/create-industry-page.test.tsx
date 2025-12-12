import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CreateIndustryPage from '../create/page'
import { useRouter } from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

vi.mock('@/components/layout/dashboard-layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/forms/industry-form', () => ({
  default: ({ onSubmit, isLoading }: { onSubmit: (data: { name: string }) => void; isLoading?: boolean }) => (
    <div>
      <button disabled={isLoading} onClick={() => onSubmit({ name: 'Technology' })}>
        Submit
      </button>
    </div>
  ),
}))

describe('CreateIndustryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useRouter).mockReturnValue(
      { push: vi.fn() } as unknown as ReturnType<typeof useRouter>
    )

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    global.fetch = vi.fn()
  })

  it('calls POST /api/industries and shows success message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ industry: { id: 'ind-1', name: 'Technology' } }),
    } as Response)

    render(<CreateIndustryPage />)

    fireEvent.click(await screen.findByText('Submit'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/industries', expect.objectContaining({ method: 'POST' }))
    })

    expect(screen.getByText('Industry created successfully!')).toBeInTheDocument()
  })

  it('shows API error message when POST fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Industry name is required' }),
    } as Response)

    render(<CreateIndustryPage />)

    fireEvent.click(await screen.findByText('Submit'))

    await waitFor(() => {
      expect(screen.getByText('Industry name is required')).toBeInTheDocument()
    })
  })
})
