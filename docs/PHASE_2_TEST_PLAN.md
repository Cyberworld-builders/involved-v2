# Phase 2 Test Plan: Assessment Management and Assignment

## Document Purpose

This document outlines comprehensive test scenarios for Phase 2 features of the Involved Talent v2 platform. It serves as a guide for:
- Creating demo articles in the Resources section
- Validating Phase 2 deliverables meet acceptance criteria
- Demonstrating functionality for client approval
- Ensuring all Phase 2 requirements are met before milestone payment

## Phase 2 Overview

**Summary of Deliverables:**
- Assessment management (CRUD operations)
- Assessment assignment to users and groups
- Assessment duplication
- Assessment preview
- Assessment publishing
- Assessment deletion
- Assignment notification emails
- Assignment email reminders
- Assignment completion
- Assignment progress tracking

---

## Test Structure

Each feature area includes:
1. **Feature Description** - What the feature does
2. **Acceptance Criteria** - Requirements that must be met
3. **Test Scenarios** - Step-by-step test cases
4. **Expected Results** - What should happen
5. **Demo Article Outline** - Structure for resources section articles

---

## 1. Assessment Management

### 1.1 Assessment Creation

**Feature Description:**
Admins can create new assessments with comprehensive configuration options including appearance, settings, dimensions, and fields.

**Acceptance Criteria:**
- ✅ Admin can create a new assessment from the assessments list page
- ✅ Assessment form includes all required fields:
  - Title (required)
  - Description (rich text with WYSIWYG editor)
  - Logo (image upload, optional)
  - Background Image (image upload, optional)
  - Primary Color (color picker, optional)
  - Accent Color (color picker, optional)
  - Split Questions into Pages (boolean)
  - Number of Questions per Page (number, shown when split enabled)
  - 360 Assessment (boolean)
  - Number of Questions (number, shown when 360 is false)
- ✅ Rich text fields render with formatting on assessment page
- ✅ Images can be uploaded and removed (set to null)
- ✅ Form validates required fields before submission
- ✅ Assessment is saved to database with all fields
- ✅ Success message displayed after creation
- ✅ User redirected to assessment edit page after creation

**Test Scenarios:**

**Scenario 1.1.1: Create Basic Assessment**
1. Navigate to `/dashboard/assessments`
2. Click "Create Assessment" button
3. Fill in:
   - Title: "Leadership Assessment"
   - Description: "A comprehensive leadership evaluation"
   - 360 Assessment: No
   - Number of Questions: 20
4. Click "Save Assessment"
5. Verify success message appears
6. Verify redirected to edit page
7. Verify assessment appears in assessments list

**Scenario 1.1.2: Create Assessment with Images**
1. Create new assessment
2. Upload logo image
3. Upload background image
4. Set primary color: #3B82F6
5. Set accent color: #10B981
6. Save assessment
7. Verify images are displayed in preview
8. Verify colors are applied in preview

**Scenario 1.1.3: Create 360 Assessment**
1. Create new assessment
2. Set "360 Assessment" to Yes
3. Verify "Number of Questions" field is hidden
4. Save assessment
5. Verify assessment is marked as 360 type

**Scenario 1.1.4: Create Assessment with Page Splitting**
1. Create new assessment
2. Enable "Split Questions into Pages"
3. Verify "Number of Questions per Page" field appears
4. Set value to 5
5. Save assessment
6. Verify pagination settings are saved

**Demo Article Outline:**
- Title: "Creating Your First Assessment"
- Sections:
  1. Introduction to assessment creation
  2. Required vs optional fields
  3. Step-by-step: Basic assessment
  4. Step-by-step: Assessment with branding
  5. Step-by-step: 360 vs non-360 assessments
  6. Best practices and tips

---

### 1.2 Assessment Editing

**Feature Description:**
Admins can edit existing assessments, updating all fields and configurations.

**Acceptance Criteria:**
- ✅ Admin can access edit page from assessments list
- ✅ All fields are pre-populated with current values
- ✅ Changes can be saved successfully
- ✅ Images can be updated or removed
- ✅ Form validation works on edit
- ✅ Changes persist after page refresh

