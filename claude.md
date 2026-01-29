# Involved Talent v2 - Claude Code Context

**Last Updated:** January 28, 2026  
**Purpose:** Comprehensive context document for AI agents working on the Involved Talent v2 codebase

---

## Project Overview

Involved Talent v2 is a modern, fullstack talent assessment and development platform. The application enables organizations to conduct 360-degree assessments, leadership development evaluations, and custom talent assessments with comprehensive reporting and analytics.

### Core Value Proposition
- **360° Assessments**: Multi-rater feedback from peers, managers, and direct reports
- **Leadership Development**: Identify and develop leadership potential
- **Custom Assessments**: Build tailored assessment tools
- **Comprehensive Reporting**: Generate detailed PDF, Excel, and CSV reports
- **Client Management**: Multi-tenant architecture with client isolation

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5.7 (App Router)
- **React**: 19.1.0
- **TypeScript**: 5.x (strict mode enabled)
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components (shadcn/ui based)
- **Rich Text**: TipTap editor for assessment content

### Backend
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (email/password, magic links)
- **Storage**: Supabase Storage (client assets, reports)
- **API**: Next.js API Routes (App Router)
- **Email**: AWS SES / Resend integration

### Testing
- **Unit/Integration**: Vitest 4.x with React Testing Library
- **E2E**: Playwright 1.57.0
- **Coverage**: @vitest/coverage-v8

### Deployment
- **Hosting**: Vercel
- **Database**: Supabase (local dev + staging/production)
- **CI/CD**: GitHub Actions

### Package Manager
- **npm** (not yarn or pnpm)

---

## Project Structure

```
involved-v2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (73 files)
│   │   │   ├── assessments/   # Assessment CRUD
│   │   │   ├── assignments/   # Assignment management
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── benchmarks/    # Benchmark data
│   │   │   ├── clients/       # Client management
│   │   │   ├── feedback/      # Feedback management
│   │   │   ├── groups/        # Group management
│   │   │   ├── industries/    # Industry data
│   │   │   ├── profile/       # User profile
│   │   │   ├── reports/       # Report generation & export
│   │   │   ├── templates/     # Report templates
│   │   │   └── users/         # User management
│   │   ├── assignment/        # Public assignment pages
│   │   │   └── [id]/         # Assignment taking flow
│   │   ├── auth/              # Authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── claim/         # Account claiming
│   │   │   ├── reset-password/
│   │   │   └── callback/      # OAuth callbacks
│   │   ├── dashboard/         # Authenticated dashboard
│   │   │   ├── assessments/  # Assessment management
│   │   │   ├── assignments/   # Assignment management
│   │   │   ├── benchmarks/    # Benchmark management
│   │   │   ├── clients/       # Client management
│   │   │   ├── feedback/      # Feedback management
│   │   │   ├── groups/        # Group management
│   │   │   ├── industries/    # Industry management
│   │   │   ├── profile/       # User profile
│   │   │   ├── reports/       # Report viewing
│   │   │   ├── resources/     # Resource library
│   │   │   └── users/         # User management
│   │   └── (reports)/         # Report route group
│   ├── components/            # React components
│   │   ├── forms/            # Form components
│   │   ├── layout/           # Layout components
│   │   ├── navigation/       # Navigation components
│   │   ├── reports/           # Report components
│   │   │   ├── charts/       # Chart components
│   │   │   ├── layout/       # Report layouts
│   │   │   └── sections/     # Report sections
│   │   ├── templates/        # Template components
│   │   └── ui/               # Base UI components
│   ├── lib/                  # Utility libraries
│   │   ├── assignments/      # Assignment utilities
│   │   ├── reports/          # Report generation
│   │   │   ├── generate-360-report.ts
│   │   │   ├── generate-leader-blocker-report.ts
│   │   │   ├── export-pdf.tsx
│   │   │   ├── export-pdf-playwright.ts
│   │   │   ├── export-pdf-puppeteer.ts
│   │   │   ├── export-csv.ts
│   │   │   ├── export-excel.ts
│   │   │   ├── calculate-geonorms.ts
│   │   │   └── get-survey-scores.ts
│   │   ├── resources/        # Resource management
│   │   ├── services/         # External services
│   │   │   └── email-service.ts
│   │   ├── supabase/         # Supabase utilities
│   │   │   ├── client.ts     # Browser client
│   │   │   ├── server.ts     # Server client
│   │   │   ├── admin.ts      # Admin client
│   │   │   ├── middleware.ts # Auth middleware
│   │   │   ├── database-queries.ts  # Query builders
│   │   │   └── relationship-queries.ts
│   │   └── utils/            # General utilities
│   │       ├── auth-validation.ts
│   │       ├── email-validation.ts
│   │       ├── invite-token-generation.ts
│   │       ├── spreadsheet-parsing.ts
│   │       └── user-validation.ts
│   ├── types/                # TypeScript types
│   │   ├── database.ts      # Generated DB types
│   │   └── index.ts         # Shared types
│   └── __tests__/           # Test files
│       ├── components/      # Component tests
│       ├── fixtures/        # Test fixtures
│       ├── integration/     # Integration tests
│       └── utils/           # Utility tests
├── e2e/                     # Playwright E2E tests
├── supabase/
│   ├── migrations/          # Database migrations (43 files)
│   ├── seeders/             # Seed data
│   └── functions/           # Edge functions
├── docs/                    # Documentation (45 files)
├── scripts/                 # Utility scripts
└── public/                  # Static assets
```

