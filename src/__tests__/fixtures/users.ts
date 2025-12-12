import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export const mockUser: Profile = {
  id: 'test-user-id',
  auth_user_id: 'test-auth-user-id',
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  client_id: 'test-client-id',
  industry_id: 'test-industry-id',
  language_id: null,
  role: 'user',
  last_login_at: null,
  completed_profile: true,
  accepted_terms: true,
  accepted_at: new Date().toISOString(),
  accepted_signature: null,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockUsers: Profile[] = [
  mockUser,
  {
    ...mockUser,
    id: 'test-user-id-2',
    username: 'testuser2',
    name: 'Test User 2',
    email: 'test2@example.com',
  },
]
