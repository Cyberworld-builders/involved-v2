import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateInviteToken,
  getTokenExpiration,
  isTokenExpired,
  validateTokenFormat,
  generateInviteTokenWithExpiration,
  validateInviteToken,
} from '../invite-token-generation'

describe('generateInviteToken', () => {
  it('should generate a token', () => {
    const token = generateInviteToken()
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
  })

  it('should generate token with correct length (64 hex characters)', () => {
    const token = generateInviteToken()
    expect(token.length).toBe(64)
  })

  it('should generate token with only hexadecimal characters', () => {
    const token = generateInviteToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('should generate unique tokens', () => {
    const token1 = generateInviteToken()
    const token2 = generateInviteToken()
    expect(token1).not.toBe(token2)
  })

  it('should generate multiple unique tokens', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 10; i++) {
      tokens.add(generateInviteToken())
    }
    expect(tokens.size).toBe(10)
  })

  it('should not contain uppercase characters', () => {
    const token = generateInviteToken()
    expect(token).toBe(token.toLowerCase())
  })

  it('should not contain special characters', () => {
    const token = generateInviteToken()
    expect(token).not.toMatch(/[^0-9a-f]/)
  })

  it('should generate token with proper format for validation', () => {
    const token = generateInviteToken()
    expect(validateTokenFormat(token)).toBe(true)
  })
})

describe('getTokenExpiration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return a date 7 days from now', () => {
    const now = new Date('2024-01-01T00:00:00.000Z')
    vi.setSystemTime(now)
    
    const expiration = getTokenExpiration()
    const expected = new Date('2024-01-08T00:00:00.000Z')
    
    expect(expiration.getTime()).toBe(expected.getTime())
  })

  it('should return a date 7 days from provided date', () => {
    const baseDate = new Date('2024-06-15T12:30:00.000Z')
    const expiration = getTokenExpiration(baseDate)
    const expected = new Date('2024-06-22T12:30:00.000Z')
    
    expect(expiration.getTime()).toBe(expected.getTime())
  })

  it('should handle end of month correctly', () => {
    const baseDate = new Date('2024-01-25T00:00:00.000Z')
    const expiration = getTokenExpiration(baseDate)
    const expected = new Date('2024-02-01T00:00:00.000Z')
    
    expect(expiration.getTime()).toBe(expected.getTime())
  })

  it('should handle end of year correctly', () => {
    const baseDate = new Date('2024-12-28T00:00:00.000Z')
    const expiration = getTokenExpiration(baseDate)
    const expected = new Date('2025-01-04T00:00:00.000Z')
    
    expect(expiration.getTime()).toBe(expected.getTime())
  })

  it('should handle leap year correctly', () => {
    const baseDate = new Date('2024-02-26T00:00:00.000Z')
    const expiration = getTokenExpiration(baseDate)
    const expected = new Date('2024-03-04T00:00:00.000Z')
    
    expect(expiration.getTime()).toBe(expected.getTime())
  })

  it('should preserve time of day', () => {
    const baseDate = new Date('2024-01-01T14:30:45.123Z')
    const expiration = getTokenExpiration(baseDate)
    
    expect(expiration.getHours()).toBe(14)
    expect(expiration.getMinutes()).toBe(30)
    expect(expiration.getSeconds()).toBe(45)
    expect(expiration.getMilliseconds()).toBe(123)
  })

  it('should return Date object', () => {
    const expiration = getTokenExpiration()
    expect(expiration instanceof Date).toBe(true)
  })

  it('should return valid date', () => {
    const expiration = getTokenExpiration()
    expect(isNaN(expiration.getTime())).toBe(false)
  })
})

