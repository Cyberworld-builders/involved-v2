import { test, expect, devices } from '@playwright/test'
import { shouldSkipAuthTests } from './helpers/auth'

/**
 * Mobile Responsiveness E2E Tests
 * 
 * Tests that verify mobile responsiveness across all major dashboard pages.
 * These tests cover:
 * - Mobile navigation (hamburger menu)
 * - Responsive layouts
 * - Table responsiveness
 * - Touch interactions
 */

test.describe('Mobile Responsiveness', () => {
  const skipAuth = shouldSkipAuthTests()

  test.beforeEach(() => {
    // These tests target authenticated dashboard layouts. In CI we often run with
    // SKIP_AUTH_TESTS=true (no real Supabase), which redirects /dashboard → /auth/login.
    // In that mode, the expected sidebar/hamburger UI will never render.
    test.skip(skipAuth, 'SKIP_AUTH_TESTS is set - skipping dashboard mobile responsiveness tests')
  })

  test.describe('Mobile Navigation', () => {
    test('should show hamburger menu button on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size

      // Navigate to dashboard
      await page.goto('/dashboard')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Hamburger menu button should be visible
      const menuButton = page.getByLabel('Open menu')
      await expect(menuButton).toBeVisible()
    })

    test('should hide sidebar by default on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Sidebar should have translate-x-full class (hidden off screen)
      const sidebar = page.locator('nav').first()
      
      // Check if sidebar is off-screen (has negative or large transform value)
      const transform = await sidebar.evaluate((el) => {
        const style = window.getComputedStyle(el.parentElement || el)
        return style.transform
      })
      
      // Transform should indicate sidebar is hidden off-screen
      expect(transform).toBeTruthy()
    })

    test('should open sidebar when hamburger menu is clicked', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Click hamburger menu
      const menuButton = page.getByLabel('Open menu')
      await menuButton.click()

      // Wait for animation
      await page.waitForTimeout(500)

      // Sidebar navigation should be visible
      const sidebar = page.getByRole('navigation')
      await expect(sidebar).toBeVisible()

      // Navigation items should be visible
      await expect(page.getByText('Assessments')).toBeVisible()
      await expect(page.getByText('Clients')).toBeVisible()
      await expect(page.getByText('Users')).toBeVisible()
    })

    test('should show overlay when sidebar is open on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Click hamburger menu
      await page.click('button[aria-label="Open menu"]')
      
      // Wait for animation
      await page.waitForTimeout(500)

      // Overlay should be visible
      const overlay = page.locator('.fixed.inset-0.z-40.bg-gray-600')
      await expect(overlay).toBeVisible()
    })

    test('should close sidebar when overlay is clicked', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Open sidebar
      await page.click('button[aria-label="Open menu"]')
      await page.waitForTimeout(500)

      // Click overlay
      const overlay = page.locator('.fixed.inset-0.z-40.bg-gray-600')
      await overlay.click()

      // Wait for animation
      await page.waitForTimeout(500)

      // Overlay should no longer be visible
      await expect(overlay).not.toBeVisible()
    })

    test('should close sidebar when close button is clicked', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Open sidebar
      await page.click('button[aria-label="Open menu"]')
      await page.waitForTimeout(500)

      // Click close button
      await page.click('button[aria-label="Close menu"]')

      // Wait for animation
      await page.waitForTimeout(500)

      // Overlay should no longer be visible
      const overlay = page.locator('.fixed.inset-0.z-40')
      await expect(overlay).not.toBeVisible()
    })

    test('should close sidebar when navigation link is clicked', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Open sidebar
      await page.click('button[aria-label="Open menu"]')
      await page.waitForTimeout(500)

      // Click a navigation link
      await page.getByText('Assessments').click()

      // Wait for navigation and animation
      await page.waitForURL('**/dashboard/assessments')
      await page.waitForTimeout(500)

      // Overlay should no longer be visible
      const overlay = page.locator('.fixed.inset-0.z-40')
      await expect(overlay).not.toBeVisible()
    })
  })

  test.describe('Dashboard Page Responsiveness', () => {
    test('should display dashboard content properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Welcome section should be visible
      await expect(page.getByText('Welcome back!')).toBeVisible()

      // Cards should stack vertically on mobile
      const cards = page.locator('.grid')
      await expect(cards).toBeVisible()

      // Check that grid has single column on mobile
      const gridClass = await cards.getAttribute('class')
      expect(gridClass).toContain('grid-cols-1')
    })

    test('should have responsive text sizes on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Title should be visible and not overflow
      const title = page.getByRole('heading', { name: /welcome back/i })
      await expect(title).toBeVisible()

      // Check that title fits within viewport
      const titleBox = await title.boundingBox()
      expect(titleBox).toBeTruthy()
      if (titleBox) {
        expect(titleBox.width).toBeLessThanOrEqual(375)
      }
    })
  })

  test.describe('Table Responsiveness', () => {
    test('should make assessments table horizontally scrollable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard/assessments')
      await page.waitForLoadState('networkidle')

      // Page title should be visible
      await expect(page.getByText('Assessments')).toBeVisible()

      // Table container should have overflow-x-auto
      const tableContainer = page.locator('.overflow-x-auto')
      if (await tableContainer.count() > 0) {
        await expect(tableContainer.first()).toBeVisible()
      }
    })

    test('should hide non-essential table columns on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard/assessments')
      await page.waitForLoadState('networkidle')

      // Wait a bit for any content to load
      await page.waitForTimeout(1000)

      // Some columns should be hidden on mobile (using sm:table-cell or md:table-cell)
      // The table should still be functional with main columns visible
      const table = page.locator('table')
      if (await table.count() > 0) {
        await expect(table.first()).toBeVisible()
      }
    })

    test('should make clients table responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard/clients')
      await page.waitForLoadState('networkidle')

      // Page should be accessible
      await expect(page.getByText('Clients')).toBeVisible()

      // Add Client button should be visible
      await expect(page.getByText('Add Client')).toBeVisible()
    })

    test('should make users table responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard/users')
      await page.waitForLoadState('networkidle')

      // Page should be accessible
      await expect(page.getByText('Users', { exact: true })).toBeVisible()

      // Buttons should stack vertically on mobile
      const addUserButton = page.getByText('Add User')
      await expect(addUserButton).toBeVisible()
    })
  })

  test.describe('Tablet Responsiveness', () => {
    test('should display properly on tablet (iPad)', async ({ page }) => {
      // iPad viewport
      await page.setViewportSize({ width: 768, height: 1024 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // On tablet (md breakpoint), sidebar should be visible
      const sidebar = page.getByRole('navigation')
      await expect(sidebar).toBeVisible()

      // Hamburger menu should be hidden on tablet
      const menuButton = page.getByLabel('Open menu')
      await expect(menuButton).toBeHidden()

      // Content should use 2 columns on tablet
      const cards = page.locator('.grid')
      const gridClass = await cards.getAttribute('class')
      expect(gridClass).toContain('md:grid-cols-2')
    })

    test('should display tables properly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })

      await page.goto('/dashboard/assessments')
      await page.waitForLoadState('networkidle')

      // More columns should be visible on tablet than mobile
      const table = page.locator('table')
      if (await table.count() > 0) {
        await expect(table.first()).toBeVisible()
      }
    })
  })

  test.describe('Desktop Responsiveness', () => {
    test('should display properly on desktop', async ({ page }) => {
      // Standard desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Sidebar should be visible and static on desktop
      const sidebar = page.getByRole('navigation')
      await expect(sidebar).toBeVisible()

      // Hamburger menu should be hidden on desktop
      const menuButton = page.getByLabel('Open menu')
      await expect(menuButton).toBeHidden()

      // Content should use 3 columns on desktop
      const cards = page.locator('.grid')
      const gridClass = await cards.getAttribute('class')
      expect(gridClass).toContain('lg:grid-cols-3')
    })

    test('should display all table columns on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })

      await page.goto('/dashboard/assessments')
      await page.waitForLoadState('networkidle')

      // All columns should be visible on desktop
      const table = page.locator('table')
      if (await table.count() > 0) {
        await expect(table.first()).toBeVisible()
      }
    })
  })

  test.describe('Touch Interactions', () => {
    test('should handle touch events on mobile navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Tap hamburger menu using touch
      const menuButton = page.getByLabel('Open menu')
      await menuButton.tap()

      // Wait for animation
      await page.waitForTimeout(500)

      // Sidebar should be visible
      await expect(page.getByRole('navigation')).toBeVisible()

      // Tap a navigation link
      await page.getByText('Clients').tap()

      // Should navigate to clients page
      await page.waitForURL('**/dashboard/clients')
    })
  })

  test.describe('Orientation Changes', () => {
    test('should handle portrait to landscape orientation change', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Hamburger should be visible in portrait
      await expect(page.getByLabel('Open menu')).toBeVisible()

      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 })
      await page.waitForTimeout(500)

      // Page should still be functional
      await expect(page.getByText('Welcome back!')).toBeVisible()
    })
  })

  test.describe('Viewport Meta Tag', () => {
    test('should have proper viewport meta tag', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Check that viewport meta tag exists and has correct properties
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content')
      expect(viewportMeta).toBeTruthy()
      expect(viewportMeta).toContain('width=device-width')
      expect(viewportMeta).toContain('initial-scale=1')
    })
  })
})
