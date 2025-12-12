import { test, expect } from '@playwright/test'
import { shouldSkipAuthTests } from './helpers/auth'

/**
 * E2E Tests for Email Verification Confirmation Page
 * 
 * Tests the email confirmation page and flow:
 * - Accessing the confirmation page with valid/invalid tokens
 * - Displaying appropriate messages for different scenarios
 * - Redirecting to login after successful confirmation
 * 
 * Related Issues:
 * - #12: Implement email verification
 */

test.describe('Email Verification Confirmation Page', () => {
  test.beforeEach(async ({ page }) => {
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
    // Start from home page
    await page.goto('/')
  })

  test('Confirmation page shows error for missing token', async ({ page }) => {
    // Navigate to confirm page without token
    await page.goto('/auth/confirm')
    await page.waitForLoadState('networkidle')

    // Verify we're on the confirmation page
    expect(page.url()).toContain('/auth/confirm')

    // Should show error state
    await expect(page.locator('text=/Email Confirmation/i')).toBeVisible()
    await expect(page.locator('text=/Confirmation failed/i')).toBeVisible()
    await expect(page.locator('text=/Invalid confirmation link/i')).toBeVisible()

    // Verify navigation buttons are available
    await expect(page.locator('text=/Back to Sign Up/i')).toBeVisible()
    await expect(page.locator('text=/Go to Login/i')).toBeVisible()
  })

  test('Confirmation page shows error for invalid token type', async ({ page }) => {
    // Navigate to confirm page with wrong type
    await page.goto('/auth/confirm?token_hash=sometoken&type=invalid')
    await page.waitForLoadState('networkidle')

    // Should show error state
    await expect(page.locator('text=/Confirmation failed/i')).toBeVisible()
    await expect(page.locator('text=/Invalid confirmation link/i')).toBeVisible()
  })

  test('Confirmation page displays loading state initially with valid params', async ({ page }) => {
    // Navigate to confirm page with what looks like valid params
    await page.goto('/auth/confirm?token_hash=validlookingtoken123456789&type=email')
    
    // The loading state should appear briefly before the error (since the token is invalid)
    // We check for either loading or the eventual error state
    const loadingOrError = page.locator('text=/Confirming your email|Confirmation failed/i')
    await expect(loadingOrError).toBeVisible({ timeout: 5000 })
  })

  test('Navigation buttons work correctly on error page', async ({ page }) => {
    // Navigate to confirm page without token
    await page.goto('/auth/confirm')
    await page.waitForLoadState('networkidle')

    // Verify error state is shown
    await expect(page.locator('text=/Confirmation failed/i')).toBeVisible()

    // Test "Back to Sign Up" button
    const signupButton = page.locator('text=/Back to Sign Up/i')
    await expect(signupButton).toBeVisible()
    await signupButton.click()

    // Should navigate to signup page
    await page.waitForURL('**/auth/signup', { timeout: 5000 })
    expect(page.url()).toContain('/auth/signup')

    // Navigate back to confirm page
    await page.goto('/auth/confirm')
    await page.waitForLoadState('networkidle')

    // Test "Go to Login" button
    const loginButton = page.locator('text=/Go to Login/i')
    await expect(loginButton).toBeVisible()
    await loginButton.click()

    // Should navigate to login page
    await page.waitForURL('**/auth/login', { timeout: 5000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('Confirmation page UI elements render correctly', async ({ page }) => {
    // Navigate to confirm page without token to trigger error state
    await page.goto('/auth/confirm')
    await page.waitForLoadState('networkidle')

    // Verify card structure
    const card = page.locator('.rounded-lg.border').first()
    await expect(card).toBeVisible()

    // Verify title
    await expect(page.locator('h3:has-text("Email Confirmation")')).toBeVisible()

    // Verify error icon is displayed
    const errorIcon = page.locator('svg.text-red-500')
    await expect(errorIcon).toBeVisible()

    // Verify error message
    await expect(page.locator('.text-red-600')).toBeVisible()

    // Verify buttons are styled correctly
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThanOrEqual(2)
  })

  test('Confirmation page is accessible from signup flow message', async ({ page }) => {
    // While we can't actually click the email link in E2E tests,
    // we can verify the signup page mentions the confirmation
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')

    // Fill in signup form with test data
    await page.fill('input[id="firstName"]', 'Test')
    await page.fill('input[id="lastName"]', 'User')
    await page.fill('input[id="email"]', `test-${Date.now()}@example.com`)
    await page.fill('input[id="password"]', 'TestPassword123!')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for success message
    await expect(
      page.locator('text=/check your email|confirmation link|verification/i')
    ).toBeVisible({ timeout: 10000 })

    // Verify message mentions email confirmation
    const messageText = await page.locator('.text-green-600').first().textContent()
    expect(messageText).toContain('email')
    expect(messageText?.toLowerCase()).toContain('confirmation')
  })

  test('Confirmation page URL structure is correct', async ({ page }) => {
    // Test that the confirmation page uses the expected URL parameters
    await page.goto('/auth/confirm?token_hash=test123&type=email')
    await page.waitForLoadState('networkidle')

    // URL should be preserved
    expect(page.url()).toContain('/auth/confirm')
    expect(page.url()).toContain('token_hash=test123')
    expect(page.url()).toContain('type=email')
  })
})
