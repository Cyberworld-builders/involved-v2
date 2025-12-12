import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import UsersListClient from '../users-list-client'
import { useRouter } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

const mockUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
    created_at: '2024-01-01T00:00:00Z',
    last_login_at: '2024-01-15T00:00:00Z',
    clients: { name: 'Client A' },
    industries: { name: 'Technology' },
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    username: 'janesmith',
    email: 'jane@example.com',
    created_at: '2024-01-02T00:00:00Z',
    last_login_at: null,
    clients: null,
    industries: null,
  },
]

describe('UsersListClient', () => {
  let mockRouter: { refresh: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter = { refresh: vi.fn() }
    vi.mocked(useRouter).mockReturnValue(
      mockRouter as unknown as ReturnType<typeof useRouter>
    )
    
    // Mock window.confirm and window.alert
    global.confirm = vi.fn()
    global.alert = vi.fn()
  })

  it('should render users list with all users', () => {
    render(<UsersListClient users={mockUsers} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('should display user client and industry information', () => {
    render(<UsersListClient users={mockUsers} />)

    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('No client')).toBeInTheDocument()
  })

  it('should display formatted dates', () => {
    render(<UsersListClient users={mockUsers} />)

    // Check created dates are rendered
    const expectedCreatedDates = mockUsers.map((u) =>
      new Date(u.created_at).toLocaleDateString(undefined, { timeZone: 'UTC' })
    )
    for (const date of expectedCreatedDates) {
      expect(screen.getByText(date)).toBeInTheDocument()
    }
    
    // Check last login displays "Never" for user without login
    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('should have Edit and Delete buttons for each user', () => {
    render(<UsersListClient users={mockUsers} />)

    const editLinks = screen.getAllByText('Edit')
    const deleteButtons = screen.getAllByText('Delete')

    expect(editLinks).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
  })

  it('should prompt for confirmation before deleting', async () => {
    vi.mocked(confirm).mockReturnValue(false) // User cancels
    
    render(<UsersListClient users={mockUsers} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete user "John Doe"? This action cannot be undone.'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should successfully delete user when confirmed', async () => {
    vi.mocked(confirm).mockReturnValue(true) // User confirms
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'User deleted successfully' }),
    } as Response)

    render(<UsersListClient users={mockUsers} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/users/user-1', {
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
                json: async () => ({ message: 'User deleted successfully' }),
              } as Response),
            100
          )
        )
    )

    render(<UsersListClient users={mockUsers} />)

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
                json: async () => ({ message: 'User deleted successfully' }),
              } as Response),
            100
          )
        )
    )

    render(<UsersListClient users={mockUsers} />)

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
      json: async () => ({ error: 'Failed to delete user' }),
    } as Response)

    render(<UsersListClient users={mockUsers} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/users/user-1', {
        method: 'DELETE',
      })
      expect(alert).toHaveBeenCalledWith('Failed to delete user')
      expect(mockRouter.refresh).not.toHaveBeenCalled()
    })
  })

  it('should handle network error during deletion', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<UsersListClient users={mockUsers} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/users/user-1', {
        method: 'DELETE',
      })
      expect(alert).toHaveBeenCalledWith('Network error')
      expect(mockRouter.refresh).not.toHaveBeenCalled()
    })
  })

  it('should render table headers correctly', () => {
    render(<UsersListClient users={mockUsers} />)

    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Industry')).toBeInTheDocument()
    expect(screen.getByText('Last Login')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('should render user avatars with first letter of name', () => {
    render(<UsersListClient users={mockUsers} />)

    // Both users have names starting with "J" so we get multiple elements
    const avatarLetters = screen.getAllByText('J')
    expect(avatarLetters.length).toBeGreaterThanOrEqual(2)
  })

  it('should have correct Edit links', () => {
    render(<UsersListClient users={mockUsers} />)

    const editLinks = screen.getAllByText('Edit')
    expect(editLinks[0].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/users/user-1/edit'
    )
    expect(editLinks[1].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/users/user-2/edit'
    )
  })

  it('should render user name as clickable link', () => {
    render(<UsersListClient users={mockUsers} />)

    const nameLink = screen.getByText('John Doe').closest('a')
    expect(nameLink).toHaveAttribute('href', '/dashboard/users/user-1')
  })

  it('should not delete if user cancels confirmation', async () => {
    vi.mocked(confirm).mockReturnValue(false)

    render(<UsersListClient users={mockUsers} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(confirm).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(mockRouter.refresh).not.toHaveBeenCalled()
  })
})
