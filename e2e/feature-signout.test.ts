import { test, expect, Page } from '@playwright/test'
import { isAuthenticated, shouldSkipAuthTests, hasSupabaseAuthCookie } from './helpers/auth'

/**
 * Feature Tests: User Sign Out Flow
 * 
 * This test suite verifies:
 * - User can sign out from dashboard
 * - User session is cleared after sign out
 * - User is redirected to login page after sign out
 * 
 * Related Issues:
 * - #10: Implement user sign out
 */

/**
 * Helper function to check if user is on login page
 */
async function isOnLoginPage(page: Page): Promise<boolean> {
  const url = page.url()
  return url.includes('/auth/login')
}

test.describe('User Sign Out Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Skip all tests if SKIP_AUTH_TESTS is set
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
    
    // Verify user is authenticated before testing sign out
    const isAuth = await isAuthenticated(page)
    if (!isAuth) {
      test.skip(true, 'User must be authenticated to test sign out')
      return
    }
  })

  test('user can sign out from dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // Verify we're authenticated and on dashboard
    expect(await isAuthenticated(page)).toBe(true)
    expect(page.url()).toContain('/dashboard')
    
    // Find and click the Sign Out button
    const signOutButton = page.locator('button:has-text("Sign Out")')
    await expect(signOutButton).toBeVisible({ timeout: 10000 })
    await signOutButton.click()
    
    // Wait for navigation to login page
    await page.waitForURL('**/auth/login**', { timeout: 10000 })
    
    // Verify we're on the login page
    expect(await isOnLoginPage(page)).toBe(true)
  })

  test('user session is cleared after sign out', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // Verify we're authenticated and have auth cookies before sign out
    expect(await isAuthenticated(page)).toBe(true)
    expect(await hasSupabaseAuthCookie(page)).toBe(true)
    
    // Click the Sign Out button
    const signOutButton = page.locator('button:has-text("Sign Out")')
    await expect(signOutButton).toBeVisible({ timeout: 10000 })
    await signOutButton.click()
    
    // Wait for navigation to login page
    await page.waitForURL('**/auth/login**', { timeout: 10000 })
    
    // Give a moment for session cleanup
    await page.waitForTimeout(1000)
    
    // Verify auth cookies are cleared
    // Note: Supabase may keep cookies but with empty/invalid tokens
    // So we verify by attempting to access dashboard
    await page.goto('/dashboard', { timeout: 10000 })
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    
    // Should be redirected back to login due to cleared session
    expect(await isOnLoginPage(page)).toBe(true)
  })

  test('user is redirected to login page after sign out', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // Verify we're on dashboard
    expect(page.url()).toContain('/dashboard')
    
    // Click the Sign Out button
    const signOutButton = page.locator('button:has-text("Sign Out")')
    await expect(signOutButton).toBeVisible({ timeout: 10000 })
    await signOutButton.click()
    
    // Wait for and verify redirect to login page
    await page.waitForURL('**/auth/login**', { timeout: 10000 })
    expect(await isOnLoginPage(page)).toBe(true)
    
    // Verify login form is visible (indicating proper redirect)
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })
    
    // Verify login page title or heading
    const loginHeading = page.locator('h1, h2').filter({ hasText: /sign in|login/i })
    await expect(loginHeading).toBeVisible({ timeout: 5000 })
  })

  test('signed out user cannot access protected routes', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // Sign out
    const signOutButton = page.locator('button:has-text("Sign Out")')
    await expect(signOutButton).toBeVisible({ timeout: 10000 })
    await signOutButton.click()
    
    // Wait for redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 10000 })
    
    // Try to access various protected routes
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/assessments',
      '/dashboard/clients',
      '/dashboard/users',
    ]
    
    for (const route of protectedRoutes) {
      await page.goto(route, { timeout: 10000 })
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      
      // Should be redirected to login page
      expect(await isOnLoginPage(page)).toBe(true)
    }
  })
})
