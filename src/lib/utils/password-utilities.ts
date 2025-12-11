/**
 * Password Utilities
 * 
 * Provides functions for password validation, strength checking,
 * and password comparison for use in authentication and user management.
 */

/**
 * Password validation configuration
 */
export interface PasswordValidationConfig {
  minLength?: number
  requireUppercase?: boolean
  requireLowercase?: boolean
  requireNumbers?: boolean
  requireSpecialChars?: boolean
}

/**
 * Default password validation configuration
 */
const DEFAULT_CONFIG: Required<PasswordValidationConfig> = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Password strength levels
 */
export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

/**
 * Validate a password against specified rules
 * 
 * @param password - The password to validate
 * @param config - Optional validation configuration
 * @returns Validation result with errors if any
 * 
 * @example
 * validatePassword('Test123!') // { isValid: true, errors: [] }
 * validatePassword('test') // { isValid: false, errors: ['Password must be at least 8 characters...'] }
 */
export function validatePassword(
  password: string,
  config: PasswordValidationConfig = {}
): PasswordValidationResult {
  const errors: string[] = []
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required')
    return { isValid: false, errors }
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // Check minimum length
  if (password.length < finalConfig.minLength) {
    errors.push(`Password must be at least ${finalConfig.minLength} characters long`)
  }

  // Check for uppercase letters
  if (finalConfig.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  // Check for lowercase letters
  if (finalConfig.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  // Check for numbers
  if (finalConfig.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // Check for special characters
  if (finalConfig.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Check the strength of a password
 * 
 * @param password - The password to check
 * @returns Password strength level
 * 
 * @example
 * checkPasswordStrength('test') // PasswordStrength.WEAK
 * checkPasswordStrength('Test123!') // PasswordStrength.MEDIUM
 * checkPasswordStrength('Test123!@#$%') // PasswordStrength.STRONG
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  if (!password || typeof password !== 'string') {
    return PasswordStrength.WEAK
  }

  let score = 0

  // Length scoring
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1 // lowercase
  if (/[A-Z]/.test(password)) score += 1 // uppercase
  if (/[0-9]/.test(password)) score += 1 // numbers
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1 // special chars

  // Determine strength based on score
  if (score <= 3) return PasswordStrength.WEAK
  if (score <= 5) return PasswordStrength.MEDIUM
  if (score <= 6) return PasswordStrength.STRONG
  return PasswordStrength.VERY_STRONG
}

/**
 * Check if a password meets minimum requirements
 * 
 * @param password - The password to check
 * @param config - Optional validation configuration
 * @returns true if password is valid, false otherwise
 * 
 * @example
 * isPasswordValid('Test123!') // true
 * isPasswordValid('test') // false
 */
export function isPasswordValid(
  password: string,
  config: PasswordValidationConfig = {}
): boolean {
  const result = validatePassword(password, config)
  return result.isValid
}

/**
 * Compare two passwords for equality
 * 
 * @param password1 - First password
 * @param password2 - Second password
 * @returns true if passwords match, false otherwise
 * 
 * @example
 * comparePasswords('test123', 'test123') // true
 * comparePasswords('test123', 'test456') // false
 */
export function comparePasswords(password1: string, password2: string): boolean {
  if (!password1 || !password2 || typeof password1 !== 'string' || typeof password2 !== 'string') {
    return false
  }
  
  return password1 === password2
}

/**
 * Get password strength as a percentage (0-100)
 * 
 * @param password - The password to evaluate
 * @returns Strength as a percentage
 * 
 * @example
 * getPasswordStrengthPercentage('test') // 25
 * getPasswordStrengthPercentage('Test123!') // 50-75
 */
export function getPasswordStrengthPercentage(password: string): number {
  const strength = checkPasswordStrength(password)
  
  switch (strength) {
    case PasswordStrength.WEAK:
      return 25
    case PasswordStrength.MEDIUM:
      return 50
    case PasswordStrength.STRONG:
      return 75
    case PasswordStrength.VERY_STRONG:
      return 100
    default:
      return 0
  }
}