---

## Core Features & Modules

### 1. Authentication & User Management
**Status**: ✅ Fully Implemented

- **Authentication Flow**:
  - Email/password signup and login
  - Magic link authentication
  - Account claiming for invited users
  - Password reset flow
  - Email verification

- **User Management**:
  - User CRUD operations
  - Bulk user upload via CSV
  - User invite system with secure tokens
  - User status tracking (active, inactive, pending)
  - Profile management

- **Authorization**:
  - Role-based access control (admin, client, user)
  - Client-scoped data isolation
  - Row Level Security (RLS) policies
  - Super admin capabilities

**Key Files**:
- `src/app/api/auth/` - Auth API routes
- `src/app/api/users/` - User management API
- `src/lib/utils/invite-token-generation.ts` - Invite tokens
- `src/lib/services/email-service.ts` - Email sending

### 2. Client Management
**Status**: ✅ Fully Implemented

- Client CRUD operations
- Client logo and branding management
- Client asset storage (Supabase Storage)
- Client-scoped user management
- Client groups management

**Key Files**:
- `src/app/api/clients/` - Client API routes
- `src/app/dashboard/clients/` - Client management UI
- `src/lib/supabase/database-queries.ts` - Client queries

### 3. Assessment Management
**Status**: ✅ Fully Implemented

- **Assessment Types**:
  - 360° assessments
  - Leader/Blocker assessments
  - Custom assessments

- **Features**:
  - Assessment CRUD operations
  - Question management with TipTap editor
  - Dimension management
  - Custom fields
  - Assessment branding (logo, colors, background)
  - Question pagination and timing options
  - Assessment duplication
  - Template system for assessments

**Key Files**:
- `src/app/api/assessments/` - Assessment API
- `src/app/dashboard/assessments/` - Assessment UI
- `src/types/database.ts` - Assessment types

### 4. Assignment Management
**Status**: ✅ Fully Implemented

- Create assignments for users/groups
- Assignment status tracking
- Reminder system (email reminders)
- Assignment completion tracking
- Survey simulation for testing
- Assignment taking flow (public pages)

**Key Files**:
- `src/app/api/assignments/` - Assignment API
- `src/app/dashboard/assignments/` - Assignment management
- `src/app/assignment/[id]/` - Public assignment taking

### 5. Report Generation
**Status**: ✅ Fully Implemented

- **Report Types**:
  - 360° reports with dimension breakdowns
  - Leader/Blocker reports
  - Custom assessment reports

- **Features**:
  - PDF generation (Playwright/Puppeteer)
  - Excel export (ExcelJS)
  - CSV export
  - Report templates
  - Industry benchmark comparisons
  - GEOnorm (group norm) calculations
  - Rater type breakdowns (Peer, Direct Report, Supervisor, Self)
  - Text feedback aggregation
  - Fullscreen report viewing

**Key Files**:
- `src/lib/reports/generate-360-report.ts` - 360 report logic
- `src/lib/reports/generate-leader-blocker-report.ts` - Leader/Blocker logic
- `src/lib/reports/export-pdf-*.ts` - PDF generation
- `src/lib/reports/export-excel.ts` - Excel export
- `src/lib/reports/export-csv.ts` - CSV export
- `src/components/reports/` - Report UI components

### 6. Benchmark Management
**Status**: ✅ Fully Implemented

- Industry-based benchmarks
- Benchmark CRUD operations
- Bulk benchmark upload via CSV
- Benchmark comparison in reports
- Assessment-industry linking

**Key Files**:
- `src/app/api/benchmarks/` - Benchmark API
- `src/app/dashboard/benchmarks/` - Benchmark UI

