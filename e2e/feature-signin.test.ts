import { test, expect } from '@playwright/test'
import { shouldSkipAuthTests, waitForAuthentication } from './helpers/auth'

/**
 * E2E tests for User Sign In Flow
 * 
 * This test suite verifies:
 * - User can access signin page
 * - User can sign in with valid credentials
 * - User is redirected to dashboard after signin
 * - Invalid credentials are rejected
 * 
 * Related: Cyberworld-builders/involved-v2#9
 */

// Test credentials from environment or defaults
const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL || 'e2e-test-admin@involved-talent.test'
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD || 'TestPassword123!'

test.describe('User Sign In Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Skip all tests if SKIP_AUTH_TESTS is set
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
    
    // Clear any existing auth state to test fresh login
    await page.context().clearCookies()
  })
  
  test('should access signin page successfully', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the signin page
    expect(page.url()).toContain('/auth/login')
    
    // Verify page title/heading is present
    const heading = page.locator('text=Sign in to Involved Talent')
    await expect(heading).toBeVisible()
    
    // Verify email and password inputs are present
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
    
    // Verify submit button is present
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toContainText('Sign in')
  })
  
  test('should sign in with valid credentials', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Fill in valid credentials
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Wait for authentication to complete
    const authenticated = await waitForAuthentication(page, 15000)
    
    // Verify authentication was successful
    expect(authenticated).toBe(true)
    
    // Verify we're on the dashboard
    expect(page.url()).toContain('/dashboard')
    expect(page.url()).not.toContain('/auth')
  })
  
  test('should be redirected to dashboard after signin', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Fill in credentials
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Wait for navigation to dashboard
    await page.waitForURL(
      (url) => url.pathname.startsWith('/dashboard'),
      { timeout: 15000, waitUntil: 'networkidle' }
    )
    
    // Verify we're on dashboard
    expect(page.url()).toContain('/dashboard')
    
    // Verify dashboard elements are present
    const sidebar = page.locator('.bg-gray-900')
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    
    // Verify we're not on auth pages
    expect(page.url()).not.toContain('/auth')
  })
  
  test('should reject invalid credentials', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Wait a moment for the error message to appear
    await page.waitForTimeout(2000)
    
    // Verify error message is displayed
    const errorMessage = page.locator('div.text-red-600')
    await expect(errorMessage).toBeVisible({ timeout: 10000 })
    
    // Verify we're still on login page (not redirected)
    expect(page.url()).toContain('/auth/login')
    
    // Verify we did NOT get redirected to dashboard
    expect(page.url()).not.toContain('/dashboard')
  })
  
  test('should reject empty email', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Fill in only password
    await page.fill('input[type="password"]', TEST_PASSWORD)
    
    // Try to submit the form (should be prevented by HTML5 validation)
    await page.click('button[type="submit"]')
    
    // Verify we're still on login page
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/auth/login')
  })
  
  test('should reject empty password', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Fill in only email
    await page.fill('input[type="email"]', TEST_EMAIL)
    
    // Try to submit the form (should be prevented by HTML5 validation)
    await page.click('button[type="submit"]')
    
    // Verify we're still on login page
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/auth/login')
  })
  
  test('should show "Back to home" link', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Verify "Back to home" link is present
    const backLink = page.locator('a:has-text("Back to home")')
    await expect(backLink).toBeVisible()
    
    // Verify it has correct href
    await expect(backLink).toHaveAttribute('href', '/')
  })
  
  test('should show "Sign up" link', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Verify "Sign up" link is present
    const signupLink = page.locator('a:has-text("Sign up")')
    await expect(signupLink).toBeVisible()
    
    // Verify it has correct href
    await expect(signupLink).toHaveAttribute('href', '/auth/signup')
  })
})
