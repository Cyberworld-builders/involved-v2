# Assignments and Assessments Implementation Plan

## Executive Summary

This document outlines the comprehensive plan for implementing the assignment and assessment-taking functionality in V2, based on analysis of the legacy system. The goal is to enable administrators to assign assessments to users and allow users to take those assessments in a way that is consistent with the preview functionality we've already built.

---

## 1. Current State Analysis

### 1.1 V2 Current Implementation

**What Exists:**
- ✅ Assessment creation and editing (`/dashboard/assessments`)
- ✅ Assessment preview (`/dashboard/assessments/[id]/preview`)
- ✅ Assignments table schema (`supabase/migrations/007_create_assignments_table.sql`)
- ✅ Basic assignment structure with fields: `user_id`, `assessment_id`, `target_id`, `custom_fields`, `expires`, `whitelabel`, `job_id`, `url`, `completed`, `started_at`, `completed_at`

**What's Missing:**
- ❌ Answers table (no migration exists)
- ❌ Assignment creation UI
- ❌ Assignment listing/management UI
- ❌ Assignment taking interface (user-facing)
- ❌ Answer saving API endpoints
- ❌ Assignment URL generation and validation
- ❌ Custom fields replacement logic
- ❌ Pagination support for assignments
- ❌ Timer functionality for timed assessments

### 1.2 Legacy System Analysis

#### 1.2.1 Database Schema

**Assignments Table:**
```sql
- id (integer, primary key)
- user_id (integer, foreign key to users)
- assessment_id (integer, foreign key to assessments)
- target_id (integer, foreign key to users, nullable) -- For 360 assessments
- custom_fields (string, serialized) -- JSON: {type: ['name', 'email', 'role'], value: [...]}
- expires (timestamp)
- whitelabel (boolean)
- job_id (integer, nullable)
- url (text) -- Encrypted assignment URL
- completed (boolean)
- started_at (timestamp, nullable)
- completed_at (timestamp, nullable)
- reminder (boolean)
- next_reminder (timestamp, nullable)
- reminder_frequency (string, nullable)
- created_at, updated_at
```

**Answers Table:**
```sql
- id (integer, primary key)
- assignment_id (integer, foreign key to assignments)
- question_id (integer, foreign key to questions)
- user_id (integer, foreign key to users)
- value (text) -- Answer value (can be serialized for complex types)
- time (integer, nullable) -- Response time in seconds
- created_at, updated_at
```

#### 1.2.2 Assignment Flow

1. **Assignment Creation:**
   - Admin selects users and assessments
   - Sets expiration date
   - Optionally sets target user (for 360 assessments)
   - Optionally sets custom fields (target name, email, role)
   - Optionally enables whitelabel
   - System generates encrypted URL
   - Optionally sends email with assignment link

2. **Assignment URL Generation:**
   - Format: `assignment/{id}?u={base64_username}&e={base64_expires}&t={hash}`
   - Hash: `sha256(username + secretkey + url + expires)`
   - Secret key stored in code (not database)
   - URL validation checks hash matches

3. **Assignment Taking:**
   - User clicks assignment URL
   - System validates URL (hash, expiration)
   - Authenticates user (auto-login via URL token)
   - Shows "stage" page (instructions/description)
   - User clicks "Begin Assessment"
   - Shows assessment form with questions
   - Answers saved via AJAX on change
   - Supports pagination (if enabled)
   - Submit button on final page
   - On submit, marks assignment as completed

4. **Answer Saving:**
   - Answers saved immediately on change (AJAX)
   - Endpoint: `POST /assignment/{id}`
   - Payload: `{question_id, value, complete: 0}`
   - Updates or creates answer record
   - On completion: `{complete: 1}` marks assignment complete

#### 1.2.3 Custom Fields Replacement

- Custom fields stored in assignment: `{type: ['name', 'email', 'role'], value: ['John Doe', 'john@example.com', 'Manager']}`
- In assessment/question content, placeholders like `[name]`, `[email]`, `[role]` are replaced
- Helper function `custom_fields($assignment_id, $content)` performs replacement
- Used in: assessment description, question content, instruction text

