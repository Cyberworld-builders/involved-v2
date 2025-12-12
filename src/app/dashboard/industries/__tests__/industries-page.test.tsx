import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import IndustriesPage from '../page'
import { redirect, useRouter } from 'next/navigation'
import { mockIndustries } from '@/__tests__/fixtures/industries'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/layout/dashboard-layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
}))

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

describe('IndustriesPage', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://example.com'
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({ refresh: vi.fn() } as any)
  })

  it('redirects to login if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    await expect(IndustriesPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('renders empty state when there are no industries', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    const result = await IndustriesPage()
    render(result as React.ReactElement)

    expect(screen.getByText('No industries found')).toBeInTheDocument()
    expect(screen.getByText('Get started by creating your first industry.')).toBeInTheDocument()
    expect(screen.getAllByText('Add Industry').length).toBeGreaterThan(0)
  })

  it('renders industries list with edit links', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockIndustries,
          error: null,
        }),
      }),
    })

    const result = await IndustriesPage()
    render(result as React.ReactElement)

    // Names
    for (const industry of mockIndustries) {
      expect(screen.getByText(industry.name)).toBeInTheDocument()
    }

    const editLinks = screen.getAllByRole('link', { name: 'Edit' })
    expect(editLinks).toHaveLength(mockIndustries.length)

    // Links should point to industry edit routes
    for (let i = 0; i < mockIndustries.length; i++) {
      expect(editLinks[i]).toHaveAttribute('href', `/dashboard/industries/${mockIndustries[i].id}/edit`)
    }
  })
})
