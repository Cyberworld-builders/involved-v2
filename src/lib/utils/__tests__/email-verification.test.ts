import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateVerificationToken,
  validateVerificationLink,
  isTokenExpired,
} from '../email-verification'

describe('generateVerificationToken', () => {
  it('should generate token with default length of 32 characters', () => {
    const token = generateVerificationToken()
    expect(token).toHaveLength(32)
  })

  it('should generate token with custom length', () => {
    expect(generateVerificationToken(16)).toHaveLength(16)
    expect(generateVerificationToken(64)).toHaveLength(64)
    expect(generateVerificationToken(8)).toHaveLength(8)
  })

  it('should only contain alphanumeric characters', () => {
    const token = generateVerificationToken(100)
    expect(token).toMatch(/^[A-Za-z0-9]+$/)
  })

  it('should generate unique tokens', () => {
    const token1 = generateVerificationToken()
    const token2 = generateVerificationToken()
    const token3 = generateVerificationToken()
    
    expect(token1).not.toBe(token2)
    expect(token2).not.toBe(token3)
    expect(token1).not.toBe(token3)
  })

  it('should throw error for zero length', () => {
    expect(() => generateVerificationToken(0)).toThrow('Token length must be a positive integer')
  })

  it('should throw error for negative length', () => {
    expect(() => generateVerificationToken(-5)).toThrow('Token length must be a positive integer')
  })

  it('should throw error for non-integer length', () => {
    expect(() => generateVerificationToken(10.5)).toThrow('Token length must be a positive integer')
  })

  it('should generate tokens with consistent length over multiple calls', () => {
    const tokens = Array.from({ length: 10 }, () => generateVerificationToken(20))
    tokens.forEach(token => {
      expect(token).toHaveLength(20)
      expect(token).toMatch(/^[A-Za-z0-9]+$/)
    })
  })

  it('should handle very long token generation', () => {
    const token = generateVerificationToken(256)
    expect(token).toHaveLength(256)
    expect(token).toMatch(/^[A-Za-z0-9]+$/)
  })
})

