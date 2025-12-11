import { chromium, FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

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
    try {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
      
      // List users and check if test user exists
      const { data: usersList } = await adminClient.auth.admin.listUsers()
      const existingUser = usersList?.users?.find((user: { email?: string }) => user.email === testEmail)
      
      if (!existingUser) {
        console.log(`Creating test user: ${testEmail}`)
        // Create user via admin API
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: testEmail,
          password: testPassword,
          email_confirm: true, // Auto-confirm email
        })
        
        if (createError) {
          console.warn(`Failed to create test user: ${createError.message}`)
        } else {
          console.log(`Test user created: ${newUser.user?.id}`)
          
          // Create profile for the user
          if (newUser.user) {
            const { error: profileError } = await adminClient
              .from('profiles')
              .upsert({
                id: newUser.user.id,
                email: testEmail,
                role: 'admin',
                first_name: 'E2E',
                last_name: 'Test Admin',
              })
            
            if (profileError) {
              console.warn(`Failed to create profile: ${profileError.message}`)
            }
          }
        }
      } else {
        console.log(`Test user already exists: ${existingUser.id}`)
        // Update password in case it changed
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: testPassword,
        })
      }
    } catch (error) {
      console.warn('Could not create test user via admin API:', error instanceof Error ? error.message : 'Unknown error')
      console.warn('Falling back to browser-based authentication...')
    }
  }
  
  // Authenticate via browser and save state
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Navigate to login page
    await page.goto(`${baseURL}/auth/login`, { waitUntil: 'networkidle' })
    
    // Fill in credentials
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard (indicates successful login)
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    
    // Save authentication state
    await context.storageState({ path: 'e2e/.auth/user.json' })
    
    console.log('✅ Authentication state saved successfully')
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
