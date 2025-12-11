import { test, expect } from '@playwright/test'
import { isAuthenticated, hasSupabaseAuthCookie, shouldSkipAuthTests } from './helpers/auth'

/**
 * Test to verify authentication setup is working
 * 
 * This test verifies that:
 * 1. Global setup ran successfully
 * 2. Authentication state is loaded
 * 3. We can access protected routes
 * 4. Supabase cookies are present
 */

test.describe('Authentication Setup Verification', () => {
  test.beforeEach(async () => {
    // Skip all tests if SKIP_AUTH_TESTS is set
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
  })
  
  test('should be authenticated from global setup', async ({ page }) => {
    // Navigate to dashboard (protected route)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Verify we're authenticated
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
    
    // Verify we're on dashboard, not redirected to login
    expect(page.url()).toContain('/dashboard')
    expect(page.url()).not.toContain('/auth/login')
  })
  
  test('should have Supabase auth cookie', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Check for Supabase auth cookie
    const hasCookie = await hasSupabaseAuthCookie(page)
    expect(hasCookie).toBe(true)
  })
  
  test('should be able to access protected routes', async ({ page }) => {
    // Try accessing various protected routes
    const protectedRoutes = [
      '/dashboard/clients',
      '/dashboard/users',
      '/dashboard/groups',
    ]
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      
      // Should not be redirected to login
      expect(page.url()).toContain(route)
      expect(page.url()).not.toContain('/auth/login')
    }
  })
})
