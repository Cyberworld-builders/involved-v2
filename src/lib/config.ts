/**
 * Get a validated app URL with protocol guaranteed.
 * Handles missing protocol (e.g. "example.com" → "https://example.com")
 * and strips trailing slashes.
 */
export function getAppUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || '').trim() || 'http://localhost:3000'
  let url = raw.replace(/\/+$/, '')

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (url.includes('localhost') || url.includes('127.0.0.1'))
  ) {
    console.warn(
      `⚠️ NEXT_PUBLIC_APP_URL is set to "${url}" in production. Email links will be broken.`
    )
  }

  return url
}

export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Involved Talent',
    url: getAppUrl(),
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  upload: {
    maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'),
    allowedTypes: process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
    ],
  },
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    debug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
  },
} as const
