import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as uploadFile } from '../route'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Mock file upload utilities
vi.mock('@/lib/utils/file-upload-utilities', () => ({
  validateLogoFile: vi.fn(),
  validateBackgroundImage: vi.fn(),
  generateStoragePath: vi.fn(),
}))

import {
  validateLogoFile,
  validateBackgroundImage,
  generateStoragePath,
} from '@/lib/utils/file-upload-utilities'

// Helper function to create a mock File object
function createMockFile(name: string, type: string, size: number): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

describe('POST /api/clients/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should upload a logo file successfully', async () => {
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    // Mock file validation
    vi.mocked(validateLogoFile).mockReturnValue({
      isValid: true,
    })

    // Mock storage path generation
    vi.mocked(generateStoragePath).mockReturnValue('clients/client-123/logos/logo_123.png')

    // Mock storage upload
    const uploadMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })

    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/storage/clients/client-123/logos/logo_123.png' },
    })

    mockSupabaseClient.storage.from.mockReturnValue({
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock,
    })

    // Create FormData with file
    const file = createMockFile('logo.png', 'image/png', 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'logo')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.url).toBe('https://example.com/storage/clients/client-123/logos/logo_123.png')
    expect(validateLogoFile).toHaveBeenCalled()
    expect(generateStoragePath).toHaveBeenCalledWith('client-123', expect.any(String), 'logo')
    expect(uploadMock).toHaveBeenCalled()
  })

  it('should upload a background image successfully', async () => {
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    // Mock file validation
    vi.mocked(validateBackgroundImage).mockReturnValue({
      isValid: true,
    })

    // Mock storage path generation
    vi.mocked(generateStoragePath).mockReturnValue('clients/client-123/backgrounds/bg_123.png')

    // Mock storage upload
    const uploadMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })

    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/storage/clients/client-123/backgrounds/bg_123.png' },
    })

    mockSupabaseClient.storage.from.mockReturnValue({
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock,
    })

    // Create FormData with file
    const file = createMockFile('background.png', 'image/png', 3 * 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'background')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.url).toBe('https://example.com/storage/clients/client-123/backgrounds/bg_123.png')
    expect(validateBackgroundImage).toHaveBeenCalled()
    expect(generateStoragePath).toHaveBeenCalledWith('client-123', expect.any(String), 'background')
    expect(uploadMock).toHaveBeenCalled()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const file = createMockFile('logo.png', 'image/png', 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'logo')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 if file is missing', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const formData = new FormData()
    formData.append('fileType', 'logo')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('File is required')
  })

  it('should return 400 if fileType is missing', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const file = createMockFile('logo.png', 'image/png', 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('File type must be either "logo" or "background"')
  })

  it('should return 400 if fileType is invalid', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const file = createMockFile('logo.png', 'image/png', 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'invalid')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('File type must be either "logo" or "background"')
  })

  it('should return 400 if clientId is missing', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const file = createMockFile('logo.png', 'image/png', 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'logo')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Client ID is required')
  })

  it('should return 400 if file validation fails for logo', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    vi.mocked(validateLogoFile).mockReturnValue({
      isValid: false,
      error: 'File size exceeds maximum allowed size of 2MB',
    })

    const file = createMockFile('logo.png', 'image/png', 10 * 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'logo')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('File size exceeds maximum allowed size of 2MB')
  })

  it('should return 400 if file validation fails for background', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    vi.mocked(validateBackgroundImage).mockReturnValue({
      isValid: false,
      error: 'Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp',
    })

    const file = createMockFile('background.pdf', 'application/pdf', 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'background')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid file type')
  })

  it('should return 500 if storage upload fails', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    vi.mocked(validateLogoFile).mockReturnValue({
      isValid: true,
    })

    vi.mocked(generateStoragePath).mockReturnValue('clients/client-123/logos/logo_123.png')

    const uploadMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Storage upload failed' },
    })

    mockSupabaseClient.storage.from.mockReturnValue({
      upload: uploadMock,
    })

    const file = createMockFile('logo.png', 'image/png', 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'logo')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadFile(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Failed to upload file')
  })

  it('should use correct bucket name', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    vi.mocked(validateLogoFile).mockReturnValue({
      isValid: true,
    })

    vi.mocked(generateStoragePath).mockReturnValue('clients/client-123/logos/logo_123.png')

    const uploadMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })

    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/logo.png' },
    })

    const fromMock = vi.fn().mockReturnValue({
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock,
    })

    mockSupabaseClient.storage.from = fromMock

    const file = createMockFile('logo.png', 'image/png', 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'logo')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    await uploadFile(request)

    expect(fromMock).toHaveBeenCalledWith('client-assets')
  })

  it('should set correct cache control header', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    vi.mocked(validateLogoFile).mockReturnValue({
      isValid: true,
    })

    vi.mocked(generateStoragePath).mockReturnValue('clients/client-123/logos/logo_123.png')

    const uploadMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })

    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/logo.png' },
    })

    mockSupabaseClient.storage.from.mockReturnValue({
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock,
    })

    const file = createMockFile('logo.png', 'image/png', 1024 * 1024)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'logo')
    formData.append('clientId', 'client-123')

    const request = new NextRequest('http://localhost:3000/api/clients/upload', {
      method: 'POST',
      body: formData,
    })

    await uploadFile(request)

    expect(uploadMock).toHaveBeenCalledWith(
      'clients/client-123/logos/logo_123.png',
      expect.anything(),
      expect.objectContaining({
        cacheControl: '3600',
        upsert: false,
      })
    )
  })
})
