import { test, expect, devices, Browser } from '@playwright/test'
import { shouldSkipAuthTests } from './helpers/auth'

/**
 * E2E tests for Navigation & Responsive Layout
 * 
 * This test suite verifies:
 * - Navigation component is consistent across pages
 * - Page layout is responsive on mobile, tablet, and desktop devices
 * - All pages maintain consistent layout structure
 * 
 * Note: Dashboard pages require authentication. Tests will skip if not authenticated.
 * To run full tests, ensure test environment has authentication configured.
 */

// Constants
// Tolerance for horizontal scroll detection (in pixels)
const VIEWPORT_TOLERANCE_PX = 10

// Helper function to create mobile context that works with all browsers
// Firefox doesn't support isMobile option, so we use viewport-only approach
async function createMobileContext(browser: Browser) {
  const browserName = browser.browserType().name()
  const device = devices['iPhone 12']
  
  if (browserName === 'firefox') {
    // Firefox doesn't support isMobile, so just use viewport
    return await browser.newContext({
      viewport: device.viewport,
      userAgent: device.userAgent,
    })
  } else {
    // Other browsers support isMobile
    return await browser.newContext({ ...device })
  }
}

// Helper function to check if we're on an authenticated page
async function isAuthenticated(page: { url: () => string }): Promise<boolean> {
  const url = page.url()
  return url.includes('/dashboard') && !url.includes('/auth/')
}

test.describe('Navigation Component Consistency', () => {
  test.beforeEach(async () => {
    // Skip all tests if SKIP_AUTH_TESTS is set
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
  })
  
  test('sidebar navigation is present on dashboard page', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // If we're on dashboard (authenticated), verify navigation
    if (await isAuthenticated(page)) {
      // Check that sidebar navigation exists
      const sidebar = page.locator('.bg-gray-900')
      await expect(sidebar).toBeVisible({ timeout: 10000 })
      
      // Verify navigation links are present
      const homeLink = page.locator('nav a[href="/dashboard"]')
      await expect(homeLink).toBeVisible()
      
      // Check for logo/branding
      const logo = page.locator('text=Involved Talent')
      await expect(logo).toBeVisible()
    } else {
      test.skip(true, 'Dashboard requires authentication')
    }
  })
  
  test('navigation contains all expected links', async ({ page }) => {
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    if (await isAuthenticated(page)) {
      // Verify all navigation links are present
      const expectedLinks = [
        { name: 'Home', href: '/dashboard' },
        { name: 'Assessments', href: '/dashboard/assessments' },
        { name: 'Clients', href: '/dashboard/clients' },
        { name: 'Users', href: '/dashboard/users' },
        { name: 'Industries', href: '/dashboard/industries' },
        { name: 'Benchmarks', href: '/dashboard/benchmarks' },
        // Feedback link hidden for Phase 1
        // { name: 'Feedback', href: '/dashboard/feedback' },
      ]
      
      for (const link of expectedLinks) {
        const navLink = page.locator(`nav a[href="${link.href}"]`)
        await expect(navLink).toBeVisible()
        await expect(navLink).toContainText(link.name)
      }
      
      // Verify user section is present
      const userSection = page.locator('.border-t.border-gray-700')
      await expect(userSection).toBeVisible()
    } else {
      test.skip(true, 'Dashboard requires authentication')
    }
  })
  
  test('header bar is present with expected elements', async ({ page }) => {
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    if (await isAuthenticated(page)) {
      // Verify header exists
      const header = page.locator('header')
      await expect(header).toBeVisible()
      
      // Verify header has mobile menu button
      const menuButton = page.locator('header button[aria-label="Open menu"]')
      await expect(menuButton).toBeVisible()
    } else {
      test.skip(true, 'Dashboard requires authentication')
    }
  })
})

test.describe('Responsive Layout - Mobile', () => {
  test.beforeEach(async () => {
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
  })
  
  test('dashboard layout renders on mobile viewport', async ({ browser }) => {
    const context = await createMobileContext(browser)
    const page = await context.newPage()
    
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    if (await isAuthenticated(page)) {
      // Verify main content area is visible
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
      
      // Verify page doesn't have horizontal scroll issues
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = page.viewportSize()?.width || 0
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + VIEWPORT_TOLERANCE_PX)
      
      // Verify layout structure exists
      const container = page.locator('.flex.h-screen')
      await expect(container).toBeVisible()
    } else {
      test.skip(true, 'Dashboard requires authentication')
    }
    
    await context.close()
  })
  
  test('navigation is accessible on mobile viewport', async ({ browser }) => {
    const context = await createMobileContext(browser)
    const page = await context.newPage()
    
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    if (await isAuthenticated(page)) {
      // Check if sidebar is present (it may be visible or hidden depending on responsive design)
      const sidebar = page.locator('.bg-gray-900')
      const sidebarCount = await sidebar.count()
      
      // Verify sidebar component exists in DOM (even if hidden)
      expect(sidebarCount).toBeGreaterThan(0)
    } else {
      test.skip(true, 'Dashboard requires authentication')
    }
    
    await context.close()
  })
})

