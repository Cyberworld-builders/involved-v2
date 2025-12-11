import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateLogoFile,
  validateBackgroundImage,
  generateLogoStoragePath,
  generateBackgroundStoragePath,
  generateStoragePath,
  ALLOWED_IMAGE_TYPES,
  MAX_LOGO_SIZE,
  MAX_BACKGROUND_SIZE,
} from '../file-upload-utilities'

// Helper function to create a mock File object
function createMockFile(name: string, type: string, size: number): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

describe('validateLogoFile', () => {
  it('should validate a valid logo file', () => {
    const file = createMockFile('logo.png', 'image/png', 1024 * 1024) // 1MB
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should accept JPEG files', () => {
    const file = createMockFile('logo.jpg', 'image/jpeg', 1024 * 1024)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept JPG files', () => {
    const file = createMockFile('logo.jpg', 'image/jpg', 1024 * 1024)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept PNG files', () => {
    const file = createMockFile('logo.png', 'image/png', 1024 * 1024)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept GIF files', () => {
    const file = createMockFile('logo.gif', 'image/gif', 1024 * 1024)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept WebP files', () => {
    const file = createMockFile('logo.webp', 'image/webp', 1024 * 1024)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(true)
  })

  it('should reject file if size exceeds 2MB limit', () => {
    const file = createMockFile('logo.png', 'image/png', MAX_LOGO_SIZE + 1)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('File size exceeds maximum allowed size of 2MB')
  })

  it('should accept file at exactly 2MB limit', () => {
    const file = createMockFile('logo.png', 'image/png', MAX_LOGO_SIZE)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(true)
  })

  it('should reject invalid file type', () => {
    const file = createMockFile('logo.pdf', 'application/pdf', 1024 * 1024)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Invalid file type')
  })

  it('should reject text files', () => {
    const file = createMockFile('logo.txt', 'text/plain', 1024)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Invalid file type')
  })

  it('should handle null file', () => {
    const result = validateLogoFile(null)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('No file provided')
  })

  it('should handle undefined file', () => {
    const result = validateLogoFile(undefined)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('No file provided')
  })

  it('should reject very large files', () => {
    const file = createMockFile('logo.png', 'image/png', 10 * 1024 * 1024) // 10MB
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('File size exceeds')
  })

  it('should accept small files', () => {
    const file = createMockFile('logo.png', 'image/png', 1024) // 1KB
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept zero-byte files', () => {
    const file = createMockFile('logo.png', 'image/png', 0)
    const result = validateLogoFile(file)
    expect(result.isValid).toBe(true)
  })
})

describe('validateBackgroundImage', () => {
  it('should validate a valid background image file', () => {
    const file = createMockFile('background.png', 'image/png', 3 * 1024 * 1024) // 3MB
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should accept JPEG files', () => {
    const file = createMockFile('background.jpg', 'image/jpeg', 3 * 1024 * 1024)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept JPG files', () => {
    const file = createMockFile('background.jpg', 'image/jpg', 3 * 1024 * 1024)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept PNG files', () => {
    const file = createMockFile('background.png', 'image/png', 3 * 1024 * 1024)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept GIF files', () => {
    const file = createMockFile('background.gif', 'image/gif', 3 * 1024 * 1024)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept WebP files', () => {
    const file = createMockFile('background.webp', 'image/webp', 3 * 1024 * 1024)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(true)
  })

  it('should reject file if size exceeds 5MB limit', () => {
    const file = createMockFile('background.png', 'image/png', MAX_BACKGROUND_SIZE + 1)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('File size exceeds maximum allowed size of 5MB')
  })

  it('should accept file at exactly 5MB limit', () => {
    const file = createMockFile('background.png', 'image/png', MAX_BACKGROUND_SIZE)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(true)
  })

  it('should reject invalid file type', () => {
    const file = createMockFile('background.pdf', 'application/pdf', 3 * 1024 * 1024)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Invalid file type')
  })

  it('should reject text files', () => {
    const file = createMockFile('background.txt', 'text/plain', 1024)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Invalid file type')
  })

  it('should handle null file', () => {
    const result = validateBackgroundImage(null)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('No file provided')
  })

  it('should handle undefined file', () => {
    const result = validateBackgroundImage(undefined)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('No file provided')
  })

  it('should reject very large files', () => {
    const file = createMockFile('background.png', 'image/png', 20 * 1024 * 1024) // 20MB
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('File size exceeds')
  })

  it('should accept small files', () => {
    const file = createMockFile('background.png', 'image/png', 1024) // 1KB
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(true)
  })

  it('should accept zero-byte files', () => {
    const file = createMockFile('background.png', 'image/png', 0)
    const result = validateBackgroundImage(file)
    expect(result.isValid).toBe(true)
  })

  it('should have higher size limit than logo', () => {
    expect(MAX_BACKGROUND_SIZE).toBeGreaterThan(MAX_LOGO_SIZE)
  })
})

