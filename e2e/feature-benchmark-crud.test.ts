import { test, expect, type Locator } from '@playwright/test'
import { shouldSkipAuthTests } from './helpers/auth'

/**
 * E2E Tests for Benchmark CRUD Flow
 * 
 * Test Coverage:
 * - Admin can create new benchmark
 * - Admin can view benchmarks list
 * - Admin can view single benchmark details
 * - Admin can update benchmark information
 * - Admin can delete benchmark
 * - Benchmarks can be filtered by assessment, industry, and dimension
 * 
 * Related Issues:
 * - Cyberworld-builders/involved-v2#59-63: Benchmark CRUD operations
 * - Cyberworld-builders/involved-v2#64: Implement benchmark filtering
 */

// Test data constants
const TEST_BENCHMARK_VALUE = '75.50'
const UPDATED_BENCHMARK_VALUE = '85.75'

// Helper function to check if an element is not visible
async function isNotVisible(locator: Locator): Promise<boolean> {
  return locator.isVisible().then((visible: boolean) => !visible)
}

test.describe('Benchmark CRUD Flow', () => {
  test.beforeEach(async () => {
    // Skip all tests if SKIP_AUTH_TESTS is set
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
  })
  
  test.beforeEach(async ({ page }) => {
    // Navigate to benchmarks page directly
    await page.goto('/dashboard/benchmarks')
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle')
  })

  test('Admin can view benchmarks list page', async ({ page }) => {
    // Page is already on benchmarks page from beforeEach
    
    // Verify page title is present
    await expect(page.locator('h1')).toContainText('Benchmarks')
    
    // Verify page description
    await expect(page.locator('p')).toContainText('Manage industry benchmarks')
    
    // Verify breadcrumbs are present
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()
    
    // Verify "Select Assessment" section is present
    await expect(page.locator('text=Select Assessment')).toBeVisible()
  })

  test('Benchmarks can be filtered by assessment', async ({ page }) => {
    // Check if there are assessments available
    const noAssessmentsMessage = page.locator('text=No assessments yet')
    const hasAssessments = await isNotVisible(noAssessmentsMessage)
    
    if (hasAssessments) {
      // Get first assessment link and click it
      const firstAssessmentLink = page.locator('a[href*="/dashboard/benchmarks/"]').first()
      await expect(firstAssessmentLink).toBeVisible()
      
      const assessmentName = await firstAssessmentLink.locator('h3').textContent()
      await firstAssessmentLink.click()
      
      // Wait for navigation
      await page.waitForLoadState('networkidle')
      
      // Verify we're on the assessment-specific page
      await expect(page).toHaveURL(/\/dashboard\/benchmarks\/[^/]+$/)
      
      // Verify breadcrumb shows the assessment name
      await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText(assessmentName || '')
      
      // Verify "Select Industry" section is present
      await expect(page.locator('text=Select Industry')).toBeVisible()
    }
  })

  test('Benchmarks can be filtered by industry', async ({ page }) => {
    // Check if there are assessments available
    const noAssessmentsMessage = page.locator('text=No assessments yet')
    const hasAssessments = await isNotVisible(noAssessmentsMessage)
    
    if (hasAssessments) {
      // Click first assessment
      const firstAssessmentLink = page.locator('a[href*="/dashboard/benchmarks/"]').first()
      const assessmentName = await firstAssessmentLink.locator('h3').textContent()
      await firstAssessmentLink.click()
      await page.waitForLoadState('networkidle')
      
      // Check if there are industries available
      const noIndustriesMessage = page.locator('text=No industries yet')
      const hasIndustries = await isNotVisible(noIndustriesMessage)
      
      if (hasIndustries) {
        // Click first industry - use data-testid or more specific selector
        const firstIndustryLink = page.locator('a').filter({ hasText: /^(?!.*\/)/ }).first()
        const industryName = await firstIndustryLink.locator('h3').textContent()
        await firstIndustryLink.click()
        
        // Wait for navigation
        await page.waitForLoadState('networkidle')
        
        // Verify we're on the benchmark management page
        await expect(page).toHaveURL(/\/dashboard\/benchmarks\/[^/]+\/[^/]+$/)
        
        // Verify breadcrumb shows both assessment and industry names
        const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
        await expect(breadcrumb).toContainText(assessmentName || '')
        await expect(breadcrumb).toContainText(industryName || '')
        
        // Verify "Benchmark Values" section is present
        await expect(page.locator('text=Benchmark Values')).toBeVisible()
      }
    }
  })

  test('Admin can view single benchmark details (dimension-specific)', async ({ page }) => {
    // Navigate through assessment and industry to reach benchmark management
    const noAssessmentsMessage = page.locator('text=No assessments yet')
    const hasAssessments = await isNotVisible(noAssessmentsMessage)
    
    if (hasAssessments) {
      // Click first assessment
      await page.locator('a[href*="/dashboard/benchmarks/"]').first().click()
      await page.waitForLoadState('networkidle')
      
      // Check if there are industries
      const noIndustriesMessage = page.locator('text=No industries yet')
      const hasIndustries = await isNotVisible(noIndustriesMessage)
      
      if (hasIndustries) {
        // Click first industry
        await page.locator('a').filter({ hasText: /^(?!.*\/)/ }).first().click()
        await page.waitForLoadState('networkidle')
        
        // Check if there are dimensions
        const noDimensionsMessage = page.locator('text=No dimensions found')
        const hasDimensions = await isNotVisible(noDimensionsMessage)
        
        if (hasDimensions) {
          // Verify table structure exists
          await expect(page.locator('table')).toBeVisible()
          
          // Verify table headers
          await expect(page.locator('th:has-text("Dimension")')).toBeVisible()
          await expect(page.locator('th:has-text("Code")')).toBeVisible()
          await expect(page.locator('th:has-text("Benchmark Value")')).toBeVisible()
          
          // Get first dimension row
          const firstDimensionRow = page.locator('tbody tr').first()
          await expect(firstDimensionRow).toBeVisible()
          
          // Verify dimension details are displayed
          const dimensionName = firstDimensionRow.locator('td').first()
          await expect(dimensionName).toBeVisible()
          
          const dimensionCode = firstDimensionRow.locator('td').nth(1)
          await expect(dimensionCode).toBeVisible()
          
          // Verify input field for benchmark value is present
          const benchmarkInput = firstDimensionRow.locator('input[type="number"]')
          await expect(benchmarkInput).toBeVisible()
        }
      }
    }
  })

  test('Admin can create new benchmark', async ({ page }) => {
    // Navigate through assessment and industry
    const noAssessmentsMessage = page.locator('text=No assessments yet')
    const hasAssessments = await isNotVisible(noAssessmentsMessage)
    
    if (hasAssessments) {
      await page.locator('a[href*="/dashboard/benchmarks/"]').first().click()
      await page.waitForLoadState('networkidle')
      
      const noIndustriesMessage = page.locator('text=No industries yet')
      const hasIndustries = await isNotVisible(noIndustriesMessage)
      
      if (hasIndustries) {
        await page.locator('a').filter({ hasText: /^(?!.*\/)/ }).first().click()
        await page.waitForLoadState('networkidle')
        
        const noDimensionsMessage = page.locator('text=No dimensions found')
        const hasDimensions = await isNotVisible(noDimensionsMessage)
        
        if (hasDimensions) {
          // Find first dimension input that doesn't have a value
          const firstEmptyInput = page.locator('input[type="number"]').first()
          
          // Clear any existing value and enter new benchmark value
          await firstEmptyInput.clear()
          await firstEmptyInput.fill(TEST_BENCHMARK_VALUE)
          
          // Verify the value was entered
          await expect(firstEmptyInput).toHaveValue(TEST_BENCHMARK_VALUE)
          
          // Click save button
          const saveButton = page.locator('button:has-text("Save Benchmarks")')
          await expect(saveButton).toBeVisible()
          await saveButton.click()
          
          // Wait for success message
          await expect(page.locator('text=Benchmarks saved successfully')).toBeVisible({ timeout: 10000 })
          
          // Verify the value persists after save
          await expect(firstEmptyInput).toHaveValue(TEST_BENCHMARK_VALUE)
        }
      }
    }
  })

  test('Admin can update benchmark information', async ({ page }) => {
    // Navigate through assessment and industry
    const noAssessmentsMessage = page.locator('text=No assessments yet')
    const hasAssessments = await isNotVisible(noAssessmentsMessage)
    
    if (hasAssessments) {
      await page.locator('a[href*="/dashboard/benchmarks/"]').first().click()
      await page.waitForLoadState('networkidle')
      
      const noIndustriesMessage = page.locator('text=No industries yet')
      const hasIndustries = await isNotVisible(noIndustriesMessage)
      
      if (hasIndustries) {
        await page.locator('a').filter({ hasText: /^(?!.*\/)/ }).first().click()
        await page.waitForLoadState('networkidle')
        
        const noDimensionsMessage = page.locator('text=No dimensions found')
        const hasDimensions = await isNotVisible(noDimensionsMessage)
        
        if (hasDimensions) {
          // Get first benchmark input
          const firstInput = page.locator('input[type="number"]').first()
          
          // Set initial value if empty
          const currentValue = await firstInput.inputValue()
          if (!currentValue) {
            await firstInput.fill(TEST_BENCHMARK_VALUE)
            await page.locator('button:has-text("Save Benchmarks")').click()
            await expect(page.locator('text=Benchmarks saved successfully')).toBeVisible({ timeout: 10000 })
            // Wait for success message to disappear before continuing
            await page.locator('text=Benchmarks saved successfully').waitFor({ state: 'hidden', timeout: 5000 })
          }
          
          // Now update the value
          await firstInput.clear()
          await firstInput.fill(UPDATED_BENCHMARK_VALUE)
          
          // Verify the updated value is displayed
          await expect(firstInput).toHaveValue(UPDATED_BENCHMARK_VALUE)
          
          // Save the updated benchmark
          await page.locator('button:has-text("Save Benchmarks")').click()
          
          // Wait for success message
          await expect(page.locator('text=Benchmarks saved successfully')).toBeVisible({ timeout: 10000 })
          
          // Verify the updated value persists
          await expect(firstInput).toHaveValue(UPDATED_BENCHMARK_VALUE)
          
          // Reload the page to confirm persistence
          await page.reload()
          await page.waitForLoadState('networkidle')
          
          // Verify the value is still there after reload
          const reloadedInput = page.locator('input[type="number"]').first()
          await expect(reloadedInput).toHaveValue(UPDATED_BENCHMARK_VALUE)
        }
      }
    }
  })

  test('Admin can delete benchmark', async ({ page }) => {
    // Navigate through assessment and industry
    const noAssessmentsMessage = page.locator('text=No assessments yet')
    const hasAssessments = await isNotVisible(noAssessmentsMessage)
    
    if (hasAssessments) {
      await page.locator('a[href*="/dashboard/benchmarks/"]').first().click()
      await page.waitForLoadState('networkidle')
      
      const noIndustriesMessage = page.locator('text=No industries yet')
      const hasIndustries = await isNotVisible(noIndustriesMessage)
      
      if (hasIndustries) {
        await page.locator('a').filter({ hasText: /^(?!.*\/)/ }).first().click()
        await page.waitForLoadState('networkidle')
        
        const noDimensionsMessage = page.locator('text=No dimensions found')
        const hasDimensions = await isNotVisible(noDimensionsMessage)
        
        if (hasDimensions) {
          // Get first benchmark input
          const firstInput = page.locator('input[type="number"]').first()
          
          // Make sure there's a value to delete
          const currentValue = await firstInput.inputValue()
          if (!currentValue) {
            await firstInput.fill(TEST_BENCHMARK_VALUE)
            await page.locator('button:has-text("Save Benchmarks")').click()
            await expect(page.locator('text=Benchmarks saved successfully')).toBeVisible({ timeout: 10000 })
            // Wait for success message to disappear before continuing
            await page.locator('text=Benchmarks saved successfully').waitFor({ state: 'hidden', timeout: 5000 })
          }
          
          // Delete the benchmark by clearing the input
          await firstInput.clear()
          
          // Verify the input is empty
          await expect(firstInput).toHaveValue('')
          
          // Save to delete the benchmark
          await page.locator('button:has-text("Save Benchmarks")').click()
          
          // Wait for success message
          await expect(page.locator('text=Benchmarks saved successfully')).toBeVisible({ timeout: 10000 })
          
          // Reload page to verify deletion persisted
          await page.reload()
          await page.waitForLoadState('networkidle')
          
          // Verify the input is still empty after reload
          const reloadedInput = page.locator('input[type="number"]').first()
          await expect(reloadedInput).toHaveValue('')
        }
      }
    }
  })

  test('Benchmark CSV upload and download functionality', async ({ page }) => {
    // Navigate through assessment and industry
    const noAssessmentsMessage = page.locator('text=No assessments yet')
    const hasAssessments = await isNotVisible(noAssessmentsMessage)
    
    if (hasAssessments) {
      await page.locator('a[href*="/dashboard/benchmarks/"]').first().click()
      await page.waitForLoadState('networkidle')
      
      const noIndustriesMessage = page.locator('text=No industries yet')
      const hasIndustries = await isNotVisible(noIndustriesMessage)
      
      if (hasIndustries) {
        await page.locator('a').filter({ hasText: /^(?!.*\/)/ }).first().click()
        await page.waitForLoadState('networkidle')
        
        const noDimensionsMessage = page.locator('text=No dimensions found')
        const hasDimensions = await isNotVisible(noDimensionsMessage)
        
        if (hasDimensions) {
          // Verify Download Template button exists
          const downloadButton = page.locator('button:has-text("Download Template")')
          await expect(downloadButton).toBeVisible()
          
          // Verify Upload CSV button exists
          const uploadButton = page.locator('button:has-text("Upload CSV")')
          await expect(uploadButton).toBeVisible()
          
          // Verify CSV file input exists but is hidden
          const fileInput = page.locator('input[type="file"]#csv-upload-input')
          await expect(fileInput).toBeHidden()
        }
      }
    }
  })

  test('Benchmarks page has proper navigation and breadcrumbs', async ({ page }) => {
    // Verify breadcrumb at root level
    let breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
    await expect(breadcrumb).toContainText('Benchmarks')
    await expect(breadcrumb).toContainText('Select Assessment')
    
    // Navigate to assessment level
    const noAssessmentsMessage = page.locator('text=No assessments yet')
    const hasAssessments = await isNotVisible(noAssessmentsMessage)
    
    if (hasAssessments) {
      const assessmentName = await page.locator('a[href*="/dashboard/benchmarks/"]').first().locator('h3').textContent()
      await page.locator('a[href*="/dashboard/benchmarks/"]').first().click()
      await page.waitForLoadState('networkidle')
      
      // Verify breadcrumb at assessment level
      breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
      await expect(breadcrumb).toContainText('Benchmarks')
      await expect(breadcrumb).toContainText(assessmentName || '')
      await expect(breadcrumb).toContainText('Select Industry')
      
      // Verify we can navigate back via breadcrumb
      await page.locator('a[href="/dashboard/benchmarks"]').first().click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL('/dashboard/benchmarks')
    }
  })

  test('Benchmark values are validated as numbers', async ({ page }) => {
    const noAssessmentsMessage = page.locator('text=No assessments yet')
    const hasAssessments = await isNotVisible(noAssessmentsMessage)
    
    if (hasAssessments) {
      await page.locator('a[href*="/dashboard/benchmarks/"]').first().click()
      await page.waitForLoadState('networkidle')
      
      const noIndustriesMessage = page.locator('text=No industries yet')
      const hasIndustries = await isNotVisible(noIndustriesMessage)
      
      if (hasIndustries) {
        await page.locator('a').filter({ hasText: /^(?!.*\/)/ }).first().click()
        await page.waitForLoadState('networkidle')
        
        const noDimensionsMessage = page.locator('text=No dimensions found')
        const hasDimensions = await isNotVisible(noDimensionsMessage)
        
        if (hasDimensions) {
          // Get first input
          const firstInput = page.locator('input[type="number"]').first()
          
          // Verify input type is number
          await expect(firstInput).toHaveAttribute('type', 'number')
          
          // Verify input has step attribute for decimals
          await expect(firstInput).toHaveAttribute('step', '0.01')
          
          // Verify input has placeholder
          await expect(firstInput).toHaveAttribute('placeholder', '0.00')
        }
      }
    }
  })

  test('Admin can navigate to all benchmarks list view', async ({ page }) => {
    // Verify "View All Benchmarks" button is present
    const viewAllButton = page.locator('a:has-text("View All Benchmarks")')
    await expect(viewAllButton).toBeVisible()
    
    // Click the button to navigate to list view
    await viewAllButton.click()
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the list page
    await expect(page).toHaveURL('/dashboard/benchmarks/list')
    
    // Verify page title
    await expect(page.locator('h1')).toContainText('All Benchmarks')
    
    // Verify page description
    await expect(page.locator('p')).toContainText('View and manage all industry benchmarks')
  })

  test('Admin can view benchmarks in list table', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Check if there are benchmarks
    const noBenchmarksMessage = page.locator('text=No benchmarks yet')
    const hasBenchmarks = await isNotVisible(noBenchmarksMessage)
    
    if (hasBenchmarks) {
      // Verify table headers are present
      await expect(page.locator('th:has-text("Dimension")')).toBeVisible()
      await expect(page.locator('th:has-text("Industry")')).toBeVisible()
      await expect(page.locator('th:has-text("Value")')).toBeVisible()
      await expect(page.locator('th:has-text("Updated")')).toBeVisible()
      await expect(page.locator('th:has-text("Actions")')).toBeVisible()
      
      // Verify at least one benchmark row exists
      const tableRows = page.locator('tbody tr')
      await expect(tableRows.first()).toBeVisible()
      
      // Verify Edit and Delete buttons exist in the first row
      const firstRow = tableRows.first()
      await expect(firstRow.locator('a:has-text("Edit")')).toBeVisible()
      await expect(firstRow.locator('button:has-text("Delete")')).toBeVisible()
    } else {
      // Verify empty state message
      await expect(noBenchmarksMessage).toBeVisible()
      await expect(page.locator('text=Get started by creating benchmarks')).toBeVisible()
    }
  })

  test('Admin can view benchmark count in list view', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Check if there are benchmarks
    const noBenchmarksMessage = page.locator('text=No benchmarks yet')
    const hasBenchmarks = await isNotVisible(noBenchmarksMessage)
    
    if (hasBenchmarks) {
      // Verify the count is displayed
      const countText = page.locator('text=/\\(\\d+ benchmark(s)?\\)/')
      await expect(countText).toBeVisible()
    }
  })

  test('Benchmarks list table displays dimension and industry information', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Check if there are benchmarks
    const noBenchmarksMessage = page.locator('text=No benchmarks yet')
    const hasBenchmarks = await isNotVisible(noBenchmarksMessage)
    
    if (hasBenchmarks) {
      const firstRow = page.locator('tbody tr').first()
      
      // Verify dimension information is displayed (name and code)
      const dimensionCell = firstRow.locator('td').first()
      await expect(dimensionCell).toBeVisible()
      
      // Verify the cell contains text content (dimension name and code)
      const dimensionText = await dimensionCell.textContent()
      expect(dimensionText).toBeTruthy()
      expect(dimensionText?.length).toBeGreaterThan(0)
    }
  })

  test('Benchmarks list has breadcrumb navigation', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Verify breadcrumbs are present
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
    await expect(breadcrumb).toBeVisible()
    
    // Verify breadcrumb contains "Benchmarks" link
    await expect(breadcrumb.locator('a:has-text("Benchmarks")')).toBeVisible()
    
    // Verify current page in breadcrumb
    await expect(breadcrumb.locator('text=All Benchmarks')).toBeVisible()
    
    // Click on Benchmarks link in breadcrumb to navigate back
    await breadcrumb.locator('a:has-text("Benchmarks")').click()
    await page.waitForLoadState('networkidle')
    
    // Verify we're back on the main benchmarks page
    await expect(page).toHaveURL('/dashboard/benchmarks')
  })

  test('Benchmarks list has "Manage by Assessment" button', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Verify "Manage by Assessment" button is present
    const manageButton = page.locator('a:has-text("Manage by Assessment")')
    await expect(manageButton).toBeVisible()
    
    // Click the button to navigate to main benchmarks page
    await manageButton.click()
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the main benchmarks page
    await expect(page).toHaveURL('/dashboard/benchmarks')
    await expect(page.locator('text=Select Assessment')).toBeVisible()
  })

  test('Admin can navigate to single benchmark details from list', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Check if there are benchmarks
    const noBenchmarksMessage = page.locator('text=No benchmarks yet')
    const hasBenchmarks = await isNotVisible(noBenchmarksMessage)
    
    if (hasBenchmarks) {
      // Find and click the first "View" link
      const firstViewLink = page.locator('a:has-text("View")').first()
      await expect(firstViewLink).toBeVisible()
      await firstViewLink.click()
      await page.waitForLoadState('networkidle')
      
      // Verify we're on a benchmark detail page (URL should contain /dashboard/benchmarks/[id])
      await expect(page).toHaveURL(/\/dashboard\/benchmarks\/[a-zA-Z0-9-]+$/)
    }
  })

  test('Admin can view single benchmark details page', async ({ page }) => {
    // Navigate to benchmarks list first to get a benchmark ID
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Check if there are benchmarks
    const noBenchmarksMessage = page.locator('text=No benchmarks yet')
    const hasBenchmarks = await isNotVisible(noBenchmarksMessage)
    
    if (hasBenchmarks) {
      // Click first "View" link
      const firstViewLink = page.locator('a:has-text("View")').first()
      await firstViewLink.click()
      await page.waitForLoadState('networkidle')
      
      // Verify the detail page structure
      await expect(page.locator('h1')).toBeVisible()
      
      // Verify benchmark information card is present
      await expect(page.locator('text=Benchmark Information')).toBeVisible()
      
      // Verify benchmark value is displayed with percentage
      const valueElement = page.locator('text=/[0-9.]+%/')
      await expect(valueElement).toBeVisible()
      
      // Verify dimension information is displayed
      await expect(page.locator('text=Dimension')).toBeVisible()
      await expect(page.locator('text=Dimension Code')).toBeVisible()
      
      // Verify industry information is displayed
      await expect(page.locator('text=Industry')).toBeVisible()
      
      // Verify metadata section
      await expect(page.locator('text=Metadata')).toBeVisible()
      await expect(page.locator('text=Benchmark ID')).toBeVisible()
      await expect(page.locator('text=Created')).toBeVisible()
      await expect(page.locator('text=Last Updated')).toBeVisible()
    }
  })

  test('Single benchmark details page has breadcrumb navigation', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Check if there are benchmarks
    const noBenchmarksMessage = page.locator('text=No benchmarks yet')
    const hasBenchmarks = await isNotVisible(noBenchmarksMessage)
    
    if (hasBenchmarks) {
      // Click first "View" link
      await page.locator('a:has-text("View")').first().click()
      await page.waitForLoadState('networkidle')
      
      // Verify breadcrumbs are present
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
      await expect(breadcrumb).toBeVisible()
      
      // Verify breadcrumb structure
      await expect(breadcrumb.locator('a:has-text("Benchmarks")')).toBeVisible()
      await expect(breadcrumb.locator('a:has-text("All Benchmarks")')).toBeVisible()
      
      // Test breadcrumb navigation - click "All Benchmarks"
      await breadcrumb.locator('a:has-text("All Benchmarks")').click()
      await page.waitForLoadState('networkidle')
      
      // Verify we're back on the benchmarks list page
      await expect(page).toHaveURL('/dashboard/benchmarks/list')
    }
  })

  test('Single benchmark details page has action buttons', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Check if there are benchmarks
    const noBenchmarksMessage = page.locator('text=No benchmarks yet')
    const hasBenchmarks = await isNotVisible(noBenchmarksMessage)
    
    if (hasBenchmarks) {
      // Click first "View" link
      await page.locator('a:has-text("View")').first().click()
      await page.waitForLoadState('networkidle')
      
      // Verify action buttons are present
      await expect(page.locator('button:has-text("Edit Benchmark")')).toBeVisible()
      await expect(page.locator('button:has-text("Back to List")')).toBeVisible()
    }
  })

  test('Single benchmark details page displays related resources', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Check if there are benchmarks
    const noBenchmarksMessage = page.locator('text=No benchmarks yet')
    const hasBenchmarks = await isNotVisible(noBenchmarksMessage)
    
    if (hasBenchmarks) {
      // Click first "View" link
      await page.locator('a:has-text("View")').first().click()
      await page.waitForLoadState('networkidle')
      
      // Verify related resources section is present
      await expect(page.locator('text=Related Resources')).toBeVisible()
      await expect(page.locator('text=View all benchmarks for this industry')).toBeVisible()
      await expect(page.locator('text=Manage benchmarks by assessment')).toBeVisible()
    }
  })

  test('Admin can navigate back from single benchmark details', async ({ page }) => {
    // Navigate to benchmarks list
    await page.goto('/dashboard/benchmarks/list')
    await page.waitForLoadState('networkidle')
    
    // Check if there are benchmarks
    const noBenchmarksMessage = page.locator('text=No benchmarks yet')
    const hasBenchmarks = await isNotVisible(noBenchmarksMessage)
    
    if (hasBenchmarks) {
      // Click first "View" link
      await page.locator('a:has-text("View")').first().click()
      await page.waitForLoadState('networkidle')
      
      // Click "Back to List" button
      const backButton = page.locator('button:has-text("Back to List")').first()
      await backButton.click()
      await page.waitForLoadState('networkidle')
      
      // Verify we're back on the benchmarks list page
      await expect(page).toHaveURL('/dashboard/benchmarks/list')
      await expect(page.locator('text=All Benchmarks')).toBeVisible()
    }
  })
})