**Test Scenarios:**

**Scenario 1.2.1: Edit Assessment Details**
1. Navigate to existing assessment
2. Click "Edit" button
3. Change title to "Updated Leadership Assessment"
4. Update description with rich text formatting
5. Save changes
6. Verify changes are reflected in list and detail views

**Scenario 1.2.2: Update Assessment Images**
1. Edit assessment with existing logo
2. Remove logo (set to null)
3. Upload new background image
4. Save changes
5. Verify logo is removed
6. Verify new background image displays

**Scenario 1.2.3: Toggle 360 Assessment**
1. Edit non-360 assessment
2. Change "360 Assessment" to Yes
3. Verify "Number of Questions" field disappears
4. Save changes
5. Verify assessment type updated

**Demo Article Outline:**
- Title: "Editing and Updating Assessments"
- Sections:
  1. Accessing the edit interface
  2. Updating assessment details
  3. Managing images and branding
  4. Changing assessment type
  5. Troubleshooting common issues

---

### 1.3 Dimensions Management

**Feature Description:**
Admins can add, edit, reorder, and delete dimensions within an assessment.

**Acceptance Criteria:**
- ✅ Admin can add new dimensions
- ✅ Dimensions have name and code fields
- ✅ Dimensions can be reordered (drag-and-drop or up/down buttons)
- ✅ Dimensions can be edited inline
- ✅ Dimensions can be deleted with confirmation
- ✅ Dimension order persists after save

**Test Scenarios:**

**Scenario 1.3.1: Add Dimensions**
1. Edit assessment
2. Navigate to Dimensions tab
3. Click "Add Dimension"
4. Enter name: "Communication"
5. Enter code: "COMM"
6. Save dimension
7. Verify dimension appears in list

**Scenario 1.3.2: Reorder Dimensions**
1. Assessment with multiple dimensions
2. Use drag-and-drop to reorder
3. Save assessment
4. Verify order persists
5. Verify order reflected in preview

**Scenario 1.3.3: Delete Dimension**
1. Select dimension to delete
2. Click delete button
3. Confirm deletion
4. Verify dimension removed
5. Verify associated fields are handled appropriately

**Demo Article Outline:**
- Title: "Managing Assessment Dimensions"
- Sections:
  1. What are dimensions?
  2. Adding dimensions
  3. Organizing dimensions
  4. Dimension best practices
  5. Troubleshooting

---

### 1.4 Fields Management

**Feature Description:**
Admins can add different types of fields (Rich Text, Multiple Choice, Slider, Free Text) to assessments, configure anchors, and manage field order.

**Acceptance Criteria:**
- ✅ Admin can add Rich Text fields
- ✅ Admin can add Multiple Choice fields with anchors
- ✅ Admin can add Slider fields with anchors
- ✅ Admin can add Free Text fields
- ✅ Anchors can be added, edited, and removed
- ✅ Anchor templates can be applied
- ✅ Anchor values can be reversed with one click
- ✅ HTML table parsing works for insights table
- ✅ Fields can be reordered
- ✅ Fields are associated with dimensions
- ✅ Field order persists

**Test Scenarios:**

**Scenario 1.4.1: Add Rich Text Field**
1. Edit assessment
2. Navigate to Fields tab
3. Click "Add Field"
4. Select "Rich Text"
5. Enter content with WYSIWYG editor
6. Assign to dimension
7. Save field
8. Verify field appears in preview

**Scenario 1.4.2: Add Multiple Choice Field with Anchors**
1. Add Multiple Choice field
2. Enter question text
3. Assign to dimension
4. Click "Add Anchor"
5. Add 5 anchors with names and values
6. Save field
7. Verify anchors appear in preview

**Scenario 1.4.3: Apply Anchor Template**
1. Add Multiple Choice field
2. Click "Apply Template"
3. Select "Below Expectations" template
4. Verify 5 anchors populated automatically
5. Verify values are correct (1-5)
6. Save field

**Scenario 1.4.4: Reverse Anchor Values**
1. Field with anchors (values 1, 2, 3, 4, 5)
2. Click "Reverse Values" button
3. Verify values change to 5, 4, 3, 2, 1
4. Save field
5. Verify reversed values persist

