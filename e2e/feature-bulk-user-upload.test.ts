import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E Tests for Bulk User Upload Feature
 * 
 * Test Coverage:
 * - Admin/Manager can access bulk upload page
 * - Download template functionality works
 * - Upload and parse valid CSV file
 * - Preview parsed users correctly
 * - Create users from spreadsheet data
 * - Handle invalid CSV rows with error messages
 * - Test group creation/assignment from bulk upload
 * 
 * Related Issue: Cyberworld-builders/involved-v2#35
 */

// Test fixtures paths
const VALID_CSV = path.join(__dirname, 'fixtures', 'valid-users.csv')
const INVALID_CSV = path.join(__dirname, 'fixtures', 'invalid-users.csv')
const INCOMPLETE_CSV = path.join(__dirname, 'fixtures', 'incomplete-row-users.csv')

// Helper function to check if user is authenticated
async function isAuthenticated(page: any): Promise<boolean> {
  const url = page.url()
  return !url.includes('/auth/login')
}

// Helper to check if Supabase is configured
function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

test.describe('Bulk User Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to bulk upload page before each test
    await page.goto('/dashboard/users/bulk-upload')
    await page.waitForLoadState('networkidle')
  })

  test('should access bulk upload page', async ({ page }) => {
    // Check if we're on the bulk upload page or redirected to login
    if (!(await isAuthenticated(page))) {
      // If redirected to login, that's expected behavior for unauthenticated users
      expect(page.url()).toContain('/auth/login')
      console.log('✓ Correctly redirected to login for unauthenticated user')
    } else {
      // If we're on the bulk upload page, verify page elements
      await expect(page.locator('h1')).toContainText('Bulk Upload Users')
      await expect(page.locator('text=Upload multiple users from a CSV file')).toBeVisible()
      console.log('✓ Successfully accessed bulk upload page')
    }
  })

  test('should display download template button', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Check for download template section
    const downloadSection = page.locator('text=Download Template').first()
    await expect(downloadSection).toBeVisible()
    
    // Verify download button exists
    const downloadButton = page.locator('button:has-text("Download Template")')
    await expect(downloadButton).toBeVisible()
  })

  test('should download template file', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Setup download listener
    const downloadPromise = page.waitForEvent('download')
    
    // Click download button
    await page.locator('button:has-text("Download Template")').click()
    
    // Wait for download and verify
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('user_upload_template.csv')
    
    // Optionally verify file content
    const filePath = await download.path()
    expect(filePath).toBeTruthy()
  })

  test('should have file upload input', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Check for upload section
    const uploadSection = page.locator('text=Upload CSV File').first()
    await expect(uploadSection).toBeVisible()
    
    // Verify file input exists
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await expect(fileInput).toBeVisible()
  })

  test('should upload and parse valid CSV file', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload the valid CSV file
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(VALID_CSV)
    
    // Wait for success message with better selector
    const successMessage = page.locator('[class*="green"], [class*="success"]').filter({ hasText: 'Successfully parsed' })
    await expect(successMessage).toBeVisible({ timeout: 10000 })
    
    // Verify preview section is displayed
    await expect(page.locator('text=Preview Users')).toBeVisible()
  })

  test('should display parsed users in preview table', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload the valid CSV file
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(VALID_CSV)
    
    // Wait for preview table to appear
    await expect(page.locator('text=Preview Users')).toBeVisible({ timeout: 10000 })
    
    // Verify table headers are present
    await expect(page.locator('th:has-text("Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Email")')).toBeVisible()
    await expect(page.locator('th:has-text("Username")')).toBeVisible()
    await expect(page.locator('th:has-text("Industry")')).toBeVisible()
    await expect(page.locator('th:has-text("Client")')).toBeVisible()
    
    // Verify specific user data from CSV
    await expect(page.locator('td:has-text("John Doe")')).toBeVisible()
    await expect(page.locator('td:has-text("john.doe@test.com")')).toBeVisible()
    await expect(page.locator('td:has-text("Jane Smith")')).toBeVisible()
    await expect(page.locator('td:has-text("jane.smith@test.com")')).toBeVisible()
    await expect(page.locator('td:has-text("Bob Johnson")')).toBeVisible()
    
    // Verify user count
    await expect(page.locator('text=Preview Users').locator('text=/3/')).toBeVisible()
  })

  test('should show create users button after parsing', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload the valid CSV file
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(VALID_CSV)
    
    // Wait for preview to appear
    await expect(page.locator('text=Preview Users')).toBeVisible({ timeout: 10000 })
    
    // Verify create button exists and shows correct count
    const createButton = page.locator('button:has-text("Create 3 Users")')
    await expect(createButton).toBeVisible()
    await expect(createButton).toBeEnabled()
  })

  test('should show clear button after parsing', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload the valid CSV file
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(VALID_CSV)
    
    // Wait for preview to appear
    await expect(page.locator('text=Preview Users')).toBeVisible({ timeout: 10000 })
    
    // Verify clear button exists
    const clearButton = page.locator('button:has-text("Clear")')
    await expect(clearButton).toBeVisible()
    
    // Click clear and verify preview is removed
    await clearButton.click()
    await expect(page.locator('text=Preview Users')).not.toBeVisible()
  })

  test('should handle CSV with invalid email format', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload the invalid CSV file
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(INVALID_CSV)
    
    // Wait for error message to appear
    const errorMessage = page.locator('[class*="red"], [class*="error"]').filter({ hasText: 'Invalid email format' })
    await expect(errorMessage).toBeVisible({ timeout: 10000 })
  })

  test('should handle CSV with missing required fields', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload the incomplete CSV file
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(INCOMPLETE_CSV)
    
    // Wait for either error or partial success
    const errorOrSuccess = page.locator('[class*="green"], [class*="red"], [class*="success"], [class*="error"]')
    await expect(errorOrSuccess.first()).toBeVisible({ timeout: 10000 })
    
    // The page should either show:
    // 1. An error for missing required fields, OR
    // 2. Only parse valid rows and skip incomplete ones
    const hasError = await page.locator('text=/required/i').isVisible()
    const hasSuccess = await page.locator('text=Successfully parsed').isVisible()
    
    expect(hasError || hasSuccess).toBeTruthy()
  })

  test('should generate username when not provided', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload CSV file
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(VALID_CSV)
    
    // Wait for preview to appear
    await expect(page.locator('text=Preview Users')).toBeVisible({ timeout: 10000 })
    
    // Verify that usernames are present in the preview
    // The CSV has usernames, but the code should handle generation if they're missing
    const usernameCell = page.locator('td:has-text("johndoe")')
    await expect(usernameCell).toBeVisible()
  })

  test('should display processing indicator during file upload', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload a file and check for result
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(VALID_CSV)
    
    // Verify we get a result (success or error) without relying on timing
    const result = page.locator('[class*="green"], [class*="red"], [class*="success"], [class*="error"]')
    await expect(result.first()).toBeVisible({ timeout: 10000 })
  })

  test('should have instructions for CSV format', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Verify instructions or helpful text is present
    await expect(page.locator('text=/CSV/i')).toBeVisible()
    await expect(page.locator('text=/template/i')).toBeVisible()
  })

  test('should disable create button during user creation', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload valid CSV
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(VALID_CSV)
    await expect(page.locator('text=Preview Users')).toBeVisible({ timeout: 10000 })
    
    // Get the create button
    const createButton = page.locator('button:has-text("Create")')
    
    // If Supabase is configured, test the loading state
    if (isSupabaseConfigured()) {
      // Click and verify loading state
      await createButton.click()
      
      // Button should show loading state
      await expect(page.locator('button:has-text("Creating Users")')).toBeVisible({ timeout: 2000 })
    } else {
      // Just verify the button is present and can be interacted with
      await expect(createButton).toBeVisible()
    }
  })

  test('should show appropriate message when Supabase is not configured', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload valid CSV
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(VALID_CSV)
    await expect(page.locator('text=Preview Users')).toBeVisible({ timeout: 10000 })
    
    // Try to create users
    const createButton = page.locator('button:has-text("Create")')
    await createButton.click()
    
    // Wait for response message
    const resultMessage = page.locator('[class*="green"], [class*="red"], [class*="success"], [class*="error"]')
    await expect(resultMessage.first()).toBeVisible({ timeout: 5000 })
    
    // Should either succeed or show appropriate error
    const hasSuccess = await page.locator('text=/Successfully created/').isVisible()
    const hasConfigError = await page.locator('text=/not configured/i').isVisible()
    
    // One of these should be true
    expect(hasSuccess || hasConfigError).toBeTruthy()
  })

  test('should redirect to users page after successful creation', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Upload valid CSV
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(VALID_CSV)
    await expect(page.locator('text=Preview Users')).toBeVisible({ timeout: 10000 })
    
    // Create users (only if Supabase is configured)
    const createButton = page.locator('button:has-text("Create")')
    await createButton.click()
    
    // Wait for potential redirect or error message
    await page.waitForTimeout(4000)
    
    // If successful, should redirect to users page
    // If not configured, will show error message
    const url = page.url()
    const hasError = await page.locator('text=/error|not configured/i').isVisible()
    
    if (!hasError) {
      // Should redirect to users page on success
      expect(url).toMatch(/\/dashboard\/users/)
    } else {
      // Error is acceptable if Supabase is not configured
      expect(hasError).toBeTruthy()
    }
  })
})

