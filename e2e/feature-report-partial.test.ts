/**
 * E2E: Report view with partial data (zero completed 360 raters).
 *
 * Ensures dashboard and fullscreen report pages render without crashing and
 * that .page-container exists (required for PDF pipeline). Run against localhost
 * after seeding: npm run seed:360-demo && npm run seed:partial-report
 */

import { test, expect } from '@playwright/test'
import { shouldSkipAuthTests } from './helpers/auth'
import { getPartial360AssignmentId } from './helpers/database'

test.describe('Report view with partial data', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (shouldSkipAuthTests()) {
      testInfo.skip(true, 'Auth tests disabled (SKIP_AUTH_TESTS)')
    }
  })

  test('dashboard report page and fullscreen render without crash; fullscreen has .page-container', async ({
    page,
  }) => {
    const assignmentId = await getPartial360AssignmentId()
    if (!assignmentId) {
      test.skip(
        true,
        'No partial 360 assignment found. Run: npm run seed:360-demo && npm run seed:partial-report'
      )
      return
    }

    await page.goto(`/dashboard/reports/${assignmentId}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).toContain(`/dashboard/reports/${assignmentId}`)

    await expect(page.locator('body')).toBeVisible()

    const hasPartialOrEmpty =
      (await page.getByText(/Partial report|No responses|responses received/i).count()) > 0
    if (!hasPartialOrEmpty) {
      await expect(page.locator('main')).toBeVisible()
    }

    const fullscreenUrl = `/reports/${assignmentId}/view`
    await page.goto(fullscreenUrl)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('.page-container').first()).toBeVisible({ timeout: 10000 })
  })
})