**Scenario 1.4.5: Parse HTML Table for Insights**
1. Add Multiple Choice field
2. Paste HTML table into "Parse HTML" field
3. Click "Parse Table"
4. Verify insights table populated with cell content
5. Verify anchors remain unchanged
6. Save field

**Scenario 1.4.6: Add Slider Field**
1. Add Slider field
2. Configure anchors (min/max values)
3. Assign to dimension
4. Save field
5. Verify slider appears in preview

**Scenario 1.4.7: Add Free Text Field**
1. Add Free Text field
2. Enter prompt/question
3. Assign to dimension
4. Save field
5. Verify text area appears in preview

**Demo Article Outline:**
- Title: "Building Assessment Questions: Fields and Anchors"
- Sections:
  1. Field types overview
  2. Adding Rich Text fields
  3. Creating Multiple Choice questions
  4. Using anchor templates
  5. Configuring slider fields
  6. HTML table parsing for insights
  7. Best practices for question design

---

### 1.5 Assessment Preview

**Feature Description:**
Admins can preview assessments before publishing to see exactly how they will appear to users.

**Acceptance Criteria:**
- ✅ Preview button available on assessment edit page
- ✅ Preview shows assessment exactly as users will see it
- ✅ All fields render correctly
- ✅ Images and colors display properly
- ✅ Pagination works if enabled
- ✅ Navigation (Next/Previous) scrolls to questions section
- ✅ Assessment description is hidden (meta field only)
- ✅ Logo hides title if logo exists

**Test Scenarios:**

**Scenario 1.5.1: Preview Basic Assessment**
1. Edit assessment with multiple fields
2. Click "Preview" button
3. Verify assessment renders correctly
4. Verify all fields display
5. Verify navigation works
6. Verify styling matches preview

**Scenario 1.5.2: Preview with Pagination**
1. Assessment with page splitting enabled
2. Preview assessment
3. Verify questions split across pages
4. Click "Next" button
5. Verify scrolls to top of questions section
6. Verify pagination controls work

**Scenario 1.5.3: Preview with Branding**
1. Assessment with logo and colors
2. Preview assessment
3. Verify logo displays
4. Verify title is hidden (logo present)
5. Verify colors applied correctly

**Demo Article Outline:**
- Title: "Previewing Assessments Before Publishing"
- Sections:
  1. Why preview is important
  2. Accessing the preview
  3. Testing navigation and pagination
  4. Verifying branding elements
  5. Common preview issues

---

### 1.6 Assessment Publishing

**Feature Description:**
Admins can publish assessments to make them available for assignment. Draft assessments cannot be assigned.

**Acceptance Criteria:**
- ✅ Assessment has draft/published status
- ✅ Draft status is default for new assessments
- ✅ Admin can toggle between draft and published
- ✅ Only published assessments appear in assignment dropdown
- ✅ Status change persists after save
- ✅ Visual indicator shows current status

**Test Scenarios:**

**Scenario 1.6.1: Publish Assessment**
1. Edit draft assessment
2. Locate publish/draft toggle
3. Change status to "Published"
4. Save assessment
5. Verify status indicator shows "Published"
6. Verify assessment appears in assignment dropdown

**Scenario 1.6.2: Unpublish Assessment**
1. Edit published assessment
2. Change status to "Draft"
3. Save assessment
4. Verify status indicator shows "Draft"
5. Verify assessment removed from assignment dropdown

**Scenario 1.6.3: Assign Draft Assessment (Should Fail)**
1. Navigate to assignment creation
2. Verify draft assessments do not appear in dropdown
3. Attempt to select draft assessment
4. Verify it's not available

**Demo Article Outline:**
- Title: "Publishing Assessments for Assignment"
- Sections:
  1. Understanding draft vs published
  2. How to publish an assessment
  3. When to use draft status
  4. Troubleshooting assignment issues

---

### 1.7 Assessment Duplication

**Feature Description:**
Admins can duplicate existing assessments, creating a copy with all fields, dimensions, and anchors.

