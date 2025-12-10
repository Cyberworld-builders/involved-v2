# Testing Guide

This document provides guidelines and instructions for writing and running tests in the Involved Talent v2 project.

## Test Stack

- **Vitest**: Unit and integration tests
- **Playwright**: End-to-end (E2E) tests
- **React Testing Library**: Component tests

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug
```

## Test Organization

```
src/
  __tests__/
    setup.ts              # Global test setup
    utils/
      test-helpers.ts     # Reusable test utilities
    fixtures/
      users.ts            # Test data fixtures
      clients.ts
    mocks/
      next-router.ts      # Mock implementations
  lib/
    utils/
      __tests__/
        *.test.ts         # Unit tests
  components/
    __tests__/
      *.test.tsx          # Component tests
e2e/
  auth/
    signin.spec.ts        # E2E tests
  dashboard/
    clients.spec.ts
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions and utilities in isolation.

**Example:**
```typescript
import { describe, it, expect } from 'vitest'
import { validateHexColor } from '@/lib/utils/color-validation'

describe('validateHexColor', () => {
  it('should validate correct hex colors', () => {
    expect(validateHexColor('#2D2E30')).toBe(true)
    expect(validateHexColor('#FFBA00')).toBe(true)
  })

  it('should reject invalid hex colors', () => {
    expect(validateHexColor('invalid')).toBe(false)
    expect(validateHexColor('#GGG')).toBe(false)
  })
})
```

### Component Tests

Component tests should test user interactions and component behavior.

**Example:**
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('should render correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### E2E Tests

E2E tests should test complete user flows across the application.

**Example:**
```typescript
import { test, expect } from '@playwright/test'

test('user can sign in', async ({ page }) => {
  await page.goto('/auth/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## Test Utilities

### Fixtures

Use fixtures for consistent test data:

```typescript
import { mockUser } from '@/__tests__/fixtures/users'

// Use in tests
const user = mockUser
```

### Helpers

Use test helpers for common operations:

```typescript
import { renderWithProviders } from '@/__tests__/utils/test-helpers'

// Render component with providers
renderWithProviders(<MyComponent />)
```

## Coverage Goals

- **Unit tests**: 80%+ code coverage
- **Feature tests**: All critical user flows covered
- **Component tests**: All public components tested

## CI/CD

Tests run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

The CI pipeline includes:
- Unit and integration tests
- E2E tests
- Coverage reporting

## Best Practices

1. **Test behavior, not implementation**: Focus on what the code does, not how it does it
2. **Use descriptive test names**: Test names should clearly describe what is being tested
3. **Keep tests isolated**: Each test should be independent and not rely on other tests
4. **Use fixtures for test data**: Don't hardcode test data in tests
5. **Mock external dependencies**: Mock Supabase, API calls, etc.
6. **Clean up after tests**: Use `afterEach` to clean up test data
7. **Test edge cases**: Don't just test the happy path

## Troubleshooting

### Tests failing with "Cannot find module"

Make sure path aliases are configured correctly in `vitest.config.ts` and match `tsconfig.json`.

### E2E tests timing out

Increase timeout in `playwright.config.ts` or use `test.setTimeout()` in individual tests.

### Coverage not generating

Make sure `@vitest/coverage-v8` is installed and coverage is enabled in `vitest.config.ts`.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library Documentation](https://testing-library.com/react)
- [Phase 1 Test Plan](./PHASE_1_TEST_PLAN.md)
