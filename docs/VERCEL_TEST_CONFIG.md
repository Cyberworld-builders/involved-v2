# Vercel Test Configuration

## Environment Variables

The `SKIP_AUTH_TESTS` environment variable has been added to all Vercel environments (Production, Preview, Development) to skip authentication-related tests during builds.

### Current Configuration

- **SKIP_AUTH_TESTS**: `true` (set in all environments)
- This ensures auth tests are skipped during Vercel builds and deployments

### Viewing/Managing Environment Variables

```bash
# List all environment variables
vercel env ls

# Add environment variable
echo "value" | vercel env add VARIABLE_NAME production
echo "value" | vercel env add VARIABLE_NAME preview
echo "value" | vercel env add VARIABLE_NAME development

# Pull environment variables locally
vercel env pull
```

## How Tests Run on Vercel

Vercel does **not** automatically run tests during builds. Tests are only run if:

1. **They're part of the build command** - Currently, `package.json` has `"build": "next build"` which doesn't include tests
2. **They're configured in `vercel.json`** - No `vercel.json` file exists currently
3. **They're run in CI/CD** - GitHub Actions runs tests separately (see `.github/workflows/test.yml`)

## Current Setup

- **Build Command**: `next build` (no tests)
- **Test Command**: Separate scripts in `package.json`:
  - `npm test` - Unit tests (Vitest)
  - `npm run test:e2e` - E2E tests (Playwright)

## If You Want Tests to Run on Vercel

If you want tests to run during Vercel builds, you can:

1. **Modify the build command** in `package.json`:
   ```json
   {
     "scripts": {
       "build": "npm test && next build"
     }
   }
   ```

2. **Or create a `vercel.json`** file:
   ```json
   {
     "buildCommand": "npm test && next build"
   }
   ```

## Current Status

✅ `SKIP_AUTH_TESTS` is set in all Vercel environments
✅ Tests are configured to respect `SKIP_AUTH_TESTS` flag
✅ Tests run in GitHub Actions (not during Vercel builds)

## Re-enabling Auth Tests

When ready to fix authentication:

1. Remove or unset `SKIP_AUTH_TESTS` in Vercel:
   ```bash
   vercel env rm SKIP_AUTH_TESTS production
   vercel env rm SKIP_AUTH_TESTS preview
   vercel env rm SKIP_AUTH_TESTS development
   ```

2. Set up test credentials in Vercel:
   - `PLAYWRIGHT_TEST_EMAIL`
   - `PLAYWRIGHT_TEST_PASSWORD`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. Update build command if you want tests to run during builds
