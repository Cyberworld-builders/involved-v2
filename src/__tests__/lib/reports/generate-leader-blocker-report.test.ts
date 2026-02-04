/**
 * Unit tests for generateLeaderBlockerReport partial path (no dimension scores).
 * Uses mocked Supabase admin client so we don't require a real DB.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'

type QueryResult = { data: unknown; error: Error | null }
const responseQueue: QueryResult[] = []

function nextResponse(): QueryResult {
  const r = responseQueue.shift()
  if (!r) throw new Error('Mock Supabase: no more responses in queue')
  return r
}

function buildChain(): { then: (onFulfilled: (v: QueryResult) => unknown) => Promise<unknown> } {
  return {
    then(onFulfilled: (v: QueryResult) => unknown) {
      return Promise.resolve(nextResponse()).then(onFulfilled)
    },
  }
}

function chainable() {
  const thenable = {
    eq: () => thenable,
    is: () => thenable,
    in: () => thenable,
    order: () => thenable,
    limit: () => thenable,
    single: () => buildChain(),
    then(onFulfilled: (v: QueryResult) => unknown) {
      return Promise.resolve(nextResponse()).then(onFulfilled)
    },
  }
  return thenable
}

const mockAdminClient = {
  from: () => ({
    select: () => chainable(),
  }),
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

vi.mock('@/lib/reports/calculate-geonorms', () => ({
  calculateGEOnorms: () => Promise.resolve(new Map()),
}))

describe('generateLeaderBlockerReport', () => {
  beforeEach(() => {
    responseQueue.length = 0
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns report with empty dimensions and zero overall when no dimension scores', async () => {
    const assignmentId = 'test-assignment-lb-partial'
    const userId = 'user-1'
    const assessmentId = 'assessment-lb'

    // 1. Assignment by id
    responseQueue.push({
      data: {
        id: assignmentId,
        user_id: userId,
        target_id: userId,
        assessment_id: assessmentId,
        created_at: '2025-01-01T00:00:00Z',
        assessment: { id: assessmentId, title: 'Leader Assessment', is_360: false },
        user: { id: userId, name: 'Test User', email: 'test@example.com', client_id: 'client-1' },
      },
      error: null,
    })

    // 2. User's groups (empty -> no GEOnorms)
    responseQueue.push({
      data: [],
      error: null,
    })

    // 3. Dimensions (one parent)
    responseQueue.push({
      data: [{ id: 'dim-1', name: 'Dimension One', code: 'D1', parent_id: null }],
      error: null,
    })

    // 4. Dimension scores for this assignment -> empty (partial)
    responseQueue.push({
      data: [],
      error: null,
    })

    // 5. Benchmarks
    responseQueue.push({
      data: [],
      error: null,
    })

    // 6. Assignment batch (same created_at, completed)
    responseQueue.push({
      data: [],
      error: null,
    })

    // 7. report_data (feedback_assigned)
    responseQueue.push({
      data: { feedback_assigned: [] },
      error: null,
    })

    const result = await generateLeaderBlockerReport(assignmentId)

    expect(result).toBeDefined()
    expect(result.assignment_id).toBe(assignmentId)
    expect(result.user_id).toBe(userId)
    expect(result.overall_score).toBe(0)
    expect(Array.isArray(result.dimensions)).toBe(true)
    expect(result.dimensions.length).toBe(0)
  })

  it('throws when assignment not found', async () => {
    responseQueue.push({ data: null, error: new Error('Not found') })

    await expect(generateLeaderBlockerReport('nonexistent')).rejects.toThrow(
      'Assignment not found'
    )
  })

  it('throws when assessment is 360', async () => {
    responseQueue.push({
      data: {
        id: 'a1',
        user_id: 'u1',
        target_id: 'u1',
        assessment_id: 'ast-360',
        created_at: '2025-01-01T00:00:00Z',
        assessment: { id: 'ast-360', title: '360 Assessment', is_360: true },
        user: { id: 'u1', name: 'User', email: 'u@e.com', client_id: null },
      },
      error: null,
    })

    await expect(generateLeaderBlockerReport('a1')).rejects.toThrow(
      'This is a 360 assessment. Use generate360Report instead.'
    )
  })
})
