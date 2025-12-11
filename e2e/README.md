# E2E Tests

This directory contains end-to-end (E2E) tests for the Involved Talent v2 application using Playwright.

## Running E2E Tests

### Prerequisites

Before running E2E tests, ensure you have:

1. **Installed dependencies**:
   ```bash
   npm install
   npx playwright install --with-deps
   ```

2. **Set up test environment**:
   - For local testing, you'll need a running instance of the application
   - Supabase should be configured (local or staging)
   - Test user credentials should be set up

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Debug tests
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/feature-client-crud.test.ts
npx playwright test e2e/feature-group-crud.test.ts
npx playwright test e2e/feature-navigation-layout.test.ts
npx playwright test e2e/feature-user-invitation.test.ts

# Run tests in headed mode (see the browser)
npx playwright test --headed

# Run tests in a specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run specific test by name
npx playwright test -g "Admin can create new industry"
```

## Test Structure

### Test Files

- `example.spec.ts` - Example test demonstrating Playwright usage
- `feature-client-crud.test.ts` - Complete client CRUD flow tests
- `feature-group-crud.test.ts` - Complete group CRUD flow tests (issues #37-43)
- `feature-navigation-layout.test.ts` - Navigation and responsive layout tests
- `feature-user-invitation.test.ts` - User invitation and account claim flow tests
- `feature-bulk-benchmark-upload.test.ts` - Bulk benchmark upload tests
- `test-auth-setup.test.ts` - Authentication setup verification tests

### Test Fixtures

The `fixtures/` directory contains test assets used in E2E tests:
- `logo.png` - Test logo image for client logo upload tests
- `background.png` - Test background image for client background upload tests
- `test-data.ts` - Reusable test data fixtures

## Authentication Setup

> **Note**: Auth tests are currently skipped by default. See `SKIP_AUTH_TESTS.md` for details.

The E2E tests use **Playwright's global setup** to automatically authenticate before running tests. This means:

1. **Authentication happens once** before all tests run (via `e2e/global-setup.ts`)
2. **Auth state is saved** and reused across all tests
3. **No need to login in each test** - tests start already authenticated

### Temporarily Skipping Auth Tests

To skip all authentication-related tests (useful during development):

```bash
export SKIP_AUTH_TESTS=true
npm run test:e2e
```

See `e2e/SKIP_AUTH_TESTS.md` for more details.

### Required Environment Variables

Set up test user credentials:

```bash
export PLAYWRIGHT_TEST_EMAIL="e2e-test-admin@involved-talent.test"
export PLAYWRIGHT_TEST_PASSWORD="TestPassword123!"
```

Or create a `.env.test` file (not committed to version control):

```env
PLAYWRIGHT_TEST_EMAIL=e2e-test-admin@involved-talent.test
PLAYWRIGHT_TEST_PASSWORD=TestPassword123!
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

### Automatic Test User Creation (Optional)

If you provide `SUPABASE_SERVICE_ROLE_KEY`, the global setup will:
- Automatically create the test user if it doesn't exist
- Create the user's profile (name: "E2E Test Admin")
- Update the password if the user already exists

Note: The `profiles` table does not have a `role` field. User roles/permissions are managed through application logic or group memberships if needed.

This is ideal for CI/CD environments where you want fully automated test setup.

### Manual Test User Setup

If you prefer to create the test user manually:

1. **Via Supabase Dashboard**: Create a user with email `e2e-test-admin@involved-talent.test` and password `TestPassword123!`
2. **Via SQL** (see SQL example below)
3. **Via Application**: Sign up through the app (the profile will be created automatically)

The global setup will authenticate using the credentials you provide.

## Setting Up Test Users

### Local Supabase

If using local Supabase, create a test admin user:

```sql
-- Note: This is a simplified example. In practice, use Supabase Admin API
-- or let the application handle user creation through the signup flow.

-- The profiles table has these fields (no role field):
-- id, auth_user_id, username, name, email, client_id, industry_id, 
-- language_id, last_login_at, completed_profile, accepted_terms, 
-- accepted_at, accepted_signature, created_at, updated_at
```

### Staging/Production

For staging or production environments:
1. Create a dedicated test user through the application
2. Use the credentials in your test environment

Note: The profiles table does not have a role field. User permissions are managed through application logic.

**Important**: Never use production credentials in tests!

## CI/CD

E2E tests run automatically in GitHub Actions on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