**Acceptance Criteria:**
- ✅ Duplicate button available on assessment list
- ✅ Duplicate includes all assessment details
- ✅ Duplicate includes all dimensions
- ✅ Duplicate includes all fields
- ✅ Duplicate includes all anchors
- ✅ Title has "[DUPLICATE]" appended
- ✅ Duplicate is created as draft
- ✅ Original assessment unchanged

**Test Scenarios:**

**Scenario 1.7.1: Duplicate Simple Assessment**
1. Navigate to assessments list
2. Click duplicate button on assessment
3. Verify new assessment created
4. Verify title includes "[DUPLICATE]"
5. Verify all fields copied
6. Verify status is draft

**Scenario 1.7.2: Duplicate Complex Assessment**
1. Assessment with multiple dimensions
2. Assessment with multiple fields per dimension
3. Assessment with anchors and templates
4. Duplicate assessment
5. Verify all dimensions copied
6. Verify all fields copied
7. Verify all anchors copied
8. Verify field order preserved

**Demo Article Outline:**
- Title: "Duplicating Assessments"
- Sections:
  1. When to duplicate assessments
  2. How duplication works
  3. What gets copied
  4. Customizing duplicates
  5. Best practices

---

### 1.8 Assessment Deletion

**Feature Description:**
Admins can delete assessments with proper authorization checks and confirmation.

**Acceptance Criteria:**
- ✅ Delete button available on assessment list
- ✅ Confirmation dialog appears before deletion
- ✅ Only assessment owner or super admin can delete
- ✅ Deletion removes assessment from database
- ✅ Associated assignments handled appropriately
- ✅ Success message displayed

**Test Scenarios:**

**Scenario 1.8.1: Delete Assessment**
1. Navigate to assessments list
2. Click delete button
3. Confirm deletion in dialog
4. Verify assessment removed from list
5. Verify success message

**Scenario 1.8.2: Cancel Deletion**
1. Click delete button
2. Click "Cancel" in confirmation dialog
3. Verify assessment still exists
4. Verify no changes made

**Scenario 1.8.3: Delete Assessment with Assignments**
1. Assessment with existing assignments
2. Attempt to delete
3. Verify appropriate handling (warning or prevention)
4. Verify data integrity maintained

**Demo Article Outline:**
- Title: "Deleting Assessments"
- Sections:
  1. When to delete assessments
  2. Deletion process
  3. Impact on assignments
  4. Recovery options
  5. Best practices

---

## 2. Assessment Assignment

### 2.1 Assignment Creation

**Feature Description:**
Admins and managers can assign assessments to individual users or groups, configure settings, and optionally send notification emails.

**Acceptance Criteria:**
- ✅ Assignment form accessible from client detail page
- ✅ Can select assessment (only published)
- ✅ Can select individual users
- ✅ Can select groups
- ✅ Can set target user (for 360 assessments)
- ✅ Can configure expiration date
- ✅ Can enable/disable email notifications
- ✅ Can configure email reminders
- ✅ Can set reminder frequency
- ✅ Assignment URL generated automatically
- ✅ Assignment saved to database
- ✅ Success message displayed

**Test Scenarios:**

**Scenario 2.1.1: Assign to Individual User**
1. Navigate to client detail page
2. Click "Assignments" tab
3. Click "Create Assignment"
4. Select published assessment
5. Select individual user
6. Set expiration date (7 days from now)
7. Enable email notification
8. Click "Create Assignment"
9. Verify success message
10. Verify assignment appears in list

**Scenario 2.1.2: Assign to Group**
1. Create assignment
2. Select group instead of individual user
3. Verify all group members receive assignment
4. Verify separate assignment records created per user

**Scenario 2.1.3: Assign 360 Assessment with Target**
1. Select 360 assessment
2. Verify "Target" field appears
3. Select target user
4. Create assignment
5. Verify target set correctly
6. Verify assignment URL includes target info

**Scenario 2.1.4: Configure Email Reminders**
1. Create assignment
2. Enable "Email Reminders"
3. Select frequency: "1 Week"
4. Create assignment
5. Verify reminder settings saved
6. Verify next_reminder calculated correctly

