import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import BenchmarksListTable from '../benchmarks-list-table'
import { useRouter } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

const mockBenchmarks = [
  {
    id: 'benchmark-1',
    dimension_id: 'dimension-1',
    industry_id: 'industry-1',
    value: 75.5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    dimensions: {
      name: 'Communication',
      code: 'COMM',
      assessment_id: 'assessment-1',
    },
    industries: { name: 'Technology' },
  },
  {
    id: 'benchmark-2',
    dimension_id: 'dimension-2',
    industry_id: 'industry-2',
    value: 82.3,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    dimensions: {
      name: 'Leadership',
      code: 'LEAD',
      assessment_id: 'assessment-1',
    },
    industries: { name: 'Healthcare' },
  },
  {
    id: 'benchmark-3',
    dimension_id: 'dimension-3',
    industry_id: 'industry-3',
    value: 68.9,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    dimensions: {
      name: 'Innovation',
      code: 'INNOV',
      assessment_id: 'assessment-2',
    },
    industries: { name: 'Finance' },
  },
]

describe('BenchmarksListTable', () => {
  let mockRouter: { refresh: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter = { refresh: vi.fn() }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    
    // Mock window.confirm
    global.confirm = vi.fn()
  })

  it('should render benchmarks list with all benchmarks', () => {
    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    expect(screen.getByText('Communication')).toBeInTheDocument()
    expect(screen.getByText('Leadership')).toBeInTheDocument()
    expect(screen.getByText('Innovation')).toBeInTheDocument()
  })

  it('should display dimension codes', () => {
    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    expect(screen.getByText('COMM')).toBeInTheDocument()
    expect(screen.getByText('LEAD')).toBeInTheDocument()
    expect(screen.getByText('INNOV')).toBeInTheDocument()
  })

  it('should display industry information', () => {
    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Healthcare').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Finance').length).toBeGreaterThan(0)
  })

  it('should display benchmark values with proper formatting', () => {
    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    expect(screen.getByText('75.5')).toBeInTheDocument()
    expect(screen.getByText('82.3')).toBeInTheDocument()
    expect(screen.getByText('68.9')).toBeInTheDocument()
  })

  it('should display formatted dates', () => {
    const { container } = render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    // Avoid timezone/locale assumptions; just verify each row renders a non-empty "Updated" cell.
    // (This table always renders the same 5 <td> structure; some are visually hidden via CSS.)
    const updatedCells = container.querySelectorAll('tbody tr td:nth-child(4)')
    expect(updatedCells).toHaveLength(mockBenchmarks.length)
    updatedCells.forEach((cell) => {
      expect(cell.textContent?.trim()).toBeTruthy()
      expect(cell.textContent).not.toBe('—')
    })
  })

  it('should have View, Edit and Delete buttons for each benchmark (legacy check)', () => {
    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    const viewLinks = screen.getAllByText('View')
    const editLinks = screen.getAllByText('Edit')
    const deleteButtons = screen.getAllByText('Delete')

    expect(viewLinks).toHaveLength(3)
    expect(editLinks).toHaveLength(3)
    expect(deleteButtons).toHaveLength(3)
  })

  it('should prompt for confirmation before deleting', async () => {
    vi.mocked(global.confirm).mockReturnValue(false)

    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Communication')
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should delete benchmark when confirmed', async () => {
    vi.mocked(global.confirm).mockReturnValue(true)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Benchmark deleted successfully' }),
    } as Response)

    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/benchmarks/benchmark-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Benchmark deleted successfully')).toBeInTheDocument()
    })

    expect(mockRouter.refresh).toHaveBeenCalled()
  })

  it('should handle delete errors', async () => {
    vi.mocked(global.confirm).mockReturnValue(true)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Delete failed' }),
    } as Response)

    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument()
    })
  })

  it('should disable delete button while deleting', async () => {
    vi.mocked(global.confirm).mockReturnValue(true)
    vi.mocked(global.fetch).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ message: 'Success' }),
      } as Response), 100))
    )

    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })
  })

  it('should render with empty benchmarks array', () => {
    const { container } = render(<BenchmarksListTable initialBenchmarks={[]} />)
    
    // Should render table structure but with no rows
    expect(container.querySelector('table')).toBeInTheDocument()
    expect(container.querySelector('tbody')?.children.length).toBe(0)
  })

  it('should handle benchmarks with missing relations', () => {
    const incompleteData = [
      {
        id: 'benchmark-4',
        dimension_id: 'dimension-4',
        industry_id: 'industry-4',
        value: 50.0,
        created_at: '2024-01-04T00:00:00Z',
        updated_at: '2024-01-04T00:00:00Z',
        dimensions: null,
        industries: null,
      },
    ]

    render(<BenchmarksListTable initialBenchmarks={incompleteData} />)

    expect(screen.getByText('Unknown Dimension')).toBeInTheDocument()
    expect(screen.getAllByText('Unknown Industry').length).toBeGreaterThan(0)
  })

  it('should have Edit links with correct URLs', () => {
    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    const editLinks = screen.getAllByText('Edit')
    
    expect(editLinks[0].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/benchmarks/manage/assessment-1/industry-1'
    )
    expect(editLinks[1].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/benchmarks/manage/assessment-1/industry-2'
    )
    expect(editLinks[2].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/benchmarks/manage/assessment-2/industry-3'
    )
  })

  it('should have View links with correct URLs', () => {
    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    const viewLinks = screen.getAllByText('View')
    
    expect(viewLinks[0].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/benchmarks/benchmark-1'
    )
    expect(viewLinks[1].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/benchmarks/benchmark-2'
    )
    expect(viewLinks[2].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/benchmarks/benchmark-3'
    )
  })

  it('should have View, Edit and Delete buttons for each benchmark', () => {
    render(<BenchmarksListTable initialBenchmarks={mockBenchmarks} />)

    const viewLinks = screen.getAllByText('View')
    const editLinks = screen.getAllByText('Edit')
    const deleteButtons = screen.getAllByText('Delete')

    expect(viewLinks).toHaveLength(3)
    expect(editLinks).toHaveLength(3)
    expect(deleteButtons).toHaveLength(3)
  })
})
