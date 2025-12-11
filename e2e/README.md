# End-to-End Tests

This directory contains E2E tests for the Involved Talent application using Playwright.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Create a `.env.local` file with required environment variables:
   ```bash
   cp .env.example .env.local
   ```

## Running Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run specific test file:
```bash
npm run test:e2e -- e2e/feature-navigation-layout.test.ts
```

### Run tests in UI mode (interactive):
```bash
npm run test:e2e:ui
```

### Run tests in debug mode:
```bash
npm run test:e2e:debug
```

## Test Files

### `feature-navigation-layout.test.ts`
Tests for navigation and responsive layout functionality:
- Navigation component consistency across pages
- Responsive layout on mobile devices (iPhone 12)
- Responsive layout on tablet devices (768x1024)
- Responsive layout on desktop devices (1920x1080)
- Layout consistency across all pages

**Note**: Dashboard tests require authentication. Tests will skip if not authenticated. Home page tests work without authentication.

## Authentication for Dashboard Tests

To run the full suite of dashboard tests, you need to:

1. Set up a test user account in your Supabase instance
2. Configure authentication in the test environment
3. Or use Playwright's authentication state persistence

For development/testing, the dashboard tests will gracefully skip if authentication is not available.

## Test Configuration

See `playwright.config.ts` in the root directory for configuration options including:
- Base URL
- Browser configurations
- Timeout settings
- Screenshot and video recording options
