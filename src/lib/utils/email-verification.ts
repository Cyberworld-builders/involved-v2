/**
 * Email Verification Utilities
 * 
 * Provides functions to generate verification tokens, validate verification links,
 * and manage email verification status.
 */

/**
 * Generate a secure verification token
 * - Generates a random alphanumeric token
 * - Uses crypto.getRandomValues() for cryptographically secure randomness
 * - Falls back to Math.random() only in environments without crypto (e.g., older browsers or test environments)
 * - Default length is 32 characters
 * 
 * @param length - The length of the token (default: 32)
 * @returns Generated verification token
 * 
 * @security The fallback to Math.random() is less secure and should only be used in non-production
 * environments. Modern browsers and Node.js provide crypto.getRandomValues().
 */
export function generateVerificationToken(length: number = 32): string {
  if (length <= 0 || !Number.isInteger(length)) {
    throw new Error('Token length must be a positive integer')
  }

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  
  // Use crypto.getRandomValues for cryptographically secure random generation
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint32Array(length)
    crypto.getRandomValues(randomValues)
    
    for (let i = 0; i < length; i++) {
      token += characters.charAt(randomValues[i] % characters.length)
    }
  } else {
    // Fallback to Math.random (less secure, mainly for testing/legacy environments)
    // WARNING: This should not be used in production for security-critical tokens
    for (let i = 0; i < length; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length))
    }
  }
  
  return token
}

/**
 * Validate a verification link
 * - Checks if URL is valid
 * - Extracts and validates token parameter
 * - Ensures token meets minimum requirements
 * 
 * @param link - The verification link to validate
 * @returns Object with validation result and extracted token
 */
export function validateVerificationLink(link: string): {
  isValid: boolean
  token: string | null
  error?: string
} {
  if (!link || typeof link !== 'string') {
    return {
      isValid: false,
      token: null,
      error: 'Link must be a non-empty string',
    }
  }

  try {
    const url = new URL(link)
    const token = url.searchParams.get('token')

    if (!token) {
      return {
        isValid: false,
        token: null,
        error: 'Token parameter is missing',
      }
    }

    // Token should be at least 16 characters and alphanumeric
    if (token.length < 16) {
      return {
        isValid: false,
        token: null,
        error: 'Token is too short (minimum 16 characters)',
      }
    }

    if (!/^[A-Za-z0-9]+$/.test(token)) {
      return {
        isValid: false,
        token: null,
        error: 'Token contains invalid characters',
      }
    }

    return {
      isValid: true,
      token,
    }
  } catch {
    return {
      isValid: false,
      token: null,
      error: 'Invalid URL format',
    }
  }
}

/**
 * Check if a verification token has expired
 * - Compares the creation timestamp with current time
 * - Default expiration is 24 hours (86400000 ms)
 * 
 * @param createdAt - The timestamp when the token was created (Date or ISO string)
 * @param expirationMs - Expiration time in milliseconds (default: 24 hours)
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(
  createdAt: Date | string,
  expirationMs: number = 86400000
): boolean {
  if (!createdAt) {
    throw new Error('createdAt is required')
  }

  if (expirationMs <= 0) {
    throw new Error('Expiration time must be positive')
  }

  try {
    const createdDate = createdAt instanceof Date ? createdAt : new Date(createdAt)
    
    // Check if date is valid
    if (isNaN(createdDate.getTime())) {
      throw new Error('Invalid date format')
    }

    const now = new Date()
    const elapsedMs = now.getTime() - createdDate.getTime()
    
    return elapsedMs > expirationMs
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to check token expiration')
  }
}