### 7. Group Management
**Status**: ✅ Fully Implemented

- Group CRUD operations
- Group-user assignments
- Bulk group upload via CSV
- Legacy system compatibility
- Group-based assignment distribution

**Key Files**:
- `src/app/api/groups/` - Group API
- `src/app/dashboard/groups/` - Group UI

### 8. Industry Management
**Status**: ✅ Fully Implemented

- Industry CRUD operations
- Industry-benchmark relationships
- Industry-based reporting

**Key Files**:
- `src/app/api/industries/` - Industry API
- `src/app/dashboard/industries/` - Industry UI

### 9. Feedback Management
**Status**: ✅ Fully Implemented

- Feedback CRUD operations
- Bulk feedback upload
- Feedback assignment to reports
- Text feedback aggregation in reports

**Key Files**:
- `src/app/api/feedback/` - Feedback API
- `src/app/dashboard/feedback/` - Feedback UI

### 10. Resource Library
**Status**: ✅ Implemented

- Resource upload and management
- Resource viewing
- Video resources support

**Key Files**:
- `src/app/dashboard/resources/` - Resource UI
- `src/lib/resources/resources.ts` - Resource utilities

---

## Database Schema

### Core Tables

#### `profiles`
- User profile information
- Linked to `auth.users`
- Roles: admin, client, user
- Access levels and status tracking

#### `clients`
- Client/organization information
- Branding assets (logo, colors)
- Multi-tenant isolation

#### `assessments`
- Assessment definitions
- Type: 360, blockers, leader, custom
- Branding and configuration
- Question pagination and timing

#### `dimensions`
- Assessment dimensions
- Hierarchical structure (parent_id)
- Dimension codes

#### `fields`
- Custom fields for assessments
- Field types and validation
- Required field tracking

#### `questions`
- Assessment questions
- Question types and options
- Ordering and pagination

#### `assignments`
- Assignment records
- Links users/groups to assessments
- Status tracking
- Reminder configuration

#### `answers`
- User responses to questions
- Rater type tracking
- Answer data (JSONB)

#### `benchmarks`
- Industry benchmark data
- Assessment-industry relationships
- Score data

#### `groups`
- User groups
- Legacy compatibility fields
- Group-user relationships

#### `industries`
- Industry definitions
- Industry-benchmark relationships

#### `user_invites`
- Invite token storage
- Expiration tracking
- Status management

#### `report_data`
- Generated report storage
- PDF storage references
- Report metadata

### Key Relationships
- `profiles` → `clients` (client_id)
- `assessments` → `profiles` (created_by)
- `assignments` → `assessments`, `profiles`, `groups`
- `answers` → `assignments`, `questions`
- `benchmarks` → `assessments`, `industries`

### Row Level Security (RLS)
- All tables have RLS enabled
- Client-scoped access control
- Admin override capabilities
- Proper foreign key constraints

---

## Code Patterns & Conventions

### TypeScript
- **Strict mode enabled**
- Use proper types, avoid `any`
- Import types from `@/types`
- Path alias: `@/` for `src/` directory

### React & Next.js
- **Server Components by default**
- Add `'use client'` only when necessary (hooks, interactivity, browser APIs)
- Use App Router conventions:
  - `page.tsx` - Page components
  - `layout.tsx` - Layout components
  - `route.ts` - API routes
  - `loading.tsx` - Loading states
  - `error.tsx` - Error boundaries

### API Routes
- Located in `src/app/api/`
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Authentication checks via Supabase
- Authorization checks for client-scoped access
- Return proper Response objects with status codes
- Error handling with meaningful messages

**Example Pattern**:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Authorization check
  // ... client-scoped access logic ...
  
  // Query data
  const { data, error } = await supabase.from('table').select('*')
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ data })
}
```

### Database Queries
- Use query builders from `src/lib/supabase/database-queries.ts`
- Server-side: `createClient()` from `@/lib/supabase/server`
- Client-side: `createClient()` from `@/lib/supabase/client`
- Admin operations: `createAdminClient()` from `@/lib/supabase/admin`
- Always handle errors
- Use RLS policies for security

### Styling
- **Tailwind CSS v4** for all styling
- Mobile-first responsive design
- Use existing UI components from `@/components/ui`
- CSS Modules only when Tailwind is insufficient

### Component Patterns
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper prop typing with TypeScript interfaces
- Place shared components in `src/components/`
- Page-specific components in page directory

### Testing
- **Unit tests**: `src/__tests__/` (mirror src structure)
- **Integration tests**: `src/__tests__/integration/`
- **E2E tests**: `e2e/` directory
- Test naming: `*.test.ts` or `*.test.tsx`
- Use React Testing Library for component tests
- Mock Supabase calls appropriately

**Test Commands**:
```bash
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
npm run test:e2e            # E2E tests
npm run test:e2e:ui         # Playwright UI
```

---

## Environment Configuration

### Environment Files
- `.env.local` - Active config (local by default)
- `.env.staging` - Staging Supabase
- `.env.production` - Production config
- `.env.example` - Template

### Required Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Involved Talent"
```

