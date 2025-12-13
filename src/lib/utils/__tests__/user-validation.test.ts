import { describe, it, expect } from 'vitest'
import {
  validateRole,
  validateStatus,
  isAdmin,
  isClient,
  isUser,
  isActive,
  isInactive,
  hasAdminPermission,
  hasClientManagementPermission,
  hasUserPermission,
  getPermissionLevel,
  hasMinimumRole,
  type UserRole,
  type UserStatus,
} from '../user-validation'

describe('validateRole', () => {
  it('should validate admin role', () => {
    expect(validateRole('admin')).toBe(true)
  })

  it('should validate client role', () => {
    expect(validateRole('client')).toBe(true)
  })

  it('should validate user role', () => {
    expect(validateRole('user')).toBe(true)
  })

  it('should reject invalid role strings', () => {
    expect(validateRole('manager')).toBe(true)
    expect(validateRole('unverified')).toBe(true)
    expect(validateRole('superuser')).toBe(false)
    expect(validateRole('moderator')).toBe(false)
    expect(validateRole('guest')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validateRole('')).toBe(false)
  })

  it('should reject whitespace-only strings', () => {
    expect(validateRole('   ')).toBe(false)
    expect(validateRole('\t')).toBe(false)
    expect(validateRole('\n')).toBe(false)
  })

  it('should reject roles with different casing', () => {
    expect(validateRole('Admin')).toBe(false)
    expect(validateRole('ADMIN')).toBe(false)
    expect(validateRole('Client')).toBe(false)
    expect(validateRole('USER')).toBe(false)
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateRole(null)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateRole(undefined)).toBe(false)
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateRole(123)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateRole({})).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateRole([])).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateRole(true)).toBe(false)
  })

  it('should handle special characters', () => {
    expect(validateRole('admin!')).toBe(false)
    expect(validateRole('user@')).toBe(false)
    expect(validateRole('client#')).toBe(false)
  })
})

describe('validateStatus', () => {
  it('should validate active status', () => {
    expect(validateStatus('active')).toBe(true)
  })

  it('should validate inactive status', () => {
    expect(validateStatus('inactive')).toBe(true)
  })

  it('should reject invalid status strings', () => {
    expect(validateStatus('pending')).toBe(false)
    expect(validateStatus('deleted')).toBe(false)
    expect(validateStatus('archived')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validateStatus('')).toBe(false)
  })

  it('should reject whitespace-only strings', () => {
    expect(validateStatus('   ')).toBe(false)
    expect(validateStatus('\t')).toBe(false)
    expect(validateStatus('\n')).toBe(false)
  })

  it('should reject status with different casing', () => {
    expect(validateStatus('Active')).toBe(false)
    expect(validateStatus('ACTIVE')).toBe(false)
    expect(validateStatus('Inactive')).toBe(false)
    expect(validateStatus('INACTIVE')).toBe(false)
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateStatus(null)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateStatus(undefined)).toBe(false)
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateStatus(123)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateStatus({})).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateStatus([])).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateStatus(true)).toBe(false)
  })

  it('should handle special characters', () => {
    expect(validateStatus('active!')).toBe(false)
    expect(validateStatus('inactive@')).toBe(false)
  })
})

describe('isAdmin', () => {
  it('should return true for admin role', () => {
    expect(isAdmin('admin')).toBe(true)
  })

  it('should return false for client role', () => {
    expect(isAdmin('client')).toBe(false)
  })

  it('should return false for user role', () => {
    expect(isAdmin('user')).toBe(false)
  })
})

describe('isClient', () => {
  it('should return true for client role', () => {
    expect(isClient('client')).toBe(true)
  })

  it('should return false for admin role', () => {
    expect(isClient('admin')).toBe(false)
  })

  it('should return false for user role', () => {
    expect(isClient('user')).toBe(false)
  })
})

describe('isUser', () => {
  it('should return true for user role', () => {
    expect(isUser('user')).toBe(true)
  })

  it('should return false for admin role', () => {
    expect(isUser('admin')).toBe(false)
  })

  it('should return false for client role', () => {
    expect(isUser('client')).toBe(false)
  })
})

describe('isActive', () => {
  it('should return true for active status', () => {
    expect(isActive('active')).toBe(true)
  })

  it('should return false for inactive status', () => {
    expect(isActive('inactive')).toBe(false)
  })
})

describe('isInactive', () => {
  it('should return true for inactive status', () => {
    expect(isInactive('inactive')).toBe(true)
  })

  it('should return false for active status', () => {
    expect(isInactive('active')).toBe(false)
  })
})

describe('hasAdminPermission', () => {
  it('should return true for active admin', () => {
    expect(hasAdminPermission('admin', 'active')).toBe(true)
  })

  it('should return false for inactive admin', () => {
    expect(hasAdminPermission('admin', 'inactive')).toBe(false)
  })

  it('should return false for active client', () => {
    expect(hasAdminPermission('client', 'active')).toBe(false)
  })

  it('should return false for active user', () => {
    expect(hasAdminPermission('user', 'active')).toBe(false)
  })

  it('should return false for inactive client', () => {
    expect(hasAdminPermission('client', 'inactive')).toBe(false)
  })

  it('should return false for inactive user', () => {
    expect(hasAdminPermission('user', 'inactive')).toBe(false)
  })
})

