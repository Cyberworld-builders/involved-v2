import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import IndustriesListClient from '../industries-list-client'
import { useRouter } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

const mockIndustries = [
  {
    id: 'industry-1',
    name: 'Technology',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'industry-2',
    name: 'Healthcare',
    created_at: '2024-01-02T00:00:00Z',
  },
]

describe('IndustriesListClient', () => {
  let mockRouter: { refresh: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter = { refresh: vi.fn() }
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>)
    
    // Mock window.confirm and window.alert
    global.confirm = vi.fn()
    global.alert = vi.fn()
  })

  it('should render industries list with all industries', () => {
    render(<IndustriesListClient industries={mockIndustries} />)

    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('Healthcare')).toBeInTheDocument()
  })

  it('should display formatted dates', () => {
    render(<IndustriesListClient industries={mockIndustries} />)

    // Check created dates are rendered
    const expectedCreatedDates = mockIndustries.map((i) =>
      new Date(i.created_at).toLocaleDateString()
    )
    for (const date of expectedCreatedDates) {
      expect(screen.getByText(date)).toBeInTheDocument()
    }
  })

  it('should have Edit and Delete buttons for each industry', () => {
    render(<IndustriesListClient industries={mockIndustries} />)

    const editLinks = screen.getAllByText('Edit')
    const deleteButtons = screen.getAllByText('Delete')

    expect(editLinks).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
  })

  it('should display empty state when no industries exist', () => {
    render(<IndustriesListClient industries={[]} />)

    expect(screen.getByText('No industries found')).toBeInTheDocument()
    expect(screen.getByText('Get started by creating your first industry.')).toBeInTheDocument()
    expect(screen.getByText('Add Industry')).toBeInTheDocument()
  })

  it('should prompt for confirmation before deleting', async () => {
    vi.mocked(confirm).mockReturnValue(false) // User cancels
    
    render(<IndustriesListClient industries={mockIndustries} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete industry "Technology"? This action cannot be undone.'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should successfully delete industry when confirmed', async () => {
    vi.mocked(confirm).mockReturnValue(true) // User confirms
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Industry deleted successfully' }),
    } as Response)

    render(<IndustriesListClient industries={mockIndustries} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/industries/industry-1', {
        method: 'DELETE',
      })
      expect(mockRouter.refresh).toHaveBeenCalled()
    })
  })

  it('should show loading state during deletion', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ message: 'Industry deleted successfully' }),
              } as Response),
            100
          )
        )
    )

    render(<IndustriesListClient industries={mockIndustries} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })

    await waitFor(
      () => {
        expect(screen.queryByText('Deleting...')).not.toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('should disable delete button during deletion', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ message: 'Industry deleted successfully' }),
              } as Response),
            100
          )
        )
    )

    render(<IndustriesListClient industries={mockIndustries} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      const deletingButton = screen.getByText('Deleting...')
      expect(deletingButton).toBeDisabled()
    })
  })

  it('should handle delete error gracefully', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to delete industry' }),
    } as Response)

    render(<IndustriesListClient industries={mockIndustries} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/industries/industry-1', {
        method: 'DELETE',
      })
      expect(alert).toHaveBeenCalledWith('Failed to delete industry')
      expect(mockRouter.refresh).not.toHaveBeenCalled()
    })
  })

  it('should handle network error gracefully', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<IndustriesListClient industries={mockIndustries} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith('Network error')
      expect(mockRouter.refresh).not.toHaveBeenCalled()
    })
  })

  it('should not delete other industries when one is being deleted', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ message: 'Industry deleted successfully' }),
              } as Response),
            100
          )
        )
    )

    render(<IndustriesListClient industries={mockIndustries} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })

    // Second delete button should still say "Delete"
    const allDeleteButtons = screen.getAllByRole('button', { name: /Delete|Deleting/ })
    const nonDeletingButtons = allDeleteButtons.filter(btn => btn.textContent === 'Delete')
    expect(nonDeletingButtons.length).toBeGreaterThan(0)
  })

  it('should render Edit links with correct href', () => {
    render(<IndustriesListClient industries={mockIndustries} />)

    const editLinks = screen.getAllByText('Edit')
    expect(editLinks[0]).toHaveAttribute('href', '/dashboard/industries/industry-1/edit')
    expect(editLinks[1]).toHaveAttribute('href', '/dashboard/industries/industry-2/edit')
  })
})
