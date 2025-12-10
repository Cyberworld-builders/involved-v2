# Phase 1 Test Plan

This document outlines the unit tests and feature tests required for Phase 1 of the Involved Talent v2 project. Each test is mapped to the corresponding GitHub issue(s) it satisfies.

## Test Coverage Overview

- **Total Issues**: 62
- **Unit Tests**: Focus on individual functions, components, and utilities
- **Feature Tests**: Focus on end-to-end user flows and complete feature functionality

---

## Unit Tests

Unit tests verify individual functions, components, and utilities in isolation.

### Authentication & Security

#### Token Generation & Validation
- **Test**: `invite-token-generation.test.ts`
  - Generate invite token with proper format
  - Token expiration set to 7 days
  - Token validation logic
  - Expired token rejection
  - **Satisfies Issues**: #46

#### Password Utilities
- **Test**: `password-utilities.test.ts`
  - Password hashing
  - Password validation rules
  - Password strength checking
  - **Satisfies Issues**: #11, #17, #51

#### Email Verification
- **Test**: `email-verification.test.ts`
  - Email verification token generation
  - Email verification link validation
  - Verification status update
  - **Satisfies Issues**: #12

### User Management Utilities

#### Username Generation
- **Test**: `username-generation.test.ts`
  - Auto-generate username from email
  - Handle duplicate usernames
  - Username format validation
  - **Satisfies Issues**: #36

#### User Role & Status Validation
- **Test**: `user-validation.test.ts`
  - Role validation (admin, manager, user)
  - Status validation (active, inactive)
  - Role-based permission checks
  - **Satisfies Issues**: #31, #32

### Client Management Utilities

#### Color Validation
- **Test**: `color-validation.test.ts`
  - Primary color format validation (hex)
  - Accent color format validation (hex)
  - Color value sanitization
  - **Satisfies Issues**: #25

#### File Upload Utilities
- **Test**: `file-upload-utilities.test.ts`
  - Logo file validation (type, size)
  - Background image validation (type, size)
  - File storage path generation
  - **Satisfies Issues**: #23, #24

### Spreadsheet Processing

#### CSV/Excel Parsing
- **Test**: `spreadsheet-parsing.test.ts`
  - Parse user bulk upload spreadsheet
  - Parse group bulk upload spreadsheet
  - Parse benchmark bulk upload spreadsheet
  - Column validation
  - Data type validation
  - Error handling for malformed data
  - **Satisfies Issues**: #35, #44, #65

### Database Utilities

#### Query Builders
- **Test**: `database-queries.test.ts`
  - Client CRUD queries
  - User CRUD queries
  - Group CRUD queries
  - Industry CRUD queries
  - Benchmark CRUD queries
  - Filtering and sorting
  - **Satisfies Issues**: #18, #19, #20, #21, #22, #26, #27, #28, #29, #30, #37, #38, #39, #40, #41, #53, #54, #55, #56, #57, #59, #60, #61, #62, #63

#### Relationship Management
- **Test**: `relationship-queries.test.ts`
  - User-client assignment queries
  - User-industry assignment queries
  - Group-user assignment queries
  - Group-manager assignment queries
  - **Satisfies Issues**: #33, #34, #42, #43, #58

### API Route Handlers

#### Authentication Routes
- **Test**: `api-auth-routes.test.ts`
  - POST /api/auth/signup
  - POST /api/auth/signin
  - POST /api/auth/signout
  - POST /api/auth/reset-password
  - POST /api/auth/verify-email
  - **Satisfies Issues**: #8, #9, #10, #11, #12

#### Client Routes
- **Test**: `api-client-routes.test.ts`
  - POST /api/clients
  - GET /api/clients
  - GET /api/clients/[id]
  - PATCH /api/clients/[id]
  - DELETE /api/clients/[id]
  - **Satisfies Issues**: #18, #19, #20, #21, #22

#### User Routes
- **Test**: `api-user-routes.test.ts`
  - POST /api/users
  - GET /api/users
  - GET /api/users/[id]
  - PATCH /api/users/[id]
  - DELETE /api/users/[id]
  - POST /api/users/bulk
  - **Satisfies Issues**: #26, #27, #28, #29, #30, #35

#### Group Routes
- **Test**: `api-group-routes.test.ts`
  - POST /api/groups
  - GET /api/groups
  - GET /api/groups/[id]
  - PATCH /api/groups/[id]
  - DELETE /api/groups/[id]
  - POST /api/groups/bulk
  - **Satisfies Issues**: #37, #38, #39, #40, #41, #44

#### Industry Routes
- **Test**: `api-industry-routes.test.ts`
  - POST /api/industries
  - GET /api/industries
  - GET /api/industries/[id]
  - PATCH /api/industries/[id]
  - DELETE /api/industries/[id]
  - **Satisfies Issues**: #53, #54, #55, #56, #57