**Scenario 2.1.5: Assignment Without Email**
1. Create assignment
2. Disable email notification
3. Create assignment
4. Verify assignment created
5. Verify no email sent
6. Verify assignment URL available in UI

**Demo Article Outline:**
- Title: "Assigning Assessments to Users and Groups"
- Sections:
  1. Accessing assignment creation
  2. Selecting assessments and users
  3. Configuring assignment settings
  4. Email notifications and reminders
  5. Bulk assignments via groups
  6. Best practices

---

### 2.2 Assignment URL Generation and Validation

**Feature Description:**
System generates secure, signed URLs for assignments that can be validated and expire after set time.

**Acceptance Criteria:**
- ✅ Assignment URL generated on creation
- ✅ URL is secure and signed
- ✅ URL includes assignment ID
- ✅ URL validates correctly
- ✅ Expired URLs are rejected
- ✅ Invalid URLs are rejected
- ✅ URL accessible without login (token-based)

**Test Scenarios:**

**Scenario 2.2.1: Access Valid Assignment URL**
1. Create assignment
2. Copy assignment URL
3. Open URL in incognito browser
4. Verify assignment page loads
5. Verify no login required
6. Verify assignment details correct

**Scenario 2.2.2: Access Expired Assignment URL**
1. Assignment with expired date
2. Attempt to access URL
3. Verify error message displayed
4. Verify assignment not accessible

**Scenario 2.2.3: Access Invalid Assignment URL**
1. Modify assignment URL (change hash)
2. Attempt to access
3. Verify error message
4. Verify assignment not accessible

**Demo Article Outline:**
- Title: "Assignment URLs and Security"
- Sections:
  1. How assignment URLs work
  2. URL security features
  3. Expiration handling
  4. Troubleshooting URL issues

---

### 2.3 Assignment Notification Emails

**Feature Description:**
Users receive email notifications when assessments are assigned to them, with direct links to the assessment.

**Acceptance Criteria:**
- ✅ Email sent when assignment created (if enabled)
- ✅ Email includes assignment link
- ✅ Email includes assessment title
- ✅ Email includes target name (if 360)
- ✅ Email includes expiration date
- ✅ Email uses proper branding
- ✅ Email template matches legacy system
- ✅ [name] shortcode populated with target

**Test Scenarios:**

**Scenario 2.3.1: Receive Assignment Email**
1. Create assignment with email enabled
2. Verify email sent to user
3. Open email
4. Verify link works
5. Verify all details correct
6. Verify branding applied

**Scenario 2.3.2: Email with Target Name**
1. Create 360 assignment with target
2. Verify email sent
3. Verify target name in email
4. Verify [name] shortcode populated

**Scenario 2.3.3: Email Without Notification**
1. Create assignment without email
2. Verify no email sent
3. Verify assignment still created

**Demo Article Outline:**
- Title: "Assignment Email Notifications"
- Sections:
  1. Email notification setup
  2. Email content and formatting
  3. Direct links in emails
  4. Troubleshooting email issues

---

### 2.4 Assignment Email Reminders

**Feature Description:**
System can send automated reminder emails for incomplete assignments based on configured frequency.

**Acceptance Criteria:**
- ✅ Reminders can be enabled per assignment
- ✅ Reminder frequency configurable (1 week, 2 weeks, 3 weeks, monthly)
- ✅ Reminders sent automatically via cron job
- ✅ next_reminder calculated correctly
- ✅ Reminders stop when assignment completed
- ✅ Reminder emails include assignment link

**Test Scenarios:**

**Scenario 2.4.1: Receive Reminder Email**
1. Create assignment with reminders enabled
2. Set frequency to "1 Week"
3. Wait for reminder trigger (or manually trigger)
4. Verify reminder email sent
5. Verify next_reminder updated
6. Verify link in email works

**Scenario 2.4.2: Reminders Stop on Completion**
1. Assignment with reminders enabled
2. User completes assignment
3. Verify no further reminders sent
4. Verify reminder job skips completed assignments

