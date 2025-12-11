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
npx playwright test e2e/feature-navigation-layout.test.ts

# Run tests in headed mode (see the browser)
npx playwright test --headed

# Run tests in a specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

### Test Files

- `example.spec.ts` - Example test demonstrating Playwright usage
- `feature-client-crud.test.ts` - Complete client CRUD flow tests
- `feature-navigation-layout.test.ts` - Navigation and responsive layout tests

### Test Fixtures

The `fixtures/` directory contains test assets used in E2E tests:
- `logo.png` - Test logo image for client logo upload tests
- `background.png` - Test background image for client background upload tests

## Authentication Setup

The E2E tests require authentication to access protected routes. You have two options:

### Option 1: Environment Variables (Recommended)

Set up test user credentials in environment variables:

```bash
export PLAYWRIGHT_TEST_EMAIL="admin@test.com"
export PLAYWRIGHT_TEST_PASSWORD="testpassword123"
```

Or create a `.env.test` file (not committed to version control):

```env
PLAYWRIGHT_TEST_EMAIL=admin@test.com
PLAYWRIGHT_TEST_PASSWORD=testpassword123
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

### Option 2: Playwright Authentication State

For more advanced setups, you can use Playwright's [authentication state](https://playwright.dev/docs/auth) to persist login sessions.

## Setting Up Test Users

### Local Supabase

If using local Supabase, create a test admin user:

```sql
-- Insert test admin user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  gen_random_uuid(),
  'admin@test.com',
  crypt('testpassword123', gen_salt('bf')),
  NOW()
);

-- Create profile for test user
INSERT INTO profiles (id, email, role, first_name, last_name)
SELECT id, email, 'admin', 'Test', 'Admin'
FROM auth.users
WHERE email = 'admin@test.com';
```

### Staging/Production

For staging or production environments:
1. Create a dedicated test user through the application
2. Assign admin role
3. Use the credentials in your test environment

**Important**: Never use production credentials in tests!

## CI/CD

E2E tests run automatically in GitHub Actions on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

The CI environment uses secrets for authentication:
- `PLAYWRIGHT_TEST_EMAIL`
- `PLAYWRIGHT_TEST_PASSWORD`
- `PLAYWRIGHT_TEST_BASE_URL`

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
4. **Handle authentication**: Use the `loginAsAdmin()` helper or check authentication state
5. **Use unique identifiers**: Generate unique names/IDs to avoid conflicts
6. **Clean up test data**: Consider cleanup in tests or use test isolation
7. **Wait for network idle**: Use `waitForLoadState('networkidle')` when needed
8. **Add screenshots**: Take screenshots on failure for debugging

Example:

```typescript
test('Admin can create new feature', async ({ page }) => {
  const uniqueName = `Test Feature ${Date.now()}`
  
  await page.goto('/dashboard/features/create')
  await page.fill('input[id="name"]', uniqueName)
  await page.click('button[type="submit"]')
  
  await page.waitForURL('**/dashboard/features')
  await expect(page.locator(`text=${uniqueName}`)).toBeVisible()
})
```

## Troubleshooting

### Tests are timing out

- Increase timeout in test or globally in `playwright.config.ts`
- Check if the development server is running
- Ensure Supabase is configured and accessible

### Authentication failures

- Verify test credentials are correct
- Check if test user exists in the database
- Ensure user has admin role
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

See `playwright.config.ts` in the root directory for configuration options including:
- Base URL
- Browser configurations (Chromium, Firefox, WebKit)
- Timeout settings
- Screenshot and video recording options
- Mobile device emulation

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Writing Tests](https://playwright.dev/docs/writing-tests)
- [Test Selectors](https://playwright.dev/docs/selectors)
- [Project Testing Guide](../docs/TESTING.md)
