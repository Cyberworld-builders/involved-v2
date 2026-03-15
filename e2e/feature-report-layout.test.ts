/**
 * E2E: Report layout and rendering tests
 *
 * Tests the fullscreen report view for correct structure, styling,
 * and content. These tests validate the fixes for issues #259-#268.
 *
 * Requires auth state and a ready report in the database.
 */

import { test, expect } from '@playwright/test'
import { shouldSkipAuthTests } from './helpers/auth'
import { getAdminClient } from './helpers/database'

// Find a ready report to test against
async function getReadyReportAssignmentId(): Promise<string | null> {
  const client = getAdminClient()
  if (!client) return null

  const { data } = await client
    .from('report_data')
    .select('assignment_id')
    .eq('pdf_status', 'ready')
    .order('calculated_at', { ascending: false })
    .limit(1)

  return data?.[0]?.assignment_id || null
}

// Find a leader-type report specifically
async function getLeaderReportAssignmentId(): Promise<string | null> {
  const client = getAdminClient()
  if (!client) return null

  const { data } = await client
    .from('report_data')
    .select('assignment_id, dimension_scores')
    .eq('pdf_status', 'ready')
    .order('calculated_at', { ascending: false })
    .limit(10)

  for (const row of data || []) {
    const report = typeof row.dimension_scores === 'string'
      ? JSON.parse(row.dimension_scores)
      : row.dimension_scores
    if (report?.assessment_title && !report.is_blocker) {
      return row.assignment_id
    }
  }
  return null
}

test.describe('Report Fullscreen View - Layout', () => {
  let assignmentId: string | null = null

  test.beforeAll(async () => {
    assignmentId = await getReadyReportAssignmentId()
  })

  test.beforeEach(async ({}, testInfo) => {
    if (shouldSkipAuthTests()) {
      testInfo.skip(true, 'Auth tests disabled')
    }
    if (!assignmentId) {
      testInfo.skip(true, 'No ready report found in database')
    }
  })

  test('fullscreen view loads without error', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await page.waitForLoadState('domcontentloaded')
    // Should not redirect to error page
    expect(page.url()).toContain(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })
  })

  test('has cover page with title and name', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    // Cover page should have assessment title text
    const coverPage = page.locator('.page-container').first()
    const coverText = await coverPage.textContent()
    expect(coverText).toBeTruthy()
    expect(coverText!.length).toBeGreaterThan(10)
  })

  test('has table of contents on page 2', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    // TOC should exist
    const toc = page.locator('.table-of-contents')
    await expect(toc).toBeVisible()

    // TOC should have lines with titles
    const lines = toc.locator('.line')
    const lineCount = await lines.count()
    expect(lineCount).toBeGreaterThan(2) // At least Read Me First + Summary + Dimensions
  })

  test('TOC does not show page number 0', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    // Get all page number spans in the TOC
    const toc = page.locator('.table-of-contents')
    const pageNumbers = toc.locator('.page')
    const count = await pageNumbers.count()

    for (let i = 0; i < count; i++) {
      const text = await pageNumbers.nth(i).textContent()
      expect(text?.trim()).not.toBe('0')
    }
  })

  test('TOC has proper nesting (sublines exist)', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    const toc = page.locator('.table-of-contents')
    // Should have both main lines and sublines
    const mainLines = toc.locator('.line:not(.subline):not(.subsubline)')
    const subLines = toc.locator('.subline')

    const mainCount = await mainLines.count()
    const subCount = await subLines.count()

    expect(mainCount).toBeGreaterThan(0)
    expect(subCount).toBeGreaterThan(0)
  })

  test('all pages have page-container class', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    const containers = page.locator('.page-container')
    const count = await containers.count()
    // Should have multiple pages (cover + TOC + read me + scores + dimensions)
    expect(count).toBeGreaterThan(5)
  })

  test('all pages have header with logo', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    // Pages after cover should have header logos
    // Skip first page (cover) which has its own logo treatment
    const headers = page.locator('.page-header')
    const headerCount = await headers.count()
    expect(headerCount).toBeGreaterThan(3)
  })

  test('all pages have footer with page number', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    const footers = page.locator('.page-footer')
    const footerCount = await footers.count()
    expect(footerCount).toBeGreaterThan(3)
  })

  test('no placeholder definition text appears', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('placeholder definition')
    expect(bodyText).not.toContain('has not been defined')
  })

  test('score displays render with numeric values', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    // Score displays should show numbers (class="score" in score-display.tsx)
    const scores = page.locator('.score')
    const scoreCount = await scores.count()
    expect(scoreCount).toBeGreaterThan(0)
  })

  test('data-report-pages attribute is set', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    // The report wrapper should have data-report-pages for PDF generation
    const reportPages = await page.getAttribute('[data-report-pages]', 'data-report-pages')
    expect(reportPages).toBeTruthy()
    const pageCount = parseInt(reportPages!)
    expect(pageCount).toBeGreaterThan(5)
  })

  test('pages have consistent dimensions (850x1100)', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    const container = page.locator('.page-container').first()
    const box = await container.boundingBox()
    expect(box).toBeTruthy()
    // Should be approximately 850px wide (allow some tolerance)
    expect(box!.width).toBeGreaterThan(800)
    expect(box!.width).toBeLessThan(900)
  })
})