**Scenario 2.4.3: Multiple Reminder Frequencies**
1. Create multiple assignments with different frequencies
2. Verify each gets reminder at correct interval
3. Verify next_reminder calculated correctly for each

**Demo Article Outline:**
- Title: "Automated Assignment Reminders"
- Sections:
  1. Setting up reminders
  2. Reminder frequency options
  3. How reminders work
  4. Managing reminders
  5. Troubleshooting

---

## 3. Assessment Taking (User-Facing)

### 3.1 Assignment Stage Page

**Feature Description:**
Users see an initial stage page with instructions before beginning the assessment.

**Acceptance Criteria:**
- ✅ Stage page accessible via assignment URL
- ✅ Shows assessment title (or logo if present)
- ✅ Shows assessment description/instructions
- ✅ Shows target name (if 360)
- ✅ Shows expiration date
- ✅ "Begin Assessment" button available
- ✅ Logo hides title if present

**Test Scenarios:**

**Scenario 3.1.1: View Stage Page**
1. Access assignment URL
2. Verify stage page displays
3. Verify all information correct
4. Verify "Begin Assessment" button present

**Scenario 3.1.2: Stage Page with Logo**
1. Assessment with logo
2. Access assignment URL
3. Verify logo displays
4. Verify title is hidden

**Scenario 3.1.3: Begin Assessment**
1. On stage page
2. Click "Begin Assessment"
3. Verify redirects to assessment taking page
4. Verify questions display

**Demo Article Outline:**
- Title: "Starting an Assessment Assignment"
- Sections:
  1. Accessing your assignment
  2. Understanding the stage page
  3. Beginning the assessment
  4. What to expect

---

### 3.2 Assessment Taking Interface

**Feature Description:**
Users can take assessments, answering questions across multiple pages if pagination is enabled.

**Acceptance Criteria:**
- ✅ Assessment renders correctly
- ✅ All field types display properly
- ✅ Navigation works (Next/Previous)
- ✅ Answers can be entered/selected
- ✅ Answers save automatically
- ✅ Progress tracked
- ✅ Pagination works if enabled
- ✅ Text fields have readable text color
- ✅ [name] shortcode populated with target

**Test Scenarios:**

**Scenario 3.2.1: Take Simple Assessment**
1. Begin assessment
2. Answer all questions
3. Verify answers save
4. Click "Submit" on final page
5. Verify completion message
6. Verify assignment marked complete

**Scenario 3.2.2: Take Assessment with Pagination**
1. Assessment with page splitting
2. Answer questions on page 1
3. Click "Next"
4. Verify scrolls to top of questions
5. Answer questions on page 2
6. Click "Previous"
7. Verify returns to page 1
8. Verify answers preserved

**Scenario 3.2.3: Answer Different Field Types**
1. Assessment with multiple field types
2. Answer Multiple Choice question
3. Answer Slider question
4. Answer Free Text question
5. Verify all answers save correctly
6. Verify answers display in results

**Scenario 3.2.4: Resume Incomplete Assessment**
1. Start assessment
2. Answer some questions
3. Close browser
4. Return to assignment URL
5. Verify previous answers loaded
6. Verify can continue where left off

**Demo Article Outline:**
- Title: "Taking an Assessment"
- Sections:
  1. Assessment interface overview
  2. Answering different question types
  3. Navigation and pagination
  4. Saving progress
  5. Submitting your assessment
  6. Troubleshooting

---

### 3.3 Assessment Completion

**Feature Description:**
Users can complete assessments, which marks the assignment as complete and saves all answers.

**Acceptance Criteria:**
- ✅ Submit button available on final page
- ✅ All answers saved before completion
- ✅ Assignment marked as completed
- ✅ completed_at timestamp set
- ✅ Completion message displayed
- ✅ User redirected to completion page
- ✅ No further edits allowed

**Test Scenarios:**

**Scenario 3.3.1: Complete Assessment**
1. Answer all questions
2. Click "Submit Assessment"
3. Verify completion message
4. Verify assignment status updated
5. Verify completion timestamp set

**Scenario 3.3.2: Attempt to Edit Completed Assessment**
1. Completed assessment
2. Attempt to access assignment URL
3. Verify completion page shown
4. Verify cannot edit answers

