# Phase 1 Regression Testing Guide

**Purpose**: This guide provides step-by-step instructions for regression testing all Phase 1 features of the Involved Talent v2 platform. Use this document to:
- Validate all functionality before milestone payment release
- Create instructional screencasts for client demonstration
- Provide a testing checklist for client validation
- Document feature completeness for deliverable acceptance

**Target Audience**: Developer (for validation) and Client (for acceptance testing)

**Estimated Testing Time**: 2-3 hours for complete regression test suite

---

## Table of Contents

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Environment Verification](#environment-verification)
3. [Authentication & Identity Management](#authentication--identity-management)
4. [Navigation & Page Layout](#navigation--page-layout)
5. [User Profile Management](#user-profile-management)
6. [Client Management](#client-management)
7. [User Management](#user-management)
8. [Group Management](#group-management)
9. [User Invitation System](#user-invitation-system)
10. [Industry Management](#industry-management)
11. [Benchmark Management](#benchmark-management)
12. [Screencast Recording Guidelines](#screencast-recording-guidelines)
13. [Validation Checklist](#validation-checklist)
14. [Client Handoff Instructions](#client-handoff-instructions)

---

## Pre-Testing Setup

### Test Data Preparation

Before beginning regression testing, prepare the following test data:

1. **Test User Accounts** (create via signup or admin panel):
   - Admin user: `admin@test.com`
   - Manager user: `manager@test.com`
   - Regular user: `user@test.com`
   - Unverified user: `unverified@test.com`

2. **Test Client Data**:
   - At least 2-3 test clients with different configurations
   - One client with logo and background image
   - One client with custom colors
   - One client with minimal data

3. **Test Spreadsheet Files** (for bulk upload testing):
   - Valid user bulk upload CSV
   - Invalid user bulk upload CSV (with errors)
   - Valid group bulk upload CSV
   - Valid benchmark bulk upload CSV

4. **Test Images**:
   - Logo file (PNG/JPG, < 5MB)
   - Background image (PNG/JPG, < 10MB)
   - Invalid file types for testing error handling

### Browser & Device Preparation

- **Desktop**: Chrome, Firefox, Safari (latest versions)
- **Desktop (Chromium variants)**: Brave, DuckDuckGo (latest versions)
- **Mobile**: iOS Safari, Chrome Mobile
- **Tablet**: iPad Safari, Android Chrome
- **Screen Recording Tool**: OBS, QuickTime, Loom, or similar

**Notes on Brave/DuckDuckGo**:
- These browsers are Chromium-based but ship with stricter privacy defaults that can affect cookies/storage.
- When validating auth flows, repeat key steps with privacy/shields on and off (and record any differences).

### Test Environment Access

- **Staging URL**: [Your staging environment URL]
- **Admin Credentials**: [Admin login credentials]
- **Test Email Account**: [Email for receiving test emails]

---

## Environment Verification

### Test 1: Local Development Environment

**Objective**: Verify local development setup is functional

**Steps**:
1. Navigate to local development URL (typically `http://localhost:3000`)
2. Verify application loads without errors
3. Check browser console for any critical errors
4. Verify Supabase connection is established (check network tab)

**What to Record**:
- Application loading successfully
- No console errors
- Network requests to Supabase are successful

**Validation**:
- ✅ Application loads without errors
- ✅ Supabase connection established
- ✅ No critical console errors

---

### Test 2: Vercel Deployment Pipeline

**Objective**: Verify deployment pipeline works correctly

**Steps**:
1. Check Vercel dashboard for latest deployment status
2. Verify deployment completed successfully
3. Check deployment logs for any warnings or errors
4. Verify staging environment URL is accessible

**What to Record**:
- Vercel dashboard showing successful deployment
- Staging URL accessible and functional

**Validation**:
- ✅ Latest deployment successful
- ✅ Staging environment accessible
- ✅ No deployment errors

---

### Test 3: Supabase Backend Connection

**Objective**: Verify Supabase backend is properly connected

**Steps**:
1. Navigate to staging environment
2. Open browser developer tools → Network tab
3. Perform any action that requires database access (e.g., view clients list)
4. Verify API requests to Supabase are successful (status 200)
5. Check that data is returned correctly

**What to Record**:
- Network requests showing successful Supabase API calls
- Data being returned from database

**Validation**:
- ✅ Supabase API calls successful
- ✅ Data retrieved correctly
- ✅ No authentication errors

---

### Test 4: Staging Environment Deployment

**Objective**: Verify staging environment is fully functional

**Steps**:
1. Access staging environment URL
2. Verify all pages load correctly
3. Test basic navigation between pages
4. Verify authentication works
5. Check that all features are accessible

**What to Record**:
- Staging environment fully functional
- All major features accessible

**Validation**:
- ✅ Staging environment accessible
- ✅ All pages load correctly
- ✅ Basic functionality works

---

## Authentication & Identity Management

### Test 5: User Sign Up

**Objective**: Verify new users can create accounts

**Steps**:
1. Navigate to signup page (`/auth/signup`)
2. Fill out signup form with new user details:
   - First Name: "Test"
   - Last Name: "User"
   - Email: `newuser@test.com`
   - Password: `TestPassword123!`
3. Submit the form
4. Verify success message appears
5. Check email inbox for verification email
6. Verify user is redirected appropriately

**What to Record**:
- Signup form completion
- Success message
- Email verification sent (show email if possible)

**Validation**:
- ✅ Signup form accepts valid input
- ✅ Success message displayed
- ✅ Verification email sent
- ✅ User redirected appropriately

---

### Test 6: Email Verification

**Objective**: Verify email verification process works

**Steps**:
1. Open verification email from Test 5
2. Click verification link
3. Verify user is redirected to verification success page
4. Verify user can now sign in
5. Test with expired/invalid token (if applicable)

**What to Record**:
- Email verification link click
- Verification success page
- Ability to sign in after verification

**Validation**:
- ✅ Verification link works
- ✅ User verified successfully
- ✅ User can sign in after verification

---

### Test 7: User Sign In

**Objective**: Verify users can sign in to their accounts

**Steps**:
1. Navigate to signin page (`/auth/login`)
2. Enter valid credentials:
   - Email: `admin@test.com`
   - Password: [admin password]
3. Click "Sign In"
4. Verify user is redirected to dashboard
5. Verify user session is established
6. Test with invalid credentials:
   - Wrong email
   - Wrong password
   - Non-existent user
7. Verify appropriate error messages appear

**What to Record**:
- Successful sign in flow
- Dashboard redirect
- Error handling for invalid credentials

**Validation**:
- ✅ Valid credentials allow sign in
- ✅ Redirect to dashboard works
- ✅ Invalid credentials show appropriate errors
- ✅ Session established correctly

---

### Test 8: User Sign Out

**Objective**: Verify users can sign out

**Steps**:
1. While signed in, click sign out button
2. Verify user is redirected to login page
3. Verify session is cleared (try accessing protected route)
4. Verify user cannot access dashboard without signing in again

**What to Record**:
- Sign out button click
- Redirect to login page
- Attempt to access protected route (should redirect to login)

**Validation**:
- ✅ Sign out works correctly
- ✅ Session cleared
- ✅ Protected routes require re-authentication

---

### Test 9: Password Reset

**Objective**: Verify password reset functionality

**Steps**:
1. Navigate to password reset page (or "Forgot Password" link)
2. Enter email address: `user@test.com`
3. Submit password reset request
4. Check email inbox for password reset email
5. Click reset link in email
6. Enter new password: `NewPassword123!`
7. Confirm new password
8. Submit password reset form
9. Verify success message
10. Sign in with new password
11. Verify old password no longer works

**What to Record**:
- Password reset request
- Email received
- Password reset form completion
- Successful sign in with new password

**Validation**:
- ✅ Password reset email sent
- ✅ Reset link works
- ✅ Password can be changed
- ✅ New password works for sign in
- ✅ Old password no longer works

---

## Navigation & Page Layout

### Test 10: Navigation Component

**Objective**: Verify navigation is consistent and functional

**Steps**:
1. Sign in as admin
2. Navigate through all major sections:
   - Dashboard
   - Clients
   - Users
   - Groups
   - Industries
   - Benchmarks
3. Verify navigation links are present and functional
4. Verify active page is highlighted in navigation
5. Verify navigation is visible on all pages
6. Test navigation on different screen sizes

**What to Record**:
- Navigation component on multiple pages
- Active state highlighting
- Responsive behavior on different screen sizes

**Validation**:
- ✅ Navigation present on all pages
- ✅ All links functional
- ✅ Active state works correctly
- ✅ Responsive on mobile/tablet

---

### Test 11: Responsive Page Layout

**Objective**: Verify layout is responsive across devices

**Steps**:
1. Test on desktop (1920x1080 or similar):
   - Verify full layout displays correctly
   - Check sidebar/navigation positioning
   - Verify content area sizing
2. Test on tablet (768x1024):
   - Verify layout adapts appropriately
   - Check navigation behavior
   - Verify content remains readable
3. Test on mobile (375x667):
   - Verify mobile navigation (hamburger menu if applicable)
   - Check content stacking
   - Verify touch targets are adequate
   - Test form inputs on mobile

**What to Record**:
- Desktop layout
- Tablet layout
- Mobile layout
- Navigation behavior on each device type

**Validation**:
- ✅ Layout adapts to screen size
- ✅ Content remains readable
- ✅ Navigation works on all devices
- ✅ Forms usable on mobile

---

### Test 12: Mobile Responsiveness

**Objective**: Verify all pages work correctly on mobile devices

**Steps**:
1. Use browser dev tools to simulate mobile device
2. Test each major page:
   - Dashboard
   - Client list
   - Client detail
   - User list
   - User detail
   - Group list
   - Group detail
   - Industry list
   - Benchmark list
3. Verify:
   - Text is readable
   - Buttons are tappable
   - Forms are usable
   - Tables scroll horizontally if needed
   - Images scale appropriately

**What to Record**:
- Key pages on mobile view
- Form interactions on mobile
- Table scrolling behavior

**Validation**:
- ✅ All pages functional on mobile
- ✅ No horizontal scrolling issues
- ✅ Touch targets adequate
- ✅ Forms usable

---

## User Profile Management

### Test 13: Profile Update

**Objective**: Verify users can update their profile information

**Steps**:
1. Sign in as a regular user
2. Navigate to profile page (or user settings)
3. Update profile fields:
   - First Name
   - Last Name
   - Email (if allowed)
   - Other profile fields
4. Save changes
5. Verify success message
6. Refresh page and verify changes persisted
7. Sign out and sign back in
8. Verify changes still present

**What to Record**:
- Profile form with updates
- Save action
- Verification of persisted changes

**Validation**:
- ✅ Profile can be updated
- ✅ Changes saved successfully
- ✅ Changes persist after refresh
- ✅ Changes persist after sign out/in

---

### Test 14: Password Update

**Objective**: Verify users can update their password

**Steps**:
1. Sign in as a regular user
2. Navigate to password update section (usually in profile/settings)
3. Enter current password
4. Enter new password: `UpdatedPassword123!`
5. Confirm new password
6. Submit form
7. Verify success message
8. Sign out
9. Sign in with new password
10. Verify old password no longer works
11. Test error cases:
    - Wrong current password
    - New password doesn't match confirmation
    - Weak password

**What to Record**:
- Password update form
- Successful update
- Sign in with new password
- Error handling

**Validation**:
- ✅ Password can be updated
- ✅ Current password required
- ✅ New password works for sign in
- ✅ Old password no longer works
- ✅ Error handling works correctly

---

## Client Management

### Test 15: Create Client

**Objective**: Verify admins can create new clients

**Steps**:
1. Sign in as admin
2. Navigate to Clients page
3. Click "Create Client" or "New Client" button
4. Fill out client form:
   - Name: "Test Client Company"
   - Address: "123 Test Street, Test City, TS 12345"
   - Primary Color: `#2563eb`
   - Accent Color: `#10b981`
5. Save client
6. Verify success message
7. Verify client appears in clients list
8. Click on new client to view details
9. Verify all entered data is correct

**What to Record**:
- Client creation form
- Form submission
- New client in list
- Client detail page

**Validation**:
- ✅ Client creation form works
- ✅ Client saved successfully
- ✅ Client appears in list
- ✅ All data saved correctly

---

### Test 16: View Clients List

**Objective**: Verify clients list displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Clients page
3. Verify clients list displays:
   - Client names
   - Client addresses (if shown)
   - Action buttons (Edit, Delete, View)
4. Test pagination (if applicable)
5. Test search/filter (if applicable)
6. Verify list is sortable (if applicable)

**What to Record**:
- Clients list view
- Pagination/search/filter functionality

**Validation**:
- ✅ Clients list displays correctly
- ✅ All clients visible
- ✅ Pagination/search/filter work (if implemented)

---

### Test 17: View Single Client Details

**Objective**: Verify client detail page displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Clients page
3. Click on a client to view details
4. Verify all client information displays:
   - Name
   - Address
   - Logo (if uploaded)
   - Background Image (if uploaded)
   - Primary Color
   - Accent Color
5. Verify related data displays (users, groups, etc.)

**What to Record**:
- Client detail page
- All client information displayed

**Validation**:
- ✅ Client detail page loads
- ✅ All information displays correctly
- ✅ Related data visible

---

### Test 18: Update Client

**Objective**: Verify admins can update client information

**Steps**:
1. Sign in as admin
2. Navigate to a client's detail page
3. Click "Edit" button
4. Update client information:
   - Change name
   - Update address
   - Change colors
5. Save changes
6. Verify success message
7. Verify changes reflected on detail page
8. Verify changes reflected in clients list

**What to Record**:
- Edit form with changes
- Save action
- Updated information displayed

**Validation**:
- ✅ Client can be updated
- ✅ Changes saved successfully
- ✅ Changes reflected immediately

---

### Test 19: Delete Client

**Objective**: Verify admins can delete clients

**Steps**:
1. Sign in as admin
2. Navigate to Clients page
3. Create a test client (or use existing test client)
4. Click "Delete" button on test client
5. Confirm deletion (if confirmation dialog appears)
6. Verify success message
7. Verify client removed from list
8. Try to access deleted client's detail page (should show error/404)

**What to Record**:
- Delete action
- Confirmation (if applicable)
- Client removed from list

**Validation**:
- ✅ Client can be deleted
- ✅ Confirmation works (if implemented)
- ✅ Client removed from list
- ✅ Deleted client inaccessible

---

### Test 20: Client Logo Upload

**Objective**: Verify client logo upload functionality

**Steps**:
1. Sign in as admin
2. Navigate to client creation or edit page
3. Click "Upload Logo" or logo upload area
4. Select a valid image file (PNG/JPG, < 5MB)
5. Verify file uploads
6. Verify preview appears
7. Save client
8. Verify logo displays on client detail page
9. Test error cases:
   - File too large
   - Invalid file type
   - No file selected

**What to Record**:
- Logo upload process
- Preview display
- Logo on client detail page
- Error handling

**Validation**:
- ✅ Logo uploads successfully
- ✅ Preview works
- ✅ Logo displays correctly
- ✅ Error handling works

---

### Test 21: Client Background Image Upload

**Objective**: Verify client background image upload functionality

**Steps**:
1. Sign in as admin
2. Navigate to client creation or edit page
3. Click "Upload Background Image" or upload area
4. Select a valid image file (PNG/JPG, < 10MB)
5. Verify file uploads
6. Verify preview appears
7. Save client
8. Verify background image displays on client detail page
9. Test error cases:
   - File too large
   - Invalid file type

**What to Record**:
- Background image upload process
- Preview display
- Background image on client detail page

**Validation**:
- ✅ Background image uploads successfully
- ✅ Preview works
- ✅ Background image displays correctly

---

### Test 22: Client Color Customization

**Objective**: Verify client color customization works

**Steps**:
1. Sign in as admin
2. Navigate to client creation or edit page
3. Set Primary Color: `#2563eb` (blue)
4. Set Accent Color: `#10b981` (green)
5. Save client
6. Verify colors saved
7. Navigate to client detail page
8. Verify colors are applied (if UI uses client colors)
9. Test with invalid color values:
   - Non-hex values
   - Invalid hex format
10. Verify validation works

**What to Record**:
- Color picker/input
- Color values saved
- Colors applied in UI (if applicable)

**Validation**:
- ✅ Colors can be set
- ✅ Colors saved correctly
- ✅ Validation works for invalid values

---

## User Management

### Test 23: Create User

**Objective**: Verify admins/managers can create new users

**Steps**:
1. Sign in as admin
2. Navigate to Users page
3. Click "Create User" or "New User" button
4. Fill out user form:
   - First Name: "Test"
   - Last Name: "User"
   - Email: `newuser@test.com`
   - Password: `TestPassword123!`
   - Role: Select "User" or "Manager"
   - Status: Select "Active"
   - Client: Select a client (if applicable)
   - Industry: Select an industry (if applicable)
5. Save user
6. Verify success message
7. Verify user appears in users list
8. Verify username auto-generated (if not provided)

**What to Record**:
- User creation form
- Form submission
- New user in list
- Auto-generated username (if applicable)

**Validation**:
- ✅ User creation form works
- ✅ User saved successfully
- ✅ User appears in list
- ✅ Username auto-generated (if applicable)

---

### Test 24: View Users List

**Objective**: Verify users list displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Users page
3. Verify users list displays:
   - User names
   - Email addresses
   - Roles
   - Status
   - Client (if applicable)
4. Test pagination (if applicable)
5. Test search/filter (if applicable)
6. Verify list is sortable (if applicable)

**What to Record**:
- Users list view
- Pagination/search/filter functionality

**Validation**:
- ✅ Users list displays correctly
- ✅ All users visible
- ✅ Pagination/search/filter work

---

### Test 25: View Single User Details

**Objective**: Verify user detail page displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Users page
3. Click on a user to view details
4. Verify all user information displays:
   - Name
   - Email
   - Username
   - Role
   - Status
   - Client
   - Industry
5. Verify related data displays (groups, assignments, etc.)

**What to Record**:
- User detail page
- All user information displayed

**Validation**:
- ✅ User detail page loads
- ✅ All information displays correctly
- ✅ Related data visible

---

### Test 26: Update User

**Objective**: Verify admins/managers can update user information

**Steps**:
1. Sign in as admin
2. Navigate to a user's detail page
3. Click "Edit" button
4. Update user information:
   - Change name
   - Update email
   - Change role
   - Change status
   - Update client assignment
   - Update industry assignment
5. Save changes
6. Verify success message
7. Verify changes reflected on detail page
8. Verify changes reflected in users list

**What to Record**:
- Edit form with changes
- Save action
- Updated information displayed

**Validation**:
- ✅ User can be updated
- ✅ Changes saved successfully
- ✅ Changes reflected immediately

---

### Test 27: Delete User

**Objective**: Verify admins/managers can delete users

**Steps**:
1. Sign in as admin
2. Navigate to Users page
3. Create a test user (or use existing test user)
4. Click "Delete" button on test user
5. Confirm deletion (if confirmation dialog appears)
6. Verify success message
7. Verify user removed from list
8. Try to access deleted user's detail page (should show error/404)

**What to Record**:
- Delete action
- Confirmation (if applicable)
- User removed from list

**Validation**:
- ✅ User can be deleted
- ✅ Confirmation works (if implemented)
- ✅ User removed from list

---

### Test 28: User Role Management

**Objective**: Verify user roles can be assigned and updated

**Steps**:
1. Sign in as admin
2. Create a new user or edit existing user
3. Test each role:
   - Admin
   - Manager
   - User
4. Save user with each role
5. Sign in as that user (if possible)
6. Verify role-based permissions work:
   - Admin can access all features
   - Manager has appropriate restrictions
   - User has appropriate restrictions

**What to Record**:
- Role selection in form
- Role-based access (if testable)

**Validation**:
- ✅ Roles can be assigned
- ✅ Roles can be updated
- ✅ Role-based permissions work correctly

---

### Test 29: User Status Management

**Objective**: Verify user status can be managed

**Steps**:
1. Sign in as admin
2. Edit a user
3. Change status to "Inactive"
4. Save changes
5. Verify status updated
6. Try to sign in as inactive user (should fail or show message)
7. Change status back to "Active"
8. Verify user can sign in again

**What to Record**:
- Status change
- Inactive user sign in attempt
- Status change back to active

**Validation**:
- ✅ Status can be changed
- ✅ Inactive users cannot sign in
- ✅ Active users can sign in

---

### Test 30: User-Client Assignment

**Objective**: Verify users can be assigned to clients

**Steps**:
1. Sign in as admin
2. Create or edit a user
3. Select a client from dropdown
4. Save user
5. Verify user assigned to client
6. View client detail page
7. Verify user appears in client's user list
8. Remove client assignment
9. Verify user no longer associated with client

**What to Record**:
- Client assignment in user form
- User in client's user list
- Removal of assignment

**Validation**:
- ✅ Users can be assigned to clients
- ✅ Assignment visible on both user and client pages
- ✅ Assignment can be removed

---

### Test 31: User-Industry Assignment

**Objective**: Verify users can be assigned to industries

**Steps**:
1. Sign in as admin
2. Create or edit a user
3. Select an industry from dropdown
4. Save user
5. Verify user assigned to industry
6. View industry detail page
7. Verify user appears in industry's user list
8. Remove industry assignment
9. Verify user no longer associated with industry

**What to Record**:
- Industry assignment in user form
- User in industry's user list
- Removal of assignment

**Validation**:
- ✅ Users can be assigned to industries
- ✅ Assignment visible on both user and industry pages
- ✅ Assignment can be removed

---

### Test 32: Username Auto-generation

**Objective**: Verify usernames are auto-generated when not provided

**Steps**:
1. Sign in as admin
2. Create a new user
3. Fill out form but leave username field empty
4. Save user
5. Verify username was auto-generated
6. Check username format (should be based on name or email)
7. Create another user with same name
8. Verify unique username generated (e.g., with number suffix)

**What to Record**:
- User creation without username
- Auto-generated username
- Unique username generation for duplicates

**Validation**:
- ✅ Username auto-generated when not provided
- ✅ Username format is correct
- ✅ Duplicate names get unique usernames

---

### Test 33: Bulk User Upload

**Objective**: Verify bulk user upload from spreadsheet works

**Steps**:
1. Sign in as admin
2. Navigate to Users page
3. Click "Bulk Upload" or "Upload Users" button
4. Select valid CSV file with columns:
   - Name
   - Email
   - Username (optional)
   - Industry
5. Upload file
6. Verify upload progress/status
7. Verify users created successfully
8. Check users list for new users
9. Verify groups created/assigned (if applicable)
10. Test with invalid CSV:
    - Missing required columns
    - Invalid email formats
    - Duplicate emails
11. Verify error messages appear for invalid rows

**What to Record**:
- Bulk upload process
- File selection
- Upload progress
- Success message
- New users in list
- Error handling for invalid data

**Validation**:
- ✅ Valid CSV uploads successfully
- ✅ Users created from spreadsheet
- ✅ Groups assigned correctly
- ✅ Errors reported for invalid rows
- ✅ Error messages are clear

---

## Group Management

### Test 34: Create Group

**Objective**: Verify admins/managers can create new groups

**Steps**:
1. Sign in as admin
2. Navigate to Groups page
3. Click "Create Group" or "New Group" button
4. Fill out group form:
   - Name: "Test Group"
   - Description: "This is a test group"
   - Client: Select a client
5. Save group
6. Verify success message
7. Verify group appears in groups list
8. Click on new group to view details

**What to Record**:
- Group creation form
- Form submission
- New group in list

**Validation**:
- ✅ Group creation form works
- ✅ Group saved successfully
- ✅ Group appears in list

---

### Test 35: View Groups List

**Objective**: Verify groups list displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Groups page
3. Verify groups list displays:
   - Group names
   - Descriptions (if shown)
   - Client (if shown)
   - Action buttons
4. Test pagination (if applicable)
5. Test search/filter (if applicable)

**What to Record**:
- Groups list view
- Pagination/search/filter functionality

**Validation**:
- ✅ Groups list displays correctly
- ✅ All groups visible

---

### Test 36: View Single Group Details

**Objective**: Verify group detail page displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Groups page
3. Click on a group to view details
4. Verify all group information displays:
   - Name
   - Description
   - Client
   - Users assigned
   - Managers assigned
5. Verify related data displays

**What to Record**:
- Group detail page
- All group information displayed

**Validation**:
- ✅ Group detail page loads
- ✅ All information displays correctly
- ✅ Related data visible

---

### Test 37: Update Group

**Objective**: Verify admins/managers can update group information

**Steps**:
1. Sign in as admin
2. Navigate to a group's detail page
3. Click "Edit" button
4. Update group information:
   - Change name
   - Update description
   - Change client
5. Save changes
6. Verify success message
7. Verify changes reflected on detail page

**What to Record**:
- Edit form with changes
- Save action
- Updated information displayed

**Validation**:
- ✅ Group can be updated
- ✅ Changes saved successfully
- ✅ Changes reflected immediately

---

### Test 38: Delete Group

**Objective**: Verify admins/managers can delete groups

**Steps**:
1. Sign in as admin
2. Navigate to Groups page
3. Create a test group (or use existing test group)
4. Click "Delete" button on test group
5. Confirm deletion (if confirmation dialog appears)
6. Verify success message
7. Verify group removed from list

**What to Record**:
- Delete action
- Confirmation (if applicable)
- Group removed from list

**Validation**:
- ✅ Group can be deleted
- ✅ Confirmation works (if implemented)
- ✅ Group removed from list

---

### Test 39: Group-User Assignment

**Objective**: Verify users can be assigned to groups

**Steps**:
1. Sign in as admin
2. Navigate to a group's detail page
3. Click "Add Users" or similar button
4. Select one or more users
5. Save assignment
6. Verify users appear in group's user list
7. View user detail page
8. Verify group appears in user's group list
9. Remove user from group
10. Verify user removed from group

**What to Record**:
- User assignment to group
- Users in group list
- Group in user's group list
- Removal of assignment

**Validation**:
- ✅ Users can be assigned to groups
- ✅ Assignment visible on both group and user pages
- ✅ Assignment can be removed

---

### Test 40: Group-Manager Assignment

**Objective**: Verify managers can be assigned to groups

**Steps**:
1. Sign in as admin
2. Navigate to a group's detail page
3. Click "Add Managers" or similar button
4. Select one or more manager users
5. Save assignment
6. Verify managers appear in group's manager list
7. View manager's user detail page
8. Verify group appears in manager's managed groups list
9. Remove manager from group
10. Verify manager removed from group

**What to Record**:
- Manager assignment to group
- Managers in group list
- Group in manager's managed groups list

**Validation**:
- ✅ Managers can be assigned to groups
- ✅ Assignment visible on both group and manager pages
- ✅ Assignment can be removed

---

### Test 41: Bulk Group Upload

**Objective**: Verify bulk group upload from spreadsheet works

**Steps**:
1. Sign in as admin
2. Navigate to Groups page
3. Click "Bulk Upload" or "Upload Groups" button
4. Select valid CSV file with columns:
   - Group Name
   - Target Name
   - Target Email
   - Name
   - Email
   - Role
5. Upload file
6. Verify upload progress/status
7. Verify groups created successfully
8. Check groups list for new groups
9. Verify users and targets assigned correctly
10. Test with invalid CSV:
    - Missing required columns
    - Invalid email formats
11. Verify error messages appear for invalid rows

**What to Record**:
- Bulk upload process
- File selection
- Upload progress
- Success message
- New groups in list
- Error handling for invalid data

**Validation**:
- ✅ Valid CSV uploads successfully
- ✅ Groups created from spreadsheet
- ✅ Users and targets assigned correctly
- ✅ Errors reported for invalid rows

---

## User Invitation System

### Test 42: Send User Invite

**Objective**: Verify admins/managers can send user invites

**Steps**:
1. Sign in as admin
2. **Current implementation note**: there is no dashboard UI button for “Send Invite” yet.
3. Trigger an invite via the API (example using browser devtools console while signed in):
   - Determine the target user’s profile id (from the Users list / URL / Supabase table)
   - Run:
     - `fetch('/api/users/<PROFILE_ID>/invite', { method: 'POST' }).then(r => r.json())`
4. Verify the API responds with success (201) and returns invite data
5. Check email inbox for invite email (if email delivery is configured in the current environment)
6. Verify invite email contains:
   - User's name
   - Invitation link with token
   - Instructions
7. **Token link routing**: the invite link should point to `/auth/claim?token=<token>` (account claim flow)

**What to Record**:
- API call and JSON response
- Success response
- Invite email (show email if possible)

**Validation**:
- ✅ Invite can be sent via API
- ✅ Invite email received (if configured)
- ✅ Email contains correct information
- ✅ Email contains valid token link

---

### Test 43: Invite Token Validation

**Objective**: Verify invite tokens work correctly

**Steps**:
1. Open invite email from Test 42
2. Copy invitation link
3. Click link or paste in browser
4. Verify account claim page loads
5. Verify token is valid (page doesn't show error)
6. Test with expired token (if possible):
   - Create invite
   - Wait 7+ days (or manually expire token)
   - Try to access claim page
   - Verify expired token error
7. Test with invalid token:
   - Modify token in URL
   - Verify error message

**What to Record**:
- Invite link click
- Account claim page
- Expired token error (if testable)

**Validation**:
- ✅ Valid token allows access to claim page
- ✅ Expired tokens show appropriate error
- ✅ Invalid tokens show appropriate error

---

### Test 44: Account Claim Process

**Objective**: Verify users can claim their accounts

**Steps**:
1. Open invite email
2. Click invitation link
3. Verify account claim page loads
4. Fill out claim form:
   - Set password: `ClaimedPassword123!`
   - Confirm password
   - Accept terms (if applicable)
5. Submit form
6. Verify success message
7. Verify user redirected to dashboard
8. Verify user is signed in automatically
9. Verify user can access dashboard features

**What to Record**:
- Account claim page
- Form completion
- Successful claim
- Dashboard redirect

**Validation**:
- ✅ Account claim page loads
- ✅ Password can be set
- ✅ Account claimed successfully
- ✅ User redirected to dashboard
- ✅ User signed in automatically

---

### Test 45: Post-Claim Functionality

**Objective**: Verify all functionality works after account claim

**Steps**:
1. After claiming account (Test 44), test:
   - Sign out
   - Sign in with email and password
   - Update profile
   - Update password
   - Request password reset
2. Verify all features work for claimed user

**What to Record**:
- Sign in after claim
- Profile update
- Password update
- Password reset request

**Validation**:
- ✅ User can sign in after claim
- ✅ Profile can be updated
- ✅ Password can be updated
- ✅ Password reset works

---

## Industry Management

### Test 46: Create Industry

**Objective**: Verify admins can create new industries

**Steps**:
1. Sign in as admin
2. Navigate to Industries page
3. Click "Create Industry" or "New Industry" button
4. Fill out industry form:
   - Name: "Test Industry"
   - Description (if applicable)
5. Save industry
6. Verify success message
7. Verify industry appears in industries list

**What to Record**:
- Industry creation form
- Form submission
- New industry in list

**Validation**:
- ✅ Industry creation form works
- ✅ Industry saved successfully
- ✅ Industry appears in list

---

### Test 47: View Industries List

**Objective**: Verify industries list displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Industries page
3. Verify industries list displays:
   - Industry names
   - Descriptions (if shown)
   - Action buttons
4. Test pagination (if applicable)
5. Test search/filter (if applicable)

**What to Record**:
- Industries list view
- Pagination/search/filter functionality

**Validation**:
- ✅ Industries list displays correctly
- ✅ All industries visible

---

### Test 48: View Single Industry Details

**Objective**: Verify industry detail page displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Industries page
3. Click on an industry to view details
4. Verify all industry information displays:
   - Name
   - Description
   - Users assigned
5. Verify related data displays

**What to Record**:
- Industry detail page
- All industry information displayed

**Validation**:
- ✅ Industry detail page loads
- ✅ All information displays correctly
- ✅ Related data visible

---

### Test 49: Update Industry

**Objective**: Verify admins can update industry information

**Steps**:
1. Sign in as admin
2. Navigate to an industry's detail page
3. Click "Edit" button
4. Update industry information:
   - Change name
   - Update description
5. Save changes
6. Verify success message
7. Verify changes reflected on detail page

**What to Record**:
- Edit form with changes
- Save action
- Updated information displayed

**Validation**:
- ✅ Industry can be updated
- ✅ Changes saved successfully
- ✅ Changes reflected immediately

---

### Test 50: Delete Industry

**Objective**: Verify admins can delete industries

**Steps**:
1. Sign in as admin
2. Navigate to Industries page
3. Create a test industry (or use existing test industry)
4. Click "Delete" button on test industry
5. Confirm deletion (if confirmation dialog appears)
6. Verify success message
7. Verify industry removed from list

**What to Record**:
- Delete action
- Confirmation (if applicable)
- Industry removed from list

**Validation**:
- ✅ Industry can be deleted
- ✅ Confirmation works (if implemented)
- ✅ Industry removed from list

---

### Test 51: User-Industry Assignment

**Objective**: Verify users can be assigned to industries

**Steps**:
1. Sign in as admin
2. Navigate to Users → create a user (or open an existing user) → Edit User
3. In the user form, select an Industry from the “Industry” dropdown and save
4. Open the user detail page and verify the “Industry” field shows the selected industry
5. (Optional) Open the industry detail page and verify the industry itself loads (name/created/updated)
6. Remove the industry assignment by setting “Industry” back to blank and saving
7. Verify the user detail page now shows “-” (or equivalent) for Industry

**What to Record**:
- User assignment to industry
- Industry shown on user detail page

**Validation**:
- ✅ Users can be assigned to industries
- ✅ Assignment visible on the user page
- ✅ Assignment can be removed

---

## Benchmark Management

### Test 52: Create Benchmark

**Objective**: Verify admins can create new benchmarks

**Steps**:
1. Sign in as admin
2. Navigate to Benchmarks page
3. Click "Create Benchmark" or "New Benchmark" button
4. Fill out benchmark form:
   - Assessment: Select an assessment
   - Industry: Select an industry
   - Dimension: Select a dimension
   - Value: Enter a numeric value
5. Save benchmark
6. Verify success message
7. Verify benchmark appears in benchmarks list

**What to Record**:
- Benchmark creation form
- Form submission
- New benchmark in list

**Validation**:
- ✅ Benchmark creation form works
- ✅ Benchmark saved successfully
- ✅ Benchmark appears in list

---

### Test 53: View Benchmarks List

**Objective**: Verify benchmarks list displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Benchmarks page
3. Verify benchmarks list displays:
   - Assessment
   - Industry
   - Dimension
   - Value
   - Action buttons
4. Test pagination (if applicable)
5. Test search/filter (if applicable)

**What to Record**:
- Benchmarks list view
- Pagination/search/filter functionality

**Validation**:
- ✅ Benchmarks list displays correctly
- ✅ All benchmarks visible

---

### Test 54: View Single Benchmark Details

**Objective**: Verify benchmark detail page displays correctly

**Steps**:
1. Sign in as admin
2. Navigate to Benchmarks page
3. Click on a benchmark to view details
4. Verify all benchmark information displays:
   - Assessment
   - Industry
   - Dimension
   - Value
5. Verify related data displays

**What to Record**:
- Benchmark detail page
- All benchmark information displayed

**Validation**:
- ✅ Benchmark detail page loads
- ✅ All information displays correctly

---

### Test 55: Update Benchmark

**Objective**: Verify admins can update benchmark information

**Steps**:
1. Sign in as admin
2. Navigate to a benchmark's detail page
3. Click "Edit" button
4. Update benchmark information:
   - Change value
   - Update assessment (if allowed)
   - Update industry (if allowed)
   - Update dimension (if allowed)
5. Save changes
6. Verify success message
7. Verify changes reflected on detail page

**What to Record**:
- Edit form with changes
- Save action
- Updated information displayed

**Validation**:
- ✅ Benchmark can be updated
- ✅ Changes saved successfully
- ✅ Changes reflected immediately

---

### Test 56: Delete Benchmark

**Objective**: Verify admins can delete benchmarks

**Steps**:
1. Sign in as admin
2. Navigate to Benchmarks page
3. Create a test benchmark (or use existing test benchmark)
4. Click "Delete" button on test benchmark
5. Confirm deletion (if confirmation dialog appears)
6. Verify success message
7. Verify benchmark removed from list

**What to Record**:
- Delete action
- Confirmation (if applicable)
- Benchmark removed from list

**Validation**:
- ✅ Benchmark can be deleted
- ✅ Confirmation works (if implemented)
- ✅ Benchmark removed from list

---

### Test 57: Benchmark Filtering

**Objective**: Verify benchmarks can be filtered

**Steps**:
1. Sign in as admin
2. Navigate to Benchmarks page
3. Test filtering by:
   - Assessment
   - Industry
   - Dimension
4. Verify filtered results display correctly
5. Test combination of filters
6. Clear filters
7. Verify all benchmarks display again

**What to Record**:
- Filter selection
- Filtered results
- Clearing filters

**Validation**:
- ✅ Filters work correctly
- ✅ Filtered results accurate
- ✅ Filters can be cleared

---

### Test 58: Bulk Benchmark Upload

**Objective**: Verify bulk benchmark upload from spreadsheet works

**Steps**:
1. Sign in as admin
2. Navigate to Benchmarks page
3. Click "Bulk Upload" or "Upload Benchmarks" button
4. Select valid CSV file with columns:
   - Assessment
   - Industry
   - Dimension
   - Value
5. Upload file
6. Verify upload progress/status
7. Verify benchmarks created successfully
8. Check benchmarks list for new benchmarks
9. Test with invalid CSV:
    - Missing required columns
    - Invalid values
10. Verify error messages appear for invalid rows

**What to Record**:
- Bulk upload process
- File selection
- Upload progress
- Success message
- New benchmarks in list
- Error handling for invalid data

**Validation**:
- ✅ Valid CSV uploads successfully
- ✅ Benchmarks created from spreadsheet
- ✅ Errors reported for invalid rows

---

## Screencast Recording Guidelines

### Preparation

1. **Clean Browser State**:
   - Use incognito/private browsing or clear cache
   - Close unnecessary tabs
   - Set browser zoom to 100%

2. **Screen Setup**:
   - Use high resolution (1920x1080 or higher)
   - Close unnecessary applications
   - Hide desktop notifications
   - Use clean, professional browser theme

3. **Audio Setup** (if narrating):
   - Use quality microphone
   - Test audio levels
   - Record in quiet environment
   - Speak clearly and at moderate pace

### Recording Best Practices

1. **Start Each Test Fresh**:
   - Begin with clear state
   - Show URL/context at start
   - State what you're testing

2. **Show Key Interactions**:
   - Hover over buttons before clicking
   - Show form filling process
   - Display success/error messages
   - Show data persistence (refresh page)

3. **Keep Recordings Focused**:
   - One feature per recording (or logical grouping)
   - Keep recordings under 5 minutes when possible
   - Edit out long pauses or errors

4. **Include Context**:
   - Show navigation path
   - Display relevant data
   - Show before/after states

### Recommended Recording Structure

1. **Introduction** (5-10 seconds):
   - State feature being tested
   - Show current page/context

2. **Test Execution** (main content):
   - Follow test steps
   - Show all interactions
   - Display results

3. **Verification** (10-15 seconds):
   - Show data persisted
   - Verify changes reflected
   - Confirm success

4. **Conclusion** (5 seconds):
   - State test passed
   - Show final state

### File Naming Convention

Use descriptive names:
- `01-environment-verification.mp4`
- `05-user-signup.mp4`
- `15-create-client.mp4`
- `33-bulk-user-upload.mp4`

### Storage & Delivery

- Store recordings in organized folder structure
- Compress videos if file sizes are large
- Provide access via:
  - Cloud storage (Google Drive, Dropbox)
  - Video hosting (YouTube unlisted, Vimeo)
  - Project management tool
  - Direct download link

---

## Validation Checklist

Use this checklist to ensure all Phase 1 features are tested and validated:

### Environment Setup
- [ ] Local development environment functional
- [ ] Vercel deployment pipeline works
- [ ] Supabase backend connection established
- [ ] Staging environment accessible and functional

### Authentication & Identity
- [ ] User sign up works
- [ ] Email verification works
- [ ] User sign in works
- [ ] User sign out works
- [ ] Password reset works

### Navigation & Layout
- [ ] Navigation component consistent
- [ ] Responsive layout works
- [ ] Mobile responsiveness verified

### User Profile
- [ ] Profile update works
- [ ] Password update works

### Client Management
- [ ] Create client works
- [ ] View clients list works
- [ ] View client details works
- [ ] Update client works
- [ ] Delete client works
- [ ] Logo upload works
- [ ] Background image upload works
- [ ] Color customization works

### User Management
- [ ] Create user works
- [ ] View users list works
- [ ] View user details works
- [ ] Update user works
- [ ] Delete user works
- [ ] Role management works
- [ ] Status management works
- [ ] User-client assignment works
- [ ] User-industry assignment works
- [ ] Username auto-generation works
- [ ] Bulk user upload works

### Group Management
- [ ] Create group works
- [ ] View groups list works
- [ ] View group details works
- [ ] Update group works
- [ ] Delete group works
- [ ] Group-user assignment works
- [ ] Group-manager assignment works
- [ ] Bulk group upload works

### User Invitation
- [ ] Send invite works
- [ ] Invite token validation works
- [ ] Account claim process works
- [ ] Post-claim functionality works

### Industry Management
- [ ] Create industry works
- [ ] View industries list works
- [ ] View industry details works
- [ ] Update industry works
- [ ] Delete industry works
- [ ] User-industry assignment works

### Benchmark Management
- [ ] Create benchmark works
- [ ] View benchmarks list works
- [ ] View benchmark details works
- [ ] Update benchmark works
- [ ] Delete benchmark works
- [ ] Benchmark filtering works
- [ ] Bulk benchmark upload works

---

## Client Handoff Instructions

### For the Client

This regression testing guide is provided to help you validate all Phase 1 features before milestone payment release. You can use this document to:

1. **Test Features Yourself**: Follow the step-by-step instructions to test each feature
2. **Review Screencasts**: Watch the provided screencasts to see features demonstrated
3. **Report Issues**: Document any issues you find using the validation checklist

### Testing Approach

**Option 1: Full Regression Test**
- Follow all tests in order (2-3 hours)
- Complete validation checklist
- Document any issues found

**Option 2: Spot Check**
- Review screencasts for all features
- Test critical features yourself
- Spot check random features

**Option 3: Focused Testing**
- Test features most important to your workflow
- Review screencasts for other features
- Complete validation checklist for tested features

### What to Look For

When testing, verify:
- ✅ Features work as described
- ✅ Data saves correctly
- ✅ Navigation is intuitive
- ✅ Error messages are clear
- ✅ UI is responsive
- ✅ No critical bugs

### Reporting Issues

If you find issues:
1. Note the test number (e.g., "Test 15: Create Client")
2. Describe what happened
3. Include screenshots if possible
4. Note browser/device used
5. Indicate severity (Critical, Major, Minor)

### Acceptance Criteria

Phase 1 is considered complete when:
- All listed features are implemented
- Features are deployed to staging environment
- Features are reasonably functional and usable
- Vast majority of normal-use test cases function correctly

**Note**: Minor bugs, rare edge cases, and preferential styling adjustments are expected and will be addressed in Phase 4 without delaying milestone payment.

### Questions or Concerns

If you have questions about:
- **Feature functionality**: Refer to the proposal document
- **Testing process**: Follow this guide's instructions
- **Issue reporting**: Use the format above
- **Acceptance**: Review the acceptance criteria section

---

## Appendix: Quick Reference

### Test Data Quick Reference

**Test Users**:
- Admin: `admin@test.com`
- Manager: `manager@test.com`
- User: `user@test.com`

**Test Passwords**: `TestPassword123!`

**Test Colors**:
- Primary: `#2563eb` (blue)
- Accent: `#10b981` (green)

### Common Test Scenarios

**Happy Path**: Normal, expected usage
**Error Handling**: Invalid input, missing data, edge cases
**Data Persistence**: Refresh page, sign out/in, verify data saved
**Permissions**: Test with different user roles

### Browser Compatibility

Test in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Phase**: Phase 1 - Environment Setup and Identity/Client/User/Group Management
