import { test, expect } from '@playwright/test'
import { getAdminClient } from './helpers/database'

/**
 * E2E Tests for User Sign Up Flow
 * 
 * Tests the complete user signup process including:
 * - Accessing the signup page
 * - Submitting the signup form
 * - Receiving verification email message
 * - Email verification (simulated with admin API)
 * - Signing in after verification
 * 
 * Related Issues:
 * - #8: Implement user sign up
 * - #12: Implement email verification
 */

test.describe('User Sign Up Flow', () => {
  // Test email domain constant
  const TEST_EMAIL_DOMAIN = 'involved-talent.test'
  
  // Helper function to generate unique test user data for each test
  const generateTestUser = () => ({
    email: `signup-test-${Date.now()}-${Math.random().toString(36).substring(7)}@${TEST_EMAIL_DOMAIN}`,
    password: 'SignupTest123!',
    firstName: 'Signup',
    lastName: 'Test',
  })

  // Helper function to fill signup form
  const fillSignupForm = async (page: any, testUser: any) => {
    await page.fill('input[id="firstName"]', testUser.firstName)
    await page.fill('input[id="lastName"]', testUser.lastName)
    await page.fill('input[id="email"]', testUser.email)
    await page.fill('input[id="password"]', testUser.password)
  }

  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/')
  })

  test('User can access signup page', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')

    // Verify we're on the signup page
    expect(page.url()).toContain('/auth/signup')

    // Verify page title and description are present
    await expect(
      page.locator('text=/Create your account|Sign up|Create account/i').first()
    ).toBeVisible()

    // Verify all required form fields are present
    await expect(page.locator('input[id="firstName"]')).toBeVisible()
    await expect(page.locator('input[id="lastName"]')).toBeVisible()
    await expect(page.locator('input[id="email"]')).toBeVisible()
    await expect(page.locator('input[id="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // Verify link to login page is present
    await expect(
      page.locator('a[href="/auth/login"], text=/already have an account/i')
    ).toBeVisible()
  })

  test('User can submit signup form with valid data', async ({ page }) => {
    const testUser = generateTestUser()
    
    // Navigate to signup page
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')

    // Fill in the signup form
    await fillSignupForm(page, testUser)

    // Submit the form
    await page.click('button[type="submit"]')

    // Wait for success message to appear (better than fixed timeout)
    const successMessage = page.locator('text=/check your email|confirmation link|verification/i')
    await expect(successMessage).toBeVisible({ timeout: 10000 })

    // Verify the message indicates email was sent
    const messageText = await page.locator('div.text-green-600').first().textContent()
    expect(messageText).toContain('email')
  })

  test('User can verify email using admin API', async ({ page }) => {
    const testUser = generateTestUser()
    
    // This test simulates email verification using Supabase Admin API
    // In a real scenario, user would click link in email
    
    const adminClient = getAdminClient()
    
    if (!adminClient) {
      test.skip(true, 'Admin client not available - SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    // First, create a user via signup
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    
    await fillSignupForm(page, testUser)
    await page.click('button[type="submit"]')
    
    // Wait for success message instead of fixed timeout
    await expect(page.locator('text=/check your email|confirmation/i')).toBeVisible({ timeout: 10000 })

    // Find user by email (more specific than listing all users)
    const { data: usersList } = await adminClient.auth.admin.listUsers()
    const newUser = usersList?.users?.find(
      (user: { email?: string }) => user.email === testUser.email
    )

    expect(newUser).toBeDefined()
    expect(newUser?.email).toBe(testUser.email)

    // Simulate email verification by updating user via admin API
    if (newUser) {
      const { error } = await adminClient.auth.admin.updateUserById(newUser.id, {
        email_confirm: true,
      })

      expect(error).toBeNull()
      
      // Verify the user is now confirmed
      const { data: updatedUser } = await adminClient.auth.admin.getUserById(newUser.id)
      expect(updatedUser.user?.email_confirmed_at).toBeTruthy()
      
      // Cleanup
      await adminClient.auth.admin.deleteUser(newUser.id)
    }
  })

  test('User can sign in after email verification', async ({ page }) => {
    const testUser = generateTestUser()
    
    // This test verifies the complete flow from signup to login
    
    const adminClient = getAdminClient()
    
    if (!adminClient) {
      test.skip(true, 'Admin client not available - SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    // Step 1: Sign up
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    
    await fillSignupForm(page, testUser)
    await page.click('button[type="submit"]')
    
    // Wait for success message
    await expect(page.locator('text=/check your email|confirmation/i')).toBeVisible({ timeout: 10000 })

    // Step 2: Verify email using admin API
    const { data: usersList } = await adminClient.auth.admin.listUsers()
    const newUser = usersList?.users?.find(
      (user: { email?: string }) => user.email === testUser.email
    )

    if (newUser) {
      await adminClient.auth.admin.updateUserById(newUser.id, {
        email_confirm: true,
      })

      // Step 3: Navigate to login page
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')

      // Step 4: Fill in login credentials
      await page.fill('input[type="email"]', testUser.email)
      await page.fill('input[type="password"]', testUser.password)

      // Step 5: Submit login form
      await page.click('button[type="submit"]')

      // Step 6: Wait for redirect to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 15000 })

      // Step 7: Verify successful login
      expect(page.url()).toContain('/dashboard')
      expect(page.url()).not.toContain('/auth/login')
      
      // Verify user is on dashboard page
      await expect(page.locator('text=/dashboard/i').first()).toBeVisible({ timeout: 5000 })
      
      // Cleanup
      await adminClient.auth.admin.deleteUser(newUser.id)
    }
  })

  test('Complete signup flow end-to-end', async ({ page }) => {
    const testUser = generateTestUser()
    
    // This test covers the entire signup journey
    
    const adminClient = getAdminClient()
    
    if (!adminClient) {
      test.skip(true, 'Admin client not available - SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    // 1. Access signup page
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/auth/signup')

    // 2. Fill and submit signup form
    await fillSignupForm(page, testUser)
    await page.click('button[type="submit"]')

    // 3. Verify confirmation message
    await expect(
      page.locator('text=/check your email|confirmation/i')
    ).toBeVisible({ timeout: 10000 })

    // 4. Simulate email verification
    const { data: usersList } = await adminClient.auth.admin.listUsers()
    const newUser = usersList?.users?.find(
      (user: { email?: string }) => user.email === testUser.email
    )

    expect(newUser).toBeDefined()

    if (newUser) {
      await adminClient.auth.admin.updateUserById(newUser.id, {
        email_confirm: true,
      })

      // 5. Login with verified account
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')
      
      await page.fill('input[type="email"]', testUser.email)
      await page.fill('input[type="password"]', testUser.password)
      await page.click('button[type="submit"]')

      // 6. Verify redirect to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 15000 })
      expect(page.url()).toContain('/dashboard')

      // 7. Verify user can access protected routes
      await page.goto('/dashboard/users')
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/dashboard/users')
      expect(page.url()).not.toContain('/auth/login')
      
      // Cleanup
      await adminClient.auth.admin.deleteUser(newUser.id)
    }
  })

  test('Form validation prevents invalid submissions', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Verify we're still on signup page (form validation prevented submit)
    expect(page.url()).toContain('/auth/signup')

    // HTML5 validation should prevent submission
    // Check that required fields have the required attribute (parallel queries for efficiency)
    const [firstNameRequired, lastNameRequired, emailRequired, passwordRequired] = await Promise.all([
      page.locator('input[id="firstName"]').getAttribute('required'),
      page.locator('input[id="lastName"]').getAttribute('required'),
      page.locator('input[id="email"]').getAttribute('required'),
      page.locator('input[id="password"]').getAttribute('required'),
    ])

    expect(firstNameRequired).not.toBeNull()
    expect(lastNameRequired).not.toBeNull()
    expect(emailRequired).not.toBeNull()
    expect(passwordRequired).not.toBeNull()
  })

  test('Signup page has link to login', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')

    // Verify link to login page exists
    const loginLink = page.locator('a[href="/auth/login"]')
    await expect(loginLink).toBeVisible()

    // Click the link
    await loginLink.click()

    // Verify navigation to login page
    await page.waitForURL('**/auth/login', { timeout: 5000 })
    expect(page.url()).toContain('/auth/login')
  })
})
