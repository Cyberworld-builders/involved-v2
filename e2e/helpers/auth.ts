import { Page } from '@playwright/test'

/**
 * Authentication helpers for E2E tests
 * 
 * These helpers understand Supabase's cookie structure and Next.js SSR requirements.
 * Based on community best practices for testing Supabase + Next.js applications.
 */

/**
 * Check if auth tests should be skipped
 * 
 * @returns true if SKIP_AUTH_TESTS is set to 'true' or '1'
 */
export function shouldSkipAuthTests(): boolean {
  return process.env.SKIP_AUTH_TESTS === 'true' || process.env.SKIP_AUTH_TESTS === '1'
}

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
 * 1. Waits for URL redirect to dashboard (handles client-side navigation)
 * 2. Waits for auth cookies to be set
 * 3. Verifies we're actually authenticated
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait (default: 15000ms)
 */
export async function waitForAuthentication(page: Page, timeout = 15000): Promise<boolean> {
  try {
    // Wait for navigation to dashboard (client-side router.push)
    // Use a more flexible URL pattern that matches /dashboard or /dashboard/*
    await page.waitForURL(
      (url) => url.pathname.startsWith('/dashboard'),
      { timeout, waitUntil: 'networkidle' }
    )
    
    // Give a moment for cookies to be set after navigation
    await page.waitForTimeout(1000)
    
    // Wait for auth cookies to be present
    await waitForAuthCookies(page, Math.min(timeout, 10000))
    
    // Double-check we're on dashboard and not redirected back to auth
    const currentUrl = page.url()
    const isOnDashboard = currentUrl.includes('/dashboard') && !currentUrl.includes('/auth')
    
    if (!isOnDashboard) {
      console.log(`   ⚠️  Not on dashboard after login. Current URL: ${currentUrl}`)
      return false
    }
    
    // Verify authentication by checking cookies directly
    const hasCookie = await hasSupabaseAuthCookie(page)
    if (!hasCookie) {
      console.log(`   ⚠️  Supabase auth cookie not found after login`)
      return false
    }
    
    return true
  } catch (error) {
    const currentUrl = page.url()
    console.log(`   ⚠️  Authentication wait failed. Current URL: ${currentUrl}`)
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`)
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
