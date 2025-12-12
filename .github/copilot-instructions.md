# Copilot Instructions for Involved Talent v2

## Project Overview

Involved Talent v2 is a modern fullstack talent assessment platform built with:
- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Testing**: Vitest (unit/integration), Playwright (E2E), React Testing Library
- **Deployment**: Vercel
- **Package Manager**: npm (use npm, not yarn or pnpm)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── ...
├── components/            # Reusable UI components
│   └── ui/               # Base UI components (shadcn/ui based)
├── lib/                  # Utility libraries
│   ├── supabase/         # Supabase client configuration
│   └── utils.ts          # Utility functions
├── types/                # TypeScript type definitions
├── hooks/                # Custom React hooks
└── __tests__/            # Test files (unit/integration)

e2e/                       # Playwright E2E tests
docs/                      # Project documentation
supabase/                  # Supabase migrations and configs
```

## Code Style & Conventions

### TypeScript
- **Always** use TypeScript for new files
- Enable strict type checking
- Use proper type definitions, avoid `any` types
- Import types from `@/types` when available
- Path alias: Use `@/` for imports from `src/` (e.g., `@/components/ui/button`)

### React & Next.js
- Use React Server Components by default
- Add `'use client'` directive only when necessary (hooks, interactivity, browser APIs)
- Follow Next.js 14 App Router conventions
- Use proper file naming: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`
- Implement proper error boundaries
- Use Next.js built-in Image component for images

### Styling
- Use Tailwind CSS for all styling (v4 syntax)
- Follow mobile-first responsive design principles
- Use existing UI components from `@/components/ui` when available
- Match the existing component patterns and styling
- Use CSS Modules only when Tailwind is insufficient

### Component Patterns
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper prop typing with TypeScript interfaces
- Follow the existing naming conventions for components
- Place shared components in `src/components/`, page-specific ones in the page directory

## Development Workflow

### Before Making Changes
1. **Understand the context**: Read related files and documentation
2. **Check existing patterns**: Look at similar implementations in the codebase
3. **Plan minimal changes**: Make the smallest possible modifications

### Environment Setup
- Local development uses local Supabase (via `npx supabase start`)
- Staging uses remote Supabase (switch with `./switch-env.sh staging`)
- Environment files: `.env.local` (active), `.env.staging`, `.env.production.example`
- Never commit `.env.local` or secrets

### Making Changes
1. **Build first**: Run `npm run build` to check for TypeScript/build errors
2. **Lint your code**: Run `npm run lint` and fix any issues
3. **Test your changes**: Write and run appropriate tests (see Testing section)
4. **Verify manually**: Run the dev server (`npm run dev`) and test UI changes

## Testing Requirements

### Test Strategy
- **Write tests first** or alongside code changes
- Match existing test patterns and structure
- Use appropriate test type for the change:
  - Unit tests for utilities and pure functions
  - Integration tests for components and hooks
  - E2E tests for critical user flows

### Unit & Integration Tests (Vitest)
- Location: `src/__tests__/` (mirror the structure of `src/`)
- Naming: `*.test.ts` or `*.test.tsx`
- Run: `npm test` (single run), `npm run test:watch` (watch mode)
- Coverage: `npm run test:coverage` (aim for good coverage on new code)
- Use React Testing Library for component tests
- Mock Supabase calls appropriately

### E2E Tests (Playwright)
- Location: `e2e/` directory
- Run: `npm run test:e2e`
- Test critical user journeys
- Use proper selectors (data-testid, roles, labels)
- Clean up test data after tests
- Note: Auth tests may be skipped in CI (SKIP_AUTH_TESTS flag)

### Running Tests
```bash
# Unit/Integration tests
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage

# E2E tests
npm run test:e2e            # All E2E tests
npm run test:e2e:ui         # Playwright UI mode
npm run test:e2e:debug      # Debug mode
```

### Test Requirements
- **Always** run existing tests before making changes to establish baseline
- **Always** write tests for new features and bug fixes
- **Never** remove or modify tests unless fixing a bug in the test itself
- **Always** ensure tests pass before submitting changes
- Fix test failures related to your changes (ignore pre-existing unrelated failures)