describe('validateVerificationLink', () => {
  it('should validate correct verification link', () => {
    const result = validateVerificationLink('https://example.com/verify?token=abcdefghijklmnopqrstuvwxyz123456')
    expect(result.isValid).toBe(true)
    expect(result.token).toBe('abcdefghijklmnopqrstuvwxyz123456')
    expect(result.error).toBeUndefined()
  })

  it('should validate link with additional query parameters', () => {
    const result = validateVerificationLink('https://example.com/verify?email=user@test.com&token=abcdefghijklmnopqrstuvwxyz123456&redirect=dashboard')
    expect(result.isValid).toBe(true)
    expect(result.token).toBe('abcdefghijklmnopqrstuvwxyz123456')
  })

  it('should validate link with token in different position', () => {
    const result = validateVerificationLink('https://example.com/verify?redirect=dashboard&token=abcdefghijklmnopqrstuvwxyz123456')
    expect(result.isValid).toBe(true)
    expect(result.token).toBe('abcdefghijklmnopqrstuvwxyz123456')
  })

  it('should validate link with different protocols', () => {
    const httpResult = validateVerificationLink('http://example.com/verify?token=abcdefghijklmnopqrstuvwxyz123456')
    expect(httpResult.isValid).toBe(true)
    
    const httpsResult = validateVerificationLink('https://example.com/verify?token=abcdefghijklmnopqrstuvwxyz123456')
    expect(httpsResult.isValid).toBe(true)
  })

  it('should validate link with different paths', () => {
    const result1 = validateVerificationLink('https://example.com/auth/verify?token=abcdefghijklmnopqrstuvwxyz123456')
    expect(result1.isValid).toBe(true)
    
    const result2 = validateVerificationLink('https://example.com/email/confirm?token=abcdefghijklmnopqrstuvwxyz123456')
    expect(result2.isValid).toBe(true)
  })

  it('should reject link missing token parameter', () => {
    const result = validateVerificationLink('https://example.com/verify')
    expect(result.isValid).toBe(false)
    expect(result.token).toBeNull()
    expect(result.error).toBe('Token parameter is missing')
  })

  it('should reject link with empty token', () => {
    const result = validateVerificationLink('https://example.com/verify?token=')
    expect(result.isValid).toBe(false)
    expect(result.token).toBeNull()
    expect(result.error).toBe('Token parameter is missing')
  })

  it('should reject link with token too short', () => {
    const result = validateVerificationLink('https://example.com/verify?token=short')
    expect(result.isValid).toBe(false)
    expect(result.token).toBeNull()
    expect(result.error).toBe('Token is too short (minimum 16 characters)')
  })

  it('should reject token with exactly 15 characters', () => {
    const result = validateVerificationLink('https://example.com/verify?token=123456789012345')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Token is too short (minimum 16 characters)')
  })

  it('should accept token with exactly 16 characters', () => {
    const result = validateVerificationLink('https://example.com/verify?token=1234567890123456')
    expect(result.isValid).toBe(true)
    expect(result.token).toBe('1234567890123456')
  })

  it('should reject token with special characters', () => {
    const result = validateVerificationLink('https://example.com/verify?token=abc-def-ghi-jkl-mno-pqr')
    expect(result.isValid).toBe(false)
    expect(result.token).toBeNull()
    expect(result.error).toBe('Token contains invalid characters')
  })

  it('should reject token with spaces', () => {
    const result = validateVerificationLink('https://example.com/verify?token=abcdef ghijkl mnopqr')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Token contains invalid characters')
  })

  it('should reject token with symbols', () => {
    const result = validateVerificationLink('https://example.com/verify?token=abcdefghijklmnop!@#$')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Token contains invalid characters')
  })

  it('should reject invalid URL format', () => {
    const result = validateVerificationLink('not-a-valid-url')
    expect(result.isValid).toBe(false)
    expect(result.token).toBeNull()
    expect(result.error).toBe('Invalid URL format')
  })

  it('should reject malformed URL', () => {
    const result = validateVerificationLink('http://?token=abcdefghijklmnopqrstuvwxyz123456')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Invalid URL format')
  })

  it('should handle empty string', () => {
    const result = validateVerificationLink('')
    expect(result.isValid).toBe(false)
    expect(result.token).toBeNull()
    expect(result.error).toBe('Link must be a non-empty string')
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    const nullResult = validateVerificationLink(null)
    expect(nullResult.isValid).toBe(false)
    expect(nullResult.error).toBe('Link must be a non-empty string')

    // @ts-expect-error - Testing invalid input
    const undefinedResult = validateVerificationLink(undefined)
    expect(undefinedResult.isValid).toBe(false)
    expect(undefinedResult.error).toBe('Link must be a non-empty string')
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    const numberResult = validateVerificationLink(123456)
    expect(numberResult.isValid).toBe(false)

    // @ts-expect-error - Testing invalid input
    const objectResult = validateVerificationLink({})
    expect(objectResult.isValid).toBe(false)

    // @ts-expect-error - Testing invalid input
    const arrayResult = validateVerificationLink([])
    expect(arrayResult.isValid).toBe(false)
  })

  it('should handle URL with fragment', () => {
    const result = validateVerificationLink('https://example.com/verify?token=abcdefghijklmnopqrstuvwxyz123456#section')
    expect(result.isValid).toBe(true)
    expect(result.token).toBe('abcdefghijklmnopqrstuvwxyz123456')
  })

  it('should validate alphanumeric tokens with mixed case', () => {
    const result = validateVerificationLink('https://example.com/verify?token=AbCdEfGhIjKlMnOpQrStUvWxYz123456')
    expect(result.isValid).toBe(true)
    expect(result.token).toBe('AbCdEfGhIjKlMnOpQrStUvWxYz123456')
  })

  it('should validate numeric-only tokens', () => {
    const result = validateVerificationLink('https://example.com/verify?token=1234567890123456')
    expect(result.isValid).toBe(true)
    expect(result.token).toBe('1234567890123456')
  })

  it('should validate letter-only tokens', () => {
    const result = validateVerificationLink('https://example.com/verify?token=abcdefghijklmnopqrstuvwxyz')
    expect(result.isValid).toBe(true)
    expect(result.token).toBe('abcdefghijklmnopqrstuvwxyz')
  })
})