describe('hasClientManagementPermission', () => {
  it('should return true for active admin', () => {
    expect(hasClientManagementPermission('admin', 'active')).toBe(true)
  })

  it('should return true for active client', () => {
    expect(hasClientManagementPermission('client', 'active')).toBe(true)
  })

  it('should return true for active manager', () => {
    expect(hasClientManagementPermission('manager', 'active')).toBe(true)
  })

  it('should return false for active user', () => {
    expect(hasClientManagementPermission('user', 'active')).toBe(false)
  })

  it('should return false for active unverified', () => {
    expect(hasClientManagementPermission('unverified', 'active')).toBe(false)
  })

  it('should return false for inactive admin', () => {
    expect(hasClientManagementPermission('admin', 'inactive')).toBe(false)
  })

  it('should return false for inactive client', () => {
    expect(hasClientManagementPermission('client', 'inactive')).toBe(false)
  })

  it('should return false for inactive manager', () => {
    expect(hasClientManagementPermission('manager', 'inactive')).toBe(false)
  })

  it('should return false for inactive user', () => {
    expect(hasClientManagementPermission('user', 'inactive')).toBe(false)
  })

  it('should return false for inactive unverified', () => {
    expect(hasClientManagementPermission('unverified', 'inactive')).toBe(false)
  })
})

describe('hasUserPermission', () => {
  it('should return true for active admin', () => {
    expect(hasUserPermission('admin', 'active')).toBe(true)
  })

  it('should return true for active client', () => {
    expect(hasUserPermission('client', 'active')).toBe(true)
  })

  it('should return true for active user', () => {
    expect(hasUserPermission('user', 'active')).toBe(true)
  })

  it('should return false for inactive admin', () => {
    expect(hasUserPermission('admin', 'inactive')).toBe(false)
  })

  it('should return false for inactive client', () => {
    expect(hasUserPermission('client', 'inactive')).toBe(false)
  })

  it('should return false for inactive user', () => {
    expect(hasUserPermission('user', 'inactive')).toBe(false)
  })
})

describe('getPermissionLevel', () => {
  it('should return 3 for admin role', () => {
    expect(getPermissionLevel('admin')).toBe(3)
  })

  it('should return 2 for client role', () => {
    expect(getPermissionLevel('client')).toBe(2)
  })

  it('should return 2 for manager role', () => {
    expect(getPermissionLevel('manager')).toBe(2)
  })

  it('should return 1 for user role', () => {
    expect(getPermissionLevel('user')).toBe(1)
  })

  it('should return 1 for unverified role', () => {
    expect(getPermissionLevel('unverified')).toBe(1)
  })

  it('should return higher level for admin than client', () => {
    expect(getPermissionLevel('admin')).toBeGreaterThan(getPermissionLevel('client'))
  })

  it('should return higher level for client than user', () => {
    expect(getPermissionLevel('client')).toBeGreaterThan(getPermissionLevel('user'))
  })

  it('should return higher level for admin than user', () => {
    expect(getPermissionLevel('admin')).toBeGreaterThan(getPermissionLevel('user'))
  })

  it('should return 0 for invalid role (default case)', () => {
    // @ts-expect-error - Testing invalid input for complete coverage
    expect(getPermissionLevel('invalid')).toBe(0)
  })
})

describe('hasMinimumRole', () => {
  it('should return true when user role equals required role - admin', () => {
    expect(hasMinimumRole('admin', 'admin')).toBe(true)
  })

  it('should return true when user role equals required role - client', () => {
    expect(hasMinimumRole('client', 'client')).toBe(true)
  })

  it('should return true when user role equals required role - user', () => {
    expect(hasMinimumRole('user', 'user')).toBe(true)
  })

  it('should return true when admin meets client requirement', () => {
    expect(hasMinimumRole('admin', 'client')).toBe(true)
  })

  it('should return true when admin meets user requirement', () => {
    expect(hasMinimumRole('admin', 'user')).toBe(true)
  })

  it('should return true when client meets user requirement', () => {
    expect(hasMinimumRole('client', 'user')).toBe(true)
  })

  it('should return false when client does not meet admin requirement', () => {
    expect(hasMinimumRole('client', 'admin')).toBe(false)
  })

  it('should return false when user does not meet admin requirement', () => {
    expect(hasMinimumRole('user', 'admin')).toBe(false)
  })

  it('should return false when user does not meet client requirement', () => {
    expect(hasMinimumRole('user', 'client')).toBe(false)
  })
})

describe('Type exports', () => {
  it('should export UserRole type', () => {
    const role: UserRole = 'admin'
    expect(validateRole(role)).toBe(true)
  })

  it('should export UserStatus type', () => {
    const status: UserStatus = 'active'
    expect(validateStatus(status)).toBe(true)
  })

  it('should allow all valid roles in UserRole type', () => {
    const roles: UserRole[] = ['admin', 'manager', 'client', 'user', 'unverified']
    roles.forEach(role => {
      expect(validateRole(role)).toBe(true)
    })
  })

  it('should allow all valid statuses in UserStatus type', () => {
    const statuses: UserStatus[] = ['active', 'inactive', 'suspended']
    statuses.forEach(status => {
      expect(validateStatus(status)).toBe(true)
    })
  })
})