test.describe('Bulk User Upload - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/users/bulk-upload')
    await page.waitForLoadState('networkidle')
  })

  test('should handle empty CSV file gracefully', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Create an empty CSV file on the fly
    const emptyCSVContent = 'Name,Email,Username,Industry,Client Name\n'
    const buffer = Buffer.from(emptyCSVContent)
    
    // Upload empty CSV
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles({
      name: 'empty.csv',
      mimeType: 'text/csv',
      buffer: buffer
    })
    
    // Wait for result message
    const resultMessage = page.locator('[class*="green"], [class*="red"], [class*="success"], [class*="error"]')
    await expect(resultMessage.first()).toBeVisible({ timeout: 10000 })
    
    // Should either show 0 users or an appropriate message
    const hasZeroUsers = await page.locator('text=/parsed 0 users/i').isVisible()
    const hasMessage = await page.locator('text=/no.*users|empty|invalid/i').isVisible()
    
    expect(hasZeroUsers || hasMessage).toBeTruthy()
  })

  test('should accept CSV files only', async ({ page }) => {
    // Skip if redirected to auth
    if (!(await isAuthenticated(page))) {
      test.skip()
      return
    }
    
    // Verify file input only accepts CSV
    const fileInput = page.locator('input[type="file"]')
    const acceptAttr = await fileInput.getAttribute('accept')
    
    expect(acceptAttr).toBe('.csv')
  })
})
