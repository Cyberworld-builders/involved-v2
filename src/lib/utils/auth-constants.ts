/**
 * Authentication Constants
 * 
 * Centralized configuration values for authentication functionality
 */

/**
 * Minimum password length for user accounts
 */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Minimum token length for email verification
 * Supabase OTP tokens are typically 6 characters, but we set a higher minimum
 * for additional security validation
 */
export const MIN_VERIFICATION_TOKEN_LENGTH = 16
