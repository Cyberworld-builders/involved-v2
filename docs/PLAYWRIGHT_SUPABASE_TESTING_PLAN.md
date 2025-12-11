# Playwright Testing Strategy for Next.js + Supabase Applications

**Based on Community Best Practices and Real-World Patterns**

---

## Executive Summary

This document outlines a practical, community-validated approach to E2E testing for Next.js applications using Supabase authentication. The strategy addresses the unique challenges of:
- Next.js App Router with Server-Side Rendering (SSR)
- Supabase cookie-based authentication
- Test user management in CI/CD environments
- Maintaining test reliability and speed

**Recommended Approach**: Playwright Global Setup with Authentication State Persistence + Supabase Admin API for Test User Management

---

## The Problem: Why Standard Approaches Fail

### Challenge 1: Next.js App Router + SSR Cookie Handling

**The Issue**: Next.js App Router uses Server Components that read cookies server-side. Supabase stores auth tokens in cookies (`sb-<project-ref>-auth-token`). These cookies must be:
- Set correctly during authentication
- Preserved across SSR requests
- Available to both client and server components

**Why This Matters**: If cookies aren't handled correctly, tests will:
- Fail authentication checks in middleware
- Redirect to login even after "successful" login
- Experience race conditions between client and server state

**Real-World Evidence**: 
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr) explicitly states cookies must be managed via `@supabase/ssr` package
- [Next.js Authentication Docs](https://nextjs.org/docs/app/building-your-application/authentication) emphasize cookie security and SSR compatibility
- Common issue: Tests pass locally but fail in CI due to cookie domain/path mismatches

### Challenge 2: Test User Management

**The Issue**: E2E tests need consistent, reliable test users. Manual creation is:
- Error-prone
- Doesn't scale
- Breaks in CI/CD
- Requires database access

**Why This Matters**: Without automated user management:
- Tests skip when users don't exist
- Tests fail when passwords change
- CI/CD requires manual database setup
- Test isolation is impossible

**Real-World Evidence**:
- [Supabase GitHub Discussion #6177](https://github.com/orgs/supabase/discussions/6177) - Community consensus: Use service role key for test user creation
- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview) - Official recommendation for programmatic user creation
- Industry standard: All major testing frameworks recommend automated test data setup

### Challenge 3: Authentication State Persistence

**The Issue**: Logging in before every test is:
- Slow (adds 2-5 seconds per test)
- Unreliable (network timing issues)
- Wasteful (redundant operations)

**Why This Matters**: 
- 100 tests × 3 seconds = 5 minutes wasted on login
- Flaky tests due to network timing
- Poor developer experience

**Real-World Evidence**:
- [Playwright Official Auth Docs](https://playwright.dev/docs/auth) - Explicitly recommends `storageState` for authentication persistence
- Used by major companies (Vercel, GitHub, Microsoft) in their E2E test suites
- Industry standard pattern for authenticated E2E testing

---

## Recommended Solution: Three-Layer Approach

### Layer 1: Global Setup with Authentication State Persistence

**What**: Run authentication once before all tests, save the session state, reuse it.

**Why**: 
- **Playwright Official Recommendation**: [Playwright Auth Documentation](https://playwright.dev/docs/auth) explicitly recommends this pattern
- **Proven Pattern**: Used by Vercel, GitHub, and other major Next.js projects
- **Performance**: 10-100x faster than per-test authentication
- **Reliability**: Eliminates login-related flakiness

**Implementation**:

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  // Authenticate via UI (real user flow)
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', testEmail)
  await page.fill('input[type="password"]', testPassword)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**')
  
  // Save auth state (cookies + localStorage)
  await context.storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()
}
```

**Configuration**:
```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  use: {
    storageState: 'e2e/.auth/user.json', // Load auth state in all tests
  },
})
```

**Evidence**:
- [Playwright Auth Guide](https://playwright.dev/docs/auth) - Official documentation
- [Next.js Testing Guide](https://nextjs.org/docs/13/pages/building-your-application/optimizing/testing) - Recommends testing against production builds with proper auth
- Real-world: Used in [Vercel's Next.js examples](https://github.com/vercel/next.js/tree/canary/examples)

---

### Layer 2: Supabase Admin API for Test User Management

**What**: Use Supabase service role key to programmatically create/manage test users.

**Why**:
- **Supabase Official Guidance**: [Supabase Testing Documentation](https://supabase.com/docs/guides/local-development/testing/overview) recommends this approach
- **Community Consensus**: [GitHub Discussion #6177](https://github.com/orgs/supabase/discussions/6177) shows widespread adoption
- **CI/CD Friendly**: No manual database setup required
- **Test Isolation**: Can create unique users per test run

**Implementation**:

```typescript
// e2e/global-setup.ts (enhanced)
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin key
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

