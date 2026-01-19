/**
 * Generate a secure temporary password
 * 
 * Generates a random password that meets minimum security requirements:
 * - At least 12 characters long
 * - Contains uppercase, lowercase, numbers, and special characters
 * - Easy to read (avoids confusing characters like 0/O, 1/l/I)
 */

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Excludes I and O
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz' // Excludes l
const NUMBERS = '23456789' // Excludes 0 and 1
const SPECIAL = '!@#$%&*' // Common, easy-to-type special characters

const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL

/**
 * Generate a secure temporary password
 * @param length - Length of password (default: 12)
 * @returns A secure random password
 */
export function generateTemporaryPassword(length: number = 12): string {
  if (length < 8) {
    throw new Error('Password length must be at least 8 characters')
  }

  // Ensure we have at least one character from each required set
  const password: string[] = [
    UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)],
    LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)],
    NUMBERS[Math.floor(Math.random() * NUMBERS.length)],
    SPECIAL[Math.floor(Math.random() * SPECIAL.length)],
  ]

  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password.push(ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)])
  }

  // Shuffle the password array to avoid predictable patterns
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]]
  }

  return password.join('')
}
