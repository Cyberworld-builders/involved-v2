import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import IndustryPage from '../page'
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
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
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

const mockIndustry = {
  id: 'industry-1',
  name: 'Technology',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

describe('IndustryPage', () => {
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

    const params = Promise.resolve({ id: 'industry-1' })

    await expect(IndustryPage({ params })).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('should display industry not found if industry does not exist', async () => {
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
    const result = await IndustryPage({ params })

    const { container } = render(result as React.ReactElement)

    expect(screen.getByText('Industry Not Found')).toBeInTheDocument()
    expect(screen.getByText("The industry you're looking for doesn't exist.")).toBeInTheDocument()
    expect(screen.getByText('Back to Industries')).toBeInTheDocument()
  })

  it('should display industry details when industry exists', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockIndustry,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'industry-1' })
    const result = await IndustryPage({ params })

    const { container } = render(result as React.ReactElement)

    expect(screen.getAllByText('Technology').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Industry details and information')).toBeInTheDocument()
    expect(screen.getByText('Industry Information')).toBeInTheDocument()
  })

  it('should display formatted created date', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockIndustry,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'industry-1' })
    const result = await IndustryPage({ params })

    render(result as React.ReactElement)

    const expectedCreated = new Date(mockIndustry.created_at).toLocaleDateString()
    expect(screen.getByText(expectedCreated)).toBeInTheDocument()
  })

  it('should display formatted updated date', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockIndustry,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'industry-1' })
    const result = await IndustryPage({ params })

    render(result as React.ReactElement)

    const expectedUpdated = new Date(mockIndustry.updated_at).toLocaleDateString()
    expect(screen.getByText(expectedUpdated)).toBeInTheDocument()
  })

  it('should have a link to edit the industry', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockIndustry,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'industry-1' })
    const result = await IndustryPage({ params })

    render(result as React.ReactElement)

    const editLink = screen.getByText('Edit Industry').closest('a')
    expect(editLink).toHaveAttribute('href', '/dashboard/industries/industry-1/edit')
  })

  it('should have a link to go back to industries list', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockIndustry,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'industry-1' })
    const result = await IndustryPage({ params })

    render(result as React.ReactElement)

    const backLinks = screen.getAllByText('Back to Industries')
    expect(backLinks.length).toBeGreaterThan(0)
    const backLink = backLinks[0].closest('a')
    expect(backLink).toHaveAttribute('href', '/dashboard/industries')
  })

  it('should query the correct industry by id', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const eqMock = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockIndustry,
        error: null,
      }),
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: eqMock,
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'industry-123' })
    await IndustryPage({ params })

    expect(mockFrom).toHaveBeenCalledWith('industries')
    expect(eqMock).toHaveBeenCalledWith('id', 'industry-123')
  })

  it('should display all industry information fields', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockIndustry,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'industry-1' })
    const result = await IndustryPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Last Updated')).toBeInTheDocument()
  })

  it('should display not found page when error occurs', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'invalid-id' })
    const result = await IndustryPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Industry Not Found')).toBeInTheDocument()
  })
})
