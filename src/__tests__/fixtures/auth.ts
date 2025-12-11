/**
 * Mock data for authentication testing
 */

export const mockAuthUser = {
  id: 'test-auth-user-id',
  email: 'test@example.com',
  user_metadata: {
    first_name: 'Test',
    last_name: 'User',
    full_name: 'Test User',
    username: 'testuser',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
}

export const mockSignupData = {
  email: 'newuser@example.com',
  password: 'SecurePassword123!',
  firstName: 'New',
  lastName: 'User',
}

export const mockSigninData = {
  email: 'test@example.com',
  password: 'SecurePassword123!',
}

export const mockResetPasswordData = {
  email: 'test@example.com',
}

export const mockVerifyEmailData = {
  token: 'abc123def456ghi789jkl012mno345pqr',
}

export const mockAuthSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockAuthUser,
}

export const mockVerificationToken = 'abcdefghijklmnopqrstuvwxyz123456'
