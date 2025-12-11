import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  checkPasswordStrength,
  isPasswordValid,
  comparePasswords,
  getPasswordStrengthPercentage,
  PasswordStrength,
  type PasswordValidationConfig,
} from '../password-utilities'

describe('validatePassword', () => {
  it('should validate a strong password with all requirements', () => {
    const result = validatePassword('Test123!')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should validate password with default configuration', () => {
    const result = validatePassword('MyP@ssw0rd')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject password that is too short', () => {
    const result = validatePassword('Test1!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must be at least 8 characters long')
  })

  it('should reject password without uppercase letters', () => {
    const result = validatePassword('test123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('should reject password without lowercase letters', () => {
    const result = validatePassword('TEST123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one lowercase letter')
  })

  it('should reject password without numbers', () => {
    const result = validatePassword('TestPass!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one number')
  })

  it('should reject password without special characters', () => {
    const result = validatePassword('TestPass123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one special character')
  })

  it('should accumulate multiple validation errors', () => {
    const result = validatePassword('test')
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
    expect(result.errors).toContain('Password must be at least 8 characters long')
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('should accept custom minimum length', () => {
    const config: PasswordValidationConfig = { minLength: 6 }
    const result = validatePassword('Test1!', config)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should accept password without uppercase when not required', () => {
    const config: PasswordValidationConfig = { requireUppercase: false }
    const result = validatePassword('test123!')
    expect(result.isValid).toBe(false) // still fails on uppercase with default config
    
    const result2 = validatePassword('test123!', config)
    expect(result2.isValid).toBe(true)
  })

  it('should accept password without lowercase when not required', () => {
    const config: PasswordValidationConfig = { requireLowercase: false }
    const result = validatePassword('TEST123!', config)
    expect(result.isValid).toBe(true)
  })

  it('should accept password without numbers when not required', () => {
    const config: PasswordValidationConfig = { requireNumbers: false }
    const result = validatePassword('TestPass!', config)
    expect(result.isValid).toBe(true)
  })

  it('should accept password without special characters when not required', () => {
    const config: PasswordValidationConfig = { requireSpecialChars: false }
    const result = validatePassword('TestPass123', config)
    expect(result.isValid).toBe(true)
  })

  it('should allow all requirements to be disabled', () => {
    const config: PasswordValidationConfig = {
      minLength: 4,
      requireUppercase: false,
      requireLowercase: false,
      requireNumbers: false,
      requireSpecialChars: false,
    }
    const result = validatePassword('test', config)
    expect(result.isValid).toBe(true)
  })

  it('should handle empty string', () => {
    const result = validatePassword('')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password is required')
  })

  it('should handle null input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    const result = validatePassword(null)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password is required')
  })

  it('should handle undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    const result = validatePassword(undefined)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password is required')
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    const result = validatePassword(123456)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password is required')
  })

  it('should validate password with various special characters', () => {
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', ':', '"', "'", '\\', '|', ',', '.', '<', '>', '/', '?']
    
    specialChars.forEach((char) => {
      const result = validatePassword(`Test123${char}`)
      expect(result.isValid).toBe(true)
    })
  })

  it('should handle very long passwords', () => {
    const longPassword = 'A'.repeat(50) + 'a'.repeat(50) + '1'.repeat(50) + '!'
    const result = validatePassword(longPassword)
    expect(result.isValid).toBe(true)
  })

  it('should validate password at minimum length boundary', () => {
    const result = validatePassword('Test123!')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject password just under minimum length', () => {
    const result = validatePassword('Test12!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must be at least 8 characters long')
  })
})

