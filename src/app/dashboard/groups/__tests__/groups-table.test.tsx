import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import GroupsTable from '../groups-table'
import { useRouter } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

const mockGroups = [
  {
    id: 'group-1',
    name: 'Engineering Team',
    client_id: 'client-1',
    description: 'Software engineering group',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    clients: { name: 'Acme Corp' },
  },
  {
    id: 'group-2',
    name: 'Marketing Team',
    client_id: 'client-2',
    description: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    clients: { name: 'Tech Inc' },
  },
  {
    id: 'group-3',
    name: 'Sales Team',
    client_id: 'client-3',
    description: 'Sales and customer relations',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    clients: null,
  },
]

describe('GroupsTable', () => {
  let mockRouter: { refresh: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter = { refresh: vi.fn() }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    
    // Mock window.confirm
    global.confirm = vi.fn()
  })

  it('should render groups list with all groups', () => {
    render(<GroupsTable initialGroups={mockGroups} />)

    expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    expect(screen.getByText('Marketing Team')).toBeInTheDocument()
    expect(screen.getByText('Sales Team')).toBeInTheDocument()
  })

  it('should display group client information', () => {
    render(<GroupsTable initialGroups={mockGroups} />)

    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tech Inc').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No client').length).toBeGreaterThan(0)
  })

  it('should display group descriptions or placeholder', () => {
    render(<GroupsTable initialGroups={mockGroups} />)

    expect(screen.getByText('Software engineering group')).toBeInTheDocument()
    expect(screen.getByText('Sales and customer relations')).toBeInTheDocument()
    // The "—" for null description
    expect(screen.getAllByText('—')).toHaveLength(1)
  })

  it('should display formatted dates', () => {
    render(<GroupsTable initialGroups={mockGroups} />)

    // Check created dates are rendered
    expect(screen.getAllByText(/1\/1\/2024|1\/2\/2024|1\/3\/2024/)).toHaveLength(3)
  })

  it('should have Edit and Delete buttons for each group', () => {
    render(<GroupsTable initialGroups={mockGroups} />)

    const editLinks = screen.getAllByText('Edit')
    const deleteButtons = screen.getAllByText('Delete')

    expect(editLinks).toHaveLength(3)
    expect(deleteButtons).toHaveLength(3)
  })

  it('should prompt for confirmation before deleting', async () => {
    vi.mocked(confirm).mockReturnValue(false) // User cancels
    
    render(<GroupsTable initialGroups={mockGroups} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete Engineering Team? This action cannot be undone.'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should successfully delete group when confirmed', async () => {
    vi.mocked(confirm).mockReturnValue(true) // User confirms
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Group deleted successfully' }),
    } as Response)

    render(<GroupsTable initialGroups={mockGroups} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/groups/group-1', {
        method: 'DELETE',
      })
      expect(mockRouter.refresh).toHaveBeenCalled()
    })
  })

  it('should show success message after deletion', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Group deleted successfully' }),
    } as Response)

    render(<GroupsTable initialGroups={mockGroups} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Group deleted successfully')).toBeInTheDocument()
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
                json: async () => ({ message: 'Group deleted successfully' }),
              } as Response),
            100
          )
        )
    )

    render(<GroupsTable initialGroups={mockGroups} />)

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
                json: async () => ({ message: 'Group deleted successfully' }),
              } as Response),
            100
          )
        )
    )

    render(<GroupsTable initialGroups={mockGroups} />)

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
      json: async () => ({ error: 'Failed to delete group' }),
    } as Response)

    render(<GroupsTable initialGroups={mockGroups} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/groups/group-1', {
        method: 'DELETE',
      })
      expect(screen.getByText('Failed to delete group')).toBeInTheDocument()
      expect(mockRouter.refresh).not.toHaveBeenCalled()
    })
  })

  it('should handle network error during deletion', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<GroupsTable initialGroups={mockGroups} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/groups/group-1', {
        method: 'DELETE',
      })
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(mockRouter.refresh).not.toHaveBeenCalled()
    })
  })

  it('should render table headers correctly', () => {
    render(<GroupsTable initialGroups={mockGroups} />)

    expect(screen.getByText('Group')).toBeInTheDocument()
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('should render group avatars with first letter of name', () => {
    render(<GroupsTable initialGroups={mockGroups} />)

    expect(screen.getByText('E')).toBeInTheDocument() // Engineering
    expect(screen.getByText('M')).toBeInTheDocument() // Marketing
    expect(screen.getByText('S')).toBeInTheDocument() // Sales
  })

  it('should have correct Edit links', () => {
    render(<GroupsTable initialGroups={mockGroups} />)

    const editLinks = screen.getAllByText('Edit')
    expect(editLinks[0].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/groups/group-1/edit'
    )
    expect(editLinks[1].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/groups/group-2/edit'
    )
    expect(editLinks[2].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/groups/group-3/edit'
    )
  })

  it('should render group name as clickable link', () => {
    render(<GroupsTable initialGroups={mockGroups} />)

    const nameLink = screen.getByText('Engineering Team').closest('a')
    expect(nameLink).toHaveAttribute('href', '/dashboard/groups/group-1')
  })

  it('should not delete if user cancels confirmation', async () => {
    vi.mocked(confirm).mockReturnValue(false)

    render(<GroupsTable initialGroups={mockGroups} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(confirm).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(mockRouter.refresh).not.toHaveBeenCalled()
  })

  it('should remove deleted group from the list', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Group deleted successfully' }),
    } as Response)

    render(<GroupsTable initialGroups={mockGroups} />)

    expect(screen.getByText('Engineering Team')).toBeInTheDocument()

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('Engineering Team')).not.toBeInTheDocument()
    })

    // Other groups should still be present
    expect(screen.getByText('Marketing Team')).toBeInTheDocument()
    expect(screen.getByText('Sales Team')).toBeInTheDocument()
  })
})
