import { chromium, FullConfig } from '@playwright/test'
import { createTestUser } from './helpers/database'
import { waitForAuthentication } from './helpers/auth'

/**
 * Global setup for E2E tests
 * 
 * This file runs once before all tests to:
 * 1. Create a test admin user if it doesn't exist
 * 2. Authenticate and save the authentication state
 * 3. Make the auth state available to all tests
 */

async function globalSetup(config: FullConfig) {
  // Check if auth tests should be skipped
  const skipAuth = process.env.SKIP_AUTH_TESTS === 'true' || process.env.SKIP_AUTH_TESTS === '1'
  
  if (skipAuth) {
    console.log('⚠️  SKIP_AUTH_TESTS is set - skipping authentication setup')
    console.log('   Auth-related tests will be skipped')
    // Create empty auth state file
    const fs = await import('fs')
    const path = await import('path')
    const authDir = path.join(process.cwd(), 'e2e', '.auth')
    await fs.promises.mkdir(authDir, { recursive: true })
    await fs.promises.writeFile(
      path.join(authDir, 'user.json'),
      JSON.stringify({ cookies: [], origins: [] }, null, 2)
    )
    return
  }
  
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // For admin operations
  
  // Get test credentials from environment or use defaults
  const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL || 'e2e-test-admin@involved-talent.test'
  const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD || 'TestPassword123!'
  
  console.log('Setting up E2E test authentication...')
  
  // If we have a service key, we can create the user programmatically
  if (supabaseServiceKey && supabaseUrl) {
    console.log('Using Supabase Admin API for test user management...')
    const result = await createTestUser(
      testEmail,
      testPassword,
      undefined, // role parameter (not used - profiles table doesn't have a role field)
      'E2E',
      'Test Admin'
    )
    
    if (result) {
      if (result.created) {
        console.log(`✅ Test user created: ${testEmail}`)
      } else {
        console.log(`ℹ️  Test user already exists: ${testEmail}`)
      }
    } else {
      console.warn('⚠️  Could not create test user via Admin API')
      console.warn('   Falling back to browser-based authentication...')
      console.warn('   Make sure test user exists manually if authentication fails')
    }
  } else {
    console.log('ℹ️  SUPABASE_SERVICE_ROLE_KEY not provided')
    console.log('   Test user must exist manually in Supabase')
    console.log('   Set SUPABASE_SERVICE_ROLE_KEY to enable automatic user creation')
  }
  
  // Authenticate via browser and save state
  console.log(`\n🌐 Starting browser authentication...`)
  console.log(`   Base URL: ${baseURL}`)
  
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  // Set reasonable timeouts
  page.setDefaultTimeout(30000)
  page.setDefaultNavigationTimeout(30000)
  
  try {
    console.log(`   Navigating to login page...`)
    // Navigate to login page with timeout
    await page.goto(`${baseURL}/auth/login`, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    console.log(`   Waiting for login form...`)
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })
    
    console.log(`   Filling in credentials...`)
    // Fill in credentials
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    
    console.log(`   Submitting login form...`)
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for form submission to complete and check for error messages
    try {
      // Wait for either navigation or error message to appear
      await Promise.race([
        page.waitForURL((url) => url.pathname.startsWith('/dashboard'), { timeout: 5000 }).catch(() => null),
        page.waitForSelector('div.text-red-600, div:has-text(/error|Error|Invalid|incorrect|failed/i)', { timeout: 5000 }).catch(() => null)
      ])
      
      // Check if we're still on login page (login might have failed)
      const currentUrl = page.url()
      if (currentUrl.includes('/auth/login')) {
        // Check for error message
        const errorMessage = await page.locator('div.text-red-600').first().textContent({ timeout: 2000 }).catch(() => null)
        if (errorMessage) {
          console.error(`   ❌ Login error: ${errorMessage.trim()}`)
          throw new Error(`Login failed: ${errorMessage.trim()}`)
        }
        
        // Also check for any error text in the page
        const pageText = (await page.textContent('body').catch(() => null)) || ''
        if (pageText.includes('Invalid login credentials') || pageText.includes('Invalid email or password')) {
          throw new Error('Login failed: Invalid email or password. Check that test user exists in Supabase.')
        }
      } else {
        // We navigated away from login, likely successful
        console.log(`   ✅ Navigated away from login page`)
      }
    } catch (error) {
      // If we got a login failed error, throw it
      if (error instanceof Error && error.message.includes('Login failed')) {
        throw error
      }
      // Otherwise, continue - navigation might have happened
    }
    
    // Wait for navigation to dashboard (client-side router.push)
    console.log(`   Waiting for navigation to dashboard...`)
    try {
      await page.waitForURL(
        (url) => url.pathname.startsWith('/dashboard'),
        { timeout: 15000, waitUntil: 'networkidle' }
      )
      console.log(`   ✅ Navigated to: ${page.url()}`)
    } catch {
      console.log(`   ⚠️  Navigation timeout. Current URL: ${page.url()}`)
      // Continue anyway - might still be authenticating
    }
    
    // Give a moment for client-side navigation and cookie setting
    await page.waitForTimeout(1000)
    
    console.log(`   Waiting for authentication...`)
    // Wait for authentication to be established (URL redirect + cookies)
    const authenticated = await waitForAuthentication(page, 20000)
    
    if (!authenticated) {
      // Take screenshot for debugging
      const screenshotPath = 'e2e/.auth/login-failed.png'
      await page.screenshot({ path: screenshotPath, fullPage: true })
      console.error(`   Screenshot saved to: ${screenshotPath}`)
      
      // Try to extract the actual error message from the page
      try {
        const errorMessage = await page.locator('div:has-text(/error|Error|Invalid|incorrect|failed/i)').first().textContent({ timeout: 2000 })
        if (errorMessage) {
          console.error(`   Error message from page: ${errorMessage.trim()}`)
        }
      } catch {
        // Error message not found in expected location
      }
      
      // Log page content for debugging
      const pageContent = await page.content()
      const hasError = pageContent.includes('error') || pageContent.includes('Error')
      const hasSuccess = pageContent.includes('successful') || pageContent.includes('Login successful')
      console.error(`   Page contains error message: ${hasError}`)
      console.error(`   Page contains success message: ${hasSuccess}`)
      
      // Get current URL to see where we are
      const currentUrl = page.url()
      console.error(`   Current URL: ${currentUrl}`)
      
      // Check if we're still on login page (indicates login failed)
      if (currentUrl.includes('/auth/login')) {
        throw new Error('Authentication failed - still on login page. Check credentials and test user exists in Supabase.')
      }
      
      throw new Error('Authentication verification failed - not redirected to dashboard')
    }
    
    console.log(`   Saving authentication state...`)
    // Save authentication state (includes cookies and localStorage)
    await context.storageState({ path: 'e2e/.auth/user.json' })
    
    console.log('✅ Authentication state saved successfully')
    console.log(`   User: ${testEmail}`)
    console.log(`   Auth state: e2e/.auth/user.json`)
  } catch (error) {
    console.error('\n❌ Failed to authenticate:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Tests requiring authentication will be skipped.')
    console.error('\nTroubleshooting:')
    console.error('1. Test user exists in Supabase')
    console.error('2. PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are set correctly')
    console.error('3. Application is running and accessible at:', baseURL)
    console.error('4. Check screenshot: e2e/.auth/login-failed.png (if created)')
    
    // Create empty auth state file so tests know auth is not available
    try {
      await context.storageState({ path: 'e2e/.auth/user.json' })
    } catch {
      // If we can't save state, create empty file
      const fs = await import('fs')
      const path = await import('path')
      const authDir = path.join(process.cwd(), 'e2e', '.auth')
      await fs.promises.mkdir(authDir, { recursive: true })
      await fs.promises.writeFile(
        path.join(authDir, 'user.json'),
        JSON.stringify({ cookies: [], origins: [] }, null, 2)
      )
    }
  } finally {
    await browser.close()
    console.log('   Browser closed\n')
  }
}

export default globalSetup