describe('isTokenExpired', () => {
  it('should return false for future date', () => {
    const futureDate = new Date('2025-12-31T23:59:59.999Z')
    const currentDate = new Date('2024-01-01T00:00:00.000Z')
    
    expect(isTokenExpired(futureDate, currentDate)).toBe(false)
  })

  it('should return true for past date', () => {
    const pastDate = new Date('2023-01-01T00:00:00.000Z')
    const currentDate = new Date('2024-01-01T00:00:00.000Z')
    
    expect(isTokenExpired(pastDate, currentDate)).toBe(true)
  })

  it('should return true for current exact time', () => {
    const now = new Date('2024-01-01T12:00:00.000Z')
    
    expect(isTokenExpired(now, now)).toBe(false)
  })

  it('should return true for date one millisecond in the past', () => {
    const currentDate = new Date('2024-01-01T12:00:00.001Z')
    const expirationDate = new Date('2024-01-01T12:00:00.000Z')
    
    expect(isTokenExpired(expirationDate, currentDate)).toBe(true)
  })

  it('should return false for date one millisecond in the future', () => {
    const currentDate = new Date('2024-01-01T12:00:00.000Z')
    const expirationDate = new Date('2024-01-01T12:00:00.001Z')
    
    expect(isTokenExpired(expirationDate, currentDate)).toBe(false)
  })

  it('should use current date when currentDate not provided', () => {
    const pastDate = new Date('2020-01-01T00:00:00.000Z')
    expect(isTokenExpired(pastDate)).toBe(true)
  })

  it('should return true for invalid date', () => {
    const invalidDate = new Date('invalid')
    const currentDate = new Date('2024-01-01T00:00:00.000Z')
    
    expect(isTokenExpired(invalidDate, currentDate)).toBe(true)
  })

  it('should return true for null date', () => {
    // @ts-expect-error - Testing invalid input
    expect(isTokenExpired(null)).toBe(true)
  })

  it('should return true for undefined date', () => {
    // @ts-expect-error - Testing invalid input
    expect(isTokenExpired(undefined)).toBe(true)
  })

  it('should handle date exactly 7 days from now as not expired', () => {
    const now = new Date('2024-01-01T00:00:00.000Z')
    const sevenDaysLater = new Date('2024-01-08T00:00:00.000Z')
    
    expect(isTokenExpired(sevenDaysLater, now)).toBe(false)
  })

  it('should handle date 7 days and 1 second from now as not expired', () => {
    const now = new Date('2024-01-01T00:00:00.000Z')
    const sevenDaysLater = new Date('2024-01-08T00:00:01.000Z')
    
    expect(isTokenExpired(sevenDaysLater, now)).toBe(false)
  })
})

describe('validateTokenFormat', () => {
  it('should validate correct token format', () => {
    const validToken = 'a'.repeat(64)
    expect(validateTokenFormat(validToken)).toBe(true)
  })

  it('should validate token with mixed hex characters', () => {
    const validToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    expect(validateTokenFormat(validToken)).toBe(true)
  })

  it('should validate token with all zeros', () => {
    const validToken = '0'.repeat(64)
    expect(validateTokenFormat(validToken)).toBe(true)
  })

  it('should validate token with all fs', () => {
    const validToken = 'f'.repeat(64)
    expect(validateTokenFormat(validToken)).toBe(true)
  })

  it('should reject token with uppercase characters', () => {
    const invalidToken = 'A'.repeat(64)
    expect(validateTokenFormat(invalidToken)).toBe(false)
  })

  it('should reject token that is too short', () => {
    const invalidToken = 'a'.repeat(63)
    expect(validateTokenFormat(invalidToken)).toBe(false)
  })

  it('should reject token that is too long', () => {
    const invalidToken = 'a'.repeat(65)
    expect(validateTokenFormat(invalidToken)).toBe(false)
  })

  it('should reject token with special characters', () => {
    const invalidToken = 'a'.repeat(63) + '!'
    expect(validateTokenFormat(invalidToken)).toBe(false)
  })

  it('should reject token with spaces', () => {
    const invalidToken = 'a'.repeat(63) + ' '
    expect(validateTokenFormat(invalidToken)).toBe(false)
  })

  it('should reject token with hyphens', () => {
    const invalidToken = 'a'.repeat(63) + '-'
    expect(validateTokenFormat(invalidToken)).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validateTokenFormat('')).toBe(false)
  })

  it('should reject whitespace-only string', () => {
    expect(validateTokenFormat('   ')).toBe(false)
  })

  it('should reject null', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateTokenFormat(null)).toBe(false)
  })

  it('should reject undefined', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateTokenFormat(undefined)).toBe(false)
  })

  it('should reject non-string input', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateTokenFormat(123)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateTokenFormat({})).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateTokenFormat([])).toBe(false)
  })

  it('should reject token with invalid hex characters (g-z)', () => {
    const invalidToken = 'g'.repeat(64)
    expect(validateTokenFormat(invalidToken)).toBe(false)
  })

  it('should validate tokens generated by generateInviteToken', () => {
    const token = generateInviteToken()
    expect(validateTokenFormat(token)).toBe(true)
  })
})

