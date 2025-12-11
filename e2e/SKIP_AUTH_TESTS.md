# Skipping Authentication Tests

## Quick Skip

To skip all authentication-related tests, set the environment variable:

```bash
export SKIP_AUTH_TESTS=true
npm run test:e2e
```

Or in your `.env.local`:
```
SKIP_AUTH_TESTS=true
```

## What Gets Skipped

When `SKIP_AUTH_TESTS=true`:
- Global setup will skip authentication
- All tests that require authentication will be automatically skipped
- Tests will run faster without waiting for auth setup

## Re-enabling Auth Tests

When you're ready to fix authentication:

1. Remove or unset `SKIP_AUTH_TESTS`
2. Set up test credentials:
   ```bash
   export PLAYWRIGHT_TEST_EMAIL="e2e-test-admin@involved-talent.test"
   export PLAYWRIGHT_TEST_PASSWORD="TestPassword123!"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```
3. Run tests: `npm run test:e2e`

## TODO

- [ ] Fix authentication setup in global-setup.ts
- [ ] Ensure test user creation works with SUPABASE_SERVICE_ROLE_KEY
- [ ] Verify auth state persistence works correctly
- [ ] Re-enable all skipped auth tests