describe('generateLogoStoragePath', () => {
  let originalDateNow: typeof Date.now

  beforeEach(() => {
    originalDateNow = Date.now
    // Mock Date.now to return a fixed timestamp for consistent testing
    Date.now = vi.fn(() => 1234567890)
  })

  afterEach(() => {
    Date.now = originalDateNow
  })

  it('should generate a valid storage path for logo', () => {
    const path = generateLogoStoragePath('client-123', 'company-logo.png')
    expect(path).toBe('clients/client-123/logos/company-logo_1234567890.png')
  })

  it('should include timestamp in path', () => {
    const path = generateLogoStoragePath('client-456', 'logo.jpg')
    expect(path).toContain('_1234567890')
  })

  it('should preserve file extension', () => {
    const path = generateLogoStoragePath('client-123', 'logo.png')
    expect(path).toMatch(/\.png$/)
  })

  it('should handle JPEG extension', () => {
    const path = generateLogoStoragePath('client-123', 'logo.jpeg')
    expect(path).toMatch(/\.jpeg$/)
  })

  it('should handle JPG extension', () => {
    const path = generateLogoStoragePath('client-123', 'logo.jpg')
    expect(path).toMatch(/\.jpg$/)
  })

  it('should handle GIF extension', () => {
    const path = generateLogoStoragePath('client-123', 'logo.gif')
    expect(path).toMatch(/\.gif$/)
  })

  it('should handle WebP extension', () => {
    const path = generateLogoStoragePath('client-123', 'logo.webp')
    expect(path).toMatch(/\.webp$/)
  })

  it('should sanitize filename with spaces', () => {
    const path = generateLogoStoragePath('client-123', 'company logo.png')
    expect(path).toBe('clients/client-123/logos/company_logo_1234567890.png')
  })

  it('should sanitize filename with special characters', () => {
    const path = generateLogoStoragePath('client-123', 'company@logo#2023.png')
    expect(path).toBe('clients/client-123/logos/company_logo_2023_1234567890.png')
  })

  it('should convert filename to lowercase', () => {
    const path = generateLogoStoragePath('client-123', 'COMPANY-LOGO.PNG')
    expect(path).toBe('clients/client-123/logos/company-logo_1234567890.png')
  })

  it('should handle filename with multiple dots', () => {
    const path = generateLogoStoragePath('client-123', 'company.logo.v2.png')
    expect(path).toBe('clients/client-123/logos/company_logo_v2_1234567890.png')
  })

  it('should throw error for empty clientId', () => {
    expect(() => generateLogoStoragePath('', 'logo.png')).toThrow(
      'Client ID is required and must be a non-empty string'
    )
  })

  it('should throw error for whitespace-only clientId', () => {
    expect(() => generateLogoStoragePath('   ', 'logo.png')).toThrow(
      'Client ID is required and must be a non-empty string'
    )
  })

  it('should throw error for empty fileName', () => {
    expect(() => generateLogoStoragePath('client-123', '')).toThrow(
      'File name is required and must be a non-empty string'
    )
  })

  it('should throw error for whitespace-only fileName', () => {
    expect(() => generateLogoStoragePath('client-123', '   ')).toThrow(
      'File name is required and must be a non-empty string'
    )
  })

  it('should throw error for null clientId', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateLogoStoragePath(null, 'logo.png')).toThrow('Client ID is required')
  })

  it('should throw error for undefined clientId', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateLogoStoragePath(undefined, 'logo.png')).toThrow('Client ID is required')
  })

  it('should throw error for null fileName', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateLogoStoragePath('client-123', null)).toThrow('File name is required')
  })

  it('should throw error for undefined fileName', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateLogoStoragePath('client-123', undefined)).toThrow('File name is required')
  })

  it('should throw error for non-string clientId', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateLogoStoragePath(123, 'logo.png')).toThrow('Client ID is required')
  })

  it('should throw error for non-string fileName', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateLogoStoragePath('client-123', 123)).toThrow('File name is required')
  })

  it('should handle filename with underscores and hyphens', () => {
    const path = generateLogoStoragePath('client-123', 'company_logo-v2.png')
    expect(path).toBe('clients/client-123/logos/company_logo-v2_1234567890.png')
  })

  it('should trim whitespace from inputs', () => {
    const path = generateLogoStoragePath('  client-123  ', '  logo.png  ')
    expect(path).toBe('clients/client-123/logos/logo_1234567890.png')
  })

  it('should use logos subdirectory', () => {
    const path = generateLogoStoragePath('client-123', 'logo.png')
    expect(path).toContain('/logos/')
  })

  it('should organize by client ID', () => {
    const path = generateLogoStoragePath('client-123', 'logo.png')
    expect(path).toContain('clients/client-123/')
  })
})

