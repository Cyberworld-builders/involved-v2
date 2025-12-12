# Troubleshooting Failing Tests Guide

This guide documents the systematic approach to troubleshooting failing tests in the Involved Talent v2 repository, based on real examples and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Types of Test Failures](#types-of-test-failures)
3. [Systematic Troubleshooting Process](#systematic-troubleshooting-process)
4. [Common Issues and Solutions](#common-issues-and-solutions)
5. [Case Study: E2E Test Failures](#case-study-e2e-test-failures)
6. [Tools and Commands](#tools-and-commands)
7. [Best Practices](#best-practices)

## Overview

Test failures can occur at different levels:
- **Unit tests** (Vitest) - Individual functions/components
- **Integration tests** (Vitest) - Multiple components working together
- **E2E tests** (Playwright) - Full user flows in a browser

Each type requires different troubleshooting approaches.

## Types of Test Failures

### 1. Compilation Errors
- **Symptom**: Tests don't run, TypeScript errors appear
- **Quick Check**: `npm run lint` and look at the error messages
- **Common Causes**: Type mismatches, missing imports, syntax errors

### 2. Test Setup Failures
- **Symptom**: Tests fail during beforeAll/beforeEach hooks
- **Quick Check**: Look at the first failing test's error message
- **Common Causes**: Database connection issues, missing environment variables, fixture problems

### 3. Assertion Failures
- **Symptom**: Tests run but expectations don't match
- **Quick Check**: Read the test output to see expected vs actual values
- **Common Causes**: Logic bugs, incorrect test expectations, data issues

### 4. Timeout Failures
- **Symptom**: Tests exceed time limits waiting for elements/actions
- **Quick Check**: Look for "timeout" or "exceeded" in error messages
- **Common Causes**: Elements not loading, incorrect selectors, slow network, missing data

### 5. Flaky Tests
- **Symptom**: Tests pass sometimes and fail other times
- **Quick Check**: Run the test multiple times
- **Common Causes**: Race conditions, hard-coded waits, shared state, timing issues

## Systematic Troubleshooting Process

### Step 1: Identify the Failure Scope

```bash
# Check which tests are failing
npm test 2>&1 | grep -E "(FAIL|✖)"

# For E2E tests
npm run test:e2e 2>&1 | grep -E "(failing|✖)"
```

**Questions to ask:**
- Is it a single test or multiple tests?
- Is it in one file or across multiple files?
- Is it consistent or intermittent?

### Step 2: Read the Error Message Carefully

Look for:
- **Stack traces**: Where exactly did it fail?
- **Error types**: Network error? Assertion error? Timeout?
- **Line numbers**: Which line of the test failed?
- **Expected vs Actual**: What did the test expect vs what it got?

### Step 3: Reproduce Locally

```bash
# Run the specific failing test
npm test -- path/to/test.test.ts

# Run in watch mode for faster iteration
npm run test:watch -- path/to/test.test.ts

# For E2E tests with UI (helpful for visual debugging)
npm run test:e2e:ui
```

### Step 4: Check Recent Changes

```bash
# See what changed in the last few commits
git log --oneline -10

# Check what files were modified
git diff HEAD~5 --name-only

# Look at specific file changes
git diff HEAD~5 -- path/to/file
```

**Questions to ask:**
- Were there recent changes to the tested code?
- Were there changes to test setup or configuration?
- Were there database schema changes?

### Step 5: Verify Test Environment

```bash
# Check environment variables
cat .env.test.local

# Verify database connection (for integration/e2e tests)
# Check that test database is accessible and seeded

# Check Node/npm versions
node --version
npm --version
```

### Step 6: Add Debug Output

**For unit/integration tests:**
```typescript
it('should do something', () => {
  const result = someFunction()
  console.log('Debug result:', result) // Add temporary debug
  expect(result).toBe(expected)
})
```

**For E2E tests:**
```typescript
test('should load page', async ({ page }) => {
  await page.goto('/some-page')
  
  // Take screenshot for debugging
  await page.screenshot({ path: '/tmp/debug.png' })
  
  // Log page content
  const content = await page.content()
  console.log('Page HTML:', content)
  
  // Log network requests
  page.on('request', req => console.log('Request:', req.url()))
})
```

### Step 7: Isolate the Problem

```bash
# Run only the failing test
npm test -- -t "specific test name"

# Comment out parts of the test to isolate the issue
# Binary search: comment out half, see if it still fails
```

### Step 8: Check Dependencies

**For tests that interact with external systems:**
- Is the API/database running?
- Are the credentials correct?
- Is the network accessible?
- Are there rate limits being hit?

**For tests that use mocks:**
- Are mocks configured correctly?
- Are they returning expected data?
- Do they match the actual API responses?

## Common Issues and Solutions

### Issue 1: "Element not found" or "Selector timed out"

**Symptoms:**
```
TimeoutError: locator.click: Timeout 5000ms exceeded.
```

**Causes:**
- Element doesn't exist on the page
- Element exists but isn't visible
- Wrong selector used
- Page hasn't finished loading

**Solutions:**
1. **Verify the element exists:**
   ```typescript
   // Check if element is actually on the page
   const element = page.locator('button[type="submit"]')
   console.log('Element count:', await element.count())
   ```

2. **Wait for the page to be ready:**
   ```typescript
   await page.waitForLoadState('networkidle')
   await page.waitForSelector('button[type="submit"]', { timeout: 10000 })
   ```

3. **Use more flexible selectors:**
   ```typescript
   // Instead of exact text match:
   page.locator('button:has-text("Submit")')
   
   // Use test IDs:
   page.locator('[data-testid="submit-button"]')
   ```

### Issue 2: "Mock data doesn't match real data"

**Symptoms:**
```
Expected 200 but got 404
```

**Causes:**
- Test uses mock/fixture data that doesn't exist in test database
- API expects different data format than what test provides
- Database state isn't set up correctly

**Solutions:**
1. **Create real test data instead of mocking:**
   ```typescript
   // Instead of using a mock token:
   const mockToken = 'abc123...'
   
   // Create real test data:
   const invite = await createTestInvite(email, name)
   const token = invite.token
   ```

2. **Verify database state:**
   ```typescript
   // Check that test data exists
   const { data } = await supabase
     .from('table')
     .select('*')
     .eq('id', testId)
   console.log('Database state:', data)
   ```

3. **Clean up and recreate:**
   ```typescript
   beforeEach(async () => {
     // Clean up old test data
     await deleteTestData()
     // Create fresh test data
     await createTestData()
   })
   ```

### Issue 3: "Tests pass locally but fail in CI"

**Causes:**
- Different environment variables
- Different database state
- Timing issues (CI might be slower)
- Missing dependencies or different versions

**Solutions:**
1. **Check environment differences:**
   ```bash
   # Compare local vs CI environment variables
   # Make sure all required vars are set in CI
   ```

2. **Increase timeouts for CI:**
   ```typescript
   // In playwright.config.ts
   timeout: process.env.CI ? 30000 : 10000
   ```

3. **Check CI logs carefully:**
   - Look for specific error messages
   - Check if database migrations ran
   - Verify API is accessible

### Issue 4: "Flaky tests that sometimes pass"

**Causes:**
- Race conditions
- Shared state between tests
- Hard-coded `setTimeout` waits
- Non-deterministic data (random IDs, timestamps)

**Solutions:**
1. **Use proper waits instead of timeouts:**
   ```typescript
   // Bad:
   await page.waitForTimeout(2000)
   
   // Good:
   await page.waitForURL('/dashboard')
   await page.waitForSelector('[data-loaded="true"]')
   ```

2. **Isolate test state:**
   ```typescript
   // Use unique identifiers per test
   const testEmail = `test.${Date.now()}@example.com`
   
   // Clean up after each test
   afterEach(async () => {
     await cleanupTestData()
   })
   ```

3. **Avoid test interdependencies:**
   - Each test should be independent
   - Don't rely on test execution order
   - Always set up needed state in beforeEach

### Issue 5: "Network errors in tests"

**Symptoms:**
```
TypeError: fetch failed
Error: getaddrinfo ENOTFOUND
```

**Causes:**
- API endpoint not available
- CORS issues
- Network timeouts
- Missing environment URLs

**Solutions:**
1. **Check API availability:**
   ```typescript
   // Add health check before tests
   beforeAll(async () => {
     const response = await fetch(API_URL + '/health')
     if (!response.ok) throw new Error('API not available')
   })
   ```

2. **Mock external APIs in tests:**
   ```typescript
   // Mock external services
   vi.mock('@/lib/external-api', () => ({
     callExternalAPI: vi.fn().mockResolvedValue({ data: 'test' })
   }))
   ```

## Case Study: E2E Test Failures

### Problem
E2E tests for the account claim flow were failing with timeouts. The claim page was showing an error state instead of the form.

### Investigation Process

**Step 1: Read the error messages**
```
TimeoutError: locator.click: Timeout 5000ms exceeded.
=========================== logs ===========================
waiting for locator('h1, h2').filter({ hasText: /claim.*account/i })
```

The test was looking for a heading with "claim account" text but timing out.

**Step 2: Check what the page was actually showing**
Looking at the claim page code, it showed either:
- Loading state (spinner)
- Error state (when token is invalid)
- Form state (when token is valid)

The test was timing out waiting for the form state, which meant the page was stuck in error state.

**Step 3: Trace the data flow**
```
Test uses mock token → API validates token → API checks database → Token not found → API returns error → Page shows error
```

**Step 4: Identify the root cause**
The tests were using `const MOCK_VALID_TOKEN = 'a'.repeat(64)` but the API validates tokens against the `user_invites` table. Since the mock token didn't exist in the database, the API returned an error.

### Solution

Created helper functions to set up real test data:

```typescript
// e2e/helpers/database.ts
export async function createTestInvite(
  email: string,
  name: string,
  status: 'pending' | 'accepted' | 'expired' | 'revoked' = 'pending',
  expiresInDays: number = 7
) {
  const client = getAdminClient()
  
  // Generate real token
  const buffer = new Uint8Array(32)
  crypto.getRandomValues(buffer)
  const token = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  // Create profile and invitation in database
  const profile = await client.from('profiles').insert({ email, name }).select().single()
  const invite = await client.from('user_invites').insert({
    token,
    profile_id: profile.id,
    expires_at: calculateExpiration(expiresInDays),
    status
  }).select().single()
  
  return { token, profileId: profile.id, inviteId: invite.id }
}

export async function deleteTestInvite(profileId: string) {
  const client = getAdminClient()
  await client.from('user_invites').delete().eq('profile_id', profileId)
  await client.from('profiles').delete().eq('id', profileId)
}
```

Updated tests to use real data:

```typescript
test('User can access account claim page with valid token', async ({ page }) => {
  // Create real test invitation
  const invite = await createTestInvite(
    `test.claim.${Date.now()}@involved.test`,
    'Test User',
    'pending'
  )
  
  try {
    // Now test with real token
    await page.goto(`/auth/claim?token=${invite.token}`)
    await page.waitForLoadState('networkidle')
    
    // Should see the form now
    await expect(
      page.locator('h1, h2').filter({ hasText: /claim.*account/i })
    ).toBeVisible({ timeout: 10000 })
  } finally {
    // Clean up
    await deleteTestInvite(invite.profileId)
  }
})
```

### Results
- All 14 claim page unit tests: ✅ Passing
- All 13 claim API unit tests: ✅ Passing
- All 13 integration tests: ✅ Passing
- E2E tests now create real data and test realistic scenarios

### Lessons Learned

1. **Mock data must match reality**: If your code validates against a database, your tests need real database records
2. **Test with real dependencies when possible**: Mocking is useful but can hide integration issues
3. **Read error messages carefully**: The timeout was a symptom, not the root cause
4. **Trace the full data flow**: Understanding the path from test to code to database revealed the issue
5. **Create reusable test utilities**: The helper functions can be used for all future invitation tests

## Tools and Commands

### Running Tests

```bash
# Unit/Integration tests
npm test                          # Run all tests once
npm run test:watch               # Watch mode for development
npm test -- path/to/test.test.ts # Run specific test file
npm test -- -t "test name"       # Run tests matching name

# E2E tests
npm run test:e2e                 # Run all E2E tests
npm run test:e2e:ui              # Run with Playwright UI
npm run test:e2e:debug           # Debug mode
npm run test:e2e -- --grep "pattern"  # Run tests matching pattern
```

### Debugging

```bash
# Linting
npm run lint                     # Check all files
npm run lint -- path/to/file.ts # Check specific file

# Type checking (if available)
npx tsc --noEmit                 # Check types without building

# Git debugging
git log --oneline -10            # Recent commits
git diff HEAD~5                  # Changes in last 5 commits
git blame path/to/file.ts        # See who changed what
git show <commit>                # See specific commit details
```

### Database debugging (for E2E/Integration tests)

```typescript
// In your test file
import { getAdminClient } from './helpers/database'

test('debug database state', async () => {
  const client = getAdminClient()
  
  // Check what's in the database
  const { data } = await client.from('user_invites').select('*')
  console.log('Invites in DB:', data)
  
  // Check specific record
  const { data: invite } = await client
    .from('user_invites')
    .select('*')
    .eq('token', testToken)
    .single()
  console.log('Test invite:', invite)
})
```

## Best Practices

### 1. Write Tests That Don't Depend on External State

**Bad:**
```typescript
test('should load user 123', async () => {
  // Assumes user 123 exists in database
  const user = await getUser(123)
  expect(user.name).toBe('John')
})
```

**Good:**
```typescript
test('should load user', async () => {
  // Create test user
  const user = await createTestUser({ name: 'John' })
  
  try {
    const loaded = await getUser(user.id)
    expect(loaded.name).toBe('John')
  } finally {
    await deleteTestUser(user.id)
  }
})
```

### 2. Use Proper Waits, Not Timeouts

**Bad:**
```typescript
await page.click('button')
await page.waitForTimeout(2000) // Hope it's loaded by then
```

**Good:**
```typescript
await page.click('button')
await page.waitForURL('/next-page')
await page.waitForSelector('[data-loaded="true"]')
```

### 3. Make Tests Independent

**Bad:**
```typescript
let userId: string

test('create user', async () => {
  userId = await createUser()
})

test('update user', async () => {
  // Depends on previous test running first
  await updateUser(userId)
})
```

**Good:**
```typescript
test('create user', async () => {
  const userId = await createUser()
  // Test and cleanup
  await deleteUser(userId)
})

test('update user', async () => {
  const userId = await createUser()
  try {
    await updateUser(userId)
    // Assertions
  } finally {
    await deleteUser(userId)
  }
})
```

### 4. Clean Up Test Data

```typescript
let testData: any[] = []

beforeEach(() => {
  testData = []
})

afterEach(async () => {
  // Clean up all test data created during the test
  for (const data of testData) {
    await deleteTestData(data.id)
  }
})

test('should work', async () => {
  const data = await createTestData()
  testData.push(data) // Track for cleanup
  // Test...
})
```

### 5. Use Descriptive Test Names

**Bad:**
```typescript
test('test 1', () => { /* ... */ })
test('works', () => { /* ... */ })
```

**Good:**
```typescript
test('should validate email format when user signs up', () => { /* ... */ })
test('should redirect to dashboard after successful login', () => { /* ... */ })
```

### 6. Test Error Cases Too

```typescript
describe('User Login', () => {
  test('should login with valid credentials', async () => {
    // Happy path
  })
  
  test('should show error for invalid password', async () => {
    // Error case
  })
  
  test('should show error for non-existent email', async () => {
    // Error case
  })
  
  test('should handle network errors gracefully', async () => {
    // Network failure case
  })
})
```

### 7. Document Complex Test Setup

```typescript
test('should process multi-step workflow', async () => {
  // Setup: Create user and assign to organization
  const org = await createTestOrganization()
  const user = await createTestUser({ orgId: org.id })
  
  // Setup: Create initial workflow state
  const workflow = await initializeWorkflow(user.id)
  
  // Test: Process workflow step
  const result = await processWorkflowStep(workflow.id, 'approve')
  
  // Assert
  expect(result.status).toBe('approved')
  
  // Cleanup
  await deleteWorkflow(workflow.id)
  await deleteUser(user.id)
  await deleteOrganization(org.id)
})
```

## Quick Reference Checklist

When a test fails, go through this checklist:

- [ ] Read the error message completely
- [ ] Identify which test(s) are failing
- [ ] Check if it reproduces locally
- [ ] Review recent code changes
- [ ] Verify test environment (DB, API, env vars)
- [ ] Add debug logging/screenshots
- [ ] Check if test data exists in database
- [ ] Verify API responses match expectations
- [ ] Look for timing/race conditions
- [ ] Check if mocks are configured correctly
- [ ] Ensure tests are independent
- [ ] Run in isolation to rule out interference
- [ ] Check CI logs for environment differences
- [ ] Fix the root cause, not just the symptom
- [ ] Run tests multiple times to check for flakiness
- [ ] Document the issue and solution

## Additional Resources

- [Testing Guide](./TESTING.md) - General testing guidelines
- [Playwright Documentation](https://playwright.dev) - E2E testing framework
- [Vitest Documentation](https://vitest.dev) - Unit test framework
- [Testing Library](https://testing-library.com) - Component testing utilities
- [Supabase Testing](./TESTING_SUPABASE.md) - Database testing guide

## Contributing

If you encounter a test failure and resolve it in a novel way, please update this guide with your findings to help future developers.
