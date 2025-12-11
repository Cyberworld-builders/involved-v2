/**
 * Invite Token Generation Utilities
 * 
 * Provides functions to generate and validate invite tokens with expiration.
 * Tokens are valid for 7 days from generation.
 */

/**
 * Generate a secure random invite token
 * - Uses crypto.randomBytes for secure token generation
 * - Returns a URL-safe base64 string
 * - Token length is 32 bytes (256 bits)
 * 
 * @returns A secure random token string
 * 
 * @example
 * const token = generateInviteToken()
 * // Returns: "a7f8d9c2b1e4f6a8c9d2e4f6a8b1c2d4e6f8a9b1c2d4e6f8"
 */
export function generateInviteToken(): string {
  // Generate 32 random bytes for a secure token
  const buffer = new Uint8Array(32)
  
  // Use crypto.getRandomValues for secure random generation
  // This works in both browser (window.crypto) and Node.js (global.crypto)
  crypto.getRandomValues(buffer)
  
  // Convert to hex string
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Calculate token expiration date (7 days from now)
 * 
 * @param fromDate - Optional base date (defaults to now)
 * @returns Date object representing expiration time
 * 
 * @example
 * const expiresAt = getTokenExpiration()
 * // Returns: Date 7 days from now
 */
export function getTokenExpiration(fromDate?: Date): Date {
  const baseDate = fromDate || new Date()
  const expirationDate = new Date(baseDate)
  
  // Add 7 days
  expirationDate.setDate(expirationDate.getDate() + 7)
  
  return expirationDate
}

/**
 * Check if a token has expired
 * 
 * @param expirationDate - The expiration date to check
 * @param currentDate - Optional current date (defaults to now, used for testing)
 * @returns true if expired, false otherwise
 * 
 * @example
 * const expired = isTokenExpired(expiresAt)
 * // Returns: true if expiresAt is in the past
 */
export function isTokenExpired(expirationDate: Date, currentDate?: Date): boolean {
  if (!expirationDate || !(expirationDate instanceof Date) || isNaN(expirationDate.getTime())) {
    return true // Invalid date is considered expired
  }
  
  const now = currentDate || new Date()
  return now > expirationDate
}

/**
 * Validate token format
 * - Must be a non-empty string
 * - Must be exactly 64 characters (32 bytes in hex)
 * - Must contain only hexadecimal characters (0-9, a-f)
 * 
 * @param token - The token string to validate
 * @returns true if valid format, false otherwise
 * 
 * @example
 * validateTokenFormat('a7f8d9c2...') // true
 * validateTokenFormat('invalid') // false
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }
  
  // Token should be 64 characters (32 bytes in hex)
  if (token.length !== 64) {
    return false
  }
  
  // Should only contain hexadecimal characters
  const hexRegex = /^[0-9a-f]{64}$/
  return hexRegex.test(token)
}

/**
 * Generate an invite token with expiration metadata
 * 
 * @returns Object containing token and expiration date
 * 
 * @example
 * const invite = generateInviteTokenWithExpiration()
 * // Returns: { token: "a7f8d9c2...", expiresAt: Date }
 */
export function generateInviteTokenWithExpiration(): {
  token: string
  expiresAt: Date
} {
  const token = generateInviteToken()
  const expiresAt = getTokenExpiration()
  
  return {
    token,
    expiresAt,
  }
}

/**
 * Validate a token and check if it's expired
 * 
 * @param token - The token to validate
 * @param expirationDate - The expiration date of the token
 * @param currentDate - Optional current date (defaults to now, used for testing)
 * @returns Object with validation result and reason
 * 
 * @example
 * const result = validateInviteToken(token, expiresAt)
 * // Returns: { valid: true, reason: null } or { valid: false, reason: 'expired' }
 */
export function validateInviteToken(
  token: string,
  expirationDate: Date,
  currentDate?: Date
): {
  valid: boolean
  reason: string | null
} {
  // Check token format
  if (!validateTokenFormat(token)) {
    return {
      valid: false,
      reason: 'invalid_format',
    }
  }
  
  // Check if expired
  if (isTokenExpired(expirationDate, currentDate)) {
    return {
      valid: false,
      reason: 'expired',
    }
  }
  
  return {
    valid: true,
    reason: null,
  }
}