#### 1.2.4 Question Filtering

- `filteredQuestions()` excludes type 2 (description) and type 10 (instructions)
- Questions ordered by dimension_id or number
- Only actual questions are numbered and displayed
- Descriptions shown but not numbered

#### 1.2.5 Pagination

- If `assessment->paginate` is true, questions split into pages
- Uses Laravel's `simplePaginate($assessment->items_per_page)`
- Previous/Next buttons between pages
- Submit button only on final page

#### 1.2.6 Timer Functionality

- If `assessment->timed` is true, shows countdown timer
- Timer based on `time_limit` (minutes)
- Calculated from `started_at` timestamp
- Timer JavaScript updates display
- Assessment auto-submits or prevents submission when time expires

---

## 2. Required Schema Changes

### 2.1 Answers Table (NEW)

```sql
CREATE TABLE answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  field_id UUID REFERENCES fields(id) ON DELETE CASCADE NOT NULL, -- Note: V2 uses 'fields' not 'questions'
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  value TEXT NOT NULL, -- Answer value (can be JSON for complex types)
  time INTEGER, -- Response time in seconds (nullable)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_answers_assignment_id ON answers(assignment_id);
CREATE INDEX idx_answers_field_id ON answers(field_id);
CREATE INDEX idx_answers_user_id ON answers(user_id);
CREATE UNIQUE INDEX idx_answers_assignment_field ON answers(assignment_id, field_id); -- One answer per question per assignment

-- RLS Policies
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Users can view answers for their own assignments
CREATE POLICY "Users can view their own answers" ON answers
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create/update answers for their own assignments
CREATE POLICY "Users can manage their own answers" ON answers
  FOR ALL USING (auth.uid() = user_id);
```

### 2.2 Assignments Table Updates

**Already exists in V2**, but verify these fields:
- ✅ `url` (TEXT) - for encrypted assignment URL
- ✅ `custom_fields` (JSONB) - already exists
- ❓ Need to verify `reminder`, `next_reminder`, `reminder_frequency` fields (may not be needed initially)

**Optional Fields (for future):**
- `reminder` (BOOLEAN)
- `next_reminder` (TIMESTAMP)
- `reminder_frequency` (TEXT)

---

## 3. Data Flow and Architecture

### 3.1 Assignment Creation Flow

```
Admin Dashboard
  ↓
Select Users + Assessments
  ↓
Set Options (expiration, target, custom_fields, whitelabel)
  ↓
API: POST /api/assignments
  ↓
Create Assignment Records
  ↓
Generate Encrypted URLs
  ↓
Optionally Send Emails
  ↓
Return Success
```

### 3.2 Assignment Taking Flow

```
User Clicks Assignment URL
  ↓
Validate URL (hash, expiration)
  ↓
Auto-authenticate User (or require login)
  ↓
Load Assignment + Assessment
  ↓
Show Stage Page (instructions/description)
  ↓
User Clicks "Begin Assessment"
  ↓
Record started_at timestamp
  ↓
Load Questions (with pagination if enabled)
  ↓
User Answers Questions
  ↓
Auto-save Answers via API (on change)
  ↓
Navigate Pages (if paginated)
  ↓
User Clicks Submit (final page)
  ↓
Mark Assignment Complete
  ↓
Show Completion Page
```

### 3.3 Answer Saving Flow

```
User Changes Answer
  ↓
Client: POST /api/assignments/[id]/answers
  ↓
Validate Assignment Ownership
  ↓
Validate Field ID (belongs to assessment)
  ↓
Create or Update Answer Record
  ↓
Return Success
```

---

## 4. API Endpoints Required

### 4.1 Assignment Management

**POST `/api/assignments`**
- Create new assignment(s)
- Body: `{user_ids: [], assessment_ids: [], expires: Date, target_id?: UUID, custom_fields?: {}, whitelabel?: boolean}`
- Returns: `{assignments: [{id, url, ...}]}`

