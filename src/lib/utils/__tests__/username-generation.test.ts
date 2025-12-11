import { describe, it, expect, vi } from 'vitest'
import {
  generateUsernameFromName,
  generateUsernameFromEmail,
  generateUniqueUsername,
  generateUsernameFromFirstLast,
} from '../username-generation'

describe('generateUsernameFromName', () => {
  it('should generate username from simple name', () => {
    expect(generateUsernameFromName('John Doe')).toBe('johndoe')
  })

  it('should handle names with hyphens', () => {
    expect(generateUsernameFromName('Mary-Jane Smith')).toBe('maryjanesmith')
  })

  it('should handle names with numbers', () => {
    expect(generateUsernameFromName('User123')).toBe('user123')
  })

  it('should truncate very long names to 20 characters', () => {
    const longName = 'Very Long Name That Exceeds Twenty Characters'
    const result = generateUsernameFromName(longName)
    expect(result).toBe('verylongnamethatexce')
    expect(result.length).toBe(20)
  })

  it('should remove special characters', () => {
    expect(generateUsernameFromName('user_name@123')).toBe('username123')
    expect(generateUsernameFromName('user.name-123')).toBe('username123')
  })

  it('should convert to lowercase', () => {
    expect(generateUsernameFromName('JOHN DOE')).toBe('johndoe')
    expect(generateUsernameFromName('JohnDoe')).toBe('johndoe')
  })

  it('should handle empty string', () => {
    expect(generateUsernameFromName('')).toBe('')
  })

  it('should handle only special characters', () => {
    expect(generateUsernameFromName('!@#$%^&*()')).toBe('')
  })

  it('should handle numbers only', () => {
    expect(generateUsernameFromName('123456')).toBe('123456')
  })

  it('should handle whitespace-only strings', () => {
    expect(generateUsernameFromName('   ')).toBe('')
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(generateUsernameFromName(null)).toBe('')
    // @ts-expect-error - Testing invalid input
    expect(generateUsernameFromName(undefined)).toBe('')
  })
})

describe('generateUsernameFromEmail', () => {
  it('should extract username from simple email', () => {
    expect(generateUsernameFromEmail('user@example.com')).toBe('user')
  })

  it('should handle email with dots', () => {
    expect(generateUsernameFromEmail('john.doe@example.com')).toBe('johndoe')
  })

  it('should handle email with plus signs', () => {
    expect(generateUsernameFromEmail('user+tag@example.com')).toBe('usertag')
  })

  it('should handle email with numbers', () => {
    expect(generateUsernameFromEmail('user123@example.com')).toBe('user123')
  })

  it('should truncate long email usernames', () => {
    const longEmail = 'verylongusername@example.com'
    const result = generateUsernameFromEmail(longEmail)
    expect(result).toBe('verylongusername')
    expect(result.length).toBeLessThanOrEqual(20)
  })

  it('should handle email with special characters', () => {
    expect(generateUsernameFromEmail('user_name@example.com')).toBe('username')
  })

  it('should handle empty string', () => {
    expect(generateUsernameFromEmail('')).toBe('')
  })

  it('should handle email without @ symbol', () => {
    expect(generateUsernameFromEmail('notanemail')).toBe('notanemail')
  })

  it('should handle null or undefined input gracefully', () => {
    // @ts-expect-error - Testing invalid input
    expect(generateUsernameFromEmail(null)).toBe('')
    // @ts-expect-error - Testing invalid input
    expect(generateUsernameFromEmail(undefined)).toBe('')
  })
})

describe('generateUsernameFromFirstLast', () => {
  it('should combine first and last name', () => {
    expect(generateUsernameFromFirstLast('John', 'Doe')).toBe('johndoe')
  })

  it('should handle names with special characters', () => {
    expect(generateUsernameFromFirstLast('Mary-Jane', 'Smith')).toBe('maryjanesmith')
  })

  it('should truncate if combined name is too long', () => {
    const result = generateUsernameFromFirstLast('VeryLongFirstName', 'VeryLongLastName')
    expect(result.length).toBeLessThanOrEqual(20)
  })

  it('should handle empty first name', () => {
    expect(generateUsernameFromFirstLast('', 'Doe')).toBe('doe')
  })

  it('should handle empty last name', () => {
    expect(generateUsernameFromFirstLast('John', '')).toBe('john')
  })

  it('should handle both empty', () => {
    expect(generateUsernameFromFirstLast('', '')).toBe('')
  })
})

describe('generateUniqueUsername', () => {
  it('should return base username if it does not exist', async () => {
    const checkExists = vi.fn().mockResolvedValue(false)
    const result = await generateUniqueUsername('username', checkExists)
    expect(result).toBe('username')
    expect(checkExists).toHaveBeenCalledTimes(1)
    expect(checkExists).toHaveBeenCalledWith('username')
  })

  it('should append number if base username exists', async () => {
    const checkExists = vi.fn()
      .mockResolvedValueOnce(true) // base username exists
      .mockResolvedValueOnce(false) // username1 does not exist
    const result = await generateUniqueUsername('username', checkExists)
    expect(result).toBe('username1')
    expect(checkExists).toHaveBeenCalledTimes(2)
  })

  it('should try multiple numbers until finding available', async () => {
    const checkExists = vi.fn()
      .mockResolvedValueOnce(true) // username exists
      .mockResolvedValueOnce(true) // username1 exists
      .mockResolvedValueOnce(true) // username2 exists
      .mockResolvedValueOnce(false) // username3 does not exist
    const result = await generateUniqueUsername('username', checkExists)
    expect(result).toBe('username3')
    expect(checkExists).toHaveBeenCalledTimes(4)
  })

  it('should fallback to timestamp if 1000 attempts fail', async () => {
    const checkExists = vi.fn().mockResolvedValue(true) // Always exists
    const result = await generateUniqueUsername('username', checkExists)
    expect(result).toMatch(/^username\d+$/)
    expect(result.length).toBeGreaterThan('username'.length + 10) // timestamp is long
    expect(checkExists).toHaveBeenCalledTimes(1000) // Should try 1000 times
  })

  it('should throw error for empty base username', async () => {
    const checkExists = vi.fn()
    await expect(generateUniqueUsername('', checkExists)).rejects.toThrow(
      'Base username cannot be empty'
    )
    expect(checkExists).not.toHaveBeenCalled()
  })

  it('should handle async checkExists function errors', async () => {
    const checkExists = vi.fn().mockRejectedValue(new Error('Database error'))
    await expect(generateUniqueUsername('username', checkExists)).rejects.toThrow('Database error')
  })
})
