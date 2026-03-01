/**
 * Unit tests for generate360Report partial path (no completed assignments).
 * Uses mocked Supabase admin client so we don't require a real DB.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generate360Report } from '@/lib/reports/generate-360-report'

// Queue of responses for the mock client (order matters)
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
    // So that await client.from().select().eq().eq() (no .single()) resolves
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

describe('generate360Report', () => {
  beforeEach(() => {
    responseQueue.length = 0
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns partial report with placeholder dimensions when no completed assignments', async () => {
    const assignmentId = 'test-assignment-360-partial'
    const targetId = 'target-1'
    const assessmentId = 'assessment-1'
    const groupId = 'group-1'

    // 1. Assignment by id (with target, assessment; no group_id so we use groups by target_id)
    responseQueue.push({
      data: {
        id: assignmentId,
        user_id: 'user-1',
        assessment_id: assessmentId,
        target_id: targetId,
        group_id: null,
        assessment: { id: assessmentId, title: '360 Assessment' },
        target: { id: targetId, name: 'Test User', email: 'test@example.com' },
      },
      error: null,
    })

    // 2. Groups by target_id
    responseQueue.push({
      data: [{ id: groupId, name: 'Test Group', target_id: targetId }],
      error: null,
    })

    // 3. Assignments (completed) for target+assessment+group -> empty
    responseQueue.push({
      data: [],
      error: null,
    })

    // 4. Fallback assignments (no group filter) when group had zero completed -> empty
    responseQueue.push({
      data: [],
      error: null,
    })

    // 5. Dimensions (top-level only)
    responseQueue.push({
      data: [
        { id: 'dim-1', name: 'Leadership', code: 'LEAD', parent_id: null },
      ],
      error: null,
    })

    // 6. Benchmarks (partial branch)
    responseQueue.push({
      data: [],
      error: null,
    })

    // 7. Group members (for total count)
    responseQueue.push({
      data: [],
      error: null,
    })

    const result = await generate360Report(assignmentId)

    expect(result).toBeDefined()
    expect(result.assignment_id).toBe(assignmentId)
    expect(result.target_id).toBe(targetId)
    expect(result.partial).toBe(true)
    expect(result.participant_response_summary).toEqual({ completed: 0, total: 0 })
    expect(result.overall_score).toBe(0)
    expect(Array.isArray(result.dimensions)).toBe(true)
    expect(result.dimensions.length).toBe(1)
    expect(result.dimensions[0].dimension_name).toBe('Leadership')
    expect(result.dimensions[0].overall_score).toBe(0)
    expect(result.dimensions[0].rater_breakdown?.all_raters).toBeNull()
  })

  it('does not throw when assignment has group_id and zero completed assignments', async () => {
    const assignmentId = 'test-assignment-360-with-group'
    const targetId = 'target-1'
    const assessmentId = 'assessment-1'
    const groupId = 'group-1'

    // 1. Assignment with group_id
    responseQueue.push({
      data: {
        id: assignmentId,
        user_id: 'user-1',
        assessment_id: assessmentId,
        target_id: targetId,
        group_id: groupId,
        assessment: { id: assessmentId, title: '360 Assessment' },
        target: { id: targetId, name: 'Test User', email: 'test@example.com' },
      },
      error: null,
    })

    // 2. Group by id
    responseQueue.push({
      data: { id: groupId, name: 'Test Group', target_id: targetId },
      error: null,
    })

    // 3. Assignments completed (with group_id) -> empty
    responseQueue.push({
      data: [],
      error: null,
    })

    // 4. Fallback assignments (no group) -> empty
    responseQueue.push({
      data: [],
      error: null,
    })

    // 5. Dimensions
    responseQueue.push({
      data: [{ id: 'dim-1', name: 'Leadership', code: 'LEAD', parent_id: null }],
      error: null,
    })

    // 6. Benchmarks
    responseQueue.push({
      data: [],
      error: null,
    })

    // 7. Group members
    responseQueue.push({
      data: [],
      error: null,
    })

    const result = await generate360Report(assignmentId)

    expect(result).toBeDefined()
    expect(result.partial).toBe(true)
    expect(result.dimensions.length).toBe(1)
  })

  it('throws when assignment not found', async () => {
    responseQueue.push({ data: null, error: new Error('Not found') })

    await expect(generate360Report('nonexistent')).rejects.toThrow(
      'Assignment not found or invalid for 360 report'
    )
  })

  it('includes dimensions with zero scores (avg_score = 0) in the report', async () => {
    const assignmentId = 'test-assignment-360-zero-scores'
    const targetId = 'target-1'
    const assessmentId = 'assessment-1'
    const groupId = 'group-1'
    const userId = 'user-1'

    // 1. Assignment with group_id
    responseQueue.push({
      data: {
        id: assignmentId,
        user_id: userId,
        assessment_id: assessmentId,
        target_id: targetId,
        group_id: groupId,
        assessment: { id: assessmentId, title: '360 Assessment' },
        target: { id: targetId, name: 'Test User', email: 'test@example.com' },
      },
      error: null,
    })

    // 2. Group by id
    responseQueue.push({
      data: { id: groupId, name: 'Test Group', target_id: targetId },
      error: null,
    })

    // 3. Completed assignments for target+assessment+group
    responseQueue.push({
      data: [
        {
          id: 'completed-assignment-1',
          user_id: userId,
          target_id: targetId,
          completed: true,
          user: { id: userId, name: 'Rater One', email: 'rater@example.com' },
        },
      ],
      error: null,
    })

    // 4. Dimensions (top-level) - two dimensions
    responseQueue.push({
      data: [
        { id: 'dim-1', name: 'Leadership', code: 'LEAD', parent_id: null },
        { id: 'dim-2', name: 'Communication', code: 'COMM', parent_id: null },
      ],
      error: null,
    })

    // 5. Group members (for rater map)
    responseQueue.push({
      data: [{ profile_id: userId, position: 'peer' }],
      error: null,
    })

    // 6. assignment_dimension_scores - dim-1 has score 0, dim-2 has score 3.5
    responseQueue.push({
      data: [
        { assignment_id: 'completed-assignment-1', dimension_id: 'dim-1', avg_score: 0 },
        { assignment_id: 'completed-assignment-1', dimension_id: 'dim-2', avg_score: 3.5 },
      ],
      error: null,
    })

    // 7. Benchmarks
    responseQueue.push({
      data: [],
      error: null,
    })

    // 8-10. calculateGEOnorms internal queries (3 thenables):
    //   8. group_members
    responseQueue.push({
      data: [{ profile_id: userId }],
      error: null,
    })
    //   9. assignments (completed for group members)
    responseQueue.push({
      data: [{ id: 'completed-assignment-1', user_id: userId }],
      error: null,
    })
    //   10. assignment_dimension_scores (for geonorm calculation)
    responseQueue.push({
      data: [],
      error: null,
    })

    // 11. Description fields
    responseQueue.push({
      data: [],
      error: null,
    })

    // 12. Text answers
    responseQueue.push({
      data: [],
      error: null,
    })

    // 13. Group members for participant count
    responseQueue.push({
      data: [{ profile_id: userId }],
      error: null,
    })

    const result = await generate360Report(assignmentId)

    expect(result).toBeDefined()
    // Both dimensions should be included, including the one with score 0
    expect(result.dimensions.length).toBe(2)

    const leadershipDim = result.dimensions.find((d) => d.dimension_name === 'Leadership')
    const commDim = result.dimensions.find((d) => d.dimension_name === 'Communication')

    expect(leadershipDim).toBeDefined()
    expect(leadershipDim!.overall_score).toBe(0)

    expect(commDim).toBeDefined()
    expect(commDim!.overall_score).toBe(3.5)

    // Overall score should be the average of the two dimensions: (0 + 3.5) / 2 = 1.75
    expect(result.overall_score).toBe(1.75)
  })
})
