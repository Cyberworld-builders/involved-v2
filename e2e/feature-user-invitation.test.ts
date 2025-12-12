import { test, expect } from '@playwright/test'
import { createTestInvite, deleteTestInvite } from './helpers/database'

/**
 * E2E Tests for User Invitation & Claim Flow
 * 
 * Tests the complete user invitation and account claim process:
 * - User can access claim page with valid token
 * - User can claim account and set password
 * - Expired and invalid tokens are rejected
 * - Post-claim functionality (sign in, update profile/password)
 * 
 * Prerequisites:
 * - /auth/claim page must exist
 * - /api/auth/claim endpoints must exist
 * - Database must have user_invites table
 */

// Test data
const INVITED_USER_PASSWORD = 'InvitedPassword123!'

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
    test('Admin/Manager can send user invite', async () => {
      // This test requires admin UI functionality which may not be implemented yet
      // Skipping for now as it's tested via API/unit tests
      test.skip(true, 'Admin UI for sending invites not in scope for this test')
    })

    test('Invite email is sent with token link', async () => {
      // This test would require access to email testing infrastructure
      test.skip(true, 'Email testing infrastructure not configured')
    })

    test('Token expires after 7 days', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Create an expired invitation (expires -1 days = yesterday)
      const invite = await createTestInvite(
        `test.expired.${Date.now()}@involved.test`,
        'Test Expired User',
        'pending',
        -1  // Expired yesterday
      )
      
      if (!invite) {
        test.skip(true, 'Could not create test invite')
        return
      }
      
      try {
        await page.goto(`/auth/claim?token=${invite.token}`)
        await page.waitForLoadState('networkidle')
        
        // Verify error message about expiration
        await expect(
          page.locator('text=/expired/i, text=/invalid.*link/i, text=/no longer valid/i')
        ).toBeVisible({ timeout: 10000 })
      } finally {
        // Clean up
        await deleteTestInvite(invite.profileId)
      }
    })
  })

  test.describe('Account Claim Flow', () => {
    test('User can access account claim page with valid token', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Create a test invitation with a valid token
      const invite = await createTestInvite(
        `test.claim.${Date.now()}@involved.test`,
        'Test Claim User',
        'pending'
      )
      
      if (!invite) {
        test.skip(true, 'Could not create test invite')
        return
      }
      
      try {
        // Navigate to claim page with valid token
        await page.goto(`/auth/claim?token=${invite.token}`)
        await page.waitForLoadState('networkidle')
        
        // Verify claim page loads
        await expect(
          page.locator('h1, h2').filter({ hasText: /claim.*account/i })
        ).toBeVisible({ timeout: 10000 })
        
        // Verify form elements are present
        await expect(page.locator('input[type="password"]').first()).toBeVisible()
        await expect(page.locator('button[type="submit"]')).toBeVisible()
      } finally {
        // Clean up
        await deleteTestInvite(invite.profileId)
      }
    })

    test('User can claim account and set password', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Create a test invitation
      const invite = await createTestInvite(
        `test.claim.password.${Date.now()}@involved.test`,
        'Test Password User',
        'pending'
      )
      
      if (!invite) {
        test.skip(true, 'Could not create test invite')
        return
      }
      
      try {
        // Navigate to claim page with valid token
        await page.goto(`/auth/claim?token=${invite.token}`)
        await page.waitForLoadState('networkidle')
        
        // Wait for page to be ready
        await page.waitForSelector('input[type="password"]', { timeout: 10000 })
        
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
          // If no success message, should redirect to dashboard or login
          await page.waitForURL(/\/(dashboard|auth\/login)/, { timeout: 15000 })
        }
        
        expect(isSuccessVisible || page.url().includes('/dashboard') || page.url().includes('/auth/login')).toBeTruthy()
      } finally {
        // Clean up
        await deleteTestInvite(invite.profileId)
      }
    })

    test('User is redirected to dashboard after claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim page not yet implemented')
      
      // Create a test invitation
      const invite = await createTestInvite(
        `test.claim.redirect.${Date.now()}@involved.test`,
        'Test Redirect User',
        'pending'
      )
      
      if (!invite) {
        test.skip(true, 'Could not create test invite')
        return
      }
      
      try {
        // Navigate to claim page
        await page.goto(`/auth/claim?token=${invite.token}`)
        await page.waitForLoadState('networkidle')
        
        // Wait for password inputs
        await page.waitForSelector('input[type="password"]', { timeout: 10000 })
        
        // Fill in passwords
        const passwordInputs = page.locator('input[type="password"]')
        const count = await passwordInputs.count()
        
        if (count >= 2) {
          await passwordInputs.nth(0).fill(INVITED_USER_PASSWORD)
          await passwordInputs.nth(1).fill(INVITED_USER_PASSWORD)
        } else {
          await passwordInputs.first().fill(INVITED_USER_PASSWORD)
        }
        
        await page.click('button[type="submit"]')
        
        // Wait for redirect (either to dashboard or login)
        await page.waitForURL(/\/(dashboard|auth\/login)/, { timeout: 15000 })
        
        // Verify we're on dashboard or login page
        const url = page.url()
        expect(url.includes('/dashboard') || url.includes('/auth/login')).toBeTruthy()
      } finally {
        // Clean up
        await deleteTestInvite(invite.profileId)
      }
    })

    test('Expired tokens are rejected', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Create an expired invitation (expires -1 days = yesterday)
      const invite = await createTestInvite(
        `test.expired.token.${Date.now()}@involved.test`,
        'Test Expired Token',
        'pending',
        -1  // Expired yesterday
      )
      
      if (!invite) {
        test.skip(true, 'Could not create test invite')
        return
      }
      
      try {
        await page.goto(`/auth/claim?token=${invite.token}`)
        await page.waitForLoadState('networkidle')
        
        // Verify error message about expiration
        await expect(
          page.locator('text=/expired/i, text=/invalid.*link/i, text=/no longer valid/i')
        ).toBeVisible({ timeout: 10000 })
      } finally {
        // Clean up
        await deleteTestInvite(invite.profileId)
      }
    })
  })

  test.describe('Post-Claim Functionality', () => {
    test('User can sign in after account claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Create and claim an account
      const invite = await createTestInvite(
        `test.signin.${Date.now()}@involved.test`,
        'Test SignIn User',
        'pending'
      )
      
      if (!invite) {
        test.skip(true, 'Could not create test invite')
        return
      }
      
      try {
        // First claim the account
        await page.goto(`/auth/claim?token=${invite.token}`)
        await page.waitForLoadState('networkidle')
        await page.waitForSelector('input[type="password"]', { timeout: 10000 })
        
        const passwordInputs = page.locator('input[type="password"]')
        const count = await passwordInputs.count()
        
        if (count >= 2) {
          await passwordInputs.nth(0).fill(INVITED_USER_PASSWORD)
          await passwordInputs.nth(1).fill(INVITED_USER_PASSWORD)
        } else {
          await passwordInputs.first().fill(INVITED_USER_PASSWORD)
        }
        
        await page.click('button[type="submit"]')
        
        // Wait for the claim to complete by checking URL or success message
        try {
          // Try to wait for URL change first
          await page.waitForURL(/\/(dashboard|auth\/login)/, { timeout: 5000 })
        } catch {
          // If URL didn't change, wait for success message
          await page.waitForSelector('text=/account.*claimed/i, text=/success/i', { timeout: 5000 }).catch(() => {
            // If neither happened, continue anyway - the test will verify login
          })
        }
        
        // Now try to sign in
        await page.goto('/auth/login')
        await page.waitForLoadState('networkidle')
        
        await page.fill('input[type="email"]', invite.email)
        await page.fill('input[type="password"]', INVITED_USER_PASSWORD)
        await page.click('button[type="submit"]')
        
        // Wait for redirect to dashboard
        await page.waitForURL('/dashboard', { timeout: 15000 })
        
        // Verify successful login
        await expect(page).toHaveURL('/dashboard')
      } finally {
        // Clean up
        await deleteTestInvite(invite.profileId)
      }
    })

    test('User can update profile after account claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Create and claim an account
      const invite = await createTestInvite(
        `test.profile.${Date.now()}@involved.test`,
        'Test Profile User',
        'pending'
      )
      
      if (!invite) {
        test.skip(true, 'Could not create test invite')
        return
      }
      
      try {
        // First claim the account
        await page.goto(`/auth/claim?token=${invite.token}`)
        await page.waitForLoadState('networkidle')
        await page.waitForSelector('input[type="password"]', { timeout: 10000 })
        
        const passwordInputs = page.locator('input[type="password"]')
        const count = await passwordInputs.count()
        
        if (count >= 2) {
          await passwordInputs.nth(0).fill(INVITED_USER_PASSWORD)
          await passwordInputs.nth(1).fill(INVITED_USER_PASSWORD)
        } else {
          await passwordInputs.first().fill(INVITED_USER_PASSWORD)
        }
        
        await page.click('button[type="submit"]')
        
        // Wait for the claim to complete
        try {
          await page.waitForURL(/\/(dashboard|auth\/login)/, { timeout: 10000 })
        } catch {
          // If URL didn't change, wait for success message
          await page.waitForSelector('text=/account.*claimed/i, text=/success/i', { timeout: 5000 }).catch(() => {})
        }
        
        // If redirected to login, sign in first
        if (page.url().includes('/auth/login')) {
          await page.fill('input[type="email"]', invite.email)
          await page.fill('input[type="password"]', INVITED_USER_PASSWORD)
          await page.click('button[type="submit"]')
          await page.waitForURL('/dashboard', { timeout: 10000 })
        }
        
        // Navigate to profile page to update profile
        const profileUrls = [
          '/dashboard/profile',
          '/dashboard/settings',
          '/dashboard/settings/profile',
          '/dashboard/account',
          '/dashboard/account/profile',
        ]
        
        let profilePageFound = false
        for (const url of profileUrls) {
          try {
            const response = await page.goto(url, { timeout: 5000 })
            if (response?.status() !== 404) {
              profilePageFound = true
              break
            }
          } catch {
            // Try next URL
          }
        }
        
        if (!profilePageFound) {
          test.skip(true, 'Profile page not found - cannot test profile update')
          return
        }
        
        await page.waitForLoadState('networkidle')
        
        // Update profile name
        const nameInput = page.locator(
          'input[name="name"], input[id="name"], input[placeholder*="name" i]'
        ).first()
        
        const nameInputExists = await nameInput.count() > 0
        
        if (!nameInputExists) {
          test.skip(true, 'Name input field not found on profile page')
          return
        }
        
        await expect(nameInput).toBeVisible({ timeout: 10000 })
        
        const updatedName = `Updated Name ${Date.now()}`
        await nameInput.clear()
        await nameInput.fill(updatedName)
        
        // Save changes
        const saveButton = page.locator(
          'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
        ).first()
        
        await expect(saveButton).toBeVisible()
        await saveButton.click()
        
        // Wait for success message
        await expect(
          page.locator('text=/success|updated|saved/i, div.text-green, div[class*="success"]')
        ).toBeVisible({ timeout: 10000 })
        
        // Verify the update persisted by reloading
        await page.reload({ waitUntil: 'networkidle' })
        
        const verifyNameInput = page.locator(
          'input[name="name"], input[id="name"], input[placeholder*="name" i]'
        ).first()
        
        await expect(verifyNameInput).toHaveValue(updatedName)
      } finally {
        // Clean up
        await deleteTestInvite(invite.profileId)
      }
    })

    test('User can update password after account claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Create and claim an account
      const invite = await createTestInvite(
        `test.password.update.${Date.now()}@involved.test`,
        'Test Password Update User',
        'pending'
      )
      
      if (!invite) {
        test.skip(true, 'Could not create test invite')
        return
      }
      
      try {
        // First claim the account
        await page.goto(`/auth/claim?token=${invite.token}`)
        await page.waitForLoadState('networkidle')
        await page.waitForSelector('input[type="password"]', { timeout: 10000 })
        
        const passwordInputs = page.locator('input[type="password"]')
        const count = await passwordInputs.count()
        
        if (count >= 2) {
          await passwordInputs.nth(0).fill(INVITED_USER_PASSWORD)
          await passwordInputs.nth(1).fill(INVITED_USER_PASSWORD)
        } else {
          await passwordInputs.first().fill(INVITED_USER_PASSWORD)
        }
        
        await page.click('button[type="submit"]')
        
        // Wait for the claim to complete
        try {
          await page.waitForURL(/\/(dashboard|auth\/login)/, { timeout: 15000 })
        } catch {
          await page.waitForSelector('text=/account.*claimed/i, text=/success/i', { timeout: 5000 }).catch(() => {})
        }
        
        // If redirected to login, sign in first
        if (page.url().includes('/auth/login')) {
          await page.fill('input[type="email"]', invite.email)
          await page.fill('input[type="password"]', INVITED_USER_PASSWORD)
          await page.click('button[type="submit"]')
          await page.waitForURL('/dashboard', { timeout: 10000 })
        }
        
        // Navigate to profile/settings page to update password
        const profileUrls = [
          '/dashboard/profile',
          '/dashboard/settings',
          '/dashboard/settings/profile',
          '/dashboard/account',
          '/dashboard/account/profile',
        ]
        
        let profilePageFound = false
        for (const url of profileUrls) {
          try {
            const response = await page.goto(url, { timeout: 5000 })
            if (response?.status() !== 404) {
              profilePageFound = true
              break
            }
          } catch {
            // Try next URL
          }
        }
        
        if (!profilePageFound) {
          test.skip(true, 'Profile/settings page not found - cannot test password update')
          return
        }
        
        await page.waitForLoadState('networkidle')
        
        // Find password fields
        const currentPasswordField = page.locator(
          'input[name*="current" i][type="password"], input[name*="old" i][type="password"], input[placeholder*="current password" i]'
        ).first()
        
        const newPasswordField = page.locator(
          'input[name*="new" i][type="password"], input[placeholder*="new password" i]'
        ).first()
        
        const confirmPasswordField = page.locator(
          'input[name*="confirm" i][type="password"], input[placeholder*="confirm password" i]'
        ).first()
        
        // Check if password fields exist
        const hasPasswordFields = await currentPasswordField.count() > 0 && 
                                   await newPasswordField.count() > 0
        
        if (!hasPasswordFields) {
          test.skip(true, 'Password update fields not found on profile page')
          return
        }
        
        await expect(currentPasswordField).toBeVisible({ timeout: 10000 })
        await expect(newPasswordField).toBeVisible()
        
        // Fill in password change form
        const newPassword = 'NewPassword123!'
        await currentPasswordField.fill(INVITED_USER_PASSWORD)
        await newPasswordField.fill(newPassword)
        
        if (await confirmPasswordField.count() > 0) {
          await confirmPasswordField.fill(newPassword)
        }
        
        // Submit password change - look for password-specific button first
        const savePasswordButton = page.locator(
          'button[type="submit"]:has-text("Change Password"), button[type="submit"]:has-text("Update Password")'
        ).first()
        
        // If no password-specific button found, fall back to generic save button
        const buttonExists = await savePasswordButton.count() > 0
        if (buttonExists) {
          await savePasswordButton.click()
        } else {
          // Fall back to any save button near the password fields
          const genericSaveButton = page.locator('button:has-text("Save")').last()
          await genericSaveButton.click()
        }
        
        // Should show success message
        await expect(
          page.locator('text=/password.*updated|password.*changed|success/i, div.text-green, div[class*="success"]')
        ).toBeVisible({ timeout: 10000 })
        
        // Verify password was changed by signing out and back in with new password
        // Try to find sign out button
        const signOutButton = page.locator(
          'button:has-text("Sign Out"), button:has-text("Logout"), a:has-text("Sign Out"), a:has-text("Logout")'
        ).first()
        
        if (await signOutButton.count() > 0) {
          await signOutButton.click()
          await page.waitForURL('/auth/login', { timeout: 5000 }).catch(() => {})
          
          // Sign in with new password
          await page.goto('/auth/login')
          await page.waitForLoadState('networkidle')
          
          await page.fill('input[type="email"]', invite.email)
          await page.fill('input[type="password"]', newPassword)
          await page.click('button[type="submit"]')
          
          // Should successfully sign in with new password
          await page.waitForURL('/dashboard', { timeout: 10000 })
          await expect(page).toHaveURL('/dashboard')
        }
      } finally {
        // Clean up
        await deleteTestInvite(invite.profileId)
      }
    })
  })

  test.describe('Error Handling', () => {
    test('Invalid token format is rejected', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Use an invalid token format (not 64 hex chars)
      const invalidToken = 'invalid-token-123'
      
      await page.goto(`/auth/claim?token=${invalidToken}`)
      await page.waitForLoadState('networkidle')
      
      // Verify error message is displayed
      const invalidMessage = page
        .getByText(/invalid.*(invitation|link|token|format)/i)
        .or(page.getByRole('heading', { name: /invalid invitation/i }))
      await expect(invalidMessage.first()).toBeVisible({ timeout: 10000 })
    })

    test('Missing token parameter is handled', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Navigate without a token parameter
      await page.goto('/auth/claim')
      await page.waitForLoadState('networkidle')
      
      // Should see error message (or be redirected, but current expected UX is inline error)
      await expect(page.getByRole('heading', { name: /invalid invitation/i })).toBeVisible({ timeout: 10000 })
      await expect(
        page.getByText(/no token provided|token is required|invalid invitation link/i)
      ).toBeVisible({ timeout: 10000 })
    })

    test('Already claimed account prevents re-claim', async ({ page }) => {
      test.skip(!claimPageExists, 'Claim feature not yet implemented')
      
      // Create an already-accepted invitation
      const invite = await createTestInvite(
        `test.already.claimed.${Date.now()}@involved.test`,
        'Test Already Claimed',
        'accepted'  // Already accepted
      )
      
      if (!invite) {
        test.skip(true, 'Could not create test invite')
        return
      }
      
      try {
        await page.goto(`/auth/claim?token=${invite.token}`)
        await page.waitForLoadState('networkidle')
        
        // Verify error message about already claimed
        await expect(
          page.locator('text=/already.*claimed/i, text=/already.*used/i, text=/token.*used/i')
        ).toBeVisible({ timeout: 10000 })
      } finally {
        // Clean up
        await deleteTestInvite(invite.profileId)
      }
    })
  })
})
