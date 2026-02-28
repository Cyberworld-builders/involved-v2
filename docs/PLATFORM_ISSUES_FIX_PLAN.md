# Platform Issues Fix Plan

**Source:** Client testing notes from 2/1/26 (`docs/Platform-Issues-2.1.26.docx`)
**Created:** 2/28/26
**Status:** Approved for implementation

## Context

The client (Craig) tested the platform on 2/1/26 and documented a comprehensive list of issues. This plan addresses all reported issues, organized by priority. Production is a development environment, so we can deploy and test freely.

---

## Phase 1: Critical — Email Links & Environment Setup

### 1.1 Install Vercel CLI & Verify Environment Variables
- Install Vercel CLI: `npm i -g vercel`
- User authenticates and links project
- Inspect `NEXT_PUBLIC_APP_URL` — this is the root cause of broken invite/assignment links
- Verify `EMAIL_FROM` / `AWS_SES_FROM_EMAIL` are set and SES is out of sandbox
- Fix any misconfigured env vars directly via CLI

**Why this matters:** Invite and assignment email links are constructed using `NEXT_PUBLIC_APP_URL`. Login verification links work because they use Supabase-native magic links (independent of this var). If the URL is wrong, every invite and assignment link is broken.

### 1.2 Harden Email Link Generation in Code
Even after fixing env vars, add defensive code so this can't silently break again.

**Files:**
- `src/app/api/users/[id]/invite/route.ts` (line 125-126) — add URL validation logging
- `src/lib/assignments/url-generator.ts` (line 13) — add URL validation
- `src/app/api/assignments/send-email/route.ts` (line 78) — validate before sending
- `src/lib/config.ts` — add a startup validation helper

**Changes:**
- Log a warning if `NEXT_PUBLIC_APP_URL` is missing or localhost in production
- Validate generated URLs are well-formed before including in emails

### 1.3 Fix Outlook Email Compatibility
Outlook strips `<style>` blocks and ignores class-based CSS. Current email templates use these.

**Files:**
- `src/lib/services/email-service.ts` (lines 69-156) — invite email template
- `src/app/api/assignments/send-email/route.ts` (lines 244-257) — assignment email HTML
- `supabase/functions/send-reminder-email/index.ts` (lines 43-74) — reminder email

**Changes:**
- Replace all `<style>` blocks with inline `style=""` attributes
- Use `<table>` layout for email structure (bulletproof for Outlook/Word renderer)
- Use the "bulletproof button" pattern (`<table><tr><td>` with inline styles)
- Keep raw URL text below buttons as fallback

### 1.4 Fix Assessment Name/URL Confusion in Emails
Users see the assessment name and raw URL together and try to copy the title text.

**File:** `src/app/api/assignments/send-email/route.ts` (line 85)

**Changes:**
- Restructure email: single clear "Start Assessment" button per assessment
- Move raw URLs to a clearly separated "If the button doesn't work" section at the bottom
- Visual separation between clickable content and fallback URLs

### 1.5 Investigate Missing Emails
**Files:** Query `email_logs` table, check AWS SES dashboard

**Actions:**
- Check email_logs for failed sends
- Verify SES sender is verified and out of sandbox mode
- Check SPF/DKIM/DMARC records for sending domain
- Check bounce/complaint rates in SES

---

## Phase 2: Critical — Fix Reports

### 2.1 Fix Completion Guard Blocking 360 Partial Reports
The main report endpoint allows 360s without full completion, but ALL other endpoints (generate, CSV, Excel, PDF) have a hard `!assignment.completed` check with no 360 exception.

**Files to add 360 exception (`if (!assignment.completed && !assessment?.is_360)`):**
- `src/app/api/reports/generate/[assignmentId]/route.ts` (line 46)
- `src/app/api/reports/[assignmentId]/export/csv/route.ts` (line 45)
- `src/app/api/reports/[assignmentId]/export/excel/route.ts` (line 45)
- `src/app/api/reports/[assignmentId]/export/pdf/route.ts` (line 69)
- `src/app/api/reports/[assignmentId]/pdf/route.ts` (line 132)

### 2.2 Fix CSV Export Null Safety
CSV generation calls `.toFixed(2)` on values that can be null in partial reports.

**File:** `src/lib/reports/export-csv.ts`

**Changes:**
- `(reportData.overall_score ?? 0).toFixed(2)` instead of `reportData.overall_score.toFixed(2)`
- Add null guards for all dimension scores and rater breakdowns
- Follow the contract in `src/lib/reports/types.ts` (lines 1-15)

### 2.3 Fix Missing Dimensions in 360 Reports
Dimensions with zero scores are silently skipped (`continue` at line 371), causing reports to have fewer dimensions than expected.

**File:** `src/lib/reports/generate-360-report.ts` (around line 371)

**Changes:**
- Instead of `continue`, produce a dimension entry with zero/null scores
- Ensure all dimensions always appear in reports, even with no data

### 2.4 Improve Force Generate Error Messages
The generate endpoint may return generic errors instead of specific ones about missing data.

**File:** `src/app/api/reports/generate/[assignmentId]/route.ts`

**Changes:**
- Surface specific error messages (missing target_id, missing group, no dimensions)
- Return actionable error text to the UI

---

## Phase 3: High Priority — Email Templates, Assignments, Dimensions, Mobile

### 3.1 Update Email Templates with Craig's Text