## Database & Supabase

### Schema
- Main tables: `profiles`, `assessments`, `questions`, `benchmarks`, `users`
- Always use Row Level Security (RLS) policies
- Use migrations for schema changes (in `supabase/migrations/`)
- Test database changes with local Supabase first

### Supabase Client
- Use server client from `@/lib/supabase/server` for Server Components
- Use client from `@/lib/supabase/client` for Client Components
- Always handle authentication state properly
- Use proper error handling for database operations

### Authentication
- Authentication flow uses Supabase Auth
- User profiles stored in `profiles` table (linked to `auth.users`)
- Implement proper auth checks in server actions and API routes
- Use middleware for protected routes

## Common Tasks

### Adding a New Page
1. Create `page.tsx` in appropriate `app/` subdirectory
2. Use Server Components by default
3. Implement proper metadata with `generateMetadata`
4. Add loading and error states (`loading.tsx`, `error.tsx`)
5. Write E2E tests for critical flows

### Adding a New Component
1. Create component in `src/components/` (or `src/components/ui/` for base UI)
2. Use TypeScript with proper prop types
3. Style with Tailwind CSS
4. Export component and types
5. Write unit tests in `src/__tests__/components/`

### Adding an API Route
1. Create `route.ts` in `app/api/` subdirectory
2. Implement proper HTTP methods (GET, POST, PUT, DELETE)
3. Add authentication checks if needed
4. Return proper Response objects with status codes
5. Handle errors gracefully
6. Write integration tests

### Modifying Database Schema
1. Create migration in `supabase/migrations/`
2. Test locally with `npx supabase db reset`
3. Update TypeScript types if needed
4. Update relevant queries and components
5. Test all affected functionality

## Build & Deployment

### Building
- Development: `npm run dev` (uses Turbopack)
- Production build: `npm run build`
- Start production: `npm start`
- Always ensure builds succeed before submitting changes

### CI/CD
- GitHub Actions workflow in `.github/workflows/test.yml`
- Runs on push to `main` and `develop` branches
- Runs unit tests and E2E tests
- Generates coverage reports
- Must pass before merging

### Deployment
- Deployed to Vercel
- Auto-deploys on push to `main` branch
- Environment variables configured in Vercel dashboard
- See `docs/VERCEL_DEPLOYMENT.md` for details

## Documentation

### When to Update Documentation
- Adding new features or major changes
- Changing project structure or conventions
- Updating environment setup or dependencies
- Documenting new testing patterns

### Documentation Locations
- `README.md`: Getting started, overview, basic usage
- `docs/`: Detailed documentation and guides
- `docs/TESTING.md`: Testing guidelines
- `docs/PHASE_1_TEST_PLAN.md`: Test plan
- Inline code comments: Only when necessary for complex logic

## Security & Best Practices

### Security
- Never commit secrets or API keys
- Use environment variables for sensitive data
- Implement proper RLS policies for database access
- Validate user input on both client and server
- Use prepared statements to prevent SQL injection
- Implement CSRF protection for forms

### Performance
- Use React Server Components for non-interactive content
- Implement proper data fetching patterns (parallel when possible)
- Use Next.js Image component for optimized images
- Implement proper caching strategies
- Minimize client-side JavaScript

### Error Handling
- Always handle errors gracefully
- Provide meaningful error messages to users
- Log errors appropriately (don't expose sensitive data)
- Use proper error boundaries in React
- Return proper HTTP status codes in API routes

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)

## Getting Help

- Check existing documentation in `docs/` directory
- Review similar implementations in the codebase
- Look at test files for usage examples
- Check project README for setup and common commands

## Summary

When working on this project:
1. **Understand first**: Read the code and related documentation
2. **Follow conventions**: Match existing patterns and style
3. **Test thoroughly**: Write and run appropriate tests
4. **Build and lint**: Ensure code compiles and passes linting
5. **Document when needed**: Update docs for significant changes
6. **Make minimal changes**: Smallest modifications that achieve the goal
7. **Security first**: Never compromise on security practices