**GET `/api/assignments`**
- List assignments (filtered by user/client)
- Query params: `?user_id=`, `?client_id=`, `?completed=`
- Returns: `{assignments: [...]}`

**GET `/api/assignments/[id]`**
- Get assignment details
- Returns: `{assignment: {...}, assessment: {...}}`

**PATCH `/api/assignments/[id]`**
- Update assignment (expiration, whitelabel, etc.)
- Body: `{expires?: Date, whitelabel?: boolean, ...}`

**DELETE `/api/assignments/[id]`**
- Delete assignment

**POST `/api/assignments/[id]/send-email`**
- Send assignment email to user
- Body: `{subject: string, body: string}`

### 4.2 Answer Management

**POST `/api/assignments/[id]/answers`**
- Save/update answer
- Body: `{field_id: UUID, value: string | number, complete?: boolean}`
- Returns: `{success: true}`

**GET `/api/assignments/[id]/answers`**
- Get all answers for assignment
- Returns: `{answers: [{field_id, value, time, ...}]}`

**POST `/api/assignments/[id]/complete`**
- Mark assignment as complete
- Body: `{}`
- Returns: `{success: true}`

### 4.3 Assignment Taking

**GET `/assignment/[id]`**
- Validate URL token
- Auto-authenticate if valid
- Show assignment stage page

**GET `/assignment/[id]/take`**
- Show assessment form
- Load questions with pagination
- Return assignment + assessment data

---

## 5. UI Components Required

### 5.1 Admin UI

**Assignment Creation Page** (`/dashboard/assignments/create`)
- User selection (individual, bulk, groups)
- Assessment selection (multi-select)
- Options:
  - Expiration date
  - Target user (for 360 assessments)
  - Custom fields (name, email, role)
  - Whitelabel toggle
  - Send email toggle
  - Email subject/body editor
- Preview of assignments to be created
- Create button

**Assignment List Page** (`/dashboard/assignments`)
- Table of assignments
- Columns: User, Assessment, Assigned Date, Expires, Status, Actions
- Filters: Client, User, Assessment, Status
- Actions: View, Edit, Delete, Resend Email

**Assignment Detail Page** (`/dashboard/assignments/[id]`)
- Assignment information
- User details
- Assessment details
- Answers (if completed)
- Actions: Edit, Delete, Resend Email

### 5.2 User UI

**Assignment Stage Page** (`/assignment/[id]`)
- Assessment description
- Instructions
- "Begin Assessment" button
- Assignment expiration info

**Assessment Taking Page** (`/assignment/[id]/take`)
- Header (logo, title, background)
- Description
- Instructions (if exists)
- Questions (paginated if enabled)
- Answer inputs (multiple choice, text, slider)
- Insights table (for multiple choice)
- Navigation (Previous/Next if paginated)
- Submit button (final page only)
- Timer (if timed)

**Assignment Complete Page** (`/assignment/[id]/complete`)
- Thank you message
- Completion confirmation

---

## 6. Key Implementation Details

### 6.1 Assignment URL Generation

```typescript
function generateAssignmentURL(assignmentId: string, username: string, expires: Date): string {
  const secretKey = process.env.ASSIGNMENT_SECRET_KEY || 'SM9UyHvpf30KHyJLmgvOPLIDJtY1fPoh'
  const url = `assignment/${assignmentId}`
  const expiresStr = expires.toISOString()
  
  const hash = crypto
    .createHash('sha256')
    .update(username + secretKey + url + expiresStr)
    .digest('hex')
  
  const params = new URLSearchParams({
    u: Buffer.from(username).toString('base64'),
    e: Buffer.from(expiresStr).toString('base64'),
    t: Buffer.from(hash).toString('base64')
  })
  
  return `${baseUrl}/${url}?${params.toString()}`
}
```

### 6.2 URL Validation

