import crypto from 'crypto'

const SECRET_KEY = process.env.ASSIGNMENT_SECRET_KEY || 'SM9UyHvpf30KHyJLmgvOPLIDJtY1fPoh'

/**
 * Generate an encrypted assignment URL
 * Format: assignment/{id}?u={base64_username}&e={base64_expires}&t={hash}
 */
export function generateAssignmentURL(
  assignmentId: string,
  username: string,
  expires: Date,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
): string {
  const url = `assignment/${assignmentId}`
  const expiresStr = expires.toISOString()

  // Generate hash: sha256(username + secretkey + url + expires)
  const hash = crypto
    .createHash('sha256')
    .update(username + SECRET_KEY + url + expiresStr)
    .digest('hex')

  const params = new URLSearchParams({
    u: Buffer.from(username).toString('base64'),
    e: Buffer.from(expiresStr).toString('base64'),
    t: Buffer.from(hash).toString('base64'),
  })

  return `${baseUrl}/${url}?${params.toString()}`
}

/**
 * Validate an assignment URL token
 * Returns true if the URL is valid and not expired
 */
export function validateAssignmentURL(
  assignmentId: string,
  query: { u?: string; e?: string; t?: string }
): { valid: boolean; username?: string; expires?: Date; error?: string } {
  if (!query.u || !query.e || !query.t) {
    return { valid: false, error: 'Missing required URL parameters' }
  }

  try {
    const username = Buffer.from(query.u, 'base64').toString()
    const expiresStr = Buffer.from(query.e, 'base64').toString()
    const token = Buffer.from(query.t, 'base64').toString()

    const expires = new Date(expiresStr)

    // Check expiration
    if (expires < new Date()) {
      return { valid: false, error: 'Assignment URL has expired' }
    }

    // Verify hash
    const url = `assignment/${assignmentId}`
    const expectedHash = crypto
      .createHash('sha256')
      .update(username + SECRET_KEY + url + expires.toISOString())
      .digest('hex')

    if (token !== expectedHash) {
      return { valid: false, error: 'Invalid assignment URL token' }
    }

    return { valid: true, username, expires }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid URL format',
    }
  }
}

