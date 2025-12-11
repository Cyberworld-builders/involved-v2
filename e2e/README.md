# E2E Tests for Involved v2

This directory contains end-to-end tests for the Involved v2 application using Playwright.

## Test Files

### `example.spec.ts`
Basic example tests demonstrating Playwright usage.

### `feature-user-invitation.test.ts`
Comprehensive E2E tests for the user invitation and account claim flow.

**Test Coverage:**
- Admin/Manager can send user invite
- Invite email is sent with token link  
- Token expires after 7 days
- User can access account claim page with valid token
- User can claim account and set password
- User is redirected to dashboard after claim
- User can sign in after account claim
- User can update profile after account claim
- User can update password after account claim
- User can request password reset after account claim
- Expired tokens are rejected
- Error handling for invalid tokens
- Integration tests for complete flows

**Related Issues:** #45-52

## Running Tests

### Prerequisites

1. **Environment Setup:**
   - Supabase must be configured (`.env.local` or `.env.staging`)
   - Required environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Feature Implementation:**
   - The following must be implemented for tests to pass:
     - `/auth/claim` page for account claiming
     - `/api/users/invite` endpoint for sending invites
     - User invitation database tables and logic
     - Email service configuration

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npm run test:e2e feature-user-invitation.test.ts
```

### Run Tests in UI Mode
```bash
npm run test:e2e:ui
```

### Run Tests in Debug Mode
```bash
npm run test:e2e:debug
```

## Test Behavior

### Smart Skip Logic
The invitation tests include smart skip logic that:
- Automatically detects if the `/auth/claim` page exists
- Skips tests gracefully when features are not yet implemented
- Provides clear messaging about why tests were skipped

### Expected Test Results (Current State)
Most tests in `feature-user-invitation.test.ts` will currently **skip** because:
- The `/auth/claim` page does not exist yet
- The invitation API endpoints are not implemented
- Email service is not configured

These tests serve as **acceptance criteria** for the user invitation feature implementation.

## Test Implementation Status

| Test Suite | Tests | Status | Notes |
|------------|-------|--------|-------|
| Admin/Manager Invitation | 3 | ⏸️ Skipped | Awaiting feature implementation |
| Account Claim Flow | 4 | ⏸️ Skipped | Awaiting `/auth/claim` page |
| Post-Claim Functionality | 4 | ⏸️ Skipped | Awaiting feature implementation |
| Error Handling | 3 | ⏸️ Skipped | Awaiting feature implementation |
| Integration Tests | 3 | ⏸️ Skipped | Awaiting full implementation |

## Future Enhancements

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

## Configuration

Test configuration is in `playwright.config.ts` at the project root.

**Key Settings:**
- Test directory: `./e2e`
- Base URL: `http://localhost:3000` (configurable via `PLAYWRIGHT_TEST_BASE_URL`)
- Browsers: Chromium, Firefox, WebKit
- Retry strategy: 2 retries on CI, 0 locally
- Screenshots: On failure only
- Video: On failure only

## Debugging Failed Tests

### View Test Report
After running tests, open the HTML report:
```bash
npx playwright show-report
```

### Run with Headed Browser
```bash
npx playwright test --headed
```

### Run with Debugging
```bash
npx playwright test --debug
```

### View Screenshots/Videos
Failed test artifacts are saved to:
- Screenshots: `test-results/`
- Videos: `test-results/`
- HTML Report: `playwright-report/`

## Contributing

When adding new E2E tests:

1. Follow the existing test structure and patterns
2. Use descriptive test names that explain what is being tested
3. Add appropriate skip logic for unimplemented features
4. Document test prerequisites and expected behavior
5. Group related tests using `test.describe()`
6. Clean up test data in `afterEach` or `afterAll` hooks

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:
- Tests fail fast on CI with `forbidOnly` flag
- Retry strategy for flaky tests (2 retries on CI)
- Tests run serially on CI to avoid race conditions
- Configured for optimal CI performance

## Support

For issues with E2E tests:
1. Check that environment variables are configured
2. Verify the dev server is running (`npm run dev`)
3. Review test prerequisites in this README
4. Check Playwright documentation: https://playwright.dev/