### Environment Switching
```bash
./switch-env.sh staging    # Switch to staging
# or manually: cp .env.staging .env.local
```

---

## Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Start local Supabase
npx supabase start

# Run development server
npm run dev
```

### Database Migrations
```bash
# Apply migrations
npm run db:migrate

# Reset and seed
npm run db:reset

# Check migration status
npm run db:status
```

### Building
```bash
# Development (with Turbopack)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

### Linting
```bash
npm run lint
```

---

## Key Libraries & Dependencies

### Core
- `next` - Next.js framework
- `react` / `react-dom` - React library
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Supabase SSR helpers
- `@supabase/auth-helpers-nextjs` - Auth helpers

### UI & Styling
- `tailwindcss` - CSS framework
- `lucide-react` - Icons
- `class-variance-authority` - Component variants
- `clsx` - Class name utilities

### Rich Text
- `@tiptap/react` - Rich text editor
- `@tiptap/starter-kit` - TipTap extensions
- `@tiptap/extension-table` - Table support

### Reports & Export
- `@react-pdf/renderer` - PDF generation
- `exceljs` - Excel export
- `playwright-core` - PDF generation (headless browser)
- `puppeteer-core` - Alternative PDF generation

### Email
- `@aws-sdk/client-ses` - AWS SES
- `resend` - Resend email service
- `nodemailer` - Email sending

### Testing
- `vitest` - Test runner
- `@testing-library/react` - React testing
- `@playwright/test` - E2E testing
- `jsdom` - DOM environment for tests

---

## Security Considerations

### Authentication
- All API routes require authentication
- Use Supabase Auth for user management
- JWT token validation via middleware

### Authorization
- Client-scoped data isolation
- Role-based access control
- Admin override capabilities
- RLS policies at database level

### Data Protection
- Row Level Security on all tables
- Input validation on client and server
- Secure token generation (crypto APIs)
- No secrets in client-side code

### Best Practices
- Never commit `.env.local` or secrets
- Use environment variables for sensitive data
- Validate user input
- Use prepared statements (Supabase handles this)
- Implement proper error handling

---

## Common Tasks

### Adding a New Page
1. Create `page.tsx` in appropriate `app/` subdirectory
2. Use Server Components by default
3. Implement `generateMetadata` for SEO
4. Add loading and error states
5. Write E2E tests for critical flows

### Adding a New API Route
1. Create `route.ts` in `app/api/` subdirectory
2. Implement proper HTTP methods
3. Add authentication checks
4. Add authorization checks (client-scoped)
5. Return proper Response objects
6. Handle errors gracefully
7. Write integration tests

### Adding a New Component
1. Create component in `src/components/`
2. Use TypeScript with proper prop types
3. Style with Tailwind CSS
4. Export component and types
5. Write unit tests in `src/__tests__/components/`

### Modifying Database Schema
1. Create migration in `supabase/migrations/`
2. Test locally with `npm run db:reset`
3. Update TypeScript types (`src/types/database.ts`)
4. Update relevant queries and components
5. Test all affected functionality

### Adding Report Export Format
1. Create export function in `src/lib/reports/`
2. Follow existing patterns (CSV, Excel, PDF)
3. Add API route in `src/app/api/reports/[assignmentId]/export/`
4. Test with various report types
5. Update documentation

---

## Testing Strategy

### Unit Tests
- Test utilities and pure functions
- Mock external dependencies (Supabase, email)
- Location: `src/__tests__/`
- Run: `npm test`

### Integration Tests
- Test API routes and database interactions
- Test component interactions
- Location: `src/__tests__/integration/`
- Run: `npm test`

### E2E Tests
- Test critical user journeys
- Test assignment taking flow
- Test report generation
- Location: `e2e/`
- Run: `npm run test:e2e`

### Test Coverage
- Aim for good coverage on new code
- Run: `npm run test:coverage`
- Current: 999+ tests passing

---

## Known Patterns & Utilities