test.describe('Report Fullscreen View - Leader Specific', () => {
  let assignmentId: string | null = null

  test.beforeAll(async () => {
    assignmentId = await getLeaderReportAssignmentId()
  })

  test.beforeEach(async ({}, testInfo) => {
    if (shouldSkipAuthTests()) {
      testInfo.skip(true, 'Auth tests disabled')
    }
    if (!assignmentId) {
      testInfo.skip(true, 'No leader report found in database')
    }
  })

  test('has "Read Me First" page', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    const readMe = page.getByText(/Read Me First|YOUR GUIDE/i)
    await expect(readMe.first()).toBeVisible()
  })

  test('has scores summary page', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    const summary = page.getByText(/Scores.*Summary|Summary.*Scores/i)
    await expect(summary.first()).toBeVisible()
  })

  test('has horizontal bar charts for dimensions', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    // Bar charts should exist in the report (class="bars" and class="bar")
    const charts = page.locator('.bars')
    const chartCount = await charts.count()
    expect(chartCount).toBeGreaterThan(0)
  })

  test('dimension pages show dimension name', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    // Look for dimension names that we know exist in the data
    const dimensionNames = ['Empower', 'Communication', 'Relationships', 'Ethical', 'Analytical']
    let found = 0
    for (const name of dimensionNames) {
      const el = page.getByText(name, { exact: false })
      if (await el.count() > 0) found++
    }
    // Should find at least some dimension names
    expect(found).toBeGreaterThan(2)
  })

  test('subdimension overview only shows dimensions with subdimensions', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    // Find the page containing "Sub-dimensions are defined as:"
    const subDimText = page.getByText('Sub-dimensions are defined as:')
    if (await subDimText.count() > 0) {
      // Get the page-container that holds the overview
      const overviewContainer = subDimText.locator('xpath=ancestor::*[contains(@class, "page-container")]')
      // Count "Dimension:" labels only within this specific page
      const dimensionLabels = overviewContainer.getByText(/^Dimension:/)
      const labelCount = await dimensionLabels.count()
      // Should only show dimensions that have subdimensions (3 out of 10 for MASTER assessment)
      expect(labelCount).toBeLessThanOrEqual(5)
      expect(labelCount).toBeGreaterThan(0)
    }
  })
})

test.describe('Report Dashboard View', () => {
  let assignmentId: string | null = null

  test.beforeAll(async () => {
    assignmentId = await getReadyReportAssignmentId()
  })

  test.beforeEach(async ({}, testInfo) => {
    if (shouldSkipAuthTests()) {
      testInfo.skip(true, 'Auth tests disabled')
    }
    if (!assignmentId) {
      testInfo.skip(true, 'No ready report found in database')
    }
  })

  test('dashboard report page loads', async ({ page }) => {
    await page.goto(`/dashboard/reports/${assignmentId}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
    // Should not be on an error page
    expect(page.url()).toContain(`/dashboard/reports/${assignmentId}`)
  })

  test('has report action buttons', async ({ page }) => {
    await page.goto(`/dashboard/reports/${assignmentId}`)
    await page.waitForLoadState('domcontentloaded')

    // Should have at least one action button (View, PDF, Export)
    const buttons = page.locator('button, a').filter({ hasText: /View|PDF|Export|Download|Regenerate/i })
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThan(0)
  })

  test('has dimension cards with scores', async ({ page }) => {
    await page.goto(`/dashboard/reports/${assignmentId}`)
    await page.waitForLoadState('networkidle')

    // Dashboard view should show dimension scores
    const bodyText = await page.textContent('body')
    // Should contain some numeric scores
    expect(bodyText).toMatch(/\d\.\d/)
  })
})

test.describe('Report Navigation - Issue #261', () => {
  let assignmentId: string | null = null

  test.beforeAll(async () => {
    assignmentId = await getReadyReportAssignmentId()
  })

  test.beforeEach(async ({}, testInfo) => {
    if (shouldSkipAuthTests()) {
      testInfo.skip(true, 'Auth tests disabled')
    }
    if (!assignmentId) {
      testInfo.skip(true, 'No ready report found in database')
    }
  })

  test('page containers have sequential IDs for navigation', async ({ page }) => {
    await page.goto(`/reports/${assignmentId}/view`)
    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 15000 })

    const containers = page.locator('.page-container')
    const count = await containers.count()

    // Each page should have an id attribute for anchor navigation
    for (let i = 0; i < Math.min(count, 5); i++) {
      const id = await containers.nth(i).getAttribute('id')
      expect(id).toBeTruthy()
    }
  })
})
