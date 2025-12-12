import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import GroupPage from '../page'
import { redirect } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// Mock dashboard layout
vi.mock('@/components/layout/dashboard-layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock UI components
type ButtonProps = React.ComponentPropsWithoutRef<'button'>
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ButtonProps) => <button {...props}>{children}</button>,
}))

type DivProps = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: DivProps) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: DivProps) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: DivProps) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: HeadingProps) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

const mockGroup = {
  id: 'group-1',
  name: 'Engineering Team',
  description: 'Software development team',
  client_id: 'client-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  clients: {
    id: 'client-1',
    name: 'Tech Corp',
  },
  group_members: [
    {
      id: 'member-1',
      profile_id: 'user-1',
      role: 'Developer',
      profiles: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
      },
    },
    {
      id: 'member-2',
      profile_id: 'user-2',
      role: 'Manager',
      profiles: {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        username: 'janesmith',
      },
    },
  ],
}

describe('GroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect to login if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    const params = Promise.resolve({ id: 'group-1' })

    await expect(GroupPage({ params })).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('should display group not found if group does not exist', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'nonexistent' })
    const result = await GroupPage({ params })

    const { container } = render(result as React.ReactElement)

    expect(screen.getByText('Group Not Found')).toBeInTheDocument()
    expect(screen.getByText("The group you're looking for doesn't exist.")).toBeInTheDocument()
    expect(screen.getByText('Back to Clients')).toBeInTheDocument()
  })

  it('should display group details when group exists', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockGroup,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    const { container } = render(result as React.ReactElement)

    expect(screen.getAllByText('Engineering Team').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Group details and members')).toBeInTheDocument()
    expect(screen.getByText('Software development team')).toBeInTheDocument()
    expect(screen.getByText('Tech Corp')).toBeInTheDocument()
  })

  it('should display group members', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockGroup,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Role: Developer')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Role: Manager')).toBeInTheDocument()
  })

  it('should display member count correctly', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockGroup,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('2 member(s)')).toBeInTheDocument()
  })

  it('should display client information unavailable when client is null', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const groupWithoutClient = {
      ...mockGroup,
      clients: null,
    }

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: groupWithoutClient,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Client information unavailable')).toBeInTheDocument()
  })

  it('should display no description message when description is null', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const groupWithoutDescription = {
      ...mockGroup,
      description: null,
    }

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: groupWithoutDescription,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('No description provided')).toBeInTheDocument()
  })

  it('should display message when no members in group', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const groupWithoutMembers = {
      ...mockGroup,
      group_members: [],
    }

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: groupWithoutMembers,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('No members in this group yet.')).toBeInTheDocument()
    expect(screen.getByText('0 member(s)')).toBeInTheDocument()
  })

  it('should have a link to view the client', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockGroup,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    render(result as React.ReactElement)

    const viewClientLink = screen.getByText('View Client').closest('a')
    expect(viewClientLink).toHaveAttribute('href', '/dashboard/clients/client-1')
  })

  it('should have links to view member profiles', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockGroup,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    render(result as React.ReactElement)

    const viewProfileButtons = screen.getAllByText('View Profile')
    expect(viewProfileButtons).toHaveLength(2)

    expect(viewProfileButtons[0].closest('a')).toHaveAttribute('href', '/dashboard/users/user-1')
    expect(viewProfileButtons[1].closest('a')).toHaveAttribute('href', '/dashboard/users/user-2')
  })

  it('should display formatted dates', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockGroup,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    render(result as React.ReactElement)

    const expectedCreated = new Date(mockGroup.created_at).toLocaleDateString(undefined, { timeZone: 'UTC' })
    const expectedUpdated = new Date(mockGroup.updated_at).toLocaleDateString(undefined, { timeZone: 'UTC' })

    expect(screen.getByText(expectedCreated)).toBeInTheDocument()
    expect(screen.getByText(expectedUpdated)).toBeInTheDocument()
  })

  it('should handle members without profile', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const groupWithMemberWithoutProfile = {
      ...mockGroup,
      group_members: [
        {
          id: 'member-1',
          profile_id: 'user-1',
          role: null,
          profiles: null,
        },
      ],
    }

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: groupWithMemberWithoutProfile,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'group-1' })
    const result = await GroupPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Name not available')).toBeInTheDocument()
    expect(screen.queryByText(/Role:/)).not.toBeInTheDocument()
  })
})
