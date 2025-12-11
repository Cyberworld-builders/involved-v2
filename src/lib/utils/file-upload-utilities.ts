import { config } from '@/lib/config'

/**
 * Supported image types for logo and background uploads
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

/**
 * Maximum file size for logo images (2MB)
 */
export const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB in bytes

/**
 * Maximum file size for background images (5MB)
 */
export const MAX_BACKGROUND_SIZE = 5 * 1024 * 1024 // 5MB in bytes

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates a logo file for type and size
 * @param file - The file to validate
 * @returns ValidationResult indicating if the file is valid
 */
export function validateLogoFile(file: File | null | undefined): ValidationResult {
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided',
    }
  }

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    }
  }

  // Validate file size
  if (file.size > MAX_LOGO_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${MAX_LOGO_SIZE / (1024 * 1024)}MB`,
    }
  }

  return {
    isValid: true,
  }
}

/**
 * Validates a background image file for type and size
 * @param file - The file to validate
 * @returns ValidationResult indicating if the file is valid
 */
export function validateBackgroundImage(file: File | null | undefined): ValidationResult {
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided',
    }
  }

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    }
  }

  // Validate file size
  if (file.size > MAX_BACKGROUND_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${MAX_BACKGROUND_SIZE / (1024 * 1024)}MB`,
    }
  }

  return {
    isValid: true,
  }
}

/**
 * Generates a storage path for client logo files
 * @param clientId - The client ID
 * @param fileName - The original file name
 * @returns The storage path for the logo file
 */
export function generateLogoStoragePath(clientId: string, fileName: string): string {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Client ID is required and must be a non-empty string')
  }

  if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
    throw new Error('File name is required and must be a non-empty string')
  }

  // Trim the clientId
  const trimmedClientId = clientId.trim()

  // Sanitize filename by removing special characters and spaces
  const sanitizedFileName = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')

  const timestamp = Date.now()
  const extension = sanitizedFileName.split('.').pop()
  const nameWithoutExtension = sanitizedFileName.replace(/\.[^/.]+$/, '').replace(/\./g, '_')

  return `clients/${trimmedClientId}/logos/${nameWithoutExtension}_${timestamp}.${extension}`
}

/**
 * Generates a storage path for client background image files
 * @param clientId - The client ID
 * @param fileName - The original file name
 * @returns The storage path for the background image file
 */
export function generateBackgroundStoragePath(clientId: string, fileName: string): string {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Client ID is required and must be a non-empty string')
  }

  if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
    throw new Error('File name is required and must be a non-empty string')
  }

  // Trim the clientId
  const trimmedClientId = clientId.trim()

  // Sanitize filename by removing special characters and spaces
  const sanitizedFileName = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')

  const timestamp = Date.now()
  const extension = sanitizedFileName.split('.').pop()
  const nameWithoutExtension = sanitizedFileName.replace(/\.[^/.]+$/, '').replace(/\./g, '_')

  return `clients/${trimmedClientId}/backgrounds/${nameWithoutExtension}_${timestamp}.${extension}`
}

/**
 * Generic function to generate storage path for any client file type
 * @param clientId - The client ID
 * @param fileName - The original file name
 * @param fileType - The type of file (logo, background, etc.)
 * @returns The storage path for the file
 */
export function generateStoragePath(
  clientId: string,
  fileName: string,
  fileType: 'logo' | 'background'
): string {
  if (fileType === 'logo') {
    return generateLogoStoragePath(clientId, fileName)
  } else {
    return generateBackgroundStoragePath(clientId, fileName)
  }
}