**Demo Article Outline:**
- Title: "Completing Your Assessment"
- Sections:
  1. Final review before submission
  2. Submitting your assessment
  3. What happens after completion
  4. Viewing your results

---

## 4. Assignment Management and Tracking

### 4.1 Assignment List View

**Feature Description:**
Admins and managers can view all assignments for a client, filter by status, and see progress.

**Acceptance Criteria:**
- ✅ Assignments list displays all assignments
- ✅ Can filter by status (pending, in progress, completed)
- ✅ Shows assignment details (user, assessment, status, dates)
- ✅ Shows completion percentage
- ✅ Can navigate to assignment details
- ✅ Can view assignment results

**Test Scenarios:**

**Scenario 4.1.1: View Assignments List**
1. Navigate to client assignments tab
2. Verify all assignments displayed
3. Verify status indicators correct
4. Verify dates displayed

**Scenario 4.1.2: Filter Assignments**
1. Filter by "Completed"
2. Verify only completed assignments shown
3. Filter by "Pending"
4. Verify only pending assignments shown

**Demo Article Outline:**
- Title: "Managing Assignment Progress"
- Sections:
  1. Viewing assignments
  2. Understanding status indicators
  3. Filtering and searching
  4. Tracking completion

---

### 4.2 Assignment Results View

**Feature Description:**
Admins and managers can view completed assessment results, seeing all answers submitted by users.

**Acceptance Criteria:**
- ✅ Results page accessible from assignment list
- ✅ Shows all questions and answers
- ✅ Answers displayed correctly by type
- ✅ Results match assessment preview format
- ✅ Can export results (if implemented)

**Test Scenarios:**

**Scenario 4.2.1: View Assignment Results**
1. Navigate to completed assignment
2. Click "View Results"
3. Verify all questions displayed
4. Verify all answers displayed
5. Verify formatting matches preview

**Scenario 4.2.2: View Results for Different Field Types**
1. Assessment with multiple field types
2. View results
3. Verify Multiple Choice answers display
4. Verify Slider values display
5. Verify Free Text answers display

**Demo Article Outline:**
- Title: "Viewing Assessment Results"
- Sections:
  1. Accessing results
  2. Understanding the results view
  3. Interpreting answers
  4. Exporting results

---

## 5. Integration and Edge Cases

### 5.1 Random Question Selection

**Feature Description:**
Non-360 assessments with number_of_questions set will randomly select questions from the pool.

**Acceptance Criteria:**
- ✅ Questions selected randomly for each user
- ✅ Questions distributed evenly across dimensions
- ✅ Number of questions matches configuration
- ✅ Each user gets unique question set (high probability)

**Test Scenarios:**

**Scenario 5.1.1: Random Question Selection**
1. Assessment with 80 questions, number_of_questions = 20
2. Assign to multiple users
3. Verify each user gets 20 questions
4. Verify questions differ between users
5. Verify questions distributed across dimensions

**Demo Article Outline:**
- Title: "Random Question Selection in Assessments"
- Sections:
  1. How random selection works
  2. Configuring question pools
  3. Ensuring question diversity
  4. Best practices

---

### 5.2 360 Assessment Flow

**Feature Description:**
360 assessments have special handling for targets and use all questions in order.

**Acceptance Criteria:**
- ✅ Target selection required for 360 assignments
- ✅ All questions presented (no random selection)
- ✅ Questions in static order
- ✅ Target name populated in content
- ✅ Results show target context

**Test Scenarios:**

**Scenario 5.2.1: Assign 360 Assessment**
1. Create 360 assessment
2. Assign to user
3. Verify target selection required
4. Verify all questions included
5. Verify questions in order
6. Verify target name in content

**Demo Article Outline:**
- Title: "360 Assessment Workflow"
- Sections:
  1. Understanding 360 assessments
  2. Setting up 360 assignments
  3. Target selection
  4. Taking 360 assessments
  5. Viewing 360 results

---

## 6. Acceptance Testing Checklist

Use this checklist to verify all Phase 2 requirements are met:

