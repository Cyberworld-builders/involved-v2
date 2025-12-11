/**
 * Test data fixtures for E2E tests
 * 
 * Provides consistent test data that can be reused across tests.
 * This ensures test isolation and makes tests more maintainable.
 */

export const testClientData = {
  name: 'Test Corporation',
  address: '123 Test Street, Test City, TC 12345',
  primaryColor: '#FF5733',
  accentColor: '#33FF57',
}

export const testUserData = {
  email: 'test-user@involved-talent.test',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser',
}

export const testGroupData = {
  name: 'Test Group',
  description: 'This is a test group for E2E testing',
}

/**
 * Generate unique test identifier
 * 
 * Useful for creating unique test data that won't conflict
 * with other test runs or existing data.
 * 
 * @param prefix - Prefix for the identifier
 * @returns Unique identifier string
 */
export function getUniqueTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

/**
 * Generate unique client name for testing
 * 
 * @returns Unique client name
 */
export function getUniqueClientName(): string {
  return `Test Client ${getUniqueTestId()}`
}

/**
 * Generate unique user email for testing
 * 
 * @returns Unique user email
 */
export function getUniqueUserEmail(): string {
  return `test-${getUniqueTestId()}@involved-talent.test`
}
