import { Page } from '@playwright/test'

/**
 * Authentication helpers for E2E tests
 * 
 * These helpers understand Supabase's cookie structure and Next.js SSR requirements.
 * Based on community best practices for testing Supabase + Next.js applications.
 */

/**
 * Wait for Supabase authentication cookies to be set
 * 
 * Supabase stores auth tokens in cookies with the pattern: sb-<project-ref>-auth-token
 * This function waits for these cookies to be present, ensuring authentication
 * state is properly established before proceeding.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait (default: 10000ms)
 */
export async function waitForAuthCookies(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      const cookies = document.cookie
      // Check for Supabase auth cookie pattern
      return cookies.includes('sb-') && cookies.includes('auth-token')
    },
    { timeout }
  )
}

/**
 * Check if the current page indicates the user is authenticated
 * 
 * This checks both the URL (not redirected to auth pages) and attempts to
 * access a protected route to verify authentication state.
 * 
 * @param page - Playwright page object
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Try to access a protected route
    await page.goto('/dashboard', { 
      waitUntil: 'domcontentloaded',
      timeout: 5000 
    })
    
    const url = page.url()
    // If we're on dashboard and not redirected to auth, we're authenticated
    return url.includes('/dashboard') && !url.includes('/auth')
  } catch {
    return false
  }
}

/**
 * Wait for authentication to be established after login
 * 
 * This is a more comprehensive check that:
 * 1. Waits for URL redirect to dashboard
 * 2. Waits for auth cookies to be set
 * 3. Verifies we're actually authenticated
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait (default: 15000ms)
 */
export async function waitForAuthentication(page: Page, timeout = 15000): Promise<boolean> {
  try {
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout })
    
    // Wait for auth cookies
    await waitForAuthCookies(page, timeout)
    
    // Verify authentication
    return await isAuthenticated(page)
  } catch {
    return false
  }
}

/**
 * Get Supabase project reference from environment
 * 
 * Extracts the project ref from NEXT_PUBLIC_SUPABASE_URL
 * Used to construct cookie names for verification
 * 
 * @returns Project reference string or null
 */
export function getSupabaseProjectRef(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  
  // Extract project ref from URL: https://<project-ref>.supabase.co
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  return match ? match[1] : null
}

/**
 * Verify Supabase auth cookie is present
 * 
 * Checks for the specific Supabase auth cookie by project reference
 * 
 * @param page - Playwright page object
 * @returns true if cookie is present
 */
export async function hasSupabaseAuthCookie(page: Page): Promise<boolean> {
  const projectRef = getSupabaseProjectRef()
  if (!projectRef) return false
  
  const cookieName = `sb-${projectRef}-auth-token`
  const cookies = await page.context().cookies()
  return cookies.some(cookie => cookie.name === cookieName)
}
