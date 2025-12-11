/**
 * Username Generation Utilities
 * 
 * Provides functions to generate usernames from names or emails,
 * and handle duplicate username conflicts.
 */

/**
 * Generate a username from a full name
 * - Converts to lowercase
 * - Removes non-alphanumeric characters
 * - Truncates to 20 characters
 * 
 * @param name - The full name to generate username from
 * @returns Generated username
 */
export function generateUsernameFromName(name: string): string {
  if (!name || typeof name !== 'string') {
    return ''
  }

  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20)
}

/**
 * Generate a username from an email address
 * - Extracts the part before @
 * - Converts to lowercase
 * - Removes non-alphanumeric characters
 * - Truncates to 20 characters
 * 
 * @param email - The email address to generate username from
 * @returns Generated username
 */
export function generateUsernameFromEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  const emailPart = email.split('@')[0]
  return generateUsernameFromName(emailPart)
}

/**
 * Generate a unique username by checking for duplicates and appending numbers
 * 
 * @param baseUsername - The base username to check
 * @param checkExists - Async function that checks if a username exists (returns true if exists)
 * @returns A unique username
 */
export async function generateUniqueUsername(
  baseUsername: string,
  checkExists: (username: string) => Promise<boolean>
): Promise<string> {
  if (!baseUsername) {
    throw new Error('Base username cannot be empty')
  }

  // Check if base username is available
  const exists = await checkExists(baseUsername)
  if (!exists) {
    return baseUsername
  }

  // Try appending numbers 1-999
  for (let counter = 1; counter < 1000; counter++) {
    const candidate = `${baseUsername}${counter}`
    const candidateExists = await checkExists(candidate)
    if (!candidateExists) {
      return candidate
    }
  }

  // Fallback to timestamp if we can't find a unique username
  return `${baseUsername}${Date.now()}`
}

/**
 * Generate username from first and last name
 * - Combines first and last name
 * - Converts to lowercase
 * - Removes non-alphanumeric characters
 * - Truncates to 20 characters
 * 
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Generated username
 */
export function generateUsernameFromFirstLast(firstName: string, lastName: string): string {
  const fullName = `${firstName}${lastName}`
  return generateUsernameFromName(fullName)
}
