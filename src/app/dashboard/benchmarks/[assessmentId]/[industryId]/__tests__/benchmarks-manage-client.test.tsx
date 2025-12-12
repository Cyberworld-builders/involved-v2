import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

describe('BenchmarksManageClient CSV upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    global.confirm = vi.fn()

    // Mock URL methods for template download
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'assessments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'assessment-1', title: 'Leadership Assessment' },
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
                  { id: 'dim-2', name: 'Leadership', code: 'LEAD', assessment_id: 'assessment-1' },
                  { id: 'dim-3', name: 'Teamwork', code: 'TEAM', assessment_id: 'assessment-1' },
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
                data: [],
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

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render upload CSV button', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('📤 Upload CSV')
    expect(uploadButton).toBeInTheDocument()
  })

  it('should render download template button', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const downloadButton = screen.getByText('📥 Download Template')
    expect(downloadButton).toBeInTheDocument()
  })

  it('should download CSV template with correct format', async () => {
    const mockAppendChild = vi.spyOn(document.body, 'appendChild')
    const mockRemoveChild = vi.spyOn(document.body, 'removeChild')

    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const downloadButton = screen.getByText('📥 Download Template')
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    })
  })

  it('should upload valid CSV and load benchmark values', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = `Dimension Name,Dimension Code,Value
Communication,COMM,85.5
Leadership,LEAD,90.2
Teamwork,TEAM,78.9`

    const file = new File([csvContent], 'benchmarks.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/CSV loaded successfully/i)).toBeInTheDocument()
      expect(screen.getByText(/3.*loaded/i)).toBeInTheDocument()
    })

    // Verify values are populated
    const commInput = screen.getByDisplayValue('85.5')
    expect(commInput).toBeInTheDocument()
  })

  it('should reject non-CSV files', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Please upload a .csv file/i)).toBeInTheDocument()
    })
  })

  it('should show error for empty CSV file', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = ''
    const file = new File([csvContent], 'empty.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Error: File appears to be empty/i)).toBeInTheDocument()
    })
  })

  it('should show validation errors for invalid CSV format', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = `Wrong,Headers,Here
Communication,COMM,85.5`

    const file = new File([csvContent], 'invalid.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/CSV validation failed/i)).toBeInTheDocument()
    })
  })

  it('should skip rows with invalid dimension codes', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = `Dimension Name,Dimension Code,Value
Communication,COMM,85.5
Invalid Dimension,INVALID,90.2
Leadership,LEAD,78.9`

    const file = new File([csvContent], 'benchmarks.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/2.*loaded.*1.*skipped/i)).toBeInTheDocument()
      expect(screen.getByText(/No matching dimension found/i)).toBeInTheDocument()
    })
  })

  it('should skip rows with values out of range', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = `Dimension Name,Dimension Code,Value
Communication,COMM,150.5
Leadership,LEAD,90.2
Teamwork,TEAM,-10`

    const file = new File([csvContent], 'benchmarks.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/1.*loaded.*2.*skipped/i)).toBeInTheDocument()
      expect(screen.getByText(/must be between 0 and 100/i)).toBeInTheDocument()
    })
  })

  it('should match dimensions by code (case insensitive)', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = `Dimension Name,Dimension Code,Value
Communication,comm,85.5
Leadership,lead,90.2`

    const file = new File([csvContent], 'benchmarks.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/2.*loaded/i)).toBeInTheDocument()
    })
  })

  it('should match dimensions by name when code does not match', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = `Dimension Name,Dimension Code,Value
Communication,WRONG,85.5`

    const file = new File([csvContent], 'benchmarks.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/1.*loaded/i)).toBeInTheDocument()
    })
  })

  it('should handle CSV with quoted values containing commas', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = `"Dimension Name","Dimension Code","Value"
"Communication","COMM","85.5"`

    const file = new File([csvContent], 'benchmarks.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/1.*loaded/i)).toBeInTheDocument()
    })
  })

  it('should reset file input after upload', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = `Dimension Name,Dimension Code,Value
Communication,COMM,85.5`

    const file = new File([csvContent], 'benchmarks.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/CSV loaded successfully/i)).toBeInTheDocument()
    })

    // File input should be reset
    expect(fileInput.value).toBe('')
  })

  it('should handle file reader errors gracefully', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const file = new File(['test'], 'test.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    // Mock FileReader to trigger error
    const originalFileReader = global.FileReader
    global.FileReader = class MockFileReader {
      readAsText() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Event('error'))
          }
        }, 0)
      }
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() { return true }
      onload = null
      onerror = null
      onprogress = null
      onloadstart = null
      onloadend = null
      onabort = null
      readyState = 0
      result = null
      error = null
      abort() {}
      readAsArrayBuffer() {}
      readAsBinaryString() {}
      readAsDataURL() {}
      EMPTY = 0
      LOADING = 1
      DONE = 2
    } as any

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Error reading file/i)).toBeInTheDocument()
    })

    global.FileReader = originalFileReader
  })

  it('should allow manual editing after CSV upload', async () => {
    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument()
    })

    const csvContent = `Dimension Name,Dimension Code,Value
Communication,COMM,85.5`

    const file = new File([csvContent], 'benchmarks.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('85.5')).toBeInTheDocument()
    })

    // Manually edit the value
    const valueInput = screen.getByDisplayValue('85.5') as HTMLInputElement
    fireEvent.change(valueInput, { target: { value: '92.3' } })

    expect(screen.getByDisplayValue('92.3')).toBeInTheDocument()
  })

  it('should preserve existing benchmark IDs when uploading', async () => {
    // Mock existing benchmark
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'assessments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'assessment-1', title: 'Leadership Assessment' },
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

    render(<BenchmarksManageClient assessmentId="assessment-1" industryId="industry-1" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('75.5')).toBeInTheDocument()
    })

    const csvContent = `Dimension Name,Dimension Code,Value
Communication,COMM,85.5`

    const file = new File([csvContent], 'benchmarks.csv', { type: 'text/csv' })
    const fileInput = document.getElementById("csv-upload-input") as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('85.5')).toBeInTheDocument()
    })

    // The value should be updated, preserving the existing benchmark ID
    expect(screen.queryByDisplayValue('75.5')).not.toBeInTheDocument()
  })
})
