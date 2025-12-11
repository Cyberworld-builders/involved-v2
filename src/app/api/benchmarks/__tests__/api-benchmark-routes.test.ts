import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getBenchmarks, POST as createBenchmark } from '../route'
import {
  GET as getBenchmark,
  PATCH as updateBenchmark,
  DELETE as deleteBenchmark,
} from '../[id]/route'
import { POST as bulkCreateBenchmarks } from '../bulk/route'
import { mockBenchmark, mockBenchmarks } from '@/__tests__/fixtures/benchmarks'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

describe('API Benchmark Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/benchmarks', () => {
    it('should create a new benchmark with valid data', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock database insert
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockBenchmark,
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify({
          dimension_id: 'test-dimension-id',
          industry_id: 'test-industry-id',
          value: 75.5,
        }),
      })

      const response = await createBenchmark(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.benchmark).toBeDefined()
      expect(data.benchmark.value).toBe(75.5)
      expect(mockFrom).toHaveBeenCalledWith('benchmarks')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify({
          dimension_id: 'test-dimension-id',
          industry_id: 'test-industry-id',
          value: 75.5,
        }),
      })

      const response = await createBenchmark(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if dimension_id is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify({
          industry_id: 'test-industry-id',
          value: 75.5,
        }),
      })

      const response = await createBenchmark(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Dimension ID is required')
    })

    it('should return 400 if industry_id is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify({
          dimension_id: 'test-dimension-id',
          value: 75.5,
        }),
      })

      const response = await createBenchmark(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Industry ID is required')
    })

    it('should return 400 if value is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify({
          dimension_id: 'test-dimension-id',
          industry_id: 'test-industry-id',
        }),
      })

      const response = await createBenchmark(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Value is required and must be a number')
    })

    it('should return 400 if value is not a number', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify({
          dimension_id: 'test-dimension-id',
          industry_id: 'test-industry-id',
          value: '75.5',
        }),
      })

      const response = await createBenchmark(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Value is required and must be a number')
    })

    it('should return 400 if value is less than 0', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify({
          dimension_id: 'test-dimension-id',
          industry_id: 'test-industry-id',
          value: -5,
        }),
      })

      const response = await createBenchmark(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Value must be between 0 and 100')
    })

    it('should return 400 if value is greater than 100', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify({
          dimension_id: 'test-dimension-id',
          industry_id: 'test-industry-id',
          value: 150,
        }),
      })

      const response = await createBenchmark(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Value must be between 0 and 100')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify({
          dimension_id: 'test-dimension-id',
          industry_id: 'test-industry-id',
          value: 75.5,
        }),
      })

      const response = await createBenchmark(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create benchmark')
    })
  })

  describe('GET /api/benchmarks', () => {
    it('should return all benchmarks', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockBenchmarks,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/benchmarks')
      const response = await getBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.benchmarks).toEqual(mockBenchmarks)
      expect(mockFrom).toHaveBeenCalledWith('benchmarks')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/benchmarks')
      const response = await getBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/benchmarks')
      const response = await getBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch benchmarks')
    })

    it('should order benchmarks by created_at descending', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const orderMock = vi.fn().mockResolvedValue({
        data: mockBenchmarks,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: orderMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest('http://localhost:3000/api/benchmarks')
      await getBenchmarks(request)

      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should filter benchmarks by industry_id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const eqMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [mockBenchmarks[0]],
          error: null,
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks?industry_id=test-industry-id'
      )
      await getBenchmarks(request)

      expect(eqMock).toHaveBeenCalledWith('industry_id', 'test-industry-id')
    })

    it('should filter benchmarks by dimension_id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const eqMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [mockBenchmarks[0]],
          error: null,
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks?dimension_id=test-dimension-id'
      )
      await getBenchmarks(request)

      expect(eqMock).toHaveBeenCalledWith('dimension_id', 'test-dimension-id')
    })

    it('should filter benchmarks by multiple parameters', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const eqMock = vi.fn().mockReturnThis()
      eqMock.mockReturnValue({
        eq: eqMock,
        order: vi.fn().mockResolvedValue({
          data: [mockBenchmarks[0]],
          error: null,
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks?industry_id=test-industry-id&dimension_id=test-dimension-id'
      )
      await getBenchmarks(request)

      expect(eqMock).toHaveBeenCalledWith('industry_id', 'test-industry-id')
      expect(eqMock).toHaveBeenCalledWith('dimension_id', 'test-dimension-id')
    })
  })

  describe('GET /api/benchmarks/[id]', () => {
    it('should return a single benchmark by id', async () => {
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

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id'
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.benchmark).toEqual(mockBenchmark)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id'
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if benchmark is not found', async () => {
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

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/nonexistent'
      )
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await getBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Benchmark not found')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id'
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await getBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch benchmark')
    })
  })

  describe('PATCH /api/benchmarks/[id]', () => {
    it('should update a benchmark with valid data', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updatedBenchmark = { ...mockBenchmark, value: 85.0 }
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedBenchmark,
                error: null,
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'PATCH',
          body: JSON.stringify({ value: 85.0 }),
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.benchmark.value).toBe(85.0)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'PATCH',
          body: JSON.stringify({ value: 85.0 }),
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if benchmark is not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/nonexistent',
        {
          method: 'PATCH',
          body: JSON.stringify({ value: 85.0 }),
        }
      )
      const params = Promise.resolve({ id: 'nonexistent' })
      const response = await updateBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Benchmark not found')
    })

    it('should return 400 if value is invalid', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'PATCH',
          body: JSON.stringify({ value: 150 }),
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Value must be between 0 and 100')
    })

    it('should return 400 if no fields to update', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'PATCH',
          body: JSON.stringify({}),
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No fields to update')
    })

    it('should handle partial updates', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockBenchmark,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'PATCH',
          body: JSON.stringify({ industry_id: 'new-industry-id' }),
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      await updateBenchmark(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          industry_id: 'new-industry-id',
          updated_at: expect.any(String),
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'PATCH',
          body: JSON.stringify({ value: 85.0 }),
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await updateBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update benchmark')
    })

    it('should update updated_at timestamp', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockBenchmark,
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: updateMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'PATCH',
          body: JSON.stringify({ value: 85.0 }),
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      await updateBenchmark(request, { params })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      )
    })
  })

  describe('DELETE /api/benchmarks/[id]', () => {
    it('should delete a benchmark successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'DELETE',
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Benchmark deleted successfully')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'DELETE',
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'DELETE',
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      const response = await deleteBenchmark(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete benchmark')
    })

    it('should delete from the correct table', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id',
        {
          method: 'DELETE',
        }
      )
      const params = Promise.resolve({ id: 'test-id' })
      await deleteBenchmark(request, { params })

      expect(mockFrom).toHaveBeenCalledWith('benchmarks')
    })

    it('should use the correct id when deleting', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const eqMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/test-id-123',
        {
          method: 'DELETE',
        }
      )
      const params = Promise.resolve({ id: 'test-id-123' })
      await deleteBenchmark(request, { params })

      expect(eqMock).toHaveBeenCalledWith('id', 'test-id-123')
    })
  })

  describe('POST /api/benchmarks/bulk', () => {
    it('should create multiple benchmarks with valid data', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mockBenchmarks,
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [
              {
                dimension_id: 'test-dimension-id-1',
                industry_id: 'test-industry-id-1',
                value: 75.5,
              },
              {
                dimension_id: 'test-dimension-id-2',
                industry_id: 'test-industry-id-2',
                value: 82.3,
              },
            ],
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.benchmarks).toBeDefined()
      expect(data.count).toBe(3)
      expect(mockFrom).toHaveBeenCalledWith('benchmarks')
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [
              {
                dimension_id: 'test-dimension-id-1',
                industry_id: 'test-industry-id-1',
                value: 75.5,
              },
            ],
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if benchmarks is not an array', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: 'not-an-array',
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Benchmarks must be an array')
    })

    it('should return 400 if benchmarks array is empty', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [],
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('At least one benchmark is required')
    })

    it('should return 400 if any benchmark has missing dimension_id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [
              {
                industry_id: 'test-industry-id-1',
                value: 75.5,
              },
            ],
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('Benchmark 1: Dimension ID is required')
    })

    it('should return 400 if any benchmark has missing industry_id', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [
              {
                dimension_id: 'test-dimension-id-1',
                value: 75.5,
              },
            ],
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('Benchmark 1: Industry ID is required')
    })

    it('should return 400 if any benchmark has missing value', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [
              {
                dimension_id: 'test-dimension-id-1',
                industry_id: 'test-industry-id-1',
              },
            ],
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain(
        'Benchmark 1: Value is required and must be a number'
      )
    })

    it('should return 400 if any benchmark has invalid value range', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [
              {
                dimension_id: 'test-dimension-id-1',
                industry_id: 'test-industry-id-1',
                value: 150,
              },
            ],
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain(
        'Benchmark 1: Value must be between 0 and 100'
      )
    })

    it('should validate all benchmarks and return multiple errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [
              {
                industry_id: 'test-industry-id-1',
                value: 75.5,
              },
              {
                dimension_id: 'test-dimension-id-2',
                value: 150,
              },
            ],
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('Benchmark 1: Dimension ID is required')
      expect(data.details).toContain('Benchmark 2: Industry ID is required')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [
              {
                dimension_id: 'test-dimension-id-1',
                industry_id: 'test-industry-id-1',
                value: 75.5,
              },
            ],
          }),
        }
      )

      const response = await bulkCreateBenchmarks(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create benchmarks')
    })

    it('should insert only valid benchmarks', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockBenchmarks.slice(0, 2),
          error: null,
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      })
      mockSupabaseClient.from = mockFrom

      const request = new NextRequest(
        'http://localhost:3000/api/benchmarks/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            benchmarks: [
              {
                dimension_id: 'test-dimension-id-1',
                industry_id: 'test-industry-id-1',
                value: 75.5,
              },
              {
                dimension_id: 'test-dimension-id-2',
                industry_id: 'test-industry-id-2',
                value: 82.3,
              },
            ],
          }),
        }
      )

      await bulkCreateBenchmarks(request)

      expect(insertMock).toHaveBeenCalledWith([
        {
          dimension_id: 'test-dimension-id-1',
          industry_id: 'test-industry-id-1',
          value: 75.5,
        },
        {
          dimension_id: 'test-dimension-id-2',
          industry_id: 'test-industry-id-2',
          value: 82.3,
        },
      ])
    })
  })
})
