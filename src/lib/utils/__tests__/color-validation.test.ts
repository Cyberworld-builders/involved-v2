import { describe, it, expect } from 'vitest'
import { validateHexColor, sanitizeHexColor } from '../color-validation'

describe('validateHexColor', () => {
  it('should validate correct 6-digit hex colors', () => {
    expect(validateHexColor('#2D2E30')).toBe(true)
    expect(validateHexColor('#FFBA00')).toBe(true)
    expect(validateHexColor('#000000')).toBe(true)
    expect(validateHexColor('#FFFFFF')).toBe(true)
  })

  it('should validate correct 3-digit hex colors', () => {
    expect(validateHexColor('#FFF')).toBe(true)
    expect(validateHexColor('#000')).toBe(true)
    expect(validateHexColor('#ABC')).toBe(true)
    expect(validateHexColor('#123')).toBe(true)
  })

  it('should validate lowercase hex colors', () => {
    expect(validateHexColor('#ffba00')).toBe(true)
    expect(validateHexColor('#abc')).toBe(true)
    expect(validateHexColor('#2d2e30')).toBe(true)
  })

  it('should validate mixed case hex colors', () => {
    expect(validateHexColor('#FfBa00')).toBe(true)
    expect(validateHexColor('#aBc')).toBe(true)
  })

  it('should reject colors missing # prefix', () => {
    expect(validateHexColor('2D2E30')).toBe(false)
    expect(validateHexColor('FFBA00')).toBe(false)
    expect(validateHexColor('FFF')).toBe(false)
  })

  it('should reject colors with wrong length', () => {
    expect(validateHexColor('#2D2E3')).toBe(false) // 5 characters
    expect(validateHexColor('#2D2E300')).toBe(false) // 7 characters
    expect(validateHexColor('#FF')).toBe(false) // 2 characters
    expect(validateHexColor('#FFFF')).toBe(false) // 4 characters
    expect(validateHexColor('#FFFFF')).toBe(false) // 5 characters
  })

  it('should reject colors with invalid characters', () => {
    expect(validateHexColor('#GGGGGG')).toBe(false)
    expect(validateHexColor('#GGG')).toBe(false)
    expect(validateHexColor('#XYZ')).toBe(false)
    expect(validateHexColor('#12345G')).toBe(false)
  })

  it('should reject colors with special characters', () => {
    expect(validateHexColor('#FF-BA-00')).toBe(false)
    expect(validateHexColor('#FF BA 00')).toBe(false)
    expect(validateHexColor('#FF_BA_00')).toBe(false)
  })

  it('should handle empty string', () => {
    expect(validateHexColor('')).toBe(false)
  })

  it('should handle whitespace-only strings', () => {
    expect(validateHexColor('   ')).toBe(false)
    expect(validateHexColor('\t')).toBe(false)
    expect(validateHexColor('\n')).toBe(false)
  })

  it('should handle strings with only #', () => {
    expect(validateHexColor('#')).toBe(false)
  })

  it('should trim whitespace before validating', () => {
    expect(validateHexColor('  #2D2E30  ')).toBe(true)
    expect(validateHexColor('\t#FFF\n')).toBe(true)
    expect(validateHexColor(' #FFBA00 ')).toBe(true)
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateHexColor(null)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateHexColor(undefined)).toBe(false)
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(validateHexColor(123456)).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateHexColor({})).toBe(false)
    // @ts-expect-error - Testing invalid input
    expect(validateHexColor([])).toBe(false)
  })
})

describe('sanitizeHexColor', () => {
  it('should sanitize valid 6-digit hex colors', () => {
    expect(sanitizeHexColor('#2D2E30')).toBe('#2D2E30')
    expect(sanitizeHexColor('#FFBA00')).toBe('#FFBA00')
    expect(sanitizeHexColor('#000000')).toBe('#000000')
    expect(sanitizeHexColor('#FFFFFF')).toBe('#FFFFFF')
  })

  it('should sanitize valid 3-digit hex colors', () => {
    expect(sanitizeHexColor('#FFF')).toBe('#FFF')
    expect(sanitizeHexColor('#000')).toBe('#000')
    expect(sanitizeHexColor('#ABC')).toBe('#ABC')
  })

  it('should convert lowercase to uppercase', () => {
    expect(sanitizeHexColor('#ffba00')).toBe('#FFBA00')
    expect(sanitizeHexColor('#fff')).toBe('#FFF')
    expect(sanitizeHexColor('#2d2e30')).toBe('#2D2E30')
    expect(sanitizeHexColor('#abc')).toBe('#ABC')
  })

  it('should convert mixed case to uppercase', () => {
    expect(sanitizeHexColor('#FfBa00')).toBe('#FFBA00')
    expect(sanitizeHexColor('#aBc')).toBe('#ABC')
  })

  it('should trim whitespace', () => {
    expect(sanitizeHexColor('  #2D2E30  ')).toBe('#2D2E30')
    expect(sanitizeHexColor('\t#FFF\n')).toBe('#FFF')
    expect(sanitizeHexColor(' #FFBA00 ')).toBe('#FFBA00')
  })

  it('should trim and convert to uppercase together', () => {
    expect(sanitizeHexColor('  #ffba00  ')).toBe('#FFBA00')
    expect(sanitizeHexColor('\t#abc\n')).toBe('#ABC')
  })

  it('should return null for colors missing # prefix', () => {
    expect(sanitizeHexColor('2D2E30')).toBeNull()
    expect(sanitizeHexColor('FFBA00')).toBeNull()
    expect(sanitizeHexColor('FFF')).toBeNull()
  })

  it('should return null for colors with wrong length', () => {
    expect(sanitizeHexColor('#2D2E3')).toBeNull()
    expect(sanitizeHexColor('#2D2E300')).toBeNull()
    expect(sanitizeHexColor('#FF')).toBeNull()
    expect(sanitizeHexColor('#FFFF')).toBeNull()
  })

  it('should return null for colors with invalid characters', () => {
    expect(sanitizeHexColor('#GGGGGG')).toBeNull()
    expect(sanitizeHexColor('#GGG')).toBeNull()
    expect(sanitizeHexColor('#XYZ')).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(sanitizeHexColor('')).toBeNull()
  })

  it('should return null for whitespace-only strings', () => {
    expect(sanitizeHexColor('   ')).toBeNull()
    expect(sanitizeHexColor('\t')).toBeNull()
    expect(sanitizeHexColor('\n')).toBeNull()
  })

  it('should return null for strings with only #', () => {
    expect(sanitizeHexColor('#')).toBeNull()
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(sanitizeHexColor(null)).toBeNull()
    // @ts-expect-error - Testing invalid input
    expect(sanitizeHexColor(undefined)).toBeNull()
  })

  it('should handle non-string input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(sanitizeHexColor(123456)).toBeNull()
    // @ts-expect-error - Testing invalid input
    expect(sanitizeHexColor({})).toBeNull()
    // @ts-expect-error - Testing invalid input
    expect(sanitizeHexColor([])).toBeNull()
  })

  it('should return null for invalid format after trimming', () => {
    expect(sanitizeHexColor('  2D2E30  ')).toBeNull() // missing #
    expect(sanitizeHexColor('  #GGG  ')).toBeNull() // invalid chars
    expect(sanitizeHexColor('  #FF  ')).toBeNull() // wrong length
  })
})