describe('checkPasswordStrength', () => {
  it('should rate empty string as weak', () => {
    expect(checkPasswordStrength('')).toBe(PasswordStrength.WEAK)
  })

  it('should rate very short password as weak', () => {
    expect(checkPasswordStrength('test')).toBe(PasswordStrength.WEAK)
  })

  it('should rate short password with limited variety as weak', () => {
    expect(checkPasswordStrength('test123')).toBe(PasswordStrength.WEAK)
  })

  it('should rate 8-char password with good variety as medium', () => {
    expect(checkPasswordStrength('Test123!')).toBe(PasswordStrength.MEDIUM)
  })

  it('should rate 12-char password with good variety as strong', () => {
    expect(checkPasswordStrength('Test1234567!')).toBe(PasswordStrength.STRONG)
  })

  it('should rate 16-char password with excellent variety as very strong', () => {
    expect(checkPasswordStrength('Test1234567890!@')).toBe(PasswordStrength.VERY_STRONG)
  })

  it('should rate password based on length', () => {
    expect(checkPasswordStrength('a'.repeat(7))).toBe(PasswordStrength.WEAK)
    expect(checkPasswordStrength('a'.repeat(8))).toBe(PasswordStrength.WEAK)
    expect(checkPasswordStrength('Aa1!'.repeat(3))).toBe(PasswordStrength.STRONG) // 12 chars
    expect(checkPasswordStrength('Aa1!'.repeat(4))).toBe(PasswordStrength.VERY_STRONG) // 16 chars
  })

  it('should rate password based on character variety', () => {
    expect(checkPasswordStrength('aaaaaaaa')).toBe(PasswordStrength.WEAK) // 8 chars, 1 type = weak
    expect(checkPasswordStrength('aaaaaaaaA')).toBe(PasswordStrength.WEAK) // 9 chars, 2 types = weak
    expect(checkPasswordStrength('aaaaaaaaA1')).toBe(PasswordStrength.MEDIUM) // 10 chars, 3 types = medium
    expect(checkPasswordStrength('aaaaaaaaA1!')).toBe(PasswordStrength.MEDIUM) // 11 chars, 4 types = medium
  })

  it('should handle null input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(checkPasswordStrength(null)).toBe(PasswordStrength.WEAK)
  })

  it('should handle undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(checkPasswordStrength(undefined)).toBe(PasswordStrength.WEAK)
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(checkPasswordStrength(123456)).toBe(PasswordStrength.WEAK)
  })

  it('should rate password with only lowercase as weak-medium', () => {
    // 16 chars with only 1 char type gets length bonus but lacks variety
    expect(checkPasswordStrength('abcdefghijklmnop')).toBe(PasswordStrength.MEDIUM)
  })

  it('should rate password with only uppercase as weak-medium', () => {
    // 16 chars with only 1 char type gets length bonus but lacks variety
    expect(checkPasswordStrength('ABCDEFGHIJKLMNOP')).toBe(PasswordStrength.MEDIUM)
  })

  it('should rate password with only numbers as weak-medium', () => {
    // 20 chars with only 1 char type gets length bonus but lacks variety
    expect(checkPasswordStrength('12345678901234567890')).toBe(PasswordStrength.MEDIUM)
  })

  it('should rate password with mixed case as better', () => {
    expect(checkPasswordStrength('AbCdEfGhIjKlMnOp')).toBe(PasswordStrength.MEDIUM)
  })

  it('should rate password with all character types as strong', () => {
    expect(checkPasswordStrength('Aa1!Bb2@Cc3#Dd4$')).toBe(PasswordStrength.VERY_STRONG)
  })
})

describe('isPasswordValid', () => {
  it('should return true for valid password', () => {
    expect(isPasswordValid('Test123!')).toBe(true)
  })

  it('should return false for invalid password', () => {
    expect(isPasswordValid('test')).toBe(false)
  })

  it('should accept custom configuration', () => {
    const config: PasswordValidationConfig = {
      minLength: 6,
      requireSpecialChars: false,
    }
    expect(isPasswordValid('Test12', config)).toBe(true)
  })

  it('should return false for empty string', () => {
    expect(isPasswordValid('')).toBe(false)
  })

  it('should return false for null input', () => {
    // @ts-expect-error - Testing invalid input
    expect(isPasswordValid(null)).toBe(false)
  })

  it('should return false for undefined input', () => {
    // @ts-expect-error - Testing invalid input
    expect(isPasswordValid(undefined)).toBe(false)
  })

  it('should validate with all default requirements', () => {
    expect(isPasswordValid('Short1!')).toBe(false) // too short
    expect(isPasswordValid('nouppercase123!')).toBe(false) // no uppercase
    expect(isPasswordValid('NOLOWERCASE123!')).toBe(false) // no lowercase
    expect(isPasswordValid('NoNumbers!')).toBe(false) // no numbers
    expect(isPasswordValid('NoSpecial123')).toBe(false) // no special chars
    expect(isPasswordValid('ValidPass123!')).toBe(true) // all requirements met
  })
})

