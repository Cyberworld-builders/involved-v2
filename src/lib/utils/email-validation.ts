/**
 * Email Validation Utilities
 * 
 * Provides functions to validate email format.
 */

/**
 * Regular expression for validating email format
 * Matches standard email format: localpart@domain.tld
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate email format
 * 
 * @param email - The email address to validate
 * @returns true if email format is valid, false otherwise
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  return EMAIL_REGEX.test(email.trim())
}
