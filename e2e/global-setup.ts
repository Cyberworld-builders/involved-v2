import { chromium, FullConfig } from '@playwright/test'
import { createTestUser } from './helpers/database'
import { waitForAuthCookies, waitForAuthentication } from './helpers/auth'

/**
 * Global setup for E2E tests
 * 
 * This file runs once before all tests to:
 * 1. Create a test admin user if it doesn't exist
 * 2. Authenticate and save the authentication state
 * 3. Make the auth state available to all tests
 */

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
      'admin',
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
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Navigate to login page
    await page.goto(`${baseURL}/auth/login`, { waitUntil: 'networkidle' })
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 5000 })
    
    // Fill in credentials
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for authentication to be established (URL redirect + cookies)
    const authenticated = await waitForAuthentication(page, 15000)
    
    if (!authenticated) {
      throw new Error('Authentication verification failed - not redirected to dashboard')
    }
    
    // Wait for auth cookies to ensure they're set (important for SSR)
    await waitForAuthCookies(page, 5000)
    
    // Save authentication state (includes cookies and localStorage)
    await context.storageState({ path: 'e2e/.auth/user.json' })
    
    console.log('✅ Authentication state saved successfully')
    console.log(`   User: ${testEmail}`)
    console.log(`   Auth state: e2e/.auth/user.json`)
  } catch (error) {
    console.error('❌ Failed to authenticate:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Tests requiring authentication will be skipped.')
    console.error('Make sure:')
    console.error('1. Test user exists in Supabase')
    console.error('2. PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are set correctly')
    console.error('3. Application is running and accessible')
    
    // Create empty auth state file so tests know auth is not available
    await context.storageState({ path: 'e2e/.auth/user.json' })
  } finally {
    await browser.close()
  }
}

export default globalSetup
