import { test, expect } from '@playwright/test'
import { shouldSkipAuthTests } from './helpers/auth'

/**
 * E2E Tests for Profile Update Flow
 * 
 * Tests the complete user profile update and password change process:
 * - User can access profile page
 * - User can view current profile information
 * - User can update profile information (name, username, email)
 * - Changes are saved and persisted
 * - User can update password
 * - Password update requires current password
 * - Profile validation (required fields, format checks)
 * - Error handling for invalid updates
 * 
 * Related Issues: #16, #17
 * 
 * Prerequisites:
 * - Profile page (e.g., /dashboard/profile or /dashboard/settings) must exist
 * - Profile update API endpoint must exist
 * - Password update API endpoint must exist
 * - User must be authenticated
 * - Profile data must include: name, username, email
 * - Password update must require current password verification
 */

// Test data
const UPDATED_NAME = 'E2E Updated Name'
const UPDATED_USERNAME = 'e2e_updated_username'
const CURRENT_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD || 'TestPassword123!'
const NEW_PASSWORD = 'NewTestPassword123!'

test.describe('Profile Update Flow', () => {
  // Check if profile page exists before running tests
  let profilePageExists = false
  let profilePageUrl = ''
  
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    
    // Try common profile page URLs
    const possibleUrls = [
      '/dashboard/profile',
      '/dashboard/settings',
      '/dashboard/settings/profile',
      '/dashboard/account',
      '/dashboard/account/profile',
    ]
    
    for (const url of possibleUrls) {
      try {
        const response = await page.goto(url, { timeout: 5000 })
        if (response?.status() !== 404) {
          profilePageExists = true
          profilePageUrl = url
          break
        }
      } catch {
        // Continue checking other URLs
      }
    }
    
    await page.close()
  })

  test.beforeEach(async () => {
    // Skip all tests if auth tests are disabled
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
  })

  test.describe('Profile Access', () => {
    test('User can access profile page', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      // Navigate to profile page
      await page.goto(profilePageUrl, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Verify we're on the profile page
      const url = page.url()
      expect(url).toContain(profilePageUrl)
      
      // Check for profile-related headings or elements
      const profileHeading = page.locator(
        'h1:has-text("Profile"), h1:has-text("Account"), h1:has-text("Settings"), h2:has-text("Profile")'
      ).first()
      
      await expect(profileHeading).toBeVisible({ timeout: 10000 })
    })

    test('User can view current profile information', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Check for profile form fields
      const nameInput = page.locator(
        'input[name="name"], input[id="name"], input[placeholder*="name" i]'
      ).first()
      
      const usernameInput = page.locator(
        'input[name="username"], input[id="username"], input[placeholder*="username" i]'
      ).first()
      
      const emailInput = page.locator(
        'input[name="email"], input[id="email"], input[type="email"]'
      ).first()
      
      // Verify profile fields are visible and populated
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      await expect(usernameInput.or(emailInput)).toBeVisible()
      
      // Verify fields have values
      const nameValue = await nameInput.inputValue()
      expect(nameValue).toBeTruthy()
    })
  })

  test.describe('Profile Information Update', () => {
    test('User can update profile name', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Find and update name field
      const nameInput = page.locator(
        'input[name="name"], input[id="name"], input[placeholder*="name" i]'
      ).first()
      
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      
      // Clear and enter new name
      await nameInput.clear()
      await nameInput.fill(UPDATED_NAME)
      
      // Find and click save button
      const saveButton = page.locator(
        'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
      ).first()
      
      await expect(saveButton).toBeVisible()
      await saveButton.click()
      
      // Wait for success message or confirmation
      await expect(
        page.locator('text=/success|updated|saved/i, div.text-green, div[class*="success"]')
      ).toBeVisible({ timeout: 10000 })
    })

    test('User can update username', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Find username field
      const usernameInput = page.locator(
        'input[name="username"], input[id="username"], input[placeholder*="username" i]'
      ).first()
      
      // Check if username field exists (it might not be editable in all implementations)
      const usernameExists = await usernameInput.count() > 0
      
      if (usernameExists) {
        await expect(usernameInput).toBeVisible({ timeout: 10000 })
        
        // Clear and enter new username
        await usernameInput.clear()
        await usernameInput.fill(UPDATED_USERNAME)
        
        // Save changes
        const saveButton = page.locator(
          'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
        ).first()
        
        await saveButton.click()
        
        // Wait for success confirmation
        await expect(
          page.locator('text=/success|updated|saved/i, div.text-green, div[class*="success"]')
        ).toBeVisible({ timeout: 10000 })
      } else {
        test.skip(true, 'Username field not available for editing')
      }
    })

    test('Changes are saved and persisted', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Get current name value
      const nameInput = page.locator(
        'input[name="name"], input[id="name"], input[placeholder*="name" i]'
      ).first()
      
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      const originalName = await nameInput.inputValue()
      
      // Update name
      const testName = `Test Name ${Date.now()}`
      await nameInput.clear()
      await nameInput.fill(testName)
      
      // Save changes
      const saveButton = page.locator(
        'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
      ).first()
      
      await saveButton.click()
      
      // Wait for success message
      await expect(
        page.locator('text=/success|updated|saved/i, div.text-green, div[class*="success"]')
      ).toBeVisible({ timeout: 10000 })
      
      // Reload page to verify persistence
      await page.reload({ waitUntil: 'networkidle' })
      
      // Verify the updated value persisted
      const updatedNameInput = page.locator(
        'input[name="name"], input[id="name"], input[placeholder*="name" i]'
      ).first()
      
      await expect(updatedNameInput).toHaveValue(testName)
      
      // Restore original name
      await updatedNameInput.clear()
      await updatedNameInput.fill(originalName)
      
      // Re-locate save button for restoring
      const restoreSaveButton = page.locator(
        'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
      ).first()
      await restoreSaveButton.click()
      
      // Wait for restoration to complete by checking for success message
      await expect(
        page.locator('text=/success|updated|saved/i, div.text-green, div[class*="success"]')
      ).toBeVisible({ timeout: 10000 })
    })

    test('Profile validation - required fields', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Try to clear a required field (name)
      const nameInput = page.locator(
        'input[name="name"], input[id="name"], input[placeholder*="name" i]'
      ).first()
      
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      
      const originalName = await nameInput.inputValue()
      
      // Clear the field
      await nameInput.clear()
      
      // Try to save
      const saveButton = page.locator(
        'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
      ).first()
      
      await saveButton.click()
      
      // Should show validation error
      await expect(
        page.locator('text=/required|cannot be empty|must not be blank/i, div.text-red, div[class*="error"]')
      ).toBeVisible({ timeout: 5000 })
      
      // Restore original value
      await nameInput.fill(originalName)
      
      // Re-locate and click save button to restore original value
      const restoreSaveButton = page.locator(
        'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
      ).first()
      await restoreSaveButton.click()
      
      // Wait for restoration to complete
      await expect(
        page.locator('text=/success|updated|saved/i, div.text-green, div[class*="success"]')
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Password Update', () => {
    test('User can access password update section', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Look for password update section
      const passwordSection = page.locator(
        'text=/password/i, h2:has-text("Password"), h3:has-text("Password")'
      ).first()
      
      await expect(passwordSection).toBeVisible({ timeout: 10000 })
      
      // Look for password fields
      const currentPasswordField = page.locator(
        'input[name*="current" i][type="password"], input[name*="old" i][type="password"], input[placeholder*="current password" i]'
      ).first()
      
      const newPasswordField = page.locator(
        'input[name*="new" i][type="password"], input[placeholder*="new password" i]'
      ).first()
      
      // At least one password field should exist
      await expect(currentPasswordField.or(newPasswordField)).toBeVisible()
    })

    test('Password update requires current password', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
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
      
      // Try to update password without entering current password
      await newPasswordField.fill(NEW_PASSWORD)
      
      if (await confirmPasswordField.count() > 0) {
        await confirmPasswordField.fill(NEW_PASSWORD)
      }
      
      // Try to save without current password
      const savePasswordButton = page.locator(
        'button[type="submit"]:has-text("Change Password"), button[type="submit"]:has-text("Update Password"), button:has-text("Save")'
      ).last() // Use last() to get password-specific save button if separate
      
      await savePasswordButton.click()
      
      // Should show error requiring current password
      await expect(
        page.locator('text=/current password.*required|enter your current password/i, div.text-red, div[class*="error"]')
      ).toBeVisible({ timeout: 5000 })
    })

    test('User can update password with valid current password', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
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
        test.skip(true, 'Password update functionality not yet implemented')
        return
      }
      
      await expect(currentPasswordField).toBeVisible({ timeout: 10000 })
      
      // Fill in password change form
      await currentPasswordField.fill(CURRENT_PASSWORD)
      await newPasswordField.fill(NEW_PASSWORD)
      
      if (await confirmPasswordField.count() > 0) {
        await confirmPasswordField.fill(NEW_PASSWORD)
      }
      
      // Submit password change
      const savePasswordButton = page.locator(
        'button[type="submit"]:has-text("Change Password"), button[type="submit"]:has-text("Update Password"), button:has-text("Save")'
      ).last()
      
      await savePasswordButton.click()
      
      // Should show success message
      await expect(
        page.locator('text=/password.*updated|password.*changed|success/i, div.text-green, div[class*="success"]')
      ).toBeVisible({ timeout: 10000 })
      
      // Wait for success message to disappear or form to reset
      await page.waitForFunction(
        () => {
          const successMessages = document.querySelectorAll('[class*="success"], .text-green')
          return successMessages.length === 0 || 
                 Array.from(successMessages).every(el => !el.textContent?.match(/password.*updated|password.*changed|success/i))
        },
        { timeout: 5000 }
      ).catch(() => {}) // Ignore timeout, continue anyway
      
      // Re-fill the form with original password
      await currentPasswordField.fill(NEW_PASSWORD)
      await newPasswordField.fill(CURRENT_PASSWORD)
      
      if (await confirmPasswordField.count() > 0) {
        await confirmPasswordField.fill(CURRENT_PASSWORD)
      }
      
      await savePasswordButton.click()
      
      // Wait for password restoration to complete
      await expect(
        page.locator('text=/password.*updated|password.*changed|success/i, div.text-green, div[class*="success"]')
      ).toBeVisible({ timeout: 10000 })
    })

    test('Password update fails with incorrect current password', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
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
        test.skip(true, 'Password update functionality not yet implemented')
        return
      }
      
      await expect(currentPasswordField).toBeVisible({ timeout: 10000 })
      
      // Fill in with incorrect current password
      await currentPasswordField.fill('WrongPassword123!')
      await newPasswordField.fill(NEW_PASSWORD)
      
      if (await confirmPasswordField.count() > 0) {
        await confirmPasswordField.fill(NEW_PASSWORD)
      }
      
      // Try to submit
      const savePasswordButton = page.locator(
        'button[type="submit"]:has-text("Change Password"), button[type="submit"]:has-text("Update Password"), button:has-text("Save")'
      ).last()
      
      await savePasswordButton.click()
      
      // Should show error for incorrect password
      await expect(
        page.locator('text=/incorrect.*password|invalid.*password|current password.*wrong/i, div.text-red, div[class*="error"]')
      ).toBeVisible({ timeout: 10000 })
    })

    test('Password update validates new password strength', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
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
        test.skip(true, 'Password update functionality not yet implemented')
        return
      }
      
      await expect(currentPasswordField).toBeVisible({ timeout: 10000 })
      
      // Try with a weak password
      const weakPassword = '123'
      await currentPasswordField.fill(CURRENT_PASSWORD)
      await newPasswordField.fill(weakPassword)
      
      if (await confirmPasswordField.count() > 0) {
        await confirmPasswordField.fill(weakPassword)
      }
      
      // Try to submit
      const savePasswordButton = page.locator(
        'button[type="submit"]:has-text("Change Password"), button[type="submit"]:has-text("Update Password"), button:has-text("Save")'
      ).last()
      
      await savePasswordButton.click()
      
      // Should show validation error for weak password
      await expect(
        page.locator('text=/password.*too short|password.*weak|password.*requirements|at least.*characters/i, div.text-red, div[class*="error"]')
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Error Handling', () => {
    test('Profile update handles network errors gracefully', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Simulate network failure by going offline
      await page.context().setOffline(true)
      
      // Try to update profile
      const nameInput = page.locator(
        'input[name="name"], input[id="name"], input[placeholder*="name" i]'
      ).first()
      
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      await nameInput.clear()
      await nameInput.fill('Network Error Test')
      
      const saveButton = page.locator(
        'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
      ).first()
      
      await saveButton.click()
      
      // Should show network error message
      await expect(
        page.locator('text=/network error|connection failed|failed to save|error occurred/i, div.text-red, div[class*="error"]')
      ).toBeVisible({ timeout: 10000 })
      
      // Restore network
      await page.context().setOffline(false)
    })

    test('Profile displays error for invalid email format', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      await page.goto(profilePageUrl, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Find email field
      const emailInput = page.locator(
        'input[name="email"], input[id="email"], input[type="email"]'
      ).first()
      
      // Check if email field is editable
      const emailExists = await emailInput.count() > 0
      
      if (!emailExists) {
        test.skip(true, 'Email field not available for editing')
        return
      }
      
      await expect(emailInput).toBeVisible({ timeout: 10000 })
      
      const originalEmail = await emailInput.inputValue()
      
      // Enter invalid email
      await emailInput.clear()
      await emailInput.fill('invalid-email-format')
      
      // Try to save
      const saveButton = page.locator(
        'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
      ).first()
      
      await saveButton.click()
      
      // Should show validation error
      await expect(
        page.locator('text=/invalid email|email.*format|valid email address/i, div.text-red, div[class*="error"]')
      ).toBeVisible({ timeout: 5000 })
      
      // Restore original email
      await emailInput.fill(originalEmail)
    })
  })

  test.describe('Integration Tests', () => {
    test('Complete profile update flow from navigation to confirmation', async ({ page }) => {
      test.skip(!profilePageExists, 'Profile page not yet implemented')
      
      // Start from dashboard
      await page.goto('/dashboard', { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      
      // Navigate to profile page (could be from sidebar, user menu, etc.)
      // Try multiple navigation methods
      let navigated = false
      
      // Try clicking user menu or settings link
      const profileLinks = [
        page.locator('a[href*="profile"]').first(),
        page.locator('a[href*="settings"]').first(),
        page.locator('a[href*="account"]').first(),
        page.locator('text=/profile|settings|account/i').first(),
      ]
      
      for (const link of profileLinks) {
        if (await link.count() > 0) {
          try {
            await link.click({ timeout: 5000 })
            await page.waitForURL(profilePageUrl, { timeout: 5000 })
            navigated = true
            break
          } catch {
            // Try next link
          }
        }
      }
      
      if (!navigated) {
        // Direct navigation as fallback
        await page.goto(profilePageUrl)
        await page.waitForLoadState('networkidle')
      }
      
      // Update profile
      const nameInput = page.locator(
        'input[name="name"], input[id="name"], input[placeholder*="name" i]'
      ).first()
      
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      
      const testName = `Integration Test ${Date.now()}`
      await nameInput.clear()
      await nameInput.fill(testName)
      
      // Save
      const saveButton = page.locator(
        'button[type="submit"]:has-text("Save"), button:has-text("Update"), button:has-text("Save Changes")'
      ).first()
      
      await saveButton.click()
      
      // Verify success
      await expect(
        page.locator('text=/success|updated|saved/i, div.text-green, div[class*="success"]')
      ).toBeVisible({ timeout: 10000 })
      
      // Navigate away and back to verify persistence
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      await page.goto(profilePageUrl)
      await page.waitForLoadState('networkidle')
      
      // Verify value persisted
      const verifyNameInput = page.locator(
        'input[name="name"], input[id="name"], input[placeholder*="name" i]'
      ).first()
      
      await expect(verifyNameInput).toHaveValue(testName)
    })
  })
})
