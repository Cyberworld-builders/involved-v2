/**
 * User Validation Utilities
 * Functions for validating user roles, status, and role-based permissions
 */

// Valid user roles based on the User type in src/types/index.ts
export type UserRole = 'admin' | 'client' | 'user'

// Valid user status values
export type UserStatus = 'active' | 'inactive'

/**
 * Validates if a given value is a valid user role
 * @param role - The role to validate
 * @returns True if the role is valid, false otherwise
 */
export function validateRole(role: unknown): role is UserRole {
  if (typeof role !== 'string') {
    return false
  }
  return role === 'admin' || role === 'client' || role === 'user'
}

/**
 * Validates if a given value is a valid user status
 * @param status - The status to validate
 * @returns True if the status is valid, false otherwise
 */
export function validateStatus(status: unknown): status is UserStatus {
  if (typeof status !== 'string') {
    return false
  }
  return status === 'active' || status === 'inactive'
}

/**
 * Checks if a user has admin role
 * @param role - The user's role
 * @returns True if the role is admin, false otherwise
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

/**
 * Checks if a user has client role
 * @param role - The user's role
 * @returns True if the role is client, false otherwise
 */
export function isClient(role: UserRole): boolean {
  return role === 'client'
}

/**
 * Checks if a user has user role
 * @param role - The user's role
 * @returns True if the role is user, false otherwise
 */
export function isUser(role: UserRole): boolean {
  return role === 'user'
}

/**
 * Checks if a user is active
 * @param status - The user's status
 * @returns True if the status is active, false otherwise
 */
export function isActive(status: UserStatus): boolean {
  return status === 'active'
}

/**
 * Checks if a user is inactive
 * @param status - The user's status
 * @returns True if the status is inactive, false otherwise
 */
export function isInactive(status: UserStatus): boolean {
  return status === 'inactive'
}

/**
 * Checks if a user has permission to perform admin actions
 * Admin users have full permissions
 * @param role - The user's role
 * @param status - The user's status
 * @returns True if the user has admin permissions, false otherwise
 */
export function hasAdminPermission(role: UserRole, status: UserStatus): boolean {
  return isAdmin(role) && isActive(status)
}

/**
 * Checks if a user has permission to manage clients
 * Admin and client users can manage client-related actions
 * @param role - The user's role
 * @param status - The user's status
 * @returns True if the user can manage clients, false otherwise
 */
export function hasClientManagementPermission(role: UserRole, status: UserStatus): boolean {
  return (isAdmin(role) || isClient(role)) && isActive(status)
}

/**
 * Checks if a user has permission to access user features
 * All active users have basic user permissions
 * @param role - The user's role
 * @param status - The user's status
 * @returns True if the user has basic user permissions, false otherwise
 */
export function hasUserPermission(role: UserRole, status: UserStatus): boolean {
  return validateRole(role) && isActive(status)
}

/**
 * Gets the permission level for a user based on their role
 * @param role - The user's role
 * @returns A number representing the permission level (higher = more permissions)
 */
export function getPermissionLevel(role: UserRole): number {
  switch (role) {
    case 'admin':
      return 3
    case 'client':
      return 2
    case 'user':
      return 1
    default:
      return 0
  }
}

/**
 * Checks if a user has higher or equal permission level than required
 * @param userRole - The user's role
 * @param requiredRole - The required role
 * @returns True if the user has sufficient permissions, false otherwise
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getPermissionLevel(userRole) >= getPermissionLevel(requiredRole)
}
