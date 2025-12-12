import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ClientGroups from '../client-groups'
import { useRouter } from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

const mockGroups = [
  {
    id: 'group-1',
    client_id: 'client-1',
    name: 'Group One',
    description: null,
    target_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    group_members: [],
  },
]

describe('ClientGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useRouter).mockReturnValue({ refresh: vi.fn() } as any)

    global.confirm = vi.fn()
    global.fetch = vi.fn()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'groups') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockGroups,
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            // loadUsers()
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
            // loadGroups() target lookup
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }
      }

      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })
  })

  it('renders existing groups loaded from Supabase', async () => {
    render(<ClientGroups clientId="client-1" />)

    await waitFor(() => {
      expect(screen.getByText('Group One')).toBeInTheDocument()
    })
  })

  it('does not delete when confirmation is cancelled', async () => {
    vi.mocked(confirm).mockReturnValue(false)

    render(<ClientGroups clientId="client-1" />)

    await waitFor(() => {
      expect(screen.getByText('Group One')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(confirm).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls DELETE /api/groups/:id when confirmed', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Group deleted successfully' }),
    } as Response)

    render(<ClientGroups clientId="client-1" />)

    await waitFor(() => {
      expect(screen.getByText('Group One')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/groups/group-1', {
        method: 'DELETE',
      })
    })

    expect(screen.getByText('Group deleted successfully!')).toBeInTheDocument()
  })

  it('shows API error message when delete fails', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to delete group' }),
    } as Response)

    render(<ClientGroups clientId="client-1" />)

    await waitFor(() => {
      expect(screen.getByText('Group One')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to delete group')).toBeInTheDocument()
    })
  })
})
