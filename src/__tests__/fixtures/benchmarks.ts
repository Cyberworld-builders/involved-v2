import { Database } from '@/types/database'

type Benchmark = Database['public']['Tables']['benchmarks']['Row']

export const mockBenchmark: Benchmark = {
  id: 'test-benchmark-id',
  dimension_id: 'test-dimension-id',
  industry_id: 'test-industry-id',
  value: 75.5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockBenchmarks: Benchmark[] = [
  mockBenchmark,
  {
    ...mockBenchmark,
    id: 'test-benchmark-id-2',
    dimension_id: 'test-dimension-id-2',
    industry_id: 'test-industry-id-2',
    value: 82.3,
  },
  {
    ...mockBenchmark,
    id: 'test-benchmark-id-3',
    dimension_id: 'test-dimension-id-3',
    industry_id: 'test-industry-id',
    value: 68.9,
  },
]