### Assessment Management
- [ ] Can create assessments with all field types
- [ ] Can edit assessments
- [ ] Can add/remove dimensions
- [ ] Can add/remove fields
- [ ] Can configure anchors and templates
- [ ] Can preview assessments
- [ ] Can publish/unpublish assessments
- [ ] Can duplicate assessments
- [ ] Can delete assessments
- [ ] Images can be uploaded and removed
- [ ] Rich text formatting works
- [ ] HTML table parsing works

### Assessment Assignment
- [ ] Can assign to individual users
- [ ] Can assign to groups
- [ ] Can set target for 360 assessments
- [ ] Can configure expiration dates
- [ ] Can enable/disable email notifications
- [ ] Can configure reminders
- [ ] Assignment URLs generated correctly
- [ ] URLs validate and expire properly

### Email Functionality
- [ ] Assignment emails sent when enabled
- [ ] Emails include correct links
- [ ] Reminder emails sent automatically
- [ ] Reminder frequency works correctly
- [ ] Emails stop when assignment completed
- [ ] [name] shortcode populated correctly

### Assessment Taking
- [ ] Stage page displays correctly
- [ ] Assessment interface works
- [ ] All field types functional
- [ ] Navigation works
- [ ] Answers save automatically
- [ ] Pagination works if enabled
- [ ] Assessment can be completed
- [ ] Completion tracked correctly

### Assignment Management
- [ ] Assignment list displays correctly
- [ ] Can filter by status
- [ ] Can view results
- [ ] Results display correctly
- [ ] Progress tracking works

### Edge Cases
- [ ] Random question selection works
- [ ] 360 assessment flow works
- [ ] Draft assessments not assignable
- [ ] Expired assignments handled
- [ ] Incomplete assignments can be resumed

---

## 7. Demo Article Creation Guide

### Article Structure Template

Each demo article should follow this structure:

1. **Title** - Clear, descriptive title
2. **Introduction** - Brief overview of the feature
3. **Prerequisites** - What's needed before starting
4. **Step-by-Step Instructions** - Numbered, clear steps
5. **Screenshots/Video** - Visual aids (to be added)
6. **Tips and Best Practices** - Helpful guidance
7. **Troubleshooting** - Common issues and solutions
8. **Related Articles** - Links to related resources

### Article Topics (Priority Order)

1. Creating Your First Assessment
2. Building Assessment Questions: Fields and Anchors
3. Previewing Assessments Before Publishing
4. Publishing Assessments for Assignment
5. Assigning Assessments to Users and Groups
6. Taking an Assessment (User Guide)
7. Managing Assignment Progress
8. Viewing Assessment Results
9. Duplicating Assessments
10. Automated Assignment Reminders

---

## 8. Testing Environment Requirements

### Test Data Setup

Before testing, ensure:
- [ ] At least 2 test clients created
- [ ] At least 5 test users created
- [ ] At least 2 test groups created
- [ ] At least 3 test assessments (one 360, two non-360)
- [ ] Assessments with various field types
- [ ] Assessments with multiple dimensions
- [ ] Test email addresses configured
- [ ] Reminder cron job configured

### User Roles

Test with different user roles:
- [ ] Super Admin
- [ ] Client Admin
- [ ] Member (regular user)

---

## 9. Success Criteria

Phase 2 is considered complete when:

1. ✅ All features listed in Phase 2 requirements are implemented
2. ✅ All acceptance criteria are met
3. ✅ All test scenarios pass
4. ✅ Demo articles created for key features
5. ✅ System is reasonably functional for intended purpose
6. ✅ Vast majority of normal-use test cases work correctly
7. ✅ Deployed to staging environment
8. ✅ Client can test and provide feedback

---

## 10. Next Steps

After Phase 2 testing:

1. Create demo articles based on this test plan
2. Record video walkthroughs of key features
3. Conduct client review session
4. Gather feedback and document issues
5. Address critical issues before milestone payment
6. Plan Phase 3 implementation

---

**Document Version:** 1.0  
**Last Updated:** January 2, 2026  
**Author:** Development Team  
**Status:** Draft for Review
