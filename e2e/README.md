# End-to-End Tests

This directory contains end-to-end (E2E) tests for the Involved v2 application using Playwright.

## Test Files

### `feature-industry-crud.test.ts`
Comprehensive test suite for Industry CRUD operations covering:

#### Test Coverage
- ✅ **Create Industry**: Admin can create new industry with form validation
- ✅ **View Industries List**: Admin can view all industries with proper table structure
- ✅ **View Industry Details**: Admin can view single industry details via edit page
- ✅ **Update Industry**: Admin can update industry information
- ✅ **Delete Industry**: Admin can delete industry (with confirmation handling)
- ✅ **User-Industry Assignment**: Users can be assigned to industries via user form
- ✅ **Form Validation**: Tests form validation rules and error handling
- ✅ **Navigation**: Tests navigation between industry pages
- ✅ **Data Display**: Verifies correct data display and empty states

#### Related Issues
- [#53-57](https://github.com/Cyberworld-builders/involved-v2/issues/53): Industry CRUD operations
- [#58](https://github.com/Cyberworld-builders/involved-v2/issues/58): User-industry assignment

## Prerequisites

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Playwright Browsers
```bash
npx playwright install
```

### 3. Configure Supabase
Create a `.env.local` file with your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

See `.env.example` for more details.

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npx playwright test feature-industry-crud
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test by name
```bash
npx playwright test -g "Admin can create new industry"
```

## Test Structure

Each test follows this pattern:

1. **Setup** (`beforeEach`): Navigate to the relevant page
2. **Action**: Perform the user action (click, fill form, etc.)
3. **Assertion**: Verify the expected outcome
4. **Cleanup**: Tests are isolated, no explicit cleanup needed

## Authentication

The tests currently navigate directly to dashboard pages. In a production environment, you would need to:

1. Set up test user credentials in your test environment
2. Implement an authentication helper (e.g., using Playwright's `storageState`)
3. Login once before all tests or use a global setup file

Example authentication setup (to be implemented):
```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test'

setup('authenticate', async ({ page }) => {
  await page.goto('/auth/login')
  await page.fill('#email', process.env.TEST_USER_EMAIL!)
  await page.fill('#password', process.env.TEST_USER_PASSWORD!)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
  await page.context().storageState({ path: 'playwright/.auth/user.json' })
})
```

## Debugging Tests

### View test report
After running tests, view the HTML report:
```bash
npx playwright show-report
```

### Screenshots and videos
Failed tests automatically capture:
- Screenshots (on failure)
- Videos (on failure)
- Traces (on retry)

Find them in the `test-results` directory.

### Debug a specific test
```bash
npx playwright test --debug feature-industry-crud -g "Admin can create"
```

## CI/CD Integration

Tests are configured to run in CI with:
- Automatic retries (2 retries on failure)
- Serial execution (non-parallel)
- HTML report generation

See `playwright.config.ts` for CI-specific settings.

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on others
2. **Wait for State**: Tests properly wait for `networkidle` before assertions
3. **Flexible Assertions**: Tests handle both success states and empty states
4. **Error Handling**: Try-catch blocks handle timing variations
5. **Realistic Data**: Tests use timestamp-based unique data to avoid conflicts

## Troubleshooting

### Test times out
- Increase timeout in `playwright.config.ts`
- Check if the dev server is running properly
- Verify Supabase configuration

### Tests fail inconsistently
- Ensure proper wait conditions (`waitForLoadState`, `waitForTimeout`)
- Check for race conditions in the application
- Verify network stability

### Authentication errors
- Verify Supabase environment variables are set
- Check that test user has proper permissions
- Ensure authentication tokens are valid

## Contributing

When adding new tests:
1. Follow the existing test structure and naming conventions
2. Add proper TypeScript types for test data
3. Include descriptive test names and comments
4. Handle both success and edge cases
5. Update this README with new test coverage