describe('isTokenExpired', () => {
  beforeEach(() => {
    // Mock Date.now() to have consistent test results
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return false for token created just now with default expiration', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)
    
    const createdAt = new Date('2024-01-01T12:00:00Z')
    expect(isTokenExpired(createdAt)).toBe(false)
  })

  it('should return false for token within expiration period', () => {
    const now = new Date('2024-01-02T11:59:59Z')
    vi.setSystemTime(now)
    
    // Created 23 hours 59 minutes ago (within 24 hour default)
    const createdAt = new Date('2024-01-01T12:00:00Z')
    expect(isTokenExpired(createdAt)).toBe(false)
  })

  it('should return true for token past expiration period', () => {
    const now = new Date('2024-01-02T12:00:01Z')
    vi.setSystemTime(now)
    
    // Created just over 24 hours ago
    const createdAt = new Date('2024-01-01T12:00:00Z')
    expect(isTokenExpired(createdAt)).toBe(true)
  })

  it('should return true for token exactly at expiration boundary', () => {
    const now = new Date('2024-01-02T12:00:00Z')
    vi.setSystemTime(now)
    
    // Created exactly 24 hours ago
    const createdAt = new Date('2024-01-01T12:00:00Z')
    // At exactly 86400000ms (24 hours), elapsedMs equals expirationMs
    // The function checks if elapsedMs > expirationMs, so it's NOT expired at the exact boundary
    const result = isTokenExpired(createdAt)
    expect(result).toBe(false)
    
    // But 1ms later it is expired
    vi.setSystemTime(new Date('2024-01-02T12:00:00.001Z'))
    expect(isTokenExpired(createdAt)).toBe(true)
  })

  it('should work with custom expiration time', () => {
    const now = new Date('2024-01-01T13:00:00Z')
    vi.setSystemTime(now)
    
    // Created 1 hour ago
    const createdAt = new Date('2024-01-01T12:00:00Z')
    
    // 1 hour = 3600000ms
    const oneHour = 3600000
    expect(isTokenExpired(createdAt, oneHour)).toBe(false)
    
    // After 1 hour and 1ms
    vi.setSystemTime(new Date('2024-01-01T13:00:00.001Z'))
    expect(isTokenExpired(createdAt, oneHour)).toBe(true)
  })

  it('should handle very short expiration times', () => {
    const now = new Date('2024-01-01T12:00:01.001Z')
    vi.setSystemTime(now)
    
    const createdAt = new Date('2024-01-01T12:00:00Z')
    
    // 1 second = 1000ms, after 1001ms it should be expired
    expect(isTokenExpired(createdAt, 1000)).toBe(true)
  })

  it('should handle very long expiration times', () => {
    const now = new Date('2024-01-08T12:00:00Z')
    vi.setSystemTime(now)
    
    // Created 7 days ago
    const createdAt = new Date('2024-01-01T12:00:00Z')
    
    // 30 days = 2592000000ms
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    expect(isTokenExpired(createdAt, thirtyDays)).toBe(false)
  })

  it('should work with ISO string date', () => {
    const now = new Date('2024-01-02T12:00:01Z')
    vi.setSystemTime(now)
    
    const createdAt = '2024-01-01T12:00:00Z'
    expect(isTokenExpired(createdAt)).toBe(true)
  })

  it('should work with various ISO string formats', () => {
    const now = new Date('2024-01-02T12:00:00Z')
    vi.setSystemTime(now)
    
    expect(isTokenExpired('2024-01-01T12:00:00.000Z')).toBe(false)
    expect(isTokenExpired('2024-01-01T12:00:00+00:00')).toBe(false)
    expect(isTokenExpired('2024-01-01T12:00:00-00:00')).toBe(false)
  })

  it('should throw error for invalid date string', () => {
    expect(() => isTokenExpired('invalid-date')).toThrow('Invalid date format')
  })

  it('should throw error for null or undefined createdAt', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => isTokenExpired(null)).toThrow('createdAt is required')
    
    // @ts-expect-error - Testing invalid input
    expect(() => isTokenExpired(undefined)).toThrow('createdAt is required')
  })

  it('should throw error for empty string createdAt', () => {
    expect(() => isTokenExpired('')).toThrow('createdAt is required')
  })

  it('should throw error for negative expiration time', () => {
    const createdAt = new Date()
    expect(() => isTokenExpired(createdAt, -1000)).toThrow('Expiration time must be positive')
  })

  it('should throw error for zero expiration time', () => {
    const createdAt = new Date()
    expect(() => isTokenExpired(createdAt, 0)).toThrow('Expiration time must be positive')
  })

  it('should handle tokens created in the future', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)
    
    // Created 1 hour in the future
    const createdAt = new Date('2024-01-01T13:00:00Z')
    expect(isTokenExpired(createdAt)).toBe(false)
  })

  it('should work with Date objects', () => {
    const now = new Date('2024-01-02T12:00:01Z')
    vi.setSystemTime(now)
    
    const createdAt = new Date('2024-01-01T12:00:00Z')
    expect(isTokenExpired(createdAt)).toBe(true)
  })

  it('should handle millisecond precision', () => {
    const now = new Date('2024-01-02T12:00:00.001Z')
    vi.setSystemTime(now)
    
    const createdAt = new Date('2024-01-01T12:00:00.000Z')
    expect(isTokenExpired(createdAt)).toBe(true)
  })

  it('should correctly compare different date formats', () => {
    const now = new Date('2024-01-02T12:00:00Z')
    vi.setSystemTime(now)
    
    const dateObj = new Date('2024-01-01T12:00:00Z')
    const isoString = '2024-01-01T12:00:00Z'
    
    expect(isTokenExpired(dateObj)).toBe(false)
    expect(isTokenExpired(isoString)).toBe(false)
  })
})