### Spreadsheet Parsing
- `src/lib/utils/spreadsheet-parsing.ts`
- Supports CSV parsing for:
  - User bulk upload
  - Group bulk upload
  - Benchmark bulk upload
- Includes validation and error reporting

### Email Service
- `src/lib/services/email-service.ts`
- Supports invite emails
- Template system
- AWS SES and Resend integration

### Validation Utilities
- `src/lib/utils/email-validation.ts` - Email validation
- `src/lib/utils/user-validation.ts` - User data validation
- `src/lib/utils/auth-validation.ts` - Auth validation
- `src/lib/utils/color-validation.ts` - Color validation

### Report Generation
- 360 reports: `generate-360-report.ts`
- Leader/Blocker: `generate-leader-blocker-report.ts`
- PDF: `export-pdf-playwright.ts` or `export-pdf-puppeteer.ts`
- Excel: `export-excel.ts`
- CSV: `export-csv.ts`

---

## Documentation

### Key Documentation Files
- `README.md` - Getting started and overview
- `docs/TESTING.md` - Testing guidelines
- `docs/PHASE_1_TEST_PLAN.md` - Test plan
- `docs/IMPLEMENTATION_SUMMARY.md` - Implementation details
- `.github/copilot-instructions.md` - Copilot instructions

### When to Update Documentation
- Adding new features or major changes
- Changing project structure or conventions
- Updating environment setup or dependencies
- Documenting new testing patterns

---

## Performance Considerations

### Server Components
- Use Server Components for non-interactive content
- Minimize client-side JavaScript
- Implement proper data fetching patterns

### Image Optimization
- Use Next.js Image component
- Configure remote patterns for Supabase Storage
- See `next.config.ts` for image configuration

### Report Generation
- PDF generation uses headless browsers (Playwright/Puppeteer)
- Consider async processing for large reports
- Cache report data when possible

### Database Queries
- Use proper indexing (defined in migrations)
- Implement pagination for large datasets
- Use select() to limit returned fields

---

## Deployment

### Vercel Deployment
- Auto-deploys on push to `main` branch
- Environment variables configured in Vercel dashboard
- See `docs/VERCEL_DEPLOYMENT.md` for details

### Database Migrations
- Migrations applied via Supabase CLI
- Test migrations locally first
- Use `npm run db:migrate` for local
- Production migrations via Supabase dashboard or CLI

### CI/CD
- GitHub Actions workflow in `.github/workflows/test.yml`
- Runs on push to `main` and `develop`
- Runs unit tests and E2E tests
- Generates coverage reports

---

## Common Issues & Solutions

### Supabase Connection Issues
- Check environment variables
- Verify Supabase is running locally (`npx supabase status`)
- Check RLS policies if data access fails

### Type Errors
- Regenerate types: `npx supabase gen types typescript --local > src/types/database.ts`
- Check TypeScript strict mode settings
- Verify import paths use `@/` alias

### Test Failures
- Ensure Supabase is running for integration tests
- Check test fixtures match current schema
- Verify mock implementations

### Build Errors
- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run build`

---

## Future Enhancements

### Planned Features
- Enhanced reminder system
- Advanced analytics dashboard
- Custom report templates
- Multi-language support
- Mobile app support

### Technical Debt
- Consider migrating to newer Supabase patterns
- Optimize report generation performance
- Enhance E2E test coverage
- Improve error handling patterns

---

## Getting Help

### Resources
- Check existing documentation in `docs/` directory
- Review similar implementations in the codebase
- Look at test files for usage examples
- Check `.github/copilot-instructions.md` for patterns

### Code Review Checklist
- [ ] TypeScript types are correct
- [ ] Tests are written and passing
- [ ] RLS policies are updated if schema changes
- [ ] Error handling is implemented
- [ ] Documentation is updated if needed
- [ ] Build succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)

---

## Summary for AI Agents

When working on this codebase:

1. **Understand the architecture**: Next.js App Router, Supabase backend, TypeScript throughout
2. **Follow existing patterns**: Look at similar implementations before creating new ones
3. **Test thoroughly**: Write unit, integration, and E2E tests as appropriate
4. **Security first**: Always check authentication and authorization
5. **Client-scoped**: Remember data isolation by client
6. **Server Components**: Default to Server Components, use Client Components only when needed
7. **Type safety**: Use proper TypeScript types, avoid `any`
8. **Documentation**: Update docs for significant changes
9. **Build and lint**: Ensure code compiles and passes linting
10. **Minimal changes**: Make the smallest modifications that achieve the goal

---

**Last Updated**: January 28, 2026  
**Maintained By**: Development Team  
**Project**: Involved Talent v2
