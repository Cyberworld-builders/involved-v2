import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('getAppUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    // Restore original env
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv
    }
    // Clear module cache so the next import re-evaluates
    vi.resetModules()
  })

  beforeEach(() => {
    vi.resetModules()
  })

  async function loadGetAppUrl() {
    const mod = await import('@/lib/config')
    return mod.getAppUrl
  }

  it('returns URL with https:// when env var has no protocol', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'example.com'
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('https://example.com')
  })

  it('returns URL as-is when it already has https://', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('https://example.com')
  })

  it('returns URL as-is when it has http://', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('http://localhost:3000')
  })

  it('strips trailing slashes', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/'
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('https://example.com')
  })

  it('strips multiple trailing slashes', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com///'
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('https://example.com')
  })

  it('returns default localhost when env var is missing', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('http://localhost:3000')
  })

  it('returns default localhost when env var is empty string', async () => {
    process.env.NEXT_PUBLIC_APP_URL = ''
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('http://localhost:3000')
  })

  it('trims whitespace', async () => {
    process.env.NEXT_PUBLIC_APP_URL = '  https://example.com  '
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('https://example.com')
  })

  it('trims whitespace and adds protocol when missing', async () => {
    process.env.NEXT_PUBLIC_APP_URL = '  example.com  '
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('https://example.com')
  })

  it('returns default when env var is only whitespace', async () => {
    process.env.NEXT_PUBLIC_APP_URL = '   '
    const getAppUrl = await loadGetAppUrl()
    expect(getAppUrl()).toBe('http://localhost:3000')
  })
})
