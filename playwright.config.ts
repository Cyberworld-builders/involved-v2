import { defineConfig, devices } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * Check if auth state file exists
 */
const authStatePath = path.join(__dirname, 'e2e', '.auth', 'user.json')
const hasAuthState = fs.existsSync(authStatePath)

/**
 * When auth tests are skipped, we can run Chromium-only to speed up CI.
 * (Most suites are either skipped or primarily validated in one engine.)
 */
const skipAuthTests =
  process.env.SKIP_AUTH_TESTS === 'true' || process.env.SKIP_AUTH_TESTS === '1'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Global setup runs before all tests */
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use 2 workers in CI for faster execution (324 tests / 1 worker = very slow) */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Load auth state if it exists (created by global setup) */
        ...(hasAuthState && { storageState: authStatePath }),
      },
    },

    ...(skipAuthTests
      ? []
      : [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              ...(hasAuthState && { storageState: authStatePath }),
            },
          },

          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              ...(hasAuthState && { storageState: authStatePath }),
            },
          },
        ]),

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
})