describe('comparePasswords', () => {
  it('should return true for matching passwords', () => {
    expect(comparePasswords('test123', 'test123')).toBe(true)
  })

  it('should return false for different passwords', () => {
    expect(comparePasswords('test123', 'test456')).toBe(false)
  })

  it('should be case sensitive', () => {
    expect(comparePasswords('Test123', 'test123')).toBe(false)
  })

  it('should handle special characters', () => {
    expect(comparePasswords('Test123!@#', 'Test123!@#')).toBe(true)
    expect(comparePasswords('Test123!', 'Test123@')).toBe(false)
  })

  it('should handle empty strings', () => {
    expect(comparePasswords('', '')).toBe(false)
  })

  it('should return false when first password is empty', () => {
    expect(comparePasswords('', 'test123')).toBe(false)
  })

  it('should return false when second password is empty', () => {
    expect(comparePasswords('test123', '')).toBe(false)
  })

  it('should handle null inputs gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(comparePasswords(null, null)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(comparePasswords(null, 'test')).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(comparePasswords('test', null)).toBe(false)
  })

  it('should handle undefined inputs gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(comparePasswords(undefined, undefined)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(comparePasswords(undefined, 'test')).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(comparePasswords('test', undefined)).toBe(false)
  })

  it('should handle non-string inputs gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(comparePasswords(123, 123)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(comparePasswords('test', 123)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(comparePasswords(123, 'test')).toBe(false)
  })

  it('should handle whitespace differences', () => {
    expect(comparePasswords('test123', ' test123')).toBe(false)
    expect(comparePasswords('test123', 'test123 ')).toBe(false)
    expect(comparePasswords(' test123', ' test123')).toBe(true)
  })

  it('should handle very long passwords', () => {
    const longPassword = 'A'.repeat(100) + '1'.repeat(100) + '!'.repeat(100)
    expect(comparePasswords(longPassword, longPassword)).toBe(true)
    expect(comparePasswords(longPassword, longPassword + 'x')).toBe(false)
  })
})

describe('getPasswordStrengthPercentage', () => {
  it('should return 25% for weak passwords', () => {
    expect(getPasswordStrengthPercentage('test')).toBe(25)
    expect(getPasswordStrengthPercentage('12345678')).toBe(25)
  })

  it('should return 50% for medium strength passwords', () => {
    expect(getPasswordStrengthPercentage('Test123!')).toBe(50)
  })

  it('should return 75% for strong passwords', () => {
    expect(getPasswordStrengthPercentage('Test1234567!')).toBe(75)
  })

  it('should return 100% for very strong passwords', () => {
    expect(getPasswordStrengthPercentage('Test1234567890!@')).toBe(100)
  })

  it('should return 25% for empty string', () => {
    expect(getPasswordStrengthPercentage('')).toBe(25)
  })

  it('should return 25% for null input', () => {
    // @ts-expect-error - Testing invalid input
    expect(getPasswordStrengthPercentage(null)).toBe(25)
  })

  it('should return 25% for undefined input', () => {
    // @ts-expect-error - Testing invalid input
    expect(getPasswordStrengthPercentage(undefined)).toBe(25)
  })

  it('should return correct percentage for boundary cases', () => {
    // Test boundaries between strength levels
    expect(getPasswordStrengthPercentage('a'.repeat(8))).toBe(25) // weak
    expect(getPasswordStrengthPercentage('Aa1!'.repeat(2))).toBe(50) // medium
    expect(getPasswordStrengthPercentage('Aa1!'.repeat(3))).toBe(75) // strong
    expect(getPasswordStrengthPercentage('Aa1!'.repeat(4))).toBe(100) // very strong
  })
})
