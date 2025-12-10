import { test, expect } from '@playwright/test'

/**
 * Example E2E test file
 * 
 * This demonstrates how to write end-to-end tests using Playwright.
 * Use this as a template when creating E2E tests.
 */

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Check that the page loaded
  expect(page).toHaveURL('/')
})

test('navigation works', async ({ page }) => {
  await page.goto('/')
  
  // Example: Click a navigation link
  // await page.click('text=Dashboard')
  // await expect(page).toHaveURL('/dashboard')
})
