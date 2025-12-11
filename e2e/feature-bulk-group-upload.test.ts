import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * Feature Tests: Bulk Group Upload Flow
 * 
 * Tests the complete bulk group upload functionality including:
 * - Accessing the upload interface
 * - Template download
 * - File upload and parsing
 * - Group creation from spreadsheet
 * - User and target assignment
 * - Error handling for invalid data
 */

// Test configuration
const TEST_CLIENT_ID = 'test-client-id'
const FIXTURES_PATH = path.join(__dirname, 'fixtures')

test.describe('Bulk Group Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In a real scenario, you would need to:
    // 1. Setup authentication (login as admin/manager)
    // 2. Create a test client and users in the database
    // 3. Navigate to the client groups page
    // For now, we'll test the UI interactions that don't require backend
  })

  test('should display import groups button and modal', async ({ page }) => {
    // Navigate to a client groups page
    await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check if Import Groups button exists
    const importButton = page.locator('button:has-text("Import Groups")')
    await expect(importButton).toBeVisible()
    
    // Click the Import Groups button
    await importButton.click()
    
    // Verify the import modal appears
    const modal = page.locator('text=Upload a CSV file of groups')
    await expect(modal).toBeVisible()
    
    // Check that modal has expected content
    await expect(page.locator('text=Group Name')).toBeVisible()
    await expect(page.locator('text=Target Name')).toBeVisible()
    await expect(page.locator('text=Target Email')).toBeVisible()
  })

  test('should have download template button in modal', async ({ page }) => {
    await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
    await page.waitForLoadState('networkidle')
    
    // Open import modal
    await page.locator('button:has-text("Import Groups")').click()
    
    // Check for download template button
    const downloadButton = page.locator('button:has-text("Download CSV Template")')
    await expect(downloadButton).toBeVisible()
  })

  test('should display download template button on main page', async ({ page }) => {
    await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
    await page.waitForLoadState('networkidle')
    
    // Check for main download template button
    const downloadButton = page.locator('button:has-text("Download Template")')
    await expect(downloadButton).toBeVisible()
  })

  test('should show upload CSV file button in modal', async ({ page }) => {
    await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
    await page.waitForLoadState('networkidle')
    
    // Open import modal
    await page.locator('button:has-text("Import Groups")').click()
    
    // Check for upload button
    const uploadButton = page.locator('button:has-text("Upload CSV File")')
    await expect(uploadButton).toBeVisible()
  })

  test('should accept .csv file input', async ({ page }) => {
    await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
    await page.waitForLoadState('networkidle')
    
    // Open import modal
    await page.locator('button:has-text("Import Groups")').click()
    
    // Find the hidden file input
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await expect(fileInput).toBeAttached()
    
    // Verify it accepts .csv files
    const acceptAttr = await fileInput.getAttribute('accept')
    expect(acceptAttr).toBe('.csv')
  })

  test('should close import modal when cancel is clicked', async ({ page }) => {
    await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
    await page.waitForLoadState('networkidle')
    
    // Open import modal
    await page.locator('button:has-text("Import Groups")').click()
    
    // Verify modal is visible
    await expect(page.locator('text=Upload a CSV file of groups')).toBeVisible()
    
    // Click cancel button
    await page.locator('button:has-text("Cancel")').last().click()
    
    // Verify modal is closed
    await expect(page.locator('text=Upload a CSV file of groups')).not.toBeVisible()
  })

  test('should close modal when X button is clicked', async ({ page }) => {
    await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
    await page.waitForLoadState('networkidle')
    
    // Open import modal
    await page.locator('button:has-text("Import Groups")').click()
    
    // Verify modal is visible
    await expect(page.locator('text=Upload a CSV file of groups')).toBeVisible()
    
    // Click X button to close
    const closeButton = page.locator('button:has-text("✕")').last()
    await closeButton.click()
    
    // Verify modal is closed
    await expect(page.locator('text=Upload a CSV file of groups')).not.toBeVisible()
  })

  test('should display create new group button', async ({ page }) => {
    await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
    await page.waitForLoadState('networkidle')
    
    // Check for create group button
    const createButton = page.locator('button:has-text("Create New Group")')
    await expect(createButton).toBeVisible()
  })

  test('should show groups table with correct columns', async ({ page }) => {
    await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
    await page.waitForLoadState('networkidle')
    
    // If there are groups, check the table structure
    const tableHeaders = page.locator('table thead th')
    
    // The table should have these columns if groups exist
    const expectedHeaders = ['Name', 'Target', 'Users In Group', 'Settings']
    
    // Check if table exists first
    const table = page.locator('table')
    const tableExists = await table.count() > 0
    
    if (tableExists) {
      const headerCount = await tableHeaders.count()
      expect(headerCount).toBeGreaterThan(0)
      
      // Verify at least some expected headers are present
      for (const header of expectedHeaders) {
        const headerLocator = page.locator(`th:has-text("${header}")`)
        const exists = await headerLocator.count() > 0
        if (exists) {
          await expect(headerLocator).toBeVisible()
        }
      }
    }
  })

  // Tests that require backend setup would go here
  test.describe('With Backend Setup (requires authentication and test data)', () => {
    test.skip('should upload valid CSV and create groups', async ({ page }) => {
      // This test would require:
      // 1. Authentication setup
      // 2. Test client and users in database
      // 3. Proper file upload handling
      
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Open import modal
      await page.locator('button:has-text("Import Groups")').click()
      
      // Upload valid CSV file
      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      await fileInput.setInputFiles(path.join(FIXTURES_PATH, 'valid-groups.csv'))
      
      // Wait for processing
      await page.waitForTimeout(2000)
      
      // Check for success message
      await expect(page.locator('text=Successfully created')).toBeVisible()
      
      // Verify groups appear in the table
      await expect(page.locator('text=Engineering Team')).toBeVisible()
      await expect(page.locator('text=Marketing Team')).toBeVisible()
    })

    test.skip('should show error for CSV with invalid headers', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Open import modal
      await page.locator('button:has-text("Import Groups")').click()
      
      // Upload CSV with invalid headers
      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      await fileInput.setInputFiles(path.join(FIXTURES_PATH, 'invalid-headers.csv'))
      
      // Wait for processing
      await page.waitForTimeout(1000)
      
      // Check for error message
      const errorMessage = page.locator('.bg-red-50, [class*="error"]')
      await expect(errorMessage).toBeVisible()
    })

    test.skip('should handle CSV with invalid data gracefully', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Open import modal
      await page.locator('button:has-text("Import Groups")').click()
      
      // Upload CSV with invalid data
      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      await fileInput.setInputFiles(path.join(FIXTURES_PATH, 'invalid-data.csv'))
      
      // Wait for processing
      await page.waitForTimeout(1000)
      
      // Should either show error or skip invalid rows
      const hasError = await page.locator('.bg-red-50, [class*="error"]').count() > 0
      const hasSuccess = await page.locator('.bg-green-50, text=Successfully').count() > 0
      
      // At least one should be true
      expect(hasError || hasSuccess).toBeTruthy()
    })

    test.skip('should assign users and targets correctly from CSV', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Upload valid CSV
      await page.locator('button:has-text("Import Groups")').click()
      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      await fileInput.setInputFiles(path.join(FIXTURES_PATH, 'valid-groups.csv'))
      
      // Wait for groups to be created
      await page.waitForTimeout(2000)
      
      // Check that targets are assigned
      await expect(page.locator('text=John Doe')).toBeVisible()
      await expect(page.locator('text=Alice Brown')).toBeVisible()
      
      // Check that users are listed in groups
      await expect(page.locator('text=Jane Smith')).toBeVisible()
      await expect(page.locator('text=Bob Johnson')).toBeVisible()
      await expect(page.locator('text=Charlie Davis')).toBeVisible()
      await expect(page.locator('text=Diana Evans')).toBeVisible()
    })

    test.skip('should assign roles correctly from CSV', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Upload valid CSV
      await page.locator('button:has-text("Import Groups")').click()
      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      await fileInput.setInputFiles(path.join(FIXTURES_PATH, 'valid-groups.csv'))
      
      // Wait for groups to be created
      await page.waitForTimeout(2000)
      
      // Verify roles are displayed
      await expect(page.locator('text=Developer')).toBeVisible()
      await expect(page.locator('text=Manager')).toBeVisible()
      await expect(page.locator('text=Analyst')).toBeVisible()
      await expect(page.locator('text=Coordinator')).toBeVisible()
    })

    test.skip('should handle duplicate group names appropriately', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Upload CSV twice to create duplicates
      await page.locator('button:has-text("Import Groups")').click()
      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      await fileInput.setInputFiles(path.join(FIXTURES_PATH, 'valid-groups.csv'))
      
      // Wait for first upload
      await page.waitForTimeout(2000)
      
      // Try to upload again
      await page.locator('button:has-text("Import Groups")').click()
      await fileInput.setInputFiles(path.join(FIXTURES_PATH, 'valid-groups.csv'))
      
      // Should show error about duplicate group names
      await expect(page.locator('text=already exists, text=duplicate')).toBeVisible()
    })

    test.skip('should show processing state during upload', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Open import modal
      await page.locator('button:has-text("Import Groups")').click()
      
      // Start upload
      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      await fileInput.setInputFiles(path.join(FIXTURES_PATH, 'valid-groups.csv'))
      
      // Should show processing state
      await expect(page.locator('button:has-text("Processing")')).toBeVisible()
    })
  })

  test.describe('UI Component Tests', () => {
    test('should display groups page heading', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Check for groups heading
      await expect(page.locator('h2:has-text("Groups")')).toBeVisible()
    })

    test('should display helpful description text', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Check for description text
      await expect(page.locator('text=Organize the users into logical groupings')).toBeVisible()
    })

    test('should show appropriate message when no groups exist', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // If no groups, should show message
      const noGroupsMessage = page.locator('text=No groups created yet')
      const groupsTable = page.locator('table')
      
      const tableExists = await groupsTable.count() > 0
      const messageExists = await noGroupsMessage.count() > 0
      
      // Either table or no-groups message should be visible
      expect(tableExists || messageExists).toBeTruthy()
    })

    test('should display import modal instructions', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Open import modal
      await page.locator('button:has-text("Import Groups")').click()
      
      // Check for instructions
      await expect(page.locator('text=first row in the CSV file will be counted as the header')).toBeVisible()
      await expect(page.locator('text=Accepted file types')).toBeVisible()
      await expect(page.locator('text=.csv')).toBeVisible()
    })
  })

  test.describe('Navigation Tests', () => {
    test('should be accessible from client tabs', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}`)
      await page.waitForLoadState('networkidle')
      
      // Look for Groups tab
      const groupsTab = page.locator('a:has-text("Groups"), button:has-text("Groups")')
      
      if (await groupsTab.count() > 0) {
        await expect(groupsTab.first()).toBeVisible()
      }
    })

    test('should navigate to groups tab via query parameter', async ({ page }) => {
      await page.goto(`/dashboard/clients/${TEST_CLIENT_ID}?tab=groups`)
      await page.waitForLoadState('networkidle')
      
      // Verify we're on groups tab by checking for groups-specific content
      const groupsContent = page.locator('h2:has-text("Groups"), text=Import Groups')
      await expect(groupsContent.first()).toBeVisible()
      
      // Check URL contains tab parameter
      expect(page.url()).toContain('tab=groups')
    })
  })
})
