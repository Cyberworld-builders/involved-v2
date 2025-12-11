/**
 * Color Validation Utilities
 * 
 * Provides functions to validate and sanitize hex color codes
 * for use in client and assessment customization.
 */

/**
 * Validate if a string is a valid hex color
 * - Must start with #
 * - Must be followed by exactly 3 or 6 hexadecimal characters
 * 
 * @param color - The color string to validate
 * @returns true if valid hex color, false otherwise
 * 
 * @example
 * validateHexColor('#2D2E30') // true
 * validateHexColor('#FFF') // true
 * validateHexColor('2D2E30') // false (missing #)
 * validateHexColor('#GGG') // false (invalid characters)
 */
export function validateHexColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false
  }

  // Trim whitespace for validation
  const trimmed = color.trim()

  // Must start with # and be followed by 3 or 6 hex characters
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return hexColorRegex.test(trimmed)
}

/**
 * Sanitize and validate a hex color string
 * - Trims whitespace
 * - Converts to uppercase
 * - Validates format
 * - Returns sanitized color or null for invalid input
 * 
 * @param color - The color string to sanitize
 * @returns Sanitized hex color string or null if invalid
 * 
 * @example
 * sanitizeHexColor('  #2d2e30  ') // '#2D2E30'
 * sanitizeHexColor('#ffba00') // '#FFBA00'
 * sanitizeHexColor('2D2E30') // null (missing #)
 * sanitizeHexColor('#GGG') // null (invalid characters)
 */
export function sanitizeHexColor(color: string): string | null {
  if (!color || typeof color !== 'string') {
    return null
  }

  // Trim whitespace
  const trimmed = color.trim()

  // Validate format
  if (!validateHexColor(trimmed)) {
    return null
  }

  // Convert to uppercase
  return trimmed.toUpperCase()
}