The CI environment uses secrets for authentication:
- `PLAYWRIGHT_TEST_EMAIL`
- `PLAYWRIGHT_TEST_PASSWORD`
- `PLAYWRIGHT_TEST_BASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SKIP_AUTH_TESTS` (set to `true` by default)

## Test Coverage

### Client CRUD Tests (`feature-client-crud.test.ts`)

#### Core CRUD Operations
- ✅ Admin can create new client
- ✅ Admin can view clients list
- ✅ Admin can view single client details
- ✅ Admin can update client information
- ✅ Admin can delete client

#### File Upload Features
- ✅ Client logo upload works
- ✅ Client background image upload works

#### Customization Features
- ✅ Client color customization works
- ✅ Complete flow with all features

#### Edge Cases
- ✅ Creating client with minimum required fields
- ✅ Form validation prevents empty client name
- ✅ Client list shows empty state when no clients exist

### User Invitation Tests (`feature-user-invitation.test.ts`)

Comprehensive E2E tests for the user invitation and account claim flow.

#### Test Coverage
- ✅ Admin/Manager can send user invite
- ✅ Invite email is sent with token link
- ✅ Token expires after 7 days
- ✅ User can access account claim page with valid token
- ✅ User can claim account and set password
- ✅ User is redirected to dashboard after claim
- ✅ User can sign in after account claim
- ✅ User can update profile after account claim
- ✅ User can update password after account claim
- ✅ User can request password reset after account claim
- ✅ Expired tokens are rejected
- ✅ Error handling for invalid tokens
- ✅ Integration tests for complete flows