#### Benchmark Routes
- **Test**: `api-benchmark-routes.test.ts`
  - POST /api/benchmarks
  - GET /api/benchmarks
  - GET /api/benchmarks/[id]
  - PATCH /api/benchmarks/[id]
  - DELETE /api/benchmarks/[id]
  - GET /api/benchmarks?filter=...
  - POST /api/benchmarks/bulk
  - **Satisfies Issues**: #59, #60, #61, #62, #63, #64, #65

### Component Tests

#### Navigation Component
- **Test**: `navigation-component.test.tsx`
  - Component renders correctly
  - Navigation links present
  - Responsive behavior
  - **Satisfies Issues**: #13

#### Layout Components
- **Test**: `layout-components.test.tsx`
  - Dashboard layout renders
  - Responsive breakpoints
  - Mobile layout adaptation
  - **Satisfies Issues**: #14, #15

### Email Service

#### Email Sending
- **Test**: `email-service.test.ts`
  - Invite email generation
  - Email template rendering
  - Email delivery confirmation
  - **Satisfies Issues**: #45

---

## Feature Tests

Feature tests verify complete end-to-end user flows and feature functionality.

### Authentication Flows

#### User Sign Up Flow
- **Test**: `feature-signup.test.ts`
  - User can access signup page
  - User can submit signup form
  - User receives verification email
  - User can verify email
  - User can sign in after verification
  - **Satisfies Issues**: #8, #12

#### User Sign In Flow
- **Test**: `feature-signin.test.ts`
  - User can access signin page
  - User can sign in with valid credentials
  - User is redirected to dashboard after signin
  - Invalid credentials are rejected
  - **Satisfies Issues**: #9

#### User Sign Out Flow
- **Test**: `feature-signout.test.ts`
  - User can sign out
  - User session is cleared
  - User is redirected to login page
  - **Satisfies Issues**: #10

#### Password Reset Flow
- **Test**: `feature-password-reset.test.ts`
  - User can request password reset
  - User receives password reset email
  - User can access reset link
  - User can set new password
  - User can sign in with new password
  - **Satisfies Issues**: #11

### User Profile Management

#### Profile Update Flow
- **Test**: `feature-profile-update.test.ts`
  - User can access profile page
  - User can update profile information
  - Changes are saved and persisted
  - User can update password
  - Password update requires current password
  - **Satisfies Issues**: #16, #17

### Client Management

#### Client CRUD Flow
- **Test**: `feature-client-crud.test.ts`
  - Admin can create new client
  - Admin can view clients list
  - Admin can view single client details
  - Admin can update client information
  - Admin can delete client
  - Client logo upload works
  - Client background image upload works
  - Client color customization works
  - **Satisfies Issues**: #18, #19, #20, #21, #22, #23, #24, #25

### User Management

#### User CRUD Flow
- **Test**: `feature-user-crud.test.ts`
  - Admin/Manager can create new user
  - Admin/Manager can view users list
  - Admin/Manager can view single user details
  - Admin/Manager can update user information
  - Admin/Manager can delete user
  - User role can be assigned/updated
  - User status can be managed
  - User can be assigned to client
  - User can be assigned to industry
  - Username auto-generation when not provided
  - **Satisfies Issues**: #26, #27, #28, #29, #30, #31, #32, #33, #34, #36

#### Bulk User Upload Flow
- **Test**: `feature-bulk-user-upload.test.ts`
  - Admin/Manager can upload user spreadsheet
  - Spreadsheet is parsed correctly
  - Users are created from spreadsheet data
  - Groups are created/assigned from spreadsheet
  - Errors are reported for invalid rows
  - **Satisfies Issues**: #35

### Group Management

#### Group CRUD Flow
- **Test**: `feature-group-crud.test.ts`
  - Admin/Manager can create new group
  - Admin/Manager can view groups list
  - Admin/Manager can view single group details
  - Admin/Manager can update group information
  - Admin/Manager can delete group
  - Users can be assigned to group
  - Managers can be assigned to group
  - **Satisfies Issues**: #37, #38, #39, #40, #41, #42, #43

#### Bulk Group Upload Flow
- **Test**: `feature-bulk-group-upload.test.ts`
  - Admin/Manager can upload group spreadsheet
  - Spreadsheet is parsed correctly
  - Groups are created from spreadsheet data
  - Users and targets are assigned correctly
  - Errors are reported for invalid rows
  - **Satisfies Issues**: #44

### User Invitation Flow

#### Complete Invitation & Claim Flow
- **Test**: `feature-user-invitation.test.ts`
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
  - **Satisfies Issues**: #45, #46, #47, #48, #49, #50, #51, #52

### Industry Management