describe('generateBackgroundStoragePath', () => {
  let originalDateNow: typeof Date.now

  beforeEach(() => {
    originalDateNow = Date.now
    Date.now = vi.fn(() => 1234567890)
  })

  afterEach(() => {
    Date.now = originalDateNow
  })

  it('should generate a valid storage path for background', () => {
    const path = generateBackgroundStoragePath('client-123', 'background-image.png')
    expect(path).toBe('clients/client-123/backgrounds/background-image_1234567890.png')
  })

  it('should include timestamp in path', () => {
    const path = generateBackgroundStoragePath('client-456', 'background.jpg')
    expect(path).toContain('_1234567890')
  })

  it('should preserve file extension', () => {
    const path = generateBackgroundStoragePath('client-123', 'background.png')
    expect(path).toMatch(/\.png$/)
  })

  it('should handle JPEG extension', () => {
    const path = generateBackgroundStoragePath('client-123', 'background.jpeg')
    expect(path).toMatch(/\.jpeg$/)
  })

  it('should handle JPG extension', () => {
    const path = generateBackgroundStoragePath('client-123', 'background.jpg')
    expect(path).toMatch(/\.jpg$/)
  })

  it('should handle GIF extension', () => {
    const path = generateBackgroundStoragePath('client-123', 'background.gif')
    expect(path).toMatch(/\.gif$/)
  })

  it('should handle WebP extension', () => {
    const path = generateBackgroundStoragePath('client-123', 'background.webp')
    expect(path).toMatch(/\.webp$/)
  })

  it('should sanitize filename with spaces', () => {
    const path = generateBackgroundStoragePath('client-123', 'company background.png')
    expect(path).toBe('clients/client-123/backgrounds/company_background_1234567890.png')
  })

  it('should sanitize filename with special characters', () => {
    const path = generateBackgroundStoragePath('client-123', 'background@image#2023.png')
    expect(path).toBe('clients/client-123/backgrounds/background_image_2023_1234567890.png')
  })

  it('should convert filename to lowercase', () => {
    const path = generateBackgroundStoragePath('client-123', 'BACKGROUND-IMAGE.PNG')
    expect(path).toBe('clients/client-123/backgrounds/background-image_1234567890.png')
  })

  it('should handle filename with multiple dots', () => {
    const path = generateBackgroundStoragePath('client-123', 'background.image.v2.png')
    expect(path).toBe('clients/client-123/backgrounds/background_image_v2_1234567890.png')
  })

  it('should throw error for empty clientId', () => {
    expect(() => generateBackgroundStoragePath('', 'background.png')).toThrow(
      'Client ID is required and must be a non-empty string'
    )
  })

  it('should throw error for whitespace-only clientId', () => {
    expect(() => generateBackgroundStoragePath('   ', 'background.png')).toThrow(
      'Client ID is required and must be a non-empty string'
    )
  })

  it('should throw error for empty fileName', () => {
    expect(() => generateBackgroundStoragePath('client-123', '')).toThrow(
      'File name is required and must be a non-empty string'
    )
  })

  it('should throw error for whitespace-only fileName', () => {
    expect(() => generateBackgroundStoragePath('client-123', '   ')).toThrow(
      'File name is required and must be a non-empty string'
    )
  })

  it('should throw error for null clientId', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateBackgroundStoragePath(null, 'background.png')).toThrow(
      'Client ID is required'
    )
  })

  it('should throw error for undefined clientId', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateBackgroundStoragePath(undefined, 'background.png')).toThrow(
      'Client ID is required'
    )
  })

  it('should throw error for null fileName', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateBackgroundStoragePath('client-123', null)).toThrow('File name is required')
  })

  it('should throw error for undefined fileName', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateBackgroundStoragePath('client-123', undefined)).toThrow(
      'File name is required'
    )
  })

  it('should throw error for non-string clientId', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateBackgroundStoragePath(123, 'background.png')).toThrow(
      'Client ID is required'
    )
  })

  it('should throw error for non-string fileName', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => generateBackgroundStoragePath('client-123', 123)).toThrow('File name is required')
  })

  it('should handle filename with underscores and hyphens', () => {
    const path = generateBackgroundStoragePath('client-123', 'background_image-v2.png')
    expect(path).toBe('clients/client-123/backgrounds/background_image-v2_1234567890.png')
  })

  it('should trim whitespace from inputs', () => {
    const path = generateBackgroundStoragePath('  client-123  ', '  background.png  ')
    expect(path).toBe('clients/client-123/backgrounds/background_1234567890.png')
  })

  it('should use backgrounds subdirectory', () => {
    const path = generateBackgroundStoragePath('client-123', 'background.png')
    expect(path).toContain('/backgrounds/')
  })

  it('should organize by client ID', () => {
    const path = generateBackgroundStoragePath('client-123', 'background.png')
    expect(path).toContain('clients/client-123/')
  })
})