test.describe('Responsive Layout - Tablet', () => {
  test('dashboard layout renders properly on tablet viewport', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 768, height: 1024 } })
    const page = await context.newPage()
    
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    if (await isAuthenticated(page)) {
      // Verify sidebar navigation is visible
      const sidebar = page.locator('.bg-gray-900')
      await expect(sidebar).toBeVisible()
      
      // Verify main content is visible
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
      
      // Verify stats cards grid is visible (using more specific selector)
      const cards = page.locator('.grid.grid-cols-1')
      await expect(cards.first()).toBeVisible()
    } else {
      test.skip(true, 'Dashboard requires authentication')
    }
    
    await context.close()
  })
})

test.describe('Responsive Layout - Desktop', () => {
  test('dashboard layout renders properly on desktop viewport', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const page = await context.newPage()
    
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    if (await isAuthenticated(page)) {
      // Verify sidebar navigation is visible
      const sidebar = page.locator('.bg-gray-900')
      await expect(sidebar).toBeVisible()
      
      // Verify main content is visible
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
      
      // Verify no horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = page.viewportSize()?.width || 0
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + VIEWPORT_TOLERANCE_PX)
    } else {
      test.skip(true, 'Dashboard requires authentication')
    }
    
    await context.close()
  })
  
  test('layout maintains proper structure on wide viewports', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const page = await context.newPage()
    
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    if (await isAuthenticated(page)) {
      // Verify flex layout structure
      const container = page.locator('.flex.h-screen')
      await expect(container).toBeVisible()
      
      // Verify stats grid is visible
      const statsGrid = page.locator('.grid.grid-cols-1')
      await expect(statsGrid.first()).toBeVisible()
    } else {
      test.skip(true, 'Dashboard requires authentication')
    }
    
    await context.close()
  })
})

test.describe('Layout Consistency', () => {
  test('layout maintains consistent structure', async ({ page }) => {
    await page.goto('/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    if (await isAuthenticated(page)) {
      // Verify sidebar exists
      const sidebar = page.locator('.bg-gray-900')
      await expect(sidebar).toBeVisible()
      
      // Verify header exists
      const header = page.locator('header')
      await expect(header).toBeVisible()
      
      // Verify main content area exists
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
      
      // Verify flex layout container exists
      const container = page.locator('.flex.h-screen')
      await expect(container).toBeVisible()
    } else {
      test.skip(true, 'Dashboard requires authentication')
    }
  })
})

test.describe('Home Page Responsive Layout', () => {
  test('home page renders properly on mobile viewport', async ({ browser }) => {
    const context = await createMobileContext(browser)
    const page = await context.newPage()
    
    await page.goto('/', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // Verify main heading is visible
    const heading = page.locator('h1:has-text("Involved Talent")')
    await expect(heading).toBeVisible()
    
    // Verify navigation is present
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
    
    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = page.viewportSize()?.width || 0
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + VIEWPORT_TOLERANCE_PX)
    
    await context.close()
  })
  
  test('home page renders properly on tablet viewport', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 768, height: 1024 } })
    const page = await context.newPage()
    
    await page.goto('/', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // Verify main heading is visible
    const heading = page.locator('h1:has-text("Involved Talent")')
    await expect(heading).toBeVisible()
    
    // Verify cards grid is visible
    const cards = page.locator('.grid')
    await expect(cards.first()).toBeVisible()
    
    await context.close()
  })
  
  test('home page renders properly on desktop viewport', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const page = await context.newPage()
    
    await page.goto('/', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // Verify main heading is visible
    const heading = page.locator('h1:has-text("Involved Talent")')
    await expect(heading).toBeVisible()
    
    // Verify navigation is present
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
    
    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = page.viewportSize()?.width || 0
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + VIEWPORT_TOLERANCE_PX)
    
    await context.close()
  })
})
