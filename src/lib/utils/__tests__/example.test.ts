import { describe, it, expect } from 'vitest'

/**
 * Example unit test file
 * 
 * This demonstrates the testing patterns and structure for utility functions.
 * Use this as a template when creating new test files.
 */

describe('Example Utility Function', () => {
  it('should perform basic operation correctly', () => {
    const result = 1 + 1
    expect(result).toBe(2)
  })

  it('should handle edge cases', () => {
    const result = 0 + 0
    expect(result).toBe(0)
  })

  it('should throw error for invalid input', () => {
    expect(() => {
      throw new Error('Invalid input')
    }).toThrow('Invalid input')
  })
})
