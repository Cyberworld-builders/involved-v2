import { describe, it, expect } from 'vitest'
import { isValidEmail, EMAIL_REGEX } from '../email-validation'

describe('isValidEmail', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('test.user@example.com')).toBe(true)
    expect(isValidEmail('user+tag@example.co.uk')).toBe(true)
    expect(isValidEmail('user123@test-domain.com')).toBe(true)
  })

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('user @example.com')).toBe(false)
    expect(isValidEmail('user@example')).toBe(false)
  })

  it('should handle empty and null values', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
    expect(isValidEmail(undefined)).toBe(false)
  })

  it('should trim whitespace before validation', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true)
    expect(isValidEmail('\tuser@example.com\n')).toBe(true)
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(isValidEmail(123)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(isValidEmail({})).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(isValidEmail([])).toBe(false)
  })
})

describe('EMAIL_REGEX', () => {
  it('should be a valid regular expression', () => {
    expect(EMAIL_REGEX).toBeInstanceOf(RegExp)
  })

  it('should match valid email patterns', () => {
    expect(EMAIL_REGEX.test('user@example.com')).toBe(true)
    expect(EMAIL_REGEX.test('test@test.co.uk')).toBe(true)
  })

  it('should not match invalid email patterns', () => {
    expect(EMAIL_REGEX.test('invalid')).toBe(false)
    expect(EMAIL_REGEX.test('user@')).toBe(false)
  })
})