#### Industry CRUD Flow
- **Test**: `feature-industry-crud.test.ts`
  - Admin can create new industry
  - Admin can view industries list
  - Admin can view single industry details
  - Admin can update industry information
  - Admin can delete industry
  - Users can be assigned to industry
  - **Satisfies Issues**: #53, #54, #55, #56, #57, #58

### Benchmark Management

#### Benchmark CRUD Flow
- **Test**: `feature-benchmark-crud.test.ts`
  - Admin can create new benchmark
  - Admin can view benchmarks list
  - Admin can view single benchmark details
  - Admin can update benchmark information
  - Admin can delete benchmark
  - Benchmarks can be filtered by assessment, industry, and dimension
  - **Satisfies Issues**: #59, #60, #61, #62, #63, #64

#### Bulk Benchmark Upload Flow
- **Test**: `feature-bulk-benchmark-upload.test.ts`
  - Admin can upload benchmark spreadsheet
  - Spreadsheet is parsed correctly
  - Benchmarks are created from spreadsheet data
  - Errors are reported for invalid rows
  - **Satisfies Issues**: #65

### Navigation & Layout

#### Navigation & Responsive Layout
- **Test**: `feature-navigation-layout.test.ts`
  - Navigation component is consistent across pages
  - Page layout is responsive on mobile devices
  - Page layout is responsive on tablet devices
  - Page layout is responsive on desktop devices
  - All pages maintain consistent layout
  - **Satisfies Issues**: #13, #14, #15

### Environment & Deployment

#### Environment Setup Verification
- **Test**: `feature-environment-setup.test.ts`
  - Local development environment is configured
  - Vercel deployment pipeline works
  - Supabase backend connection is established
  - Staging environment deployment works
  - **Satisfies Issues**: #4, #5, #6, #7

---

## Test Implementation Notes

### Test Framework
- Use Jest/Vitest for unit tests
- Use Playwright or Cypress for feature tests
- Use React Testing Library for component tests

### Test Data
- Create test fixtures for common data structures
- Use factories for generating test data
- Clean up test data after each test

### Coverage Goals
- Unit tests: 80%+ code coverage
- Feature tests: All critical user flows covered
- Component tests: All public components tested

### Test Organization
- Group tests by feature area
- Use descriptive test names
- Include test descriptions explaining what is being tested
- Tag tests appropriately for CI/CD pipeline

---

## Issue Coverage Summary

| Issue # | Title | Unit Test | Feature Test |
|---------|-------|-----------|--------------|
| #4 | Environment Setup - Local Dev | ✅ | ✅ |
| #5 | Environment Setup - Vercel Pipeline | ✅ | ✅ |
| #6 | Environment Setup - Supabase Connection | ✅ | ✅ |
| #7 | Environment Setup - Staging Deployment | ✅ | ✅ |
| #8 | User Sign Up | ✅ | ✅ |
| #9 | User Sign In | ✅ | ✅ |
| #10 | User Sign Out | ✅ | ✅ |
| #11 | Password Reset | ✅ | ✅ |
| #12 | Email Verification | ✅ | ✅ |
| #13 | Navigation Component | ✅ | ✅ |
| #14 | Responsive Layout | ✅ | ✅ |
| #15 | Mobile Responsiveness | ✅ | ✅ |
| #16 | Profile Update | ✅ | ✅ |
| #17 | Password Update | ✅ | ✅ |
| #18-22 | Client CRUD | ✅ | ✅ |
| #23-24 | Client File Uploads | ✅ | ✅ |
| #25 | Client Color Customization | ✅ | ✅ |
| #26-30 | User CRUD | ✅ | ✅ |
| #31-32 | User Role/Status Management | ✅ | ✅ |
| #33-34 | User Assignments | ✅ | ✅ |
| #35 | Bulk User Upload | ✅ | ✅ |
| #36 | Username Auto-generation | ✅ | ✅ |
| #37-41 | Group CRUD | ✅ | ✅ |
| #42-43 | Group Assignments | ✅ | ✅ |
| #44 | Bulk Group Upload | ✅ | ✅ |
| #45-52 | User Invites | ✅ | ✅ |
| #53-57 | Industry CRUD | ✅ | ✅ |
| #58 | User-Industry Assignment | ✅ | ✅ |
| #59-63 | Benchmark CRUD | ✅ | ✅ |
| #64 | Benchmark Filtering | ✅ | ✅ |
| #65 | Bulk Benchmark Upload | ✅ | ✅ |

**Total Issues Covered**: 62/62 (100%)

---

## Next Steps

1. Set up test framework and configuration
2. Create test utilities and helpers
3. Implement unit tests for each utility/component
4. Implement feature tests for each user flow
5. Set up CI/CD pipeline to run tests automatically
6. Monitor test coverage and ensure all issues are satisfied
7. Document any test failures and update tests as needed
