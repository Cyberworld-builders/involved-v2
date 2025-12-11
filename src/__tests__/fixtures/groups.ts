import { Database } from '@/types/database'

type Group = Database['public']['Tables']['groups']['Row']

export const mockGroup: Group = {
  id: 'test-group-id',
  client_id: 'test-client-id',
  name: 'Test Group',
  description: 'A test group for unit testing',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockGroups: Group[] = [
  mockGroup,
  {
    ...mockGroup,
    id: 'test-group-id-2',
    name: 'Test Group 2',
    description: 'Another test group',
  },
  {
    ...mockGroup,
    id: 'test-group-id-3',
    name: 'Test Group 3',
    description: null,
  },
]
