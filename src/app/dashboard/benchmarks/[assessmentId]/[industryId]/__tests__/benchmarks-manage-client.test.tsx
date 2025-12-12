import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import BenchmarksManageClient from '../benchmarks-manage-client'

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
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
}))

const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('BenchmarksManageClient delete benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    global.confirm = vi.fn()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'assessments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'assessment-1', title: 'Assessment 1' },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'industries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'industry-1', name: 'Technology' },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'dimensions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'dim-1', name: 'Communication', code: 'COMM', assessment_id: 'assessment-1' },
                ],
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'benchmarks') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'bm-1', dimension_id: 'dim-1', industry_id: 'industry-1', value: 75.5 },
                ],
                error: null,
              }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }

      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })
  })

  it('calls DELETE /api/benchmarks/:id when deleting a saved benchmark', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Benchmark deleted successfully' }),
    } as Response)

    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    // Wait for row to render
    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    // Ensure value is present
    const valueInput = screen.getByDisplayValue('75.5')
    expect(valueInput).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/benchmarks/bm-1', { method: 'DELETE' })
    })

    // Value should be cleared
    await waitFor(() => {
      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement
      expect(input.value).toBe('')
    })

    expect(screen.getByText('Benchmark deleted successfully!')).toBeInTheDocument()
  })
})
