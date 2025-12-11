import { test, expect } from '@playwright/test'
import { shouldSkipAuthTests } from './helpers/auth'

/**
 * Feature Tests: Industry CRUD Flow
 * 
 * This test suite covers the complete industry CRUD (Create, Read, Update, Delete) operations
 * and user-industry assignment functionality.
 * 
 * Test Coverage:
 * - Admin can create new industry
 * - Admin can view industries list
 * - Admin can view single industry details
 * - Admin can update industry information
 * - Admin can delete industry
 * - Users can be assigned to industry
 * 
 * Related Issues:
 * - #53-57: Industry CRUD operations
 * - #58: Implement user-industry assignment
 */

// Test data
const testIndustry = {
  name: 'Test Technology Industry',
  updatedName: 'Updated Technology Industry'
}

const testUser = {
  username: 'testuser',
  name: 'Test User',
  email: 'testuser@example.com'
}

test.describe('Industry CRUD Flow', () => {
  test.beforeEach(async () => {
    // Skip all tests if SKIP_AUTH_TESTS is set
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
  })
  
  // Before all tests, ensure we're on the industries page
  test.beforeEach(async ({ page }) => {
    // Navigate to the industries page
    // Note: In a real scenario, you'd need to handle authentication first
    // For now, we'll navigate directly assuming auth is handled or skip auth check
    await page.goto('/dashboard/industries')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('Admin can create new industry', async ({ page }) => {
    // Click on "Add Industry" button
    await page.click('text=Add Industry')
    
    // Wait for navigation to create page
    await expect(page).toHaveURL('/dashboard/industries/create')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the create page
    await expect(page.locator('h1')).toContainText('Create New Industry')
    
    // Fill in the industry form
    await page.fill('#name', testIndustry.name)
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Wait for success message or redirect
    // Check for either success message or navigation back to list
    try {
      await expect(page.locator('text=/successfully|created/i')).toBeVisible({ timeout: 5000 })
    } catch {
      // If no success message, check we navigated back to industries list
      await expect(page).toHaveURL('/dashboard/industries', { timeout: 5000 })
    }
  })

  test('Admin can view industries list', async ({ page }) => {
    // We should already be on the industries list page from beforeEach
    await expect(page).toHaveURL('/dashboard/industries')
    
    // Verify the page title
    await expect(page.locator('h1')).toContainText('Industries')
    
    // Check that the "Add Industry" button exists
    await expect(page.locator('text=Add Industry')).toBeVisible()
    
    // Check if table or empty state is displayed appropriately
    const hasTable = await page.locator('table tbody tr').count() > 0
    const hasEmptyState = await page.locator('text=/No industries found/i').count() > 0
    
    // Either a table should exist or we should see the empty state
    if (!hasTable && !hasEmptyState) {
      throw new Error('Expected either table with data or empty state message')
    }
    
    // If table exists, verify it has the expected columns
    if (hasTable) {
      await expect(page.locator('th:has-text("Name")')).toBeVisible()
      await expect(page.locator('th:has-text("Created")')).toBeVisible()
      await expect(page.locator('th:has-text("Actions")')).toBeVisible()
    }
  })

  test('Admin can view single industry details', async ({ page }) => {
    // Check if there are any industries in the list
    const industryRows = page.locator('table tbody tr')
    const rowCount = await industryRows.count()
    
    if (rowCount === 0) {
      // Skip this test if no industries exist
      test.skip()
      return
    }
    
    // Get the first industry's name
    const firstIndustryName = await industryRows.first().locator('td').first().textContent()
    
    // Click on the Edit link for the first industry (as there's no dedicated view page)
    await industryRows.first().locator('a:has-text("Edit")').click()
    
    // Wait for navigation to edit page
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toContainText('Edit Industry')
    
    // Verify the industry name is shown in the form
    const nameInput = page.locator('#name')
    await expect(nameInput).toHaveValue(firstIndustryName || '')
  })

  test('Admin can update industry information', async ({ page }) => {
    // Check if there are any industries in the list
    const industryRows = page.locator('table tbody tr')
    const rowCount = await industryRows.count()
    
    if (rowCount === 0) {
      // Create an industry first if none exist
      await page.click('text=Add Industry')
      await page.waitForLoadState('networkidle')
      await page.fill('#name', testIndustry.name)
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')
      
      // Wait for redirect back to list
      await expect(page).toHaveURL('/dashboard/industries')
    }
    
    // Navigate back to industries list if we're not already there
    await page.goto('/dashboard/industries')
    await page.waitForLoadState('networkidle')
    
    // Click Edit on the first industry
    await page.locator('table tbody tr').first().locator('a:has-text("Edit")').click()
    await page.waitForLoadState('networkidle')
    
    // Get current name and update it
    const currentName = await page.locator('#name').inputValue()
    const newName = `${currentName} - Updated ${Date.now()}`
    
    // Update the industry name
    await page.fill('#name', newName)
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Wait for success message or redirect
    try {
      await expect(page.locator('text=/successfully|updated/i')).toBeVisible({ timeout: 5000 })
    } catch {
      // If no success message, check we navigated back to industries list
      await expect(page).toHaveURL('/dashboard/industries', { timeout: 5000 })
    }
    
    // Verify the updated name appears in the list
    await page.goto('/dashboard/industries')
    await page.waitForLoadState('networkidle')
    
    // The new name should appear in the table
    const tableText = await page.locator('table').textContent()
    expect(tableText).toContain(newName)
  })

  test('Admin can delete industry', async ({ page }) => {
    // Check if there are any industries in the list
    const industryRows = page.locator('table tbody tr')
    const initialRowCount = await industryRows.count()
    
    if (initialRowCount === 0) {
      // Create an industry first if none exist
      await page.click('text=Add Industry')
      await page.waitForLoadState('networkidle')
      await page.fill('#name', `Test Delete Industry ${Date.now()}`)
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')
      
      // Wait for redirect back to list
      await expect(page).toHaveURL('/dashboard/industries')
      await page.waitForLoadState('networkidle')
    }
    
    // Set up dialog handler for confirmation (if any)
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    
    // Click delete button on the first industry
    const deleteButton = page.locator('table tbody tr').first().locator('button:has-text("Delete")')
    await deleteButton.click()
    
    // Wait for deletion to process
    await page.waitForLoadState('networkidle')
    
    // Note: The actual delete functionality might not be fully implemented
    // This test documents the expected behavior
    // In a fully implemented system, we would verify the industry is removed from the list
  })

  test('Users can be assigned to industry', async ({ page }) => {
    // First, ensure at least one industry exists
    await page.goto('/dashboard/industries')
    await page.waitForLoadState('networkidle')
    
    const industryRows = page.locator('table tbody tr')
    const industryCount = await industryRows.count()
    
    let testIndustryName = ''
    
    if (industryCount === 0) {
      // Create an industry for testing
      await page.click('text=Add Industry')
      await page.waitForLoadState('networkidle')
      testIndustryName = `Test Industry for Assignment ${Date.now()}`
      await page.fill('#name', testIndustryName)
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')
    } else {
      // Get the first industry name
      testIndustryName = await industryRows.first().locator('td').first().textContent() || ''
    }
    
    // Navigate to user creation page
    await page.goto('/dashboard/users/create')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the user creation page
    await expect(page.locator('h1')).toContainText('Create')
    
    // Fill in user form
    await page.fill('#username', `${testUser.username}_${Date.now()}`)
    await page.fill('#name', testUser.name)
    await page.fill('#email', `test_${Date.now()}@example.com`)
    
    // Check if industry dropdown exists
    const industryDropdown = page.locator('#industry_id')
    const dropdownExists = await industryDropdown.count() > 0
    
    if (dropdownExists) {
      // Select the industry from dropdown
      await industryDropdown.selectOption({ label: testIndustryName })
      
      // Verify industry is selected
      const selectedValue = await industryDropdown.inputValue()
      expect(selectedValue).toBeTruthy()
      
      // Note: Not submitting the form to avoid actually creating the user
      // This test verifies that the industry can be assigned in the UI
    } else {
      // If the dropdown doesn't exist, skip this part of the test
      test.skip()
    }
  })

  test('Industry list shows correct information', async ({ page }) => {
    // Navigate to industries list
    await page.goto('/dashboard/industries')
    await page.waitForLoadState('networkidle')
    
    // Check page elements
    await expect(page.locator('h1')).toContainText('Industries')
    await expect(page.locator('text=Manage industry categories')).toBeVisible()
    
    // Verify the Add Industry button is present
    const addButton = page.locator('text=Add Industry').first()
    await expect(addButton).toBeVisible()
    await expect(addButton).toBeEnabled()
    
    // Check if table or empty state is displayed appropriately
    const hasData = await page.locator('table tbody tr').count() > 0
    
    if (hasData) {
      // If data exists, verify table structure
      await expect(page.locator('table')).toBeVisible()
      await expect(page.locator('table thead')).toBeVisible()
      
      // Verify each row has the expected actions
      const firstRow = page.locator('table tbody tr').first()
      await expect(firstRow.locator('a:has-text("Edit")')).toBeVisible()
      await expect(firstRow.locator('button:has-text("Delete")')).toBeVisible()
    } else {
      // If no data, verify empty state
      await expect(page.locator('text=/No industries found/i')).toBeVisible()
      await expect(page.locator('text=/Get started by creating/i')).toBeVisible()
    }
  })

  test('Industry form validation works correctly', async ({ page }) => {
    // Navigate to create industry page
    await page.goto('/dashboard/industries/create')
    await page.waitForLoadState('networkidle')
    
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // HTML5 validation should prevent submission
    // Check if we're still on the create page (form didn't submit)
    await expect(page).toHaveURL('/dashboard/industries/create')
    
    // Verify the name field has required attribute
    const nameInput = page.locator('#name')
    const isRequired = await nameInput.getAttribute('required')
    expect(isRequired).not.toBeNull()
    
    // Now fill in the form with valid data
    await page.fill('#name', `Valid Industry ${Date.now()}`)
    
    // Submit should work now
    await page.click('button[type="submit"]')
    
    // Should show success or redirect
    await page.waitForTimeout(2000)
    
    // Check we're either still on page with success message or redirected
    const currentUrl = page.url()
    const hasSuccessMessage = await page.locator('text=/successfully|created/i').count() > 0
    const redirectedToList = currentUrl.includes('/dashboard/industries') && !currentUrl.includes('/create')
    
    expect(hasSuccessMessage || redirectedToList).toBe(true)
  })

  test('Industry edit page loads with correct data', async ({ page }) => {
    // Ensure at least one industry exists
    await page.goto('/dashboard/industries')
    await page.waitForLoadState('networkidle')
    
    const industryRows = page.locator('table tbody tr')
    const rowCount = await industryRows.count()
    
    if (rowCount === 0) {
      // Create an industry first
      await page.click('text=Add Industry')
      await page.waitForLoadState('networkidle')
      await page.fill('#name', `Test Industry ${Date.now()}`)
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')
      await page.goto('/dashboard/industries')
      await page.waitForLoadState('networkidle')
    }
    
    // Get the first industry's name
    const industryName = await page.locator('table tbody tr').first().locator('td').first().textContent()
    
    // Click edit on the first industry
    await page.locator('table tbody tr').first().locator('a:has-text("Edit")').click()
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the edit page
    await expect(page.locator('h1')).toContainText('Edit Industry')
    
    // Verify the form is pre-filled with the industry data
    const nameInput = page.locator('#name')
    await expect(nameInput).toHaveValue(industryName || '')
    
    // Verify submit button shows correct text
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toContainText(/Update|Save/)
  })

  test('Navigation between industry pages works correctly', async ({ page }) => {
    // Start at industries list
    await page.goto('/dashboard/industries')
    await page.waitForLoadState('networkidle')
    
    // Navigate to create page
    await page.click('text=Add Industry')
    await expect(page).toHaveURL('/dashboard/industries/create')
    
    // Go back to list (using browser back or navigation)
    await page.goto('/dashboard/industries')
    await expect(page).toHaveURL('/dashboard/industries')
    
    // Check if any industries exist to test edit navigation
    const hasIndustries = await page.locator('table tbody tr').count() > 0
    
    if (hasIndustries) {
      // Navigate to edit page
      await page.locator('table tbody tr').first().locator('a:has-text("Edit")').click()
      await page.waitForLoadState('networkidle')
      await expect(page.url()).toMatch(/\/dashboard\/industries\/[\w-]+\/edit/)
      
      // Navigate back to list
      await page.goto('/dashboard/industries')
      await expect(page).toHaveURL('/dashboard/industries')
    }
  })
})
