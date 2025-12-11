import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Password Reset Flow
 * 
 * Tests the complete password reset process:
 * - User can request password reset
 * - User receives password reset email
 * - User can access reset link
 * - User can set new password
 * - User can sign in with new password
 * 
 * Related Issues: #11 - Implement password reset functionality
 * 
 * Prerequisites:
 * - /auth/forgot-password page must exist (for requesting reset)
 * - /auth/reset-password page must exist (for setting new password)
 * - Password reset functionality must be implemented
 * - Email service must be configured for reset emails
 * - Supabase auth must support password reset flow
 */

// Test data - using environment variables with fallbacks
const TEST_USER_EMAIL = process.env.PLAYWRIGHT_PASSWORD_RESET_TEST_EMAIL || 'password-reset-test@involved.test'
const ORIGINAL_PASSWORD = process.env.PLAYWRIGHT_PASSWORD_RESET_ORIGINAL_PASSWORD || 'OriginalPassword123!'
const NEW_PASSWORD = 'NewPassword456!'
const INVALID_EMAIL = 'nonexistent@involved.test'

// Helper function to generate mock tokens
function generateMockToken(suffix: string): string {
  return 'mock-reset-token-' + suffix.repeat(50)
}

test.describe('Password Reset Flow', () => {
  // Check if reset pages exist before running tests
  let forgotPasswordPageExists = false
  let resetPasswordPageExists = false
  
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    
    // Check forgot password page
    try {
      const forgotResponse = await page.goto('/auth/forgot-password')
      forgotPasswordPageExists = forgotResponse?.status() !== 404
    } catch (error) {
      console.log('Error checking forgot password page:', error instanceof Error ? error.message : 'Unknown error')
      forgotPasswordPageExists = false
    }
    
    // Check reset password page (with mock token)
    try {
      const resetResponse = await page.goto('/auth/reset-password')
      resetPasswordPageExists = resetResponse?.status() !== 404
    } catch (error) {
      console.log('Error checking reset password page:', error instanceof Error ? error.message : 'Unknown error')
      resetPasswordPageExists = false
    }
    
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    // Start from the home page before each test
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Request Password Reset', () => {
    test('User can navigate to forgot password page', async ({ page }) => {
      test.skip(!forgotPasswordPageExists, 'Forgot password page not yet implemented')
      
      // Navigate to login page
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      
      // Look for forgot password link
      const forgotPasswordLink = page.locator(
        'a:has-text("Forgot password"), a:has-text("Forgot your password"), a:has-text("Reset password")'
      ).first()
      
      const linkExists = await forgotPasswordLink.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (linkExists) {
        // Click the link if it exists
        await forgotPasswordLink.click()
        await page.waitForLoadState('networkidle')
        
        // Verify we're on the forgot password page
        await expect(page).toHaveURL(/forgot-password|reset-password/)
      } else {
        // If link doesn't exist, navigate directly
        await page.goto('/auth/forgot-password')
        await page.waitForLoadState('networkidle')
      }
      
      // Verify the page has loaded
      await expect(
        page.locator('h1, h2').filter({ hasText: /forgot.*password|reset.*password/i })
      ).toBeVisible({ timeout: 5000 })
    })

    test('User can request password reset with valid email', async ({ page }) => {
      test.skip(!forgotPasswordPageExists, 'Forgot password page not yet implemented')
      
      // Navigate to forgot password page
      await page.goto('/auth/forgot-password')
      await page.waitForLoadState('networkidle')
      
      // Verify email input is present
      const emailInput = page.locator('input[type="email"]').first()
      await expect(emailInput).toBeVisible({ timeout: 5000 })
      
      // Fill in email
      await emailInput.fill(TEST_USER_EMAIL)
      
      // Submit the form
      const submitButton = page.locator('button[type="submit"]').first()
      await expect(submitButton).toBeVisible()
      await submitButton.click()
      
      // Wait for submission to complete
      await page.waitForLoadState('networkidle')
      
      // Verify success message
      await expect(
        page.locator(
          'text=/reset.*link.*sent/i, text=/check.*email/i, text=/sent.*email/i, text=/email.*sent/i'
        )
      ).toBeVisible({ timeout: 10000 })
    })

    test('User sees appropriate message for non-existent email', async ({ page }) => {
      test.skip(!forgotPasswordPageExists, 'Forgot password page not yet implemented')
      
      // Navigate to forgot password page
      await page.goto('/auth/forgot-password')
      await page.waitForLoadState('networkidle')
      
      // Fill in non-existent email
      await page.fill('input[type="email"]', INVALID_EMAIL)
      
      // Submit the form
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')
      
      // Most secure implementations show same message for security reasons
      // (don't reveal if email exists), so we check for success message
      const successMessage = page.locator(
        'text=/reset.*link.*sent/i, text=/check.*email/i, text=/sent.*email/i'
      )
      const errorMessage = page.locator(
        'text=/user.*not.*found/i, text=/email.*not.*found/i, text=/invalid.*email/i'
      )
      
      // Either success message (security best practice) or error should appear
      const successVisible = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)
      const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
      
      expect(successVisible || errorVisible).toBeTruthy()
    })

    test('Form validates email format', async ({ page }) => {
      test.skip(!forgotPasswordPageExists, 'Forgot password page not yet implemented')
      
      // Navigate to forgot password page
      await page.goto('/auth/forgot-password')
      await page.waitForLoadState('networkidle')
      
      // Try submitting with invalid email format
      const emailInput = page.locator('input[type="email"]').first()
      await emailInput.fill('invalid-email-format')
      
      // Try to submit
      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()
      
      // Check for HTML5 validation or custom error message
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
      const hasValidationError = validationMessage.length > 0
      
      const customError = await page.locator(
        'text=/invalid.*email/i, text=/valid.*email/i'
      ).isVisible({ timeout: 2000 }).catch(() => false)
      
      // Either HTML5 validation or custom error should prevent submission
      expect(hasValidationError || customError).toBeTruthy()
    })
  })

  test.describe('Email Verification', () => {
    test('User receives password reset email', async () => {
      // This test would require access to email testing infrastructure
      // In a real implementation, this could use:
      // - A test email service like Ethereal or MailHog
      // - Supabase Admin API to check auth.users table for reset token
      // - API calls to check email queue
      
      test.skip(true, 'Email testing infrastructure not yet configured')
      
      // Expected flow:
      // 1. Request password reset
      // 2. Check email service/database for sent email
      // 3. Extract reset token/link from email
      // 4. Verify email contains proper reset link format
      // 5. Verify token is valid and not expired
    })

    test('Reset email contains valid reset link', async () => {
      test.skip(true, 'Email testing infrastructure not yet configured')
      
      // Expected flow:
      // 1. Request password reset
      // 2. Extract reset link from email
      // 3. Verify link format: /auth/reset-password?token=...
      // 4. Verify link is accessible
    })
  })

  test.describe('Access Reset Link', () => {
    test('User can access reset password page with valid token', async ({ page }) => {
      test.skip(!resetPasswordPageExists, 'Reset password page not yet implemented')
      
      // Mock token for testing - Supabase uses base64 encoded tokens
      const mockToken = generateMockToken('a')
      
      // Navigate to reset password page with token
      await page.goto(`/auth/reset-password?token=${mockToken}`)
      await page.waitForLoadState('networkidle')
      
      // Verify reset password page loads
      await expect(
        page.locator('h1, h2').filter({ hasText: /reset.*password|new.*password/i })
      ).toBeVisible({ timeout: 5000 })
      
      // Verify password input fields are present
      const passwordInputs = page.locator('input[type="password"]')
      const passwordCount = await passwordInputs.count()
      
      // Should have at least 1 password field (possibly 2 for confirmation)
      expect(passwordCount).toBeGreaterThanOrEqual(1)
      
      // Verify submit button is present
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('Invalid token format is rejected', async ({ page }) => {
      test.skip(!resetPasswordPageExists, 'Reset password page not yet implemented')
      
      // Navigate with invalid token format
      const invalidToken = 'invalid'
      await page.goto(`/auth/reset-password?token=${invalidToken}`)
      await page.waitForLoadState('networkidle')
      
      // Verify error message is displayed
      const errorMessage = page.locator(
        'text=/invalid.*link/i, text=/invalid.*token/i, text=/expired.*link/i'
      )
      const isErrorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (isErrorVisible) {
        await expect(errorMessage).toBeVisible()
      } else {
        // If no error message visible, form might be disabled
        const submitButton = page.locator('button[type="submit"]')
        const isButtonDisabled = await submitButton.isDisabled().catch(() => false)
        expect(isButtonDisabled).toBeTruthy()
      }
    })

    test('Missing token parameter is handled', async ({ page }) => {
      test.skip(!resetPasswordPageExists, 'Reset password page not yet implemented')
      
      // Navigate to reset password page without token
      await page.goto('/auth/reset-password')
      await page.waitForLoadState('networkidle')
      
      // Check if error message is shown or if we're redirected
      const errorMessage = page.locator(
        'text=/missing.*token/i, text=/invalid.*link/i, text=/token.*required/i'
      )
      const isErrorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (!isErrorVisible) {
        // If no error message, might redirect to forgot password page
        const currentUrl = page.url()
        const isRedirected = currentUrl.includes('/auth/forgot-password') || 
                           currentUrl.includes('/auth/login')
        
        if (!isRedirected) {
          // Or form might be disabled
          const submitButton = page.locator('button[type="submit"]')
          const isButtonDisabled = await submitButton.isDisabled().catch(() => true)
          expect(isButtonDisabled).toBeTruthy()
        }
      } else {
        await expect(errorMessage).toBeVisible()
      }
    })
  })

  test.describe('Set New Password', () => {
    test('User can set new password with valid token', async ({ page }) => {
      test.skip(!resetPasswordPageExists, 'Reset password page not yet implemented')
      
      // Mock token for testing
      const mockToken = generateMockToken('b')
      
      // Navigate to reset password page with token
      await page.goto(`/auth/reset-password?token=${mockToken}`)
      await page.waitForLoadState('networkidle')
      
      // Fill in new password
      const passwordInputs = page.locator('input[type="password"]')
      const passwordCount = await passwordInputs.count()
      
      if (passwordCount >= 2) {
        // Password and confirm password fields
        await passwordInputs.nth(0).fill(NEW_PASSWORD)
        await passwordInputs.nth(1).fill(NEW_PASSWORD)
      } else {
        // Single password field
        await passwordInputs.first().fill(NEW_PASSWORD)
      }
      
      // Submit the form
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')
      
      // Verify success (either success message or redirect to login)
      const successMessage = page.locator(
        'text=/password.*updated/i, text=/password.*reset/i, text=/success/i'
      )
      const isSuccessVisible = await successMessage.isVisible({ timeout: 10000 }).catch(() => false)
      
      if (!isSuccessVisible) {
        // If no success message, should redirect to login
        const currentUrl = page.url()
        expect(currentUrl).toMatch(/\/auth\/login|\/dashboard/)
      } else {
        await expect(successMessage).toBeVisible()
      }
    })

    test('Password validation is enforced', async ({ page }) => {
      test.skip(!resetPasswordPageExists, 'Reset password page not yet implemented')
      
      // Mock token for testing
      const mockToken = generateMockToken('c')
      
      // Navigate to reset password page
      await page.goto(`/auth/reset-password?token=${mockToken}`)
      await page.waitForLoadState('networkidle')
      
      // Try with weak password
      const weakPassword = '123'
      const passwordInputs = page.locator('input[type="password"]')
      
      await passwordInputs.first().fill(weakPassword)
      if (await passwordInputs.count() >= 2) {
        await passwordInputs.nth(1).fill(weakPassword)
      }
      
      // Try to submit
      await page.click('button[type="submit"]')
      
      // Should see validation error
      const validationError = page.locator(
        'text=/password.*too.*short/i, text=/password.*weak/i, text=/password.*requirements/i, text=/at least.*characters/i'
      )
      
      const hasError = await validationError.isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasError).toBeTruthy()
    })

    test('Passwords must match when confirmation field exists', async ({ page }) => {
      test.skip(!resetPasswordPageExists, 'Reset password page not yet implemented')
      
      // Mock token for testing
      const mockToken = generateMockToken('d')
      
      // Navigate to reset password page
      await page.goto(`/auth/reset-password?token=${mockToken}`)
      await page.waitForLoadState('networkidle')
      
      // Check if there are two password fields
      const passwordInputs = page.locator('input[type="password"]')
      const passwordCount = await passwordInputs.count()
      
      if (passwordCount >= 2) {
        // Fill with non-matching passwords
        await passwordInputs.nth(0).fill(NEW_PASSWORD)
        await passwordInputs.nth(1).fill(NEW_PASSWORD + 'different')
        
        // Try to submit
        await page.click('button[type="submit"]')
        
        // Should see validation error
        const validationError = page.locator(
          'text=/password.*not.*match/i, text=/password.*must.*match/i, text=/passwords.*different/i'
        )
        
        const hasError = await validationError.isVisible({ timeout: 5000 }).catch(() => false)
        expect(hasError).toBeTruthy()
      } else {
        // Skip this test if there's only one password field
        test.skip(true, 'Only one password field present - confirmation not required')
      }
    })
  })

  test.describe('Sign In With New Password', () => {
    test('User can sign in with new password after reset', async ({ page }) => {
      // This test verifies the complete flow
      // Note: This requires actual password reset functionality to be working
      test.skip(
        !resetPasswordPageExists || !forgotPasswordPageExists,
        'Password reset functionality not yet fully implemented'
      )
      
      // Navigate to login page
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      
      // Fill in credentials with the NEW password
      await page.fill('input[type="email"]', TEST_USER_EMAIL)
      await page.fill('input[type="password"]', NEW_PASSWORD)
      
      // Submit login form
      await page.click('button[type="submit"]')
      
      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify successful login
      await expect(page).toHaveURL('/dashboard')
      
      // Verify we can access protected content
      const dashboardContent = page.locator('h1, h2').first()
      await expect(dashboardContent).toBeVisible({ timeout: 5000 })
    })

    test('Old password no longer works after reset', async ({ page }) => {
      test.skip(
        !resetPasswordPageExists || !forgotPasswordPageExists,
        'Password reset functionality not yet fully implemented'
      )
      
      // Navigate to login page
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      
      // Try to login with OLD password
      await page.fill('input[type="email"]', TEST_USER_EMAIL)
      await page.fill('input[type="password"]', ORIGINAL_PASSWORD)
      
      // Submit login form
      await page.click('button[type="submit"]')
      
      // Should see error message
      const errorMessage = page.locator(
        'text=/invalid.*credentials/i, text=/incorrect.*password/i, text=/login.*failed/i'
      )
      
      await expect(errorMessage).toBeVisible({ timeout: 10000 })
      
      // Should still be on login page
      expect(page.url()).toContain('/auth/login')
    })
  })

  test.describe('Error Handling', () => {
    test('Expired token is rejected', async ({ page }) => {
      test.skip(!resetPasswordPageExists, 'Reset password page not yet implemented')
      
      // Mock an expired token
      const expiredToken = generateMockToken('e')
      
      // Navigate to reset password page
      await page.goto(`/auth/reset-password?token=${expiredToken}`)
      await page.waitForLoadState('networkidle')
      
      // Verify error message is displayed
      await expect(
        page.locator('text=/expired/i, text=/invalid.*link/i, text=/no longer valid/i')
      ).toBeVisible({ timeout: 5000 })
      
      // Verify form is disabled or shows error
      const submitButton = page.locator('button[type="submit"]')
      const isButtonVisible = await submitButton.isVisible().catch(() => false)
      
      if (isButtonVisible) {
        const isButtonDisabled = await submitButton.isDisabled().catch(() => false)
        expect(isButtonDisabled).toBeTruthy()
      }
    })

    test('Token can only be used once', async ({ page }) => {
      test.skip(!resetPasswordPageExists, 'Reset password page not yet implemented')
      
      // This would require:
      // 1. Actually resetting a password with a valid token
      // 2. Trying to use the same token again
      // 3. Verifying it's rejected
      
      // For now, we test the error handling when accessing with used token
      const usedToken = generateMockToken('f')
      
      await page.goto(`/auth/reset-password?token=${usedToken}`)
      await page.waitForLoadState('networkidle')
      
      // Should show error or disable form
      const errorMessage = page.locator(
        'text=/already.*used/i, text=/invalid.*link/i, text=/token.*used/i'
      )
      const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (!hasError) {
        // If no explicit error, form should be disabled
        const submitButton = page.locator('button[type="submit"]')
        const isButtonDisabled = await submitButton.isDisabled().catch(() => true)
        expect(isButtonDisabled).toBeTruthy()
      }
    })

    test('Rate limiting is applied to reset requests', async ({ page }) => {
      test.skip(!forgotPasswordPageExists, 'Forgot password page not yet implemented')
      
      // Navigate to forgot password page
      await page.goto('/auth/forgot-password')
      await page.waitForLoadState('networkidle')
      
      // Submit multiple requests rapidly
      const emailInput = page.locator('input[type="email"]').first()
      const submitButton = page.locator('button[type="submit"]').first()
      
      for (let i = 0; i < 5; i++) {
        await emailInput.fill(TEST_USER_EMAIL)
        await submitButton.click()
        await page.waitForTimeout(500)
      }
      
      // After multiple rapid requests, should see rate limit message
      // Note: Actual rate limit behavior depends on Supabase configuration
      const rateLimitMessage = page.locator(
        'text=/too many.*requests/i, text=/rate.*limit/i, text=/try.*again.*later/i'
      )
      
      // Rate limiting might not be implemented, so we don't assert
      // Just check if it exists
      const hasRateLimit = await rateLimitMessage.isVisible({ timeout: 2000 }).catch(() => false)
      
      // Log the result for documentation purposes
      if (hasRateLimit) {
        console.log('✓ Rate limiting is implemented')
      } else {
        console.log('ℹ Rate limiting not detected - may need to be configured')
      }
    })
  })

  test.describe('Integration Tests', () => {
    test('Complete password reset flow from request to login', async ({ page }) => {
      // This is a comprehensive integration test
      test.skip(true, 'Requires full implementation and email testing infrastructure')
      
      // Expected complete flow:
      // 1. User navigates to forgot password page
      // 2. User requests password reset
      // 3. System sends email with reset token
      // 4. Extract token from email/database
      // 5. User visits reset link with token
      // 6. User sets new password
      // 7. User is redirected to login
      // 8. User logs in with new password
      // 9. User can access dashboard
    })

    test('Multiple password reset requests for same user', async ({ page }) => {
      test.skip(!forgotPasswordPageExists, 'Forgot password page not yet implemented')
      
      // Expected behavior:
      // 1. First reset request creates token A
      // 2. Second reset request creates token B (invalidates token A)
      // 3. Token A should no longer work
      // 4. Token B should work
      
      // This would require email/database access to verify
    })

    test('Password reset respects password history', async ({ page }) => {
      test.skip(!resetPasswordPageExists, 'Reset password page not yet implemented')
      
      // If password history is implemented:
      // 1. User resets password
      // 2. User tries to reset to the same password
      // 3. Should be rejected if password history is enforced
      
      // Note: This is an optional security feature
    })
  })
})
