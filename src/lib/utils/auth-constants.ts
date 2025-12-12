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
 * Supabase tokens are URL-safe strings, typically 32+ characters
 * We use 16 as a reasonable minimum to reject obviously invalid tokens
 * while accepting legitimate verification tokens
 */
export const MIN_VERIFICATION_TOKEN_LENGTH = 16
