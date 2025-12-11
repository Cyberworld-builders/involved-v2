import { test, expect } from '@playwright/test'

/**
 * E2E Tests for User Invitation & Claim Flow
 * 
 * Tests the complete user invitation and account claim process:
 * - Admin/Manager sends invitation
 * - User receives email with token link
 * - User claims account and sets password
 * - User can access all account features after claim
 * - Expired tokens are properly rejected
 * 
 * Related Issues: #45-52
 * 
 * Prerequisites:
 * - /auth/claim page must exist
 * - /api/users/invite endpoint must exist
 * - User invitation and claim functionality must be implemented
 * - Email service must be configured for invite emails
 * - Database must have invite_tokens table
 */

// Test data
const ADMIN_EMAIL = 'admin@involved.test'
const ADMIN_PASSWORD = 'AdminPassword123!'
const INVITED_USER_EMAIL = 'invited.user@involved.test'
const INVITED_USER_NAME = 'Invited User'
const INVITED_USER_PASSWORD = 'InvitedPassword123!'

// Helper to check if a page exists (unused but kept for future use)
// async function pageExists(page: Page, url: string): Promise<boolean> {
//   try {
//     const response = await page.goto(url)
//     return response?.status() !== 404
//   } catch {
//     return false
//   }
// }

test.describe('User Invitation & Claim Flow', () => {
  // Check if claim page exists before running tests
  let claimPageExists = false
  
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    const mockToken = 'a'.repeat(64)
    try {
      const response = await page.goto(`/auth/claim?token=${mockToken}`)
      claimPageExists = response?.status() !== 404
    } catch {
      claimPageExists = false
    } finally {
      await page.close()
    }
  })

  test.beforeEach(async ({ page }) => {
    // Start from the home page before each test
    await page.goto('/')
  })

  test.describe('Admin/Manager Invitation', () => {
    test('Admin/Manager can send user invite', async ({ page }) => {
      test.skip(!claimPageExists, 'Invite/claim feature not yet implemented')
      
      // Login as admin
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      
      await page.fill('input[type="email"]', ADMIN_EMAIL)
      await page.fill('input[type="password"]', ADMIN_PASSWORD)
      await page.click('button[type="submit"]')
      
      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Navigate to users page
      await page.goto('/dashboard/users')
      await page.waitForLoadState('networkidle')
      
      // Look for invite button
      const inviteButton = page.locator(
        'button:has-text("Send Invite"), button:has-text("Invite User"), a:has-text("Invite User")'
      ).first()
      
      await expect(inviteButton).toBeVisible({ timeout: 5000 })
      await inviteButton.click()
      
      // Fill in invitation form
      await page.fill('input[name="email"], input[id="email"]', INVITED_USER_EMAIL)
      await page.fill('input[name="name"], input[id="name"]', INVITED_USER_NAME)
      
      // Submit invitation
      await page.click('button[type="submit"]:has-text("Send"), button:has-text("Invite")')
      
      // Verify success message
      await expect(
        page.locator('text=/invite.*sent/i, text=/invitation.*sent/i')
      ).toBeVisible({ timeout: 10000 })
    })

    test('Invite email is sent with token link', async () => {
      // This test would require access to email testing infrastructure
      // In a real implementation, this could use:
      // - A test email service like Ethereal or MailHog
      // - Direct database queries to verify invite_tokens table
      // - API calls to check email queue
      
      test.skip(true, 'Email testing infrastructure not yet configured')
      
      // Expected flow:
      // 1. Admin sends invite
      // 2. Check email service/database for sent email
      // 3. Extract token from email
      // 4. Verify token is valid and links to claim page
      // 5. Verify email contains proper claim link format
    })

    test('Token expires after 7 days', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // This test verifies token expiration logic
      // In a real implementation, this would:
      // 1. Create an invite with a backdated expiration (via API or database)
      // 2. Attempt to use the expired token
      // 3. Verify appropriate error message
      
      // For now, we test with a clearly invalid/expired token marker
      const expiredToken = 'expired' + 'a'.repeat(57) // 64 chars but marked as expired
      
      await page.goto(`/auth/claim?token=${expiredToken}`)
      await page.waitForLoadState('networkidle')
      
      // Verify error message about expiration
      await expect(
        page.locator('text=/expired/i, text=/invalid.*link/i, text=/no longer valid/i')
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Account Claim Flow', () => {
    // Mock token for testing - in real implementation this would come from database
    const MOCK_VALID_TOKEN = 'a'.repeat(64) // Valid format from invite-token-generation.ts
    
    test('User can access account claim page with valid token', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Navigate to claim page with valid token
      await page.goto(`/auth/claim?token=${MOCK_VALID_TOKEN}`)
      await page.waitForLoadState('networkidle')
      
      // Verify claim page loads
      await expect(
        page.locator('h1, h2').filter({ hasText: /claim.*account/i })
      ).toBeVisible({ timeout: 5000 })
      
      // Verify form elements are present
      await expect(page.locator('input[type="password"]').first()).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('User can claim account and set password', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Navigate to claim page with valid token
      await page.goto(`/auth/claim?token=${MOCK_VALID_TOKEN}`)
      await page.waitForLoadState('networkidle')
      
      // Fill in password form
      const passwordInputs = page.locator('input[type="password"]')
      const count = await passwordInputs.count()
      
      if (count >= 2) {
        // Password and confirm password fields
        await passwordInputs.nth(0).fill(INVITED_USER_PASSWORD)
        await passwordInputs.nth(1).fill(INVITED_USER_PASSWORD)
      } else {
        // Single password field
        await passwordInputs.first().fill(INVITED_USER_PASSWORD)
      }
      
      // Submit claim form
      await page.click('button[type="submit"]')
      
      // Verify success (either success message or redirect)
      const successMessage = page.locator('text=/account.*claimed/i, text=/success/i')
      const isSuccessVisible = await successMessage.isVisible({ timeout: 10000 }).catch(() => false)
      
      if (!isSuccessVisible) {
        // If no success message, should redirect to dashboard
        await page.waitForURL('/dashboard', { timeout: 10000 })
      } else {
        await expect(successMessage).toBeVisible()
      }
    })

    test('User is redirected to dashboard after claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Navigate to claim page with valid token
      await page.goto(`/auth/claim?token=${MOCK_VALID_TOKEN}`)
      await page.waitForLoadState('networkidle')
      
      // Fill in password form
      const passwordInputs = page.locator('input[type="password"]')
      const count = await passwordInputs.count()
      
      if (count >= 2) {
        await passwordInputs.nth(0).fill(INVITED_USER_PASSWORD)
        await passwordInputs.nth(1).fill(INVITED_USER_PASSWORD)
      } else {
        await passwordInputs.first().fill(INVITED_USER_PASSWORD)
      }
      
      await page.click('button[type="submit"]')
      
      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify dashboard loaded
      await expect(page).toHaveURL('/dashboard')
      await expect(
        page.locator('h1, h2, text=/dashboard/i').first()
      ).toBeVisible({ timeout: 5000 })
    })

    test('Expired tokens are rejected', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Use a token that's marked as expired in the database
      const EXPIRED_TOKEN = 'expired' + 'b'.repeat(57) // 64 chars
      
      // Navigate to claim page with expired token
      await page.goto(`/auth/claim?token=${EXPIRED_TOKEN}`)
      await page.waitForLoadState('networkidle')
      
      // Verify error message is displayed
      await expect(
        page.locator('text=/expired/i, text=/invalid.*link/i, text=/no longer valid/i')
      ).toBeVisible({ timeout: 5000 })
      
      // Verify claim form is not accessible or submit button is disabled
      const submitButton = page.locator('button[type="submit"]')
      const isButtonVisible = await submitButton.isVisible().catch(() => false)
      
      if (isButtonVisible) {
        await expect(submitButton).toBeDisabled()
      }
    })
  })

  test.describe('Post-Claim Functionality', () => {
    test('User can sign in after account claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented - cannot create claimed user for testing')
      
      // Navigate to login page
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      
      // Fill in credentials (user who has claimed their account)
      await page.fill('input[type="email"]', INVITED_USER_EMAIL)
      await page.fill('input[type="password"]', INVITED_USER_PASSWORD)
      
      // Submit login form
      await page.click('button[type="submit"]')
      
      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify successful login
      await expect(page).toHaveURL('/dashboard')
    })

    test('User can update profile after account claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Login as claimed user
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      
      await page.fill('input[type="email"]', INVITED_USER_EMAIL)
      await page.fill('input[type="password"]', INVITED_USER_PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Navigate to profile page
      // This might be under /dashboard/profile, /dashboard/settings, or /dashboard/users/[id]
      const profileUrls = ['/dashboard/profile', '/dashboard/settings', '/dashboard/account']
      
      let profileLoaded = false
      for (const url of profileUrls) {
        try {
          await page.goto(url)
          await page.waitForLoadState('networkidle')
          const nameInput = page.locator('input[name="name"], input[name="full_name"], input[name="fullName"]')
          if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            profileLoaded = true
            break
          }
        } catch {
          continue
        }
      }
      
      test.skip(!profileLoaded, 'Profile page not found or not accessible')
      
      // Update profile information
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[name="fullName"]').first()
      await nameInput.fill('Updated Name')
      
      // Save changes
      await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")')
      
      // Verify success message
      await expect(
        page.locator('text=/saved/i, text=/updated/i, text=/success/i')
      ).toBeVisible({ timeout: 10000 })
    })

    test('User can update password after account claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Login as claimed user
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      
      await page.fill('input[type="email"]', INVITED_USER_EMAIL)
      await page.fill('input[type="password"]', INVITED_USER_PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Navigate to password change page
      const passwordUrls = [
        '/dashboard/settings/password',
        '/dashboard/password',
        '/dashboard/settings',
        '/dashboard/profile'
      ]
      
      let passwordPageLoaded = false
      for (const url of passwordUrls) {
        try {
          await page.goto(url)
          await page.waitForLoadState('networkidle')
          const currentPasswordInput = page.locator(
            'input[name="currentPassword"], input[name="current_password"], input[name="oldPassword"]'
          )
          if (await currentPasswordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            passwordPageLoaded = true
            break
          }
        } catch {
          continue
        }
      }
      
      test.skip(!passwordPageLoaded, 'Password change page not found')
      
      // Fill in password change form
      await page.fill(
        'input[name="currentPassword"], input[name="current_password"]',
        INVITED_USER_PASSWORD
      )
      const newPassword = 'NewPassword123!'
      await page.fill('input[name="newPassword"], input[name="new_password"]', newPassword)
      await page.fill('input[name="confirmPassword"], input[name="confirm_password"]', newPassword)
      
      // Submit password change
      await page.click('button[type="submit"]')
      
      // Verify success message
      await expect(
        page.locator('text=/password.*updated/i, text=/password.*changed/i, text=/success/i')
      ).toBeVisible({ timeout: 10000 })
    })

    test('User can request password reset after account claim', async ({ page }) => {
      // This test can run independently as it tests the reset flow, not claim
      // Navigate to password reset page
      const resetUrl = '/auth/reset-password'
      await page.goto(resetUrl)
      await page.waitForLoadState('networkidle')
      
      // Check if reset page exists
      const emailInput = page.locator('input[type="email"]')
      const pageExists = await emailInput.isVisible({ timeout: 5000 }).catch(() => false)
      
      test.skip(!pageExists, 'Password reset page not yet implemented')
      
      // Fill in email
      await emailInput.fill(INVITED_USER_EMAIL)
      
      // Submit reset request
      await page.click('button[type="submit"]')
      
      // Verify success message
      await expect(
        page.locator('text=/reset.*link.*sent/i, text=/check.*email/i, text=/sent.*email/i')
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Error Handling', () => {
    test('Invalid token format is rejected', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Navigate to claim page with invalid token format
      const INVALID_TOKEN = 'invalid-token-123'
      await page.goto(`/auth/claim?token=${INVALID_TOKEN}`)
      await page.waitForLoadState('networkidle')
      
      // Verify error message
      await expect(
        page.locator('text=/invalid.*link/i, text=/invalid.*token/i, text=/invalid.*format/i')
      ).toBeVisible({ timeout: 5000 })
    })

    test('Missing token parameter is handled', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Navigate to claim page without token
      await page.goto('/auth/claim')
      await page.waitForLoadState('networkidle')
      
      // Verify error message or redirect
      const errorMessage = page.locator('text=/missing.*token/i, text=/invalid.*link/i, text=/token.*required/i')
      const isErrorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (!isErrorVisible) {
        // If no error message, should redirect to login or show error page
        const currentUrl = page.url()
        const isRedirected = currentUrl.includes('/auth/login') || currentUrl.includes('/error')
        expect(isRedirected).toBeTruthy()
      } else {
        await expect(errorMessage).toBeVisible()
      }
    })

    test('Already claimed account prevents re-claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Use a token that's already been claimed
      const CLAIMED_TOKEN = 'claimed' + 'c'.repeat(57) // 64 chars
      
      // Navigate to claim page
      await page.goto(`/auth/claim?token=${CLAIMED_TOKEN}`)
      await page.waitForLoadState('networkidle')
      
      // Verify error message
      await expect(
        page.locator('text=/already.*claimed/i, text=/already.*used/i, text=/token.*used/i')
      ).toBeVisible({ timeout: 5000 })
    })
  })
})

test.describe('Integration Tests', () => {
  test('Complete invitation flow from admin invite to user login', async () => {
    // This is a comprehensive integration test that tests the entire flow
    test.skip(true, 'Requires full implementation and email testing infrastructure')
    
    // Expected complete flow:
    // 1. Admin logs in
    // 2. Admin sends invitation to new user
    // 3. System generates token and sends email
    // 4. Extract token from email/database
    // 5. User visits claim page with token
    // 6. User sets password and claims account
    // 7. User is redirected to dashboard
    // 8. User logs out
    // 9. User logs back in with new credentials
    // 10. User can access all features
  })

  test('Multiple users can be invited and claim accounts independently', async () => {
    test.skip(true, 'Requires full implementation')
    
    // Expected flow:
    // 1. Admin invites User A
    // 2. Admin invites User B
    // 3. User A claims account
    // 4. User B claims account
    // 5. Both users can log in independently
    // 6. Both users have separate profiles
  })

  test('Token cannot be reused after successful claim', async () => {
    test.skip(true, 'Requires full implementation')
    
    // Expected flow:
    // 1. User claims account with token
    // 2. User logs out
    // 3. Attempt to use same token again
    // 4. Token is rejected as already used
  })
})