**Default assignment email template** (user-editable via rich text with shortcodes):
```
Hello {name},

You have been assigned the following assessment(s):
{assessments}

Please click the link above to take you to the dashboard to log in. Please complete your assignments by {expiration-date}.

You can access your assignments at any time from your dashboard ({dashboard-link}).

SAVE this email and BOOKMARK your login page. If you have been assigned multiple assessments, this will help you navigate to the login page.

If you have any questions, please contact us at: support@involvedtalent.com

Thank you!

-Involved Talent Team
© {year} Involved Talent
```

**Reminder email template:**
```
Hello, {name}

This is a reminder to complete your assessments, which will expire {expiration-date}.

You have been assigned to complete: {assessments}

You can login using this link to complete them: {dashboard-link}

© {year} Involved Talent
```

**Files:**
- `src/app/dashboard/assignments/create/create-assignment-client.tsx` — update default email body (around line 63)
- `supabase/functions/send-reminder-email/index.ts` — update hard-coded reminder template with shortcode values

### 3.2 Create Assignment Edit Page
The assignment detail page links to an edit page that doesn't exist yet.

**Files to create:**
- `src/app/dashboard/assignments/[id]/edit/page.tsx` — server component loads assignment
- `src/app/dashboard/assignments/[id]/edit/edit-assignment-client.tsx` — client form

**Features:**
- Extend due date (uses existing PATCH `expires`)
- Delete assignment (uses existing DELETE endpoint) with confirmation dialog
- View assignment details (read-only for fields that can't change)
- "Add users to this survey" button that navigates to create page with `survey_id` pre-filled

### 3.3 Fix Dimension Ordering

**New migration:** `supabase/migrations/XXXXXX_add_sort_order_to_dimensions.sql`
```sql
ALTER TABLE dimensions ADD COLUMN sort_order INTEGER DEFAULT 0;
CREATE INDEX idx_dimensions_sort_order ON dimensions(assessment_id, sort_order);

-- Backfill from current alphabetical order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY assessment_id ORDER BY name ASC) as rn
  FROM dimensions
)
UPDATE dimensions SET sort_order = ordered.rn FROM ordered WHERE dimensions.id = ordered.id;
```

**Files to update:**
- `src/app/api/assessments/[id]/dimensions/route.ts` — change `.order('name')` to `.order('sort_order')`
- `src/lib/reports/generate-360-report.ts` (line 178) — same
- `src/lib/reports/generate-leader-blocker-report.ts` — same
- Assessment dimensions UI — wire drag-drop to persist sort_order via API

### 3.4 Mobile: Block Mobile, Allow Tablets
Keep the mobile block but improve it. Allow tablets (lower threshold).

**File:** `src/app/assignment/[id]/take/assessment-taking-client.tsx` (lines 9, 154-170)

**Changes:**
- Lower viewport threshold from 768px to 640px (allows most tablets)
- Improve the block message: explain why, suggest emailing yourself the link to open on desktop/tablet
- Better styling for the block screen

---

## Phase 4: Medium Priority — UX Improvements

### 4.1 Better Completion Message
**Files:**
- `src/app/assignment/[id]/complete/page.tsx` — fetch other pending assignments for this user
- `src/app/assignment/[id]/complete/assignment-complete-client.tsx` — add "Next Assessment" button if pending assignments exist

### 4.2 Multiple Assignments Dashboard UX
**File:** `src/app/dashboard/assignments/page.tsx`

**Changes:**
- Show progress indicator ("2 of 5 completed")
- Group assignments by survey batch if applicable
- Make "Start Assessment" buttons more prominent

### 4.3 Bulk PDF Generation
**File:** `src/app/api/reports/bulk-export/route.ts` (replace lines 173-180)

**Changes:**
- Add `jszip` dependency
- Implement ZIP creation for multiple report PDFs
- Add UI button for "Generate All PDFs" on the reports/assignments page

### 4.4 Confirmation Dialog Enhancement
**File:** `src/app/dashboard/assignments/create/create-assignment-client.tsx` (lines 792-824)

The dialog already exists. Enhance it:
- Show list of users who will receive assignments
- Show expiration date
- Emphasize that this will send emails (if email toggle is on)

### 4.5 Verify Assessment Deletion UI
- DELETE endpoint already works at `/api/assessments/[id]/route.ts`
- Verify the delete button is visible in the dashboard assessment pages
- Add confirmation dialog if missing

### 4.6 Login Page
- Already clean (no signup/social login visible)
- Verify this is true in production deployment
- No code changes expected

---

## Verification Plan

After each phase, verify:

**Phase 1 (Emails):**
- Send test invite email → verify link works in Gmail AND Outlook
- Send test assignment email → verify link works
- Check email_logs table for delivery records
- Verify `NEXT_PUBLIC_APP_URL` matches production domain

**Phase 2 (Reports):**
- Generate 360 report with < 100% completion → should succeed with partial data
- Force Generate on a partial dataset → should show partial report, not error
- Export CSV for a partial 360 report → should download without errors
- Verify all dimensions appear in report even if some have no data

**Phase 3 (Templates, Assignments, Dimensions, Mobile):**
- Create assignment → verify default email matches Craig's template
- Edit an assignment → extend due date, verify it saves
- Delete an assignment → verify with confirmation
- Reorder dimensions → verify order persists and appears in reports
- Open assessment on phone → see improved block message
- Open assessment on tablet → should be allowed through

**Phase 4 (UX):**
- Complete an assessment with more pending → see "Next Assessment" button
- Bulk export multiple PDFs → get ZIP download
- View assignments dashboard with multiple assignments → see progress
