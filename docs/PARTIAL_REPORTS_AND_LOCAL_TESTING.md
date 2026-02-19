# Partial Reports and Local Testing

## Partial report contract

Reports can be **partial** when:

- **360:** No or only some raters have completed (`completedCount < total`). The generator returns a report with `partial: true`, `participant_response_summary: { completed, total }`, and placeholder dimension scores (e.g. 0 or null).
- **Leader/Blocker:** No dimension scores yet; `dimensions` may be empty or have null/zero scores.

The single source of truth for report shapes and the contract is **`src/lib/reports/types.ts`**. All consumers (dashboard UI, fullscreen UI, CSV, Excel, React-PDF, Playwright PDF) must:

- Treat numeric fields as possibly null/undefined: use `(value ?? 0).toFixed(...)` or guard with `value != null`.
- Use optional chaining for nested objects (e.g. `dimension.rater_breakdown?.peer`).
- Handle empty `dimensions` array: do not assume `dimensions.length > 0` or `dimensions[0]` exists.
- Never call `.toFixed()`, `.replace()`, or other methods on `undefined` without a fallback.

See the comment block at the top of `src/lib/reports/types.ts` for the full contract.

## Local testing of partial reports

You can validate the partial-report flow locally without deploying.

### 1. Seed a partial 360 scenario

After running the main demo seeder (so a 360 assessment and groups exist):

```bash
npm run seed:360-demo
npm run seed:partial-report
```

The script ensures one 360 group has assignments with **zero completed** raters and prints URLs, for example:

- **Dashboard:** `http://localhost:3000/dashboard/reports/<assignmentId>`
- **Fullscreen:** `http://localhost:3000/reports/<assignmentId>/view`

Open the dashboard URL while logged in (e.g. as `admin@demo.com`), then try fullscreen and PDF export. You should see “Partial report” or “No responses yet” and no crashes.

### 2. Run E2E for partial report view

The Playwright test `e2e/feature-report-partial.test.ts` checks that:

- The dashboard report page and fullscreen report page load without crashing.
- The fullscreen view has a `.page-container` (required for the PDF pipeline).

Prerequisites:

- Same as above: `npm run seed:360-demo` then `npm run seed:partial-report`.
- E2E test user has access (e.g. super_admin) or the partial assignment belongs to a client the test user can access.

Run E2E (with app and Supabase available):

```bash
npm run test:e2e -- e2e/feature-report-partial.test.ts
```

If no partial 360 assignment exists, the test is skipped with a message to run the seed commands.

### 3. Unit tests with partial fixtures

Fixtures and unit tests for partial/empty reports live under:

- **Fixtures:** `src/__tests__/fixtures/reports.ts`  
  - `partial360Report`, `emptyDimensions360Report`, `partialLeaderBlockerReport`, etc.
- **Tests:**  
  - `src/__tests__/lib/reports/generate-360-report.test.ts` – 360 generator with mocked DB (zero completed).  
  - `src/__tests__/lib/reports/generate-leader-blocker-report.test.ts` – Leader/Blocker generator with no dimension scores.  
  - `src/__tests__/lib/reports/export-csv.test.ts`, `export-excel.test.ts` – CSV/Excel with partial fixtures.  
  - `src/__tests__/components/report-views-partial.test.tsx` – Report UI components with partial data.

Run unit tests:

```bash
npm test -- --run src/__tests__/lib/reports src/__tests__/fixtures src/__tests__/components/report-views-partial
```

## Allowing 360 report view before completion

For 360 assessments, the app allows opening the report even when the assignment is **not completed**. That way, when zero raters have responded, users can still open the report and see the “Partial report” / “No responses yet” state. Non-360 assessments still require the assignment to be completed before viewing the report.