// Create test user if it doesn't exist
const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
const user = existingUser?.users?.find(u => u.email === testEmail)

if (!user) {
  await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true, // Skip email verification
  })
  
  // Create profile
  await supabaseAdmin.from('profiles').upsert({
    id: user.id,
    email: testEmail,
    role: 'admin',
  })
}
```

**Security Note**: Service role key bypasses RLS and has full database access. This is **intentional and safe** for:
- Test environments only
- Never exposed to client-side code
- Stored as CI/CD secrets

**Evidence**:
- [Supabase Service Role Key Documentation](https://supabase.com/docs/reference/javascript/auth-admin-api) - Official API
- [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices) - Recommends service role for server-side operations
- Real-world: Used by [Supawright](https://github.com/isaacharrisholt/supawright) and other Supabase testing tools

---

### Layer 3: Cookie-Aware Test Helpers

**What**: Helper functions that understand Supabase's cookie structure and Next.js SSR.

**Why**:
- Supabase uses specific cookie names: `sb-<project-ref>-auth-token`
- Next.js middleware reads these cookies server-side
- Tests must wait for cookies to be set and propagated

**Implementation**:

```typescript
// e2e/helpers/auth.ts
export async function waitForAuthCookies(page: Page) {
  // Wait for Supabase auth cookie to be set
  await page.waitForFunction(() => {
    return document.cookie.includes('sb-') && 
           document.cookie.includes('auth-token')
  }, { timeout: 10000 })
}