```typescript
function validateAssignmentURL(assignmentId: string, query: {u?: string, e?: string, t?: string}): boolean {
  if (!query.u || !query.e || !query.t) return false
  
  const username = Buffer.from(query.u, 'base64').toString()
  const expires = new Date(Buffer.from(query.e, 'base64').toString())
  const token = Buffer.from(query.t, 'base64').toString()
  
  // Check expiration
  if (expires < new Date()) return false
  
  // Verify hash
  const secretKey = process.env.ASSIGNMENT_SECRET_KEY || 'SM9UyHvpf30KHyJLmgvOPLIDJtY1fPoh'
  const url = `assignment/${assignmentId}`
  const expectedHash = crypto
    .createHash('sha256')
    .update(username + secretKey + url + expires.toISOString())
    .digest('hex')
  
  return token === expectedHash
}
```

### 6.3 Custom Fields Replacement

```typescript
function replaceCustomFields(content: string, customFields: {type: string[], value: string[]} | null): string {
  if (!customFields || !customFields.type || !customFields.value) {
    return content
  }
  
  let result = content
  
  customFields.type.forEach((fieldType, index) => {
    const fieldValue = customFields.value[index] || ''
    const placeholder = `[${fieldType}]`
    result = result.replace(new RegExp(placeholder, 'gi'), fieldValue)
  })
  
  return result
}
```

### 6.4 Answer Value Handling

**Multiple Choice:**
- Value: `number` (index of selected anchor)

**Text Input:**
- Value: `string` (text content)

**Slider:**
- Value: `number` (slider value, e.g., 1.5)

**Complex Types (future WM types):**
- Value: `JSON string` (serialized object)

### 6.5 Pagination Logic

- Split fields into pages based on `page_break` field type
- Each page shows subset of questions
- Previous/Next navigation
- Submit button only on final page
- Maintain answer state across pages

### 6.6 Timer Implementation

- Store `started_at` when user begins assessment
- Calculate remaining time: `(time_limit * 60) - (now - started_at)`
- Update timer display every second
- Warn user when time is low
- Auto-submit or prevent submission when time expires

---

## 7. Security Considerations

### 7.1 Assignment URL Security

- URLs are time-limited (expiration date)
- URLs are cryptographically signed (hash)
- URLs contain username for validation
- Cannot be guessed or forged

### 7.2 Answer Validation

- Verify assignment belongs to user
- Verify field belongs to assessment
- Verify assignment not already completed
- Verify assignment not expired

### 7.3 RLS Policies

- Users can only view their own assignments
- Users can only create/update their own answers
- Admins can view assignments for their clients
- Admins can create assignments for their clients

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1)
1. Create answers table migration
2. Create assignment creation API endpoint
3. Create answer saving API endpoint
4. Create assignment listing API endpoint
5. Implement URL generation and validation

### Phase 2: Admin UI (Week 2)
1. Assignment creation page
2. Assignment list page
3. Assignment detail page
4. Email sending functionality

### Phase 3: User UI - Basic (Week 3)
1. Assignment stage page
2. Assessment taking page (single page, no pagination)
3. Answer saving (auto-save on change)
4. Assignment completion

### Phase 4: User UI - Advanced (Week 4)
1. Pagination support
2. Timer functionality
3. Custom fields replacement
4. Insights table display
5. Error handling and edge cases

### Phase 5: Testing & Refinement (Week 5)
1. End-to-end testing
2. Edge case handling
3. Performance optimization
4. UI/UX refinements
5. Documentation

---

## 9. Key Differences from Legacy

### 9.1 Schema Differences

**V2 Uses:**
- `fields` table instead of `questions` table
- `field_id` in answers instead of `question_id`
- JSONB for `custom_fields` instead of serialized string
- UUIDs instead of integers for IDs

### 9.2 Question Type Mapping

**Legacy → V2:**
- Type 1 (multiple_choice) → `multiple_choice` or `'1'`
- Type 2 (description) → `description` or `'2'` or `rich_text`
- Type 3 (text_input) → `text_input` or `'3'`
- Type 10 (instructions) → `instructions` or `'10'`
- Type 11 (slider) → `slider` or `'11'`

### 9.3 Answer Value Storage

**Legacy:**
- Multiple choice: index number
- Text: plain string
- Slider: number
- WM types: serialized PHP array