describe('generateStoragePath', () => {
  let originalDateNow: typeof Date.now

  beforeEach(() => {
    originalDateNow = Date.now
    Date.now = vi.fn(() => 1234567890)
  })

  afterEach(() => {
    Date.now = originalDateNow
  })

  it('should generate logo path when type is logo', () => {
    const path = generateStoragePath('client-123', 'logo.png', 'logo')
    expect(path).toBe('clients/client-123/logos/logo_1234567890.png')
  })

  it('should generate background path when type is background', () => {
    const path = generateStoragePath('client-123', 'background.png', 'background')
    expect(path).toBe('clients/client-123/backgrounds/background_1234567890.png')
  })

  it('should delegate to generateLogoStoragePath for logo type', () => {
    const logoPath = generateStoragePath('client-123', 'test.png', 'logo')
    const directLogoPath = generateLogoStoragePath('client-123', 'test.png')
    expect(logoPath).toBe(directLogoPath)
  })

  it('should delegate to generateBackgroundStoragePath for background type', () => {
    const backgroundPath = generateStoragePath('client-123', 'test.png', 'background')
    const directBackgroundPath = generateBackgroundStoragePath('client-123', 'test.png')
    expect(backgroundPath).toBe(directBackgroundPath)
  })

  it('should throw error for invalid inputs when using logo type', () => {
    expect(() => generateStoragePath('', 'logo.png', 'logo')).toThrow('Client ID is required')
  })

  it('should throw error for invalid inputs when using background type', () => {
    expect(() => generateStoragePath('', 'background.png', 'background')).toThrow(
      'Client ID is required'
    )
  })
})

describe('File upload constants', () => {
  it('should define allowed image types', () => {
    expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg')
    expect(ALLOWED_IMAGE_TYPES).toContain('image/jpg')
    expect(ALLOWED_IMAGE_TYPES).toContain('image/png')
    expect(ALLOWED_IMAGE_TYPES).toContain('image/gif')
    expect(ALLOWED_IMAGE_TYPES).toContain('image/webp')
  })

  it('should define MAX_LOGO_SIZE as 2MB', () => {
    expect(MAX_LOGO_SIZE).toBe(2 * 1024 * 1024)
  })

  it('should define MAX_BACKGROUND_SIZE as 5MB', () => {
    expect(MAX_BACKGROUND_SIZE).toBe(5 * 1024 * 1024)
  })
})