#### Related Issues
- User invitation and account claim (Issues #45-#52)

#### Test Behavior

**Smart Skip Logic:**
The invitation tests include smart skip logic that:
- Automatically detects if the `/auth/claim` page exists
- Skips tests gracefully when features are not yet implemented
- Provides clear messaging about why tests were skipped

**Expected Test Results (Current State):**
Most tests in `feature-user-invitation.test.ts` will currently **skip** because:
- The `/auth/claim` page does not exist yet
- The invitation API endpoints are not implemented
- Email service is not configured

These tests serve as **acceptance criteria** for the user invitation feature implementation.

#### Test Implementation Status

| Test Suite | Tests | Status | Notes |
|------------|-------|--------|-------|
| Admin/Manager Invitation | 3 | ⏸️ Skipped | Awaiting feature implementation |
| Account Claim Flow | 4 | ⏸️ Skipped | Awaiting `/auth/claim` page |
| Post-Claim Functionality | 4 | ⏸️ Skipped | Awaiting feature implementation |
| Error Handling | 3 | ⏸️ Skipped | Awaiting feature implementation |
| Integration Tests | 3 | ⏸️ Skipped | Awaiting full implementation |

#### Future Enhancements

When implementing the user invitation features, the following should be added:

1. **Email Testing Infrastructure:**
   - Integration with test email service (e.g., Ethereal, MailHog)
   - Database queries to verify invite tokens
   - API to check email queue status

2. **Test Data Management:**
   - Automated cleanup of test users after tests complete
   - Fixtures for creating test users with various states
   - Database seeding for test scenarios

3. **Time-based Testing:**
   - Mock time manipulation for token expiration tests
   - Database helpers to create backdated tokens

### Navigation & Layout Tests (`feature-navigation-layout.test.ts`)

#### Navigation Component
- ✅ Sidebar navigation is present on dashboard page
- ✅ Navigation contains all expected links
- ✅ Header bar is present with expected elements

#### Responsive Layout
- ✅ Dashboard layout renders on mobile viewport
- ✅ Navigation is accessible on mobile viewport
- ✅ Dashboard layout renders properly on tablet viewport
- ✅ Dashboard layout renders properly on desktop viewport
- ✅ Layout maintains proper structure on wide viewports

#### Layout Consistency
- ✅ Layout maintains consistent structure
- ✅ Home page renders properly on mobile viewport
- ✅ Home page renders properly on tablet viewport
- ✅ Home page renders properly on desktop viewport

**Note**: Dashboard tests require authentication. Tests will skip if not authenticated. Home page tests work without authentication.

## Writing New Tests

When adding new E2E tests:

1. **Follow naming convention**: `feature-*.test.ts` or `*-flow.test.ts`
2. **Use descriptive test names**: Clearly describe what is being tested
3. **Add test documentation**: Include comments explaining test purpose
4. **Handle authentication**: Use the `shouldSkipAuthTests()` helper to respect `SKIP_AUTH_TESTS` flag
5. **Use unique identifiers**: Generate unique names/IDs to avoid conflicts
6. **Clean up test data**: Consider cleanup in tests or use test isolation
7. **Wait for network idle**: Use `waitForLoadState('networkidle')` when needed
8. **Add screenshots**: Take screenshots on failure for debugging
9. **Add appropriate skip logic**: For unimplemented features, use smart skip logic

Example:

```typescript
import { test, expect } from '@playwright/test'
import { shouldSkipAuthTests } from './helpers/auth'

test.describe('Feature Tests', () => {
  test.beforeEach(async () => {
    if (shouldSkipAuthTests()) {
      test.skip(true, 'Auth tests are disabled (SKIP_AUTH_TESTS=true)')
      return
    }
  })

  test('Admin can create new feature', async ({ page }) => {
    const uniqueName = `Test Feature ${Date.now()}`
    
    await page.goto('/dashboard/features/create')
    await page.fill('input[id="name"]', uniqueName)
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/dashboard/features')
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible()
  })
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
npx playwright test --debug feature-user-invitation -g "Admin can send"
```

### Run with Headed Browser
```bash
npx playwright test --headed
```

## Troubleshooting

### Tests are timing out

- Increase timeout in test or globally in `playwright.config.ts`
- Check if the development server is running
- Ensure Supabase is configured and accessible

### Authentication failures

- Verify test credentials are correct
- Check if test user exists in the database
- Ensure the user's profile exists (created automatically on signup)
- Tests will skip gracefully if credentials are not provided

### File upload tests failing

- Verify test fixtures exist in `e2e/fixtures/`
- Check file paths are correct (use `path.join(__dirname, 'fixtures', 'file.png')`)
- Ensure file upload inputs have correct `id` attributes

### Tests pass locally but fail in CI

- Check CI environment variables are set
- Verify CI has correct Supabase configuration
- Review Playwright artifacts uploaded by CI for debugging

## Test Configuration

Test configuration is in `playwright.config.ts` at the project root.

**Key Settings:**
- Test directory: `./e2e`
- Base URL: `http://localhost:3000` (configurable via `PLAYWRIGHT_TEST_BASE_URL`)
- Browsers: Chromium, Firefox, WebKit
- Retry strategy: 2 retries on CI, 0 locally
- Screenshots: On failure only
- Video: On failure only
- Global setup for authentication

See `playwright.config.ts` in the root directory for configuration options including:
- Base URL
- Browser configurations (Chromium, Firefox, WebKit)
- Timeout settings
- Screenshot and video recording options
- Mobile device emulation
- Global setup for authentication

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on others
2. **Wait for State**: Tests properly wait for `networkidle` before assertions
3. **Flexible Assertions**: Tests handle both success states and empty states
4. **Error Handling**: Try-catch blocks handle timing variations
5. **Realistic Data**: Tests use timestamp-based unique data to avoid conflicts
6. **Respect SKIP_AUTH_TESTS**: Always check `shouldSkipAuthTests()` in tests that require authentication
7. **Smart Skip Logic**: Use skip logic for unimplemented features with clear messaging

## Contributing

When adding new tests:
1. Follow the existing test structure and naming conventions
2. Add proper TypeScript types for test data
3. Include descriptive test names and comments
4. Handle both success and edge cases
5. Update this README with new test coverage
6. Ensure tests respect the `SKIP_AUTH_TESTS` flag
7. Add appropriate skip logic for unimplemented features
8. Document test prerequisites and expected behavior
9. Group related tests using `test.describe()`
10. Clean up test data in `afterEach` or `afterAll` hooks

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:
- Tests fail fast on CI with `forbidOnly` flag
- Retry strategy for flaky tests (2 retries on CI)
- Tests run serially on CI to avoid race conditions
- Configured for optimal CI performance

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Writing Tests](https://playwright.dev/docs/writing-tests)
- [Test Selectors](https://playwright.dev/docs/selectors)
- [Project Testing Guide](../docs/TESTING.md)

## Support

For issues with E2E tests:
1. Check that environment variables are configured
2. Verify the dev server is running (`npm run dev`)
3. Review test prerequisites in this README
4. Check Playwright documentation: https://playwright.dev/
