import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function generateSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.charAt(0).toUpperCase() || ''
  const last = lastName?.charAt(0).toUpperCase() || ''
  return first + last
}

/**
 * Strip HTML tags from a string for display purposes
 * @param html - HTML string to strip tags from
 * @returns Plain text with HTML tags removed
 * @note This function is used to convert HTML content to plain text for display.
 *       The output is rendered as text in React components (not as HTML),
 *       so React's automatic escaping provides XSS protection.
 *       Do NOT use this for sanitization if the output will be rendered as HTML.
 */
export function stripHtmlTags(html: string): string {
  if (!html) return ''
  // lgtm [js/incomplete-multi-character-sanitization]
  // This is safe because the output is rendered as plain text in React,
  // which automatically escapes it. This is not used for HTML sanitization.
  return html.replace(/<[^>]*>/g, '').trim()
}
