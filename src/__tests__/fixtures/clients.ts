import { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

export const mockClient: Client = {
  id: 'test-client-id',
  name: 'Test Client',
  address: '123 Test St, Test City, TC 12345',
  logo: null,
  background: null,
  primary_color: '#2D2E30',
  accent_color: '#FFBA00',
  require_profile: false,
  require_research: false,
  whitelabel: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockClients: Client[] = [
  mockClient,
  {
    ...mockClient,
    id: 'test-client-id-2',
    name: 'Test Client 2',
    primary_color: '#000000',
    accent_color: '#FFFFFF',
  },
]
