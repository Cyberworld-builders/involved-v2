# Platform Issues Fix — Changelog (Feb 28, 2026)

**Branch:** `issues/feb-2026` (off `migration`)
**PR:** [#222](https://github.com/Cyberworld-builders/involved-v2/pull/222)
**Source:** Client testing notes from 2/1/26 (`docs/Platform-Issues-2.1.26.docx`)

---

## Summary

Addresses all issues documented during platform testing on 2/1/26. Changes span 44 files with 1,770 insertions and 360 deletions across email delivery, report generation, assignment management, database schema, mobile UX, configuration hardening, and test coverage.

---

## 1. Email Templates — Outlook Compatibility

**Problem:** Outlook strips `<style>` blocks and ignores class-based CSS. Assessment names and raw URLs presented together caused user confusion.

### Files Changed

- **`src/lib/services/email-service.ts`** — Invite email template
  - Replaced CSS class layout with table-based structure (bulletproof email pattern)
  - All styles moved to inline `style=""` attributes
  - "Accept Invitation" button uses bulletproof button pattern (`<table>` within `<table>`)
  - Raw URL moved to "If the button doesn't work" section at bottom
  - Added `target="_blank"`, charset meta, copyright footer

- **`src/app/api/assignments/send-email/route.ts`** — Assignment email
  - Assessment list restructured from `<ul><li>` to table rows
  - Each assessment gets its own bulletproof button
  - Uses `getAppUrl()` for base URL generation
  - Dashboard link included with clear instructions

- **`supabase/functions/send-reminder-email/index.ts`** — Reminder email (edge function)
  - Full table-based restructure matching invite pattern
  - Styled header, bulletproof button, fallback URL section
  - URL generation with protocol detection and trailing slash removal
  - Updated copy per client feedback

### Default Email Templates Updated

**Assignment email** now includes: greeting with name, assessment list with buttons, expiration date, dashboard link, save/bookmark reminder, support contact, copyright footer.

**Reminder email** now includes: greeting, expiration warning, assessment list, login link, copyright footer.

---

## 2. Report Generation Fixes

### 2.1 360 Completion Guard

**Problem:** All report endpoints (generate, CSV, Excel, PDF) blocked with hard `!assignment.completed` check — no exception for 360 assessments that allow partial completion.

**Fix:** Added `&& !assessment?.is_360` exception to 5 API routes:
- `src/app/api/reports/generate/[assignmentId]/route.ts`
- `src/app/api/reports/[assignmentId]/export/csv/route.ts`
- `src/app/api/reports/[assignmentId]/export/excel/route.ts`
- `src/app/api/reports/[assignmentId]/export/pdf/route.ts`
- `src/app/api/reports/[assignmentId]/pdf/route.ts`

### 2.2 CSV Export Null Safety

**Problem:** `.toFixed(2)` called on null values crashes CSV export for partial reports.

**File:** `src/lib/reports/export-csv.ts`
- `overall_score` → `(reportData.overall_score ?? 0).toFixed(2)`
- `generated_at` → conditional date formatting with `'N/A'` fallback

### 2.3 Missing Dimensions in Reports

**Problem:** Dimensions with zero scores silently skipped (`continue`), producing incomplete reports.

**File:** `src/lib/reports/generate-360-report.ts`
- Instead of `continue`, creates dimension entry with zero/null scores
- All dimensions always appear in reports even with no response data
- Zero-scored dimensions still included in overall average calculation

### 2.4 Improved Force Generate Errors

**File:** `src/app/api/reports/generate/[assignmentId]/route.ts`
- Surfaces specific error messages (missing target, group, dimensions)
- Returns 400 for user-fixable errors, 500 for server errors

---

## 3. Assignment Edit Page (New Feature)

### New Files

- **`src/app/dashboard/assignments/[id]/edit/page.tsx`** (68 lines)
  - Server component with auth + role-based access (super_admin, client_admin)
  - Client-scoped authorization check
  - Fetches assignment with user and assessment joins

- **`src/app/dashboard/assignments/[id]/edit/edit-assignment-client.tsx`** (312 lines)
  - Displays assignment details (user, assessment, status badge, dates, URL)
  - Editable expiration date with PATCH to `/api/assignments/{id}`
  - Delete with confirmation dialog (DELETE request)
  - "Add Users to Survey" link when `survey_id` exists
  - Status badges: Pending (orange), Completed (green), Expired (red)
  - Expired warning message with reactivation instructions

- **`src/app/dashboard/assignments/[id]/edit/__tests__/edit-assignment-client.test.tsx`** (138 lines)
  - 10 tests covering rendering, status states, date input, delete flow, survey link

---

## 4. Configuration & Environment Hardening

### `getAppUrl()` Utility

**File:** `src/lib/config.ts`

New exported function that:
- Handles missing protocol: `example.com` → `https://example.com`
- Strips trailing slashes
- Defaults to `http://localhost:3000` when env var missing, empty, or whitespace-only
- Warns in production if URL points to localhost

**Used in 8 files** across invite emails, assignment emails, login links, report PDF generation, and the reminder edge function.

### Whitespace Bug Fix

**Before:** `(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()` — whitespace-only string is truthy, `trim()` gives empty string, produces invalid `https://` URL.

**After:** `(process.env.NEXT_PUBLIC_APP_URL || '').trim() || 'http://localhost:3000'` — trim first, then fallback.

### Vercel Environment Variables Fixed

Three env vars on Vercel production had trailing `\n` corruption:
- `NEXT_PUBLIC_APP_URL` → `https://involved-v2.cyberworldbuilders.dev`
- `SKIP_AUTH_TESTS` → `true`
- `SMTP_FROM_NAME` → `Involved Talent`

Removed and re-added without trailing newlines. Redeployed.

### Test Coverage

**New file:** `src/__tests__/lib/config.test.ts` (85 lines, 10 test cases)
- Protocol addition, preservation, trailing slashes, defaults, whitespace handling

---

## 5. Dimension Ordering

### Database Migration

**File:** `supabase/migrations/20260228233221_add_sort_order_to_dimensions.sql`

```sql
ALTER TABLE dimensions ADD COLUMN sort_order INTEGER DEFAULT 0;
CREATE INDEX idx_dimensions_sort_order ON dimensions(assessment_id, sort_order);
```

Backfills from current alphabetical order so existing reports don't change.

### Queries Updated

All dimension queries changed from `.order('name')` to `.order('sort_order')`:
- `src/app/api/assessments/[id]/dimensions/route.ts`
- `src/lib/reports/generate-360-report.ts`
- `src/lib/reports/generate-leader-blocker-report.ts`
- `src/app/dashboard/assessments/create/create-client.tsx` — assigns `sort_order` based on form order during creation

---

## 6. Mobile UX

**File:** `src/app/assignment/[id]/take/assessment-taking-client.tsx`

- Lowered viewport block threshold from 768px to 640px (allows tablets through)
- Improved block screen messaging:
  - Title: "Please use a larger screen"
  - Step-by-step instructions in styled box
  - Suggests forwarding email or bookmarking the page

---

## 7. Assessment Completion Flow

**Files:**
- `src/app/assignment/[id]/complete/page.tsx` — fetches pending assignments for user
- `src/app/assignment/[id]/complete/assignment-complete-client.tsx` — shows "Next Assessment" cards

After completing an assessment, users see their remaining pending assignments with direct "Start" buttons, encouraging continued completion.

---

## 8. Other Changes

- **`src/app/dashboard/assessments/[id]/edit/edit-client.tsx`** — dimension sort_order wiring in edit UI
- **`src/app/api/auth/request-login-link/route.ts`** — uses `getAppUrl()` for callback URL
- **`src/lib/assignments/url-generator.ts`** — uses `getAppUrl()` as default base URL
- **`scripts/reset-and-seed.sh`** — added `--local` flag to `supabase migration list`

---

## 9. Test Fixes

36 broken tests fixed across 10 files to match code changes:

| File | Changes |
|------|---------|
| `email-service.test.ts` | Updated for inline-styled templates, bulletproof buttons |
| `navigation-component.test.tsx` | Added `userProfile` prop, updated nav items |
| `navigation-consistency.test.tsx` | Added `userProfile` prop |
| `user-form.test.tsx` | Removed username field assertion (now auto-generated) |
| `api-user-routes.test.ts` | Fixed missing `const data =` for `response.json()` |
| `api-user-status.test.ts` | Same fix |
| `confirm-page.test.tsx` | Removed "Back to Sign Up" assertion |
| `group-detail-page.test.tsx` | Changed `role` → `position`, `Role:` → `Position:` |
| `relationship-queries.test.ts` | Updated manager query mocks, `role` → `leader` field |
| `group-user-assignment.test.tsx` | Changed `role` → `position` in mock data |

3 new test files added:
- `src/__tests__/lib/config.test.ts` — 10 tests for `getAppUrl()`
- `src/__tests__/lib/reports/export-csv-null-safety.test.ts` — CSV null guard coverage
- `src/app/dashboard/assignments/[id]/edit/__tests__/edit-assignment-client.test.tsx` — 10 tests for edit page

**Final test results:** 1530 passing, 21 failing (all pre-existing client upload test failures unrelated to this work).

---

## Commits

1. `631fb11` — Fix platform issues from client testing (Feb 2026)
2. `da8d616` — Fix and add tests for platform issue fixes
3. `e171c4b` — Fix supabase migration list to use --local flag
4. `fe320fa` — Add client testing notes from Feb 2026

---

## Deployment

- **Supabase migration** `20260228233221_add_sort_order_to_dimensions` applied to production
- **Vercel env vars** fixed (removed trailing `\n` from 3 variables)
- **Vercel deploy** completed to https://involved-v2.vercel.app

---

## Verification Checklist

- [ ] Send test invite email — verify link works in Gmail AND Outlook
- [ ] Send test assignment email — verify buttons render correctly
- [ ] Send reminder email — verify formatting
- [ ] Generate 360 report with < 100% completion — should succeed
- [ ] Export partial 360 to CSV — no null errors
- [ ] Verify all dimensions appear in reports (including zero-score)
- [ ] Navigate to assignment edit page — extend date, delete with confirmation
- [ ] Open assessment on phone (< 640px) — see block message
- [ ] Open assessment on tablet (640-768px) — should be allowed
- [ ] Verify dimension ordering uses sort_order
- [ ] Complete assessment — see next pending assessments
- [ ] Verify `NEXT_PUBLIC_APP_URL` matches production domain