export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    return page.url().includes('/dashboard') && !page.url().includes('/auth')
  } catch {
    return false
  }
}
```

**Evidence**:
- [Supabase SSR Troubleshooting](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV) - Documents cookie handling requirements
- [Next.js Cookie API](https://nextjs.org/docs/app/api-reference/functions/cookies) - Official cookie handling documentation

---

## Complete Implementation Plan

### Phase 1: Global Setup (Required)

**Files to Create**:
1. `e2e/global-setup.ts` - Authentication setup
2. Update `playwright.config.ts` - Add globalSetup and storageState

**Environment Variables**:
- `PLAYWRIGHT_TEST_EMAIL` - Test user email
- `PLAYWRIGHT_TEST_PASSWORD` - Test user password
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

**Benefits**:
- ✅ Tests start authenticated
- ✅ No per-test login overhead
- ✅ Works with existing Supabase setup
- ✅ No code changes to application

**Timeline**: 1-2 hours

---

### Phase 2: Automated User Management (Recommended)

**Files to Update**:
1. `e2e/global-setup.ts` - Add user creation logic

**Environment Variables** (Additional):
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)

**Benefits**:
- ✅ Zero manual setup
- ✅ Works in CI/CD out of the box
- ✅ Test isolation (can create unique users)
- ✅ Self-healing (creates users if missing)

**Timeline**: 1 hour

**Security Considerations**:
- Service role key stored as GitHub secret
- Never committed to repository
- Only used in test environment
- Documented in team security guidelines

---

### Phase 3: Test Helpers and Utilities (Optional but Recommended)

**Files to Create**:
1. `e2e/helpers/auth.ts` - Authentication helpers
2. `e2e/helpers/database.ts` - Database cleanup helpers
3. `e2e/fixtures/` - Test data fixtures

**Benefits**:
- ✅ Reusable authentication checks
- ✅ Database cleanup between tests
- ✅ Consistent test data
- ✅ Better test organization

**Timeline**: 2-3 hours

---

## Why This Approach Works

### 1. Addresses Real Supabase + Next.js Challenges

**Cookie Handling**: 
- Global setup authenticates via real UI flow (sets cookies correctly)
- Storage state preserves cookies across tests
- Matches how real users authenticate

**SSR Compatibility**:
- Cookies saved in storage state work with Next.js middleware
- Server components can read auth state
- No client/server state mismatches

**Evidence**: 
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr) - Official pattern for cookie-based auth
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware) - Reads cookies server-side

---

### 2. Follows Playwright Best Practices

**Official Recommendations**:
- ✅ Use `storageState` for authentication ([Playwright Docs](https://playwright.dev/docs/auth))
- ✅ Use `globalSetup` for one-time setup ([Playwright Docs](https://playwright.dev/docs/test-global-setup-teardown))
- ✅ Test against real application (not mocks) ([Playwright Best Practices](https://playwright.dev/docs/best-practices))

**Community Patterns**:
- ✅ Used by [Vercel's Next.js examples](https://github.com/vercel/next.js/tree/canary/examples)
- ✅ Recommended in [Next.js Testing Guide](https://nextjs.org/docs/13/pages/building-your-application/optimizing/testing)
- ✅ Pattern in [Playwright Community Examples](https://github.com/microsoft/playwright/tree/main/examples)

---

### 3. Solves Real CI/CD Problems

**Problem**: Tests fail in CI because:
- Test users don't exist
- Credentials aren't set
- Database isn't seeded

**Solution**: 
- Service role key creates users automatically
- Environment variables from GitHub secrets
- No manual database setup needed

**Evidence**:
- [GitHub Actions with Playwright](https://playwright.dev/docs/ci) - Official CI/CD guide
- [Supabase CI/CD Patterns](https://supabase.com/docs/guides/cli/local-development) - Service role key usage

---

## Alternative Approaches (And Why We Don't Use Them)

### ❌ Mock Authentication

**What**: Mock Supabase client, skip real authentication

**Why Not**:
- Doesn't test real auth flow
- Misses cookie handling issues
- Doesn't catch SSR problems
- False sense of security

**When It's OK**: Unit tests only, not E2E

---

### ❌ Per-Test Login

**What**: Login in `beforeEach` hook

**Why Not**:
- Slow (adds seconds per test)
- Flaky (network timing)
- Redundant (same operation 100+ times)
- Poor developer experience

**When It's OK**: Single test file, not full suite

---

### ❌ Direct API Authentication

**What**: Use Supabase REST API to get tokens, set cookies manually

**Why Not**:
- Doesn't test UI flow
- Cookie structure might be wrong
- Misses Next.js middleware behavior
- More complex than UI login

**When It's OK**: Performance-critical scenarios (rare)

---

## Implementation Checklist

### Immediate (Required for Tests to Work)

- [ ] Create `e2e/global-setup.ts` with authentication flow
- [ ] Update `playwright.config.ts` with `globalSetup` and `storageState`
- [ ] Add `e2e/.auth/` to `.gitignore`
- [ ] Set `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` environment variables
- [ ] Create test user in Supabase (manually or via script)
- [ ] Verify tests start authenticated

### Short Term (Recommended for Reliability)

- [ ] Add Supabase Admin API user creation to global setup
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to GitHub secrets
- [ ] Create test helpers for auth state checks
- [ ] Add database cleanup helpers
- [ ] Document environment variable requirements

### Long Term (Nice to Have)

- [ ] Create test data fixtures
- [ ] Add test isolation (unique users per run)
- [ ] Implement test data cleanup
- [ ] Add performance monitoring
- [ ] Create test user management dashboard

---

## Real-World Examples and References

### Official Documentation

1. **Playwright Authentication**: https://playwright.dev/docs/auth
   - Official guide for authentication state persistence
   - Used by thousands of projects

2. **Supabase Testing**: https://supabase.com/docs/guides/local-development/testing/overview
   - Official Supabase testing recommendations
   - Service role key usage patterns

3. **Next.js Testing**: https://nextjs.org/docs/13/pages/building-your-application/optimizing/testing
   - Next.js testing best practices
   - E2E testing recommendations

### Community Resources

1. **Supabase GitHub Discussion #6177**: https://github.com/orgs/supabase/discussions/6177
   - Community consensus on test user creation
   - Real-world implementation examples

2. **Supawright**: https://github.com/isaacharrisholt/supawright
   - Playwright test harness for Supabase
   - Shows patterns for test data management

3. **TestRig Technologies**: https://www.testrigtechnologies.com/advanced-end-to-end-testing-validating-supabase-data-with-playwright/
   - Real-world case study
   - Database validation patterns

### Industry Patterns

1. **Vercel Next.js Examples**: https://github.com/vercel/next.js/tree/canary/examples
   - Real-world Next.js + Playwright patterns
   - Authentication state management

2. **Microsoft Playwright Examples**: https://github.com/microsoft/playwright/tree/main/examples
   - Official Playwright examples
   - Authentication patterns

---

## Security Considerations

### Service Role Key Usage

**What It Is**: Supabase service role key provides admin access to your database.

**Security Risks**:
- Bypasses Row Level Security (RLS)
- Full database access
- Can create/delete any data

**Why It's Safe for Testing**:
1. **Never in client code**: Only used in server-side test setup
2. **Environment-specific**: Only in test/staging environments
3. **Secret management**: Stored as GitHub secret, never committed
4. **Limited scope**: Only used for test user creation
5. **Industry standard**: Used by major companies for testing

**Best Practices**:
- Store as `SUPABASE_SERVICE_ROLE_KEY` in GitHub secrets
- Document in team security guidelines
- Rotate periodically (like any secret)
- Monitor usage (Supabase dashboard)

**Evidence**: 
- [Supabase Security Best Practices](https://www.leanware.co/insights/supabase-best-practices) - Service role key usage
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) - Test environment isolation

---

## Performance Impact

### Before (Per-Test Login)
- 100 tests × 3 seconds login = **5 minutes wasted**
- Network requests per test
- Cookie setting overhead
- Flaky due to timing

### After (Global Setup)
- 1 login × 3 seconds = **3 seconds total**
- Auth state reused
- No network overhead per test
- **99% faster**

**Real-World Evidence**:
- [Playwright Performance Guide](https://playwright.dev/docs/best-practices#reuse-authentication-state) - Official performance recommendation
- Industry standard: All major E2E test suites use auth state persistence

---

## Troubleshooting Common Issues

### Issue: Tests Still Skipping

**Cause**: Auth state file not created or invalid

**Solution**:
1. Check `e2e/.auth/user.json` exists
2. Verify global setup runs (check console output)
3. Ensure test user exists in Supabase
4. Check environment variables are set

### Issue: Cookies Not Persisting

**Cause**: Cookie domain/path mismatch

**Solution**:
1. Verify `baseURL` in Playwright config matches app URL
2. Check cookie domain in browser DevTools
3. Ensure `storageState` path is correct
4. Verify Supabase cookie names match

### Issue: SSR Authentication Fails

**Cause**: Server components can't read auth state

**Solution**:
1. Verify middleware is reading cookies correctly
2. Check `@supabase/ssr` package version
3. Ensure cookies are set with correct options
4. Test with `waitForLoadState('networkidle')`

---

## Conclusion

The recommended three-layer approach (Global Setup + Admin API + Helpers) is:

1. **Community-Validated**: Based on official Playwright, Supabase, and Next.js documentation
2. **Real-World Proven**: Used by major companies and open-source projects
3. **Practical**: Solves actual problems (cookie handling, user management, performance)
4. **Secure**: Follows security best practices for test environments
5. **Maintainable**: Clear patterns, well-documented, easy to extend

**This is not theoretical** - it's the pattern used by:
- Vercel's Next.js examples
- Supabase's own testing tools
- Major Next.js applications in production
- Playwright's official documentation

**Next Steps**: Implement Phase 1 (Global Setup) immediately to get tests working, then add Phase 2 (User Management) for CI/CD reliability.

---

## References

1. [Playwright Authentication Documentation](https://playwright.dev/docs/auth)
2. [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview)
3. [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr)
4. [Next.js Testing Guide](https://nextjs.org/docs/13/pages/building-your-application/optimizing/testing)
5. [Supabase GitHub Discussion #6177](https://github.com/orgs/supabase/discussions/6177)
6. [TestRig Technologies: Supabase E2E Testing](https://www.testrigtechnologies.com/advanced-end-to-end-testing-validating-supabase-data-with-playwright/)
7. [Supabase Service Role Key Documentation](https://supabase.com/docs/reference/javascript/auth-admin-api)

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Based On**: Community best practices, official documentation, and real-world implementations
