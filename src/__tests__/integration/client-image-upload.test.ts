import { describe, it, expect, vi } from 'vitest'
import { validateLogoFile, validateBackgroundImage, generateStoragePath } from '@/lib/utils/file-upload-utilities'

/**
 * Integration tests for client background image upload workflow
 * Tests the complete flow from file validation to storage path generation
 */
describe('Client Image Upload Integration', () => {
  // Helper function to create a mock File object
  function createMockFile(name: string, type: string, size: number): File {
    const blob = new Blob(['x'.repeat(size)], { type })
    return new File([blob], name, { type })
  }

  describe('Logo Upload Workflow', () => {
    it('should complete full logo upload validation and path generation', () => {
      const clientId = 'client-test-123'
      const logoFile = createMockFile('company-logo.png', 'image/png', 1024 * 1024) // 1MB

      // Step 1: Validate logo file
      const validation = validateLogoFile(logoFile)
      expect(validation.isValid).toBe(true)
      expect(validation.error).toBeUndefined()

      // Step 2: Generate storage path
      const storagePath = generateStoragePath(clientId, logoFile.name, 'logo')
      expect(storagePath).toContain('clients/')
      expect(storagePath).toContain(clientId)
      expect(storagePath).toContain('logos/')
      expect(storagePath).toMatch(/\.png$/)
    })

    it('should reject oversized logo files', () => {
      const logoFile = createMockFile('large-logo.png', 'image/png', 3 * 1024 * 1024) // 3MB

      const validation = validateLogoFile(logoFile)
      expect(validation.isValid).toBe(false)
      expect(validation.error).toContain('File size exceeds maximum allowed size of 2MB')
    })

    it('should reject invalid file types for logo', () => {
      const pdfFile = createMockFile('logo.pdf', 'application/pdf', 1024 * 1024)

      const validation = validateLogoFile(pdfFile)
      expect(validation.isValid).toBe(false)
      expect(validation.error).toContain('Invalid file type')
    })

    it('should handle logo files with special characters in name', () => {
      const clientId = 'client-123'
      const logoFile = createMockFile('Company Logo #2023.png', 'image/png', 1024 * 1024)

      const validation = validateLogoFile(logoFile)
      expect(validation.isValid).toBe(true)

      const storagePath = generateStoragePath(clientId, logoFile.name, 'logo')
      // Special characters should be sanitized
      expect(storagePath).not.toContain('#')
      expect(storagePath).not.toContain(' ')
      expect(storagePath).toContain('clients/client-123/logos/')
    })
  })

  describe('Background Image Upload Workflow', () => {
    it('should complete full background upload validation and path generation', () => {
      const clientId = 'client-test-456'
      const backgroundFile = createMockFile('background-image.jpg', 'image/jpeg', 4 * 1024 * 1024) // 4MB

      // Step 1: Validate background file
      const validation = validateBackgroundImage(backgroundFile)
      expect(validation.isValid).toBe(true)
      expect(validation.error).toBeUndefined()

      // Step 2: Generate storage path
      const storagePath = generateStoragePath(clientId, backgroundFile.name, 'background')
      expect(storagePath).toContain('clients/')
      expect(storagePath).toContain(clientId)
      expect(storagePath).toContain('backgrounds/')
      expect(storagePath).toMatch(/\.jpg$/)
    })

    it('should reject oversized background files', () => {
      const backgroundFile = createMockFile('large-background.jpg', 'image/jpeg', 10 * 1024 * 1024) // 10MB

      const validation = validateBackgroundImage(backgroundFile)
      expect(validation.isValid).toBe(false)
      expect(validation.error).toContain('File size exceeds maximum allowed size of 5MB')
    })

    it('should reject invalid file types for background', () => {
      const pdfFile = createMockFile('background.pdf', 'application/pdf', 1024 * 1024)

      const validation = validateBackgroundImage(pdfFile)
      expect(validation.isValid).toBe(false)
      expect(validation.error).toContain('Invalid file type')
    })

    it('should accept background at maximum size limit', () => {
      const backgroundFile = createMockFile('background.png', 'image/png', 5 * 1024 * 1024) // Exactly 5MB

      const validation = validateBackgroundImage(backgroundFile)
      expect(validation.isValid).toBe(true)
    })
  })

  describe('Multiple File Upload Scenario', () => {
    it('should validate and generate paths for both logo and background', () => {
      const clientId = 'client-789'
      const logoFile = createMockFile('logo.webp', 'image/webp', 500 * 1024) // 500KB
      const backgroundFile = createMockFile('background.webp', 'image/webp', 3 * 1024 * 1024) // 3MB

      // Validate logo
      const logoValidation = validateLogoFile(logoFile)
      expect(logoValidation.isValid).toBe(true)

      // Validate background
      const backgroundValidation = validateBackgroundImage(backgroundFile)
      expect(backgroundValidation.isValid).toBe(true)

      // Generate paths
      const logoPath = generateStoragePath(clientId, logoFile.name, 'logo')
      const backgroundPath = generateStoragePath(clientId, backgroundFile.name, 'background')

      // Verify paths are different but both organized under same client
      expect(logoPath).toContain(`clients/${clientId}/logos/`)
      expect(backgroundPath).toContain(`clients/${clientId}/backgrounds/`)
      expect(logoPath).not.toBe(backgroundPath)
    })

    it('should handle partial upload scenario (only logo)', () => {
      const clientId = 'client-partial-1'
      const logoFile = createMockFile('logo.gif', 'image/gif', 800 * 1024) // 800KB

      const logoValidation = validateLogoFile(logoFile)
      expect(logoValidation.isValid).toBe(true)

      const logoPath = generateStoragePath(clientId, logoFile.name, 'logo')
      expect(logoPath).toContain('clients/client-partial-1/logos/')
    })

    it('should handle partial upload scenario (only background)', () => {
      const clientId = 'client-partial-2'
      const backgroundFile = createMockFile('background.jpg', 'image/jpg', 2 * 1024 * 1024) // 2MB

      const backgroundValidation = validateBackgroundImage(backgroundFile)
      expect(backgroundValidation.isValid).toBe(true)

      const backgroundPath = generateStoragePath(clientId, backgroundFile.name, 'background')
      expect(backgroundPath).toContain('clients/client-partial-2/backgrounds/')
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum file size (1 byte)', () => {
      const logoFile = createMockFile('tiny-logo.png', 'image/png', 1)
      const backgroundFile = createMockFile('tiny-bg.png', 'image/png', 1)

      expect(validateLogoFile(logoFile).isValid).toBe(true)
      expect(validateBackgroundImage(backgroundFile).isValid).toBe(true)
    })

    it('should handle zero byte files', () => {
      const logoFile = createMockFile('empty-logo.png', 'image/png', 0)
      const backgroundFile = createMockFile('empty-bg.png', 'image/png', 0)

      expect(validateLogoFile(logoFile).isValid).toBe(true)
      expect(validateBackgroundImage(backgroundFile).isValid).toBe(true)
    })

    it('should handle various supported image formats', () => {
      const clientId = 'client-formats'
      const formats = [
        { name: 'test.png', type: 'image/png' },
        { name: 'test.jpg', type: 'image/jpg' },
        { name: 'test.jpeg', type: 'image/jpeg' },
        { name: 'test.gif', type: 'image/gif' },
        { name: 'test.webp', type: 'image/webp' },
      ]

      formats.forEach(format => {
        const file = createMockFile(format.name, format.type, 1024 * 1024)
        
        const logoValidation = validateLogoFile(file)
        const bgValidation = validateBackgroundImage(file)
        
        expect(logoValidation.isValid).toBe(true)
        expect(bgValidation.isValid).toBe(true)
        
        const logoPath = generateStoragePath(clientId, file.name, 'logo')
        const bgPath = generateStoragePath(clientId, file.name, 'background')
        
        expect(logoPath).toBeTruthy()
        expect(bgPath).toBeTruthy()
      })
    })

    it('should generate unique paths for same file uploaded multiple times', () => {
      const clientId = 'client-unique'
      const fileName = 'logo.png'
      
      // Mock Date.now to return different values
      const originalDateNow = Date.now
      let timestamp = 1000000000
      Date.now = vi.fn(() => timestamp)

      const path1 = generateStoragePath(clientId, fileName, 'logo')
      
      timestamp = 1000000001
      const path2 = generateStoragePath(clientId, fileName, 'logo')
      
      Date.now = originalDateNow

      expect(path1).not.toBe(path2)
      expect(path1).toContain('_1000000000')
      expect(path2).toContain('_1000000001')
    })

    it('should organize files by client ID correctly', () => {
      const client1 = 'client-org-1'
      const client2 = 'client-org-2'
      const fileName = 'logo.png'

      const path1 = generateStoragePath(client1, fileName, 'logo')
      const path2 = generateStoragePath(client2, fileName, 'logo')

      expect(path1).toContain(`clients/${client1}/`)
      expect(path2).toContain(`clients/${client2}/`)
      expect(path1).not.toContain(client2)
      expect(path2).not.toContain(client1)
    })
  })

  describe('Error Handling', () => {
    it('should handle null file gracefully', () => {
      const logoValidation = validateLogoFile(null)
      const bgValidation = validateBackgroundImage(null)

      expect(logoValidation.isValid).toBe(false)
      expect(logoValidation.error).toBe('No file provided')
      expect(bgValidation.isValid).toBe(false)
      expect(bgValidation.error).toBe('No file provided')
    })

    it('should handle undefined file gracefully', () => {
      const logoValidation = validateLogoFile(undefined)
      const bgValidation = validateBackgroundImage(undefined)

      expect(logoValidation.isValid).toBe(false)
      expect(logoValidation.error).toBe('No file provided')
      expect(bgValidation.isValid).toBe(false)
      expect(bgValidation.error).toBe('No file provided')
    })

    it('should throw error for invalid client ID', () => {
      expect(() => generateStoragePath('', 'file.png', 'logo')).toThrow(
        'Client ID is required and must be a non-empty string'
      )
      expect(() => generateStoragePath('   ', 'file.png', 'logo')).toThrow(
        'Client ID is required and must be a non-empty string'
      )
    })

    it('should throw error for invalid file name', () => {
      expect(() => generateStoragePath('client-123', '', 'logo')).toThrow(
        'File name is required and must be a non-empty string'
      )
      expect(() => generateStoragePath('client-123', '   ', 'logo')).toThrow(
        'File name is required and must be a non-empty string'
      )
    })
  })

  describe('File Name Sanitization', () => {
    it('should sanitize filenames with special characters', () => {
      const clientId = 'client-123'
      const specialNames = [
        'file name with spaces.png',
        'file@with#special$chars.png',
        'file/with\\slashes.png',
        'file:with:colons.png',
        'file*with*asterisks.png',
      ]

      specialNames.forEach(fileName => {
        const path = generateStoragePath(clientId, fileName, 'logo')
        
        // Path should not contain special characters except allowed ones (- _ .)
        expect(path).toMatch(/^clients\/[a-z0-9-_]+\/(logos|backgrounds)\/[a-z0-9-_.]+\.[a-z]+$/)
      })
    })

    it('should convert filenames to lowercase', () => {
      const clientId = 'client-123'
      const upperCaseFile = 'COMPANY-LOGO.PNG'

      const path = generateStoragePath(clientId, upperCaseFile, 'logo')
      
      expect(path).toBe(path.toLowerCase())
      expect(path).toContain('company-logo')
    })

    it('should handle multiple dots in filename', () => {
      const clientId = 'client-123'
      const fileName = 'logo.backup.v2.png'

      const path = generateStoragePath(clientId, fileName, 'logo')
      
      expect(path).toContain('.png')
      // Dots in the name (not extension) should be replaced
      expect(path).toMatch(/logo_backup_v2_\d+\.png$/)
    })
  })
})