describe('generateInviteTokenWithExpiration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should generate an object with token and expiresAt', () => {
    const result = generateInviteTokenWithExpiration()
    
    expect(result).toHaveProperty('token')
    expect(result).toHaveProperty('expiresAt')
  })

  it('should generate valid token format', () => {
    const result = generateInviteTokenWithExpiration()
    
    expect(validateTokenFormat(result.token)).toBe(true)
  })

  it('should set expiration to 7 days from now', () => {
    const now = new Date('2024-01-01T00:00:00.000Z')
    vi.setSystemTime(now)
    
    const result = generateInviteTokenWithExpiration()
    const expected = new Date('2024-01-08T00:00:00.000Z')
    
    expect(result.expiresAt.getTime()).toBe(expected.getTime())
  })

  it('should return Date object for expiresAt', () => {
    const result = generateInviteTokenWithExpiration()
    
    expect(result.expiresAt instanceof Date).toBe(true)
  })

  it('should generate unique tokens on multiple calls', () => {
    const result1 = generateInviteTokenWithExpiration()
    const result2 = generateInviteTokenWithExpiration()
    
    expect(result1.token).not.toBe(result2.token)
  })

  it('should generate tokens that are not expired immediately', () => {
    const result = generateInviteTokenWithExpiration()
    
    expect(isTokenExpired(result.expiresAt)).toBe(false)
  })

  it('should have consistent expiration times for tokens generated at same time', () => {
    const now = new Date('2024-01-01T12:00:00.000Z')
    vi.setSystemTime(now)
    
    const result1 = generateInviteTokenWithExpiration()
    const result2 = generateInviteTokenWithExpiration()
    
    expect(result1.expiresAt.getTime()).toBe(result2.expiresAt.getTime())
  })
})

describe('validateInviteToken', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return valid for correct token and future expiration', () => {
    const token = generateInviteToken()
    const futureDate = new Date('2025-12-31T23:59:59.999Z')
    const currentDate = new Date('2024-01-01T00:00:00.000Z')
    
    const result = validateInviteToken(token, futureDate, currentDate)
    
    expect(result.valid).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('should return invalid for expired token', () => {
    const token = generateInviteToken()
    const pastDate = new Date('2023-01-01T00:00:00.000Z')
    const currentDate = new Date('2024-01-01T00:00:00.000Z')
    
    const result = validateInviteToken(token, pastDate, currentDate)
    
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('expired')
  })

  it('should return invalid for malformed token', () => {
    const invalidToken = 'invalid-token'
    const futureDate = new Date('2025-12-31T23:59:59.999Z')
    const currentDate = new Date('2024-01-01T00:00:00.000Z')
    
    const result = validateInviteToken(invalidToken, futureDate, currentDate)
    
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid_format')
  })

  it('should return invalid for empty token', () => {
    const futureDate = new Date('2025-12-31T23:59:59.999Z')
    const currentDate = new Date('2024-01-01T00:00:00.000Z')
    
    const result = validateInviteToken('', futureDate, currentDate)
    
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid_format')
  })

  it('should prioritize format validation over expiration check', () => {
    const invalidToken = 'short'
    const pastDate = new Date('2023-01-01T00:00:00.000Z')
    const currentDate = new Date('2024-01-01T00:00:00.000Z')
    
    const result = validateInviteToken(invalidToken, pastDate, currentDate)
    
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid_format')
  })

  it('should use current time when currentDate not provided', () => {
    const token = generateInviteToken()
    const pastDate = new Date('2020-01-01T00:00:00.000Z')
    
    const result = validateInviteToken(token, pastDate)
    
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('expired')
  })

  it('should validate token at exact expiration time as not expired', () => {
    const token = generateInviteToken()
    const expirationDate = new Date('2024-01-08T00:00:00.000Z')
    const currentDate = new Date('2024-01-08T00:00:00.000Z')
    
    const result = validateInviteToken(token, expirationDate, currentDate)
    
    expect(result.valid).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('should validate token one millisecond before expiration as valid', () => {
    const token = generateInviteToken()
    const expirationDate = new Date('2024-01-08T00:00:00.000Z')
    const currentDate = new Date('2024-01-07T23:59:59.999Z')
    
    const result = validateInviteToken(token, expirationDate, currentDate)
    
    expect(result.valid).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('should validate token one millisecond after expiration as invalid', () => {
    const token = generateInviteToken()
    const expirationDate = new Date('2024-01-08T00:00:00.000Z')
    const currentDate = new Date('2024-01-08T00:00:00.001Z')
    
    const result = validateInviteToken(token, expirationDate, currentDate)
    
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('expired')
  })

  it('should work with tokens from generateInviteTokenWithExpiration', () => {
    const now = new Date('2024-01-01T00:00:00.000Z')
    vi.setSystemTime(now)
    
    const { token, expiresAt } = generateInviteTokenWithExpiration()
    
    // Should be valid immediately after generation
    const result = validateInviteToken(token, expiresAt, now)
    expect(result.valid).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('should reject token after 7 days', () => {
    const now = new Date('2024-01-01T00:00:00.000Z')
    vi.setSystemTime(now)
    
    const { token, expiresAt } = generateInviteTokenWithExpiration()
    
    // Check 7 days and 1 second later
    const futureDate = new Date('2024-01-08T00:00:01.000Z')
    const result = validateInviteToken(token, expiresAt, futureDate)
    
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('expired')
  })

  it('should return object with valid and reason properties', () => {
    const token = generateInviteToken()
    const futureDate = new Date('2025-12-31T23:59:59.999Z')
    
    const result = validateInviteToken(token, futureDate)
    
    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('reason')
    expect(typeof result.valid).toBe('boolean')
  })
})
