# E2E Test: Bulk Benchmark Upload Flow

## Overview
This test suite validates the complete end-to-end flow for uploading benchmark data from CSV spreadsheets.

## Test File
`e2e/feature-bulk-benchmark-upload.test.ts`

## Test Coverage

### Core Functionality Tests
1. **Admin can upload benchmark spreadsheet** - Verifies that authenticated users can upload CSV files containing benchmark data
2. **Spreadsheet is parsed correctly** - Validates that CSV files are correctly parsed and the correct number of records are loaded
3. **Benchmarks are created from spreadsheet data** - Tests that uploaded benchmark values are properly saved to the database
4. **Errors are reported for invalid rows** - Ensures that invalid or malformed rows in the CSV are properly handled and reported to the user

### Additional Test Cases
5. **Download CSV template** - Verifies that users can download a correctly formatted template CSV file
6. **Empty CSV file handling** - Tests graceful handling of CSV files with no data rows
7. **File upload button visibility** - Checks that the upload interface is properly rendered
8. **Manual editing after upload** - Validates that users can edit individual benchmark values after bulk upload
9. **CSV parsing with quoted values** - Tests handling of CSV files with quoted fields (commas in values, etc.)

## Test Data
The test suite automatically creates test CSV files in a temporary directory:
- `valid-benchmarks.csv` - Valid benchmark data with all required fields
- `invalid-benchmarks.csv` - Malformed data to test error handling
- `empty-benchmarks.csv` - CSV with headers only
- `quoted-benchmarks.csv` - CSV with quoted values to test parsing

Test files are automatically cleaned up after tests complete.

## Running the Tests

### Run all benchmark upload tests
```bash
npm run test:e2e -- e2e/feature-bulk-benchmark-upload.test.ts
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui -- e2e/feature-bulk-benchmark-upload.test.ts
```

### Run tests in debug mode
```bash
npm run test:e2e:debug -- e2e/feature-bulk-benchmark-upload.test.ts
```

### Run tests on a specific browser
```bash
npx playwright test e2e/feature-bulk-benchmark-upload.test.ts --project=chromium
```

## Prerequisites
- Supabase environment variables must be configured for full test execution
- Authentication setup is required for most tests
- Tests are currently marked as skipped pending authentication setup

## Test Implementation Notes

### Authentication
Most tests are currently skipped with the message "Skipping: Requires authentication setup". To enable these tests:
1. Implement an authentication helper function in the test setup
2. Remove the `test.skip()` calls from individual test cases
3. Ensure test user accounts exist in the database

### CSV Format
The expected CSV format for benchmark uploads:
```csv
Dimension Name,Dimension Code,Value
Business Mindset,BM,3.79
Collaboration,CO,4.03
```

Required fields:
- **Dimension Name** - The name of the dimension
- **Dimension Code** - Short code for the dimension
- **Value** - Numeric benchmark value

## Integration with CI/CD
These tests are configured to run in CI environments through Playwright's configuration in `playwright.config.ts`. The configuration includes:
- Retry on failure in CI
- Single worker in CI to avoid race conditions
- HTML reports for test results
- Screenshots and videos on failure

## Related Files
- Implementation: `/src/app/dashboard/benchmarks/[assessmentId]/[industryId]/benchmarks-manage-client.tsx`
- Sample data: `/examples/csv/benchmarks.csv`
- Database schema: `/supabase/migrations/005_create_benchmarks_table.sql`

## Future Improvements
- [ ] Add authentication helpers for full test execution
- [ ] Add tests for concurrent uploads
- [ ] Add tests for large CSV files (performance testing)
- [ ] Add tests for different CSV encodings (UTF-8, UTF-16, etc.)
- [ ] Add visual regression tests for the upload interface
