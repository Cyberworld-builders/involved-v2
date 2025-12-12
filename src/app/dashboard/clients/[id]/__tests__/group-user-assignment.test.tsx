import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('Group-user assignment (ClientGroups)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(
      { refresh: vi.fn() } as unknown as ReturnType<typeof useRouter>
    )

    // ClientGroups uses confirm/alert in some flows
    global.confirm = vi.fn()
    global.alert = vi.fn()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            // loadUsers()
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            // loadGroups() target lookup
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }

      if (table === 'groups') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'group-1',
                    client_id: 'client-1',
                    name: 'Engineering',
                    description: null,
                    target_id: null,
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                    group_members: [
                      {
                        id: 'gm-1',
                        profile_id: 'user-1',
                        role: 'Developer',
                        profiles: {
                          id: 'user-1',
                          name: 'Jane Smith',
                          email: 'jane@example.com',
                          username: 'janesmith',
                        },
                      },
                    ],
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }

      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })
  })

  it('renders group members with role from group_members.role', async () => {
    render(<ClientGroups clientId="client-1" />)

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument()
    })

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('(Developer)')).toBeInTheDocument()
  })
})
