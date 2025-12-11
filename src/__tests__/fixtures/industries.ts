import { Database } from '@/types/database'

type Industry = Database['public']['Tables']['industries']['Row']

export const mockIndustry: Industry = {
  id: 'test-industry-id',
  name: 'Technology',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockIndustries: Industry[] = [
  mockIndustry,
  {
    ...mockIndustry,
    id: 'test-industry-id-2',
    name: 'Healthcare',
  },
  {
    ...mockIndustry,
    id: 'test-industry-id-3',
    name: 'Finance',
  },
]