**V2:**
- Multiple choice: index number (same)
- Text: plain string (same)
- Slider: number (same)
- Future WM types: JSON string

---

## 10. Testing Strategy

### 10.1 Unit Tests

- URL generation and validation
- Custom fields replacement
- Answer value parsing
- Question filtering logic
- Pagination logic

### 10.2 Integration Tests

- Assignment creation flow
- Answer saving flow
- Assignment completion flow
- URL validation flow
- Email sending

### 10.3 E2E Tests

- Full assignment creation and taking flow
- Multi-page assessment flow
- Timer functionality
- Custom fields replacement
- Error scenarios

---

## 11. Open Questions / Decisions Needed

1. **Reminder System**: Do we need reminder functionality initially, or can this be Phase 2?
2. **WM Types**: Should we implement WM question types now or defer?
3. **Translation Support**: Do we need multi-language support initially?
4. **Job Integration**: How important is job_id linking initially?
5. **Bulk Operations**: Should bulk assignment creation be in Phase 1 or Phase 2?
6. **Email Templates**: Do we need customizable email templates or simple text?
7. **Assignment Expiration Handling**: What happens when assignment expires mid-taking?
8. **Answer Editing**: Can users edit answers after submission, or is it final?

---

## 12. Success Criteria

- ✅ Admins can create assignments for users
- ✅ Users receive assignment links (via email or dashboard)
- ✅ Users can take assessments with full question support
- ✅ Answers are saved automatically
- ✅ Assessments can be completed and submitted
- ✅ Pagination works correctly
- ✅ Custom fields are replaced in content
- ✅ Timer works for timed assessments
- ✅ Assignment URLs are secure and time-limited
- ✅ Preview and actual taking experience are consistent

---

## Appendix A: File Structure

```
src/
  app/
    api/
      assignments/
        [id]/
          answers/
            route.ts          # POST answers
          complete/
            route.ts          # POST complete assignment
          route.ts            # GET, PATCH, DELETE assignment
        route.ts              # GET list, POST create
    assignment/
      [id]/
        page.tsx              # Assignment stage page
        take/
          page.tsx            # Assessment taking page
        complete/
          page.tsx            # Completion page
    dashboard/
      assignments/
        page.tsx              # Assignment list
        create/
          page.tsx            # Create assignments
        [id]/
          page.tsx            # Assignment detail
  components/
    assignments/
      assignment-form.tsx     # Assignment creation form
      assignment-list.tsx     # Assignment list table
      assignment-take-client.tsx  # Assessment taking client component
  lib/
    assignments/
      url-generator.ts        # URL generation/validation
      custom-fields.ts        # Custom fields replacement
      answer-handler.ts        # Answer value parsing
```

---

## Appendix B: Environment Variables

```env
ASSIGNMENT_SECRET_KEY=SM9UyHvpf30KHyJLmgvOPLIDJtY1fPoh  # For URL hashing
```

---

## 13. Report Generation Compatibility

**✅ CRITICAL: Schema changes are fully compatible with report generation.**

See `REPORT_GENERATION_PERFORMANCE_ANALYSIS.md` for detailed analysis. Key findings:

- **Schema Compatibility:** V2 schema (`fields` table, `field_id` in answers) is fully compatible with legacy report generation patterns
- **Performance Opportunity:** V2 enables significant performance improvements (10-100x faster) by using SQL JOINs instead of N+1 queries
- **No Bottlenecks:** No new performance bottlenecks introduced; all legacy patterns can be replicated with better performance

**Recommended Optimizations:**
1. Use SQL JOINs for answer filtering (Phase 1)
2. Batch dimension queries (Phase 1)
3. Implement dimension score caching (Phase 2)
4. Consider materialized views for reports (Phase 3)

---

## Next Steps

1. Review and approve this plan
2. Review `REPORT_GENERATION_PERFORMANCE_ANALYSIS.md` for performance considerations
3. Create answers table migration (with proper indexes for report queries)
4. Begin Phase 1 implementation
5. Set up testing framework
6. Iterate based on feedback
