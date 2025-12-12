import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import BenchmarkPage from '../page'
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
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
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

const mockBenchmark = {
  id: 'benchmark-1',
  dimension_id: 'dimension-1',
  industry_id: 'industry-1',
  value: 75.5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  dimensions: {
    id: 'dimension-1',
    name: 'Leadership',
    code: 'LEAD',
    assessment_id: 'assessment-1',
  },
  industries: {
    id: 'industry-1',
    name: 'Technology',
  },
}

describe('BenchmarkPage', () => {
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

    const params = Promise.resolve({ id: 'benchmark-1' })

    await expect(BenchmarkPage({ params })).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('should display benchmark not found if benchmark does not exist', async () => {
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
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Benchmark Not Found')).toBeInTheDocument()
    expect(screen.getByText("The benchmark you're looking for doesn't exist.")).toBeInTheDocument()
    expect(screen.getByText('Back to Benchmarks')).toBeInTheDocument()
  })

  it('should display benchmark details when benchmark exists', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    const leadershipTexts = screen.getAllByText('Leadership')
    expect(leadershipTexts.length).toBeGreaterThan(0)
    expect(screen.getByText('Benchmark details for Technology')).toBeInTheDocument()
    expect(screen.getByText('Benchmark Information')).toBeInTheDocument()
  })

  it('should display benchmark value with percentage', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('75.5%')).toBeInTheDocument()
  })

  it('should display dimension code', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    // Check that dimension code appears (it appears multiple times)
    const leadTexts = screen.getAllByText('LEAD')
    expect(leadTexts.length).toBeGreaterThan(0)
  })

  it('should display industry name', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    // "Technology" appears multiple times on the page
    const technologyTexts = screen.getAllByText('Technology')
    expect(technologyTexts.length).toBeGreaterThan(0)
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
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    // Check that Created label exists
    expect(screen.getByText('Created')).toBeInTheDocument()
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
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    // Check that Last Updated label exists
    expect(screen.getByText('Last Updated')).toBeInTheDocument()
  })

  it('should have a link to edit the benchmark', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    const editLink = screen.getByText('Edit Benchmark').closest('a')
    expect(editLink).toHaveAttribute('href', '/dashboard/benchmarks/assessment-1/industry-1')
  })

  it('should have a link to go back to benchmarks list', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    const backLinks = screen.getAllByText('Back to List')
    expect(backLinks.length).toBeGreaterThan(0)
    const backLink = backLinks[0].closest('a')
    expect(backLink).toHaveAttribute('href', '/dashboard/benchmarks/list')
  })

  it('should query the correct benchmark by id', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const eqMock = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockBenchmark,
        error: null,
      }),
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: eqMock,
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-123' })
    await BenchmarkPage({ params })

    expect(mockFrom).toHaveBeenCalledWith('benchmarks')
    expect(eqMock).toHaveBeenCalledWith('id', 'benchmark-123')
  })

  it('should display all benchmark information fields', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Benchmark Value')).toBeInTheDocument()
    expect(screen.getByText('Dimension')).toBeInTheDocument()
    expect(screen.getByText('Dimension Code')).toBeInTheDocument()
    expect(screen.getByText('Industry')).toBeInTheDocument()
  })

  it('should display metadata fields', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Metadata')).toBeInTheDocument()
    expect(screen.getByText('Benchmark ID')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Last Updated')).toBeInTheDocument()
  })

  it('should display related resources section', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Related Resources')).toBeInTheDocument()
    expect(screen.getByText('View all benchmarks for this industry')).toBeInTheDocument()
    expect(screen.getByText('Manage benchmarks by assessment')).toBeInTheDocument()
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
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Benchmark Not Found')).toBeInTheDocument()
  })

  it('should display breadcrumbs with correct navigation', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBenchmark,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    // Check for breadcrumb links
    const benchmarksLinks = screen.getAllByText('Benchmarks')
    expect(benchmarksLinks.length).toBeGreaterThan(0)
    
    const allBenchmarksLinks = screen.getAllByText('All Benchmarks')
    expect(allBenchmarksLinks.length).toBeGreaterThan(0)
  })

  it('should handle missing dimension data gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const benchmarkWithoutDimension = {
      ...mockBenchmark,
      dimensions: null,
    }

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: benchmarkWithoutDimension,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Unknown Dimension')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('should handle missing industry data gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const benchmarkWithoutIndustry = {
      ...mockBenchmark,
      industries: null,
    }

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: benchmarkWithoutIndustry,
            error: null,
          }),
        }),
      }),
    })
    mockSupabaseClient.from = mockFrom

    const params = Promise.resolve({ id: 'benchmark-1' })
    const result = await BenchmarkPage({ params })

    render(result as React.ReactElement)

    expect(screen.getByText('Benchmark details for Unknown Industry')).toBeInTheDocument()
  })
})
