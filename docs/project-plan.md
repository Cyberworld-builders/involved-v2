# Involved Talent v2 Project Plan

## Pages

- Home
- Login
- Register
- Forgot Password
- Reset Password
- Verify Email
- Dashboard
- Profile
- Settings
- Notifications

- Assessments
    - List
    - Create / Edit
        - Details
            - Appearance
                - Title (text)
                - Description (text)
                - Logo (image)
                - Background Image (image)
            - Settings
                - Split Questions into Pages (boolean)
                - Number of Questions per Page (number)
                - Timed (boolean)
                - Time Limit (number)
                - Target (user)
            - Fields
                - Rich Text (text)
                    - This is used for descriptions, instructions, etc. 
                - Multiple Choice
                    - Rich Text (text)
                        - This is used for descriptions, instructions, etc. 
                    - Dimension (dimension)
                    - Anchors
                        - Name (text)
                        - Value (number)
                        - Practice (boolean)
                        - Need the ability to reverse values. This is a client-side action. For example, if the values for anchors 1-5 are 1,2,3,4,5, they should be able to click a button that updates the values in the input fields to 5,4,3,2,1. Nothing will be saved until the save button is clicked.
                - Slider
                    - Rich Text (text)
                        - This is used for descriptions, instructions, etc. 
                    - Dimension (dimension)
                    - Anchors
                        - Name (text)
                        - Value (number)
                        - Practice (boolean)
                        - Need the ability to reverse values. This is a client-side action. For example, if the values for anchors 1-5 are 1,2,3,4,5, they should be able to click a button that updates the values in the input fields to 5,4,3,2,1. Nothing will be saved until the save button is clicked.
                - ***QUESTION:*** *Should slider just be a variant of the multiple choice question?*
- Clients
    - List
    - Create / Edit
        - Details
            - Name (text)
            - Address (text)
            - Logo (image)
            - Background Image (image)
            - Primary Color (color)
            - Accent Color (color)
    - View
    - Delete

- Client
    - Users
    - Groups
    - Surveys ("Development" tab)
        - Generate and view reports here.
    - Assignments
        - A place to track the progress of the users' assessments.
    - Reports (report templates)
        - This is where you can create and customize templates for how your reports will be formatted and presented.

- Users
    - List
    - Create / Edit
        - Details
            - Name (text)
            - Email (email)
            - Password (password)
            - Role (role)
            - Status (status)
            - Created At (date)
            - Updated At (date)

## Assessment Lifecycle
- Admin creates assessment, adds dimensions and fields, saves, and publishes.
- Client Manager assigns assessment to users, emails go out.
- Users link to assessment from email, fill out assessment, submit, and wait for results.
- Client Manager can view results, generate reports, and export data.

## Client Onboarding
- Admin creates client, adds details, saves, and publishes.
- Client Manager assigns client to users, emails go out.
- Users link to client from email, fill out client onboarding, and wait for client to be approved.
- Client Manager can view client onboarding progress, generate reports, and export data.
- Alternatively, the client can upload a spreadsheet of users and their details.

## User Management
- Admin or manager creates a user group.
- Admin or manager adds users to the group.
- Users are invited to claim their account by clicking a link in the email.
- Alternatively, group details can be included in the spreadsheet upload.


## Other Features
- Reports are the main product of this system. They need to be informative, easy to understand, and visually appealing. They need to be highly customizable and flexible. They need to be able to be exported to PDF, Excel, and CSV. They need to be able to be shared with other users.
- Some assessments will have a pool of questions greater than the number of questions the user will be expected to answer. These questions need to be pulled evenly across dimensions and otherwise randomized.
- Email functionality is another critical feature. Emails need to be dependable and reliable and they need to look professional and be personalized and potentially branded for the client.
- We need a way to upload and manage feedback entries to be provided to the user in the report. We need to be able to upload a spreadsheet of feedback entries and have them be added to the database. Eventually we want a feature that will analyze the assessments, historical reports, and existing feedback and generate new feedback for admin approval.
- Legacy versions of this system had glitchy assessment editor functionality. It was clunky and prone to bugs. We need to use the latest technology to build a robust and reliable assessment editor. It needs to be tight, clean, and easy to use. 


## Phases

### Phase 1: Environment Setup and Identity/Client/User/Group Management

> **Summary of Deliverables:**
> - Environment setup with Vercel deployments and a Supabase backend.
> - Authentication and identity management.
> - User profile management.
> - Client CRUD (create, read, update, delete).
> - User CRUD with bulk upload.
> - Group CRUD with bulk upload.
> - User Invites.

- **Environment setup with Vercel deployments and a Supabase backend.** Developer will have the ability to make changes locally and deploy to an environment in the cloud that the client can access and test.
- **Authentication and identity management.** Users will be able to sign up, sign in, and sign out. They will be able to reset their password if they forget it. They will be able to verify their email address if they need to.
- **User profile management.** Users will be able to update their profile information. They will be able to update their password.
- **Client CRUD (create, read, update, delete).** Admins will be able to create, read, update, and delete clients.
    - Client details include:
        - Name
        - Address
        - Logo
        - Background Image
        - Primary Color
        - Accent Color
- **User CRUD (create, read, update, delete).** Admins and managers will be able to create, read, update, and delete users.
    - User details include:
        - Name
        - Email
        - Password
        - Role
        - Status
        - Client
        - Industry
        - Last Login At
    - Admins and managers can bulk upload a user with groups from a spreadsheet.
        - The spreadsheet should have the following columns:
            - Name
            - Email
            - Username
            - Industry
- **Group CRUD (create, read, update, delete).** Admins and managers will be able to create, read, update, and delete groups.
    - Group details include:
        - Name
        - Description
        - Client
        - Users
        - Managers
    - Admins and managers can bulk upload groups from a spreadsheet.
        - The spreadsheet should have the following columns:
            - Group Name
            - Target Name
            - Target Email
            - Name
            - Email
            - Role
- **User Invites** Users will receive an email with a link to claim their account.
    - The email will have a link to the login page.
    - The link will contain a token that will be used to claim the account.
    - The token will expire after 7 days.
    - The token will be used to claim the account.
    - The account will be claimed and the user will be redirected to the dashboard.
    - The user will be able to login with their email and password.
    - The user will be able to update their profile information.
    - The user will be able to update their password.
    - The user will be able to request a password reset link.

### Phase 2: Assessment Management and Assignment

> **Summary of Deliverables:**
> - Assessment management.
> - Assessment assignment.
> - Assessment duplication.
> - Assessment preview.
> - Assessment publishing.
> - Assessment deletion.
> - Assignment notification emails.
> - Assignment email reminders.
> - Assignment completion.
> - Assignment progress tracking.

- **Assessment Management.** Admins will be able to create, read, update, and delete assessments
    - Assessments will have the following details:
        - Title
        - Description
        - Logo
        - Background Image
        - Primary Color
        - Accent Color
        - Split Questions into Pages
        - Number of Questions per Page
        - Timed
        - Time Limit
        - Target
        - 360 Assessment (boolean)
    - Rich Text fields will have a WYSIWYG editor and will render with formatting on the assessment page.
    - Admins can add dimensions and fields to the assessment.
    - Multiple Choice and Slider fields will have the ability to add anchors and edit values.
    - Support for free text fields will be available.
    - Anchor values can be reversed by clicking a button.
    - Assessments will pull questions evenly across dimensions and otherwise be randomized.
    - Non-randomized assessments (360) will use all questions and present them in their static order.
    - Admins can preview the assessment before publishing.
    - Admins can publish the assessment to be assigned to users.
    - Admins can duplicate an assessment.

- **Assessment Assignment.** Admins and managers will be able to assign assessments to users and groups.
    - Assessments can be assigned to users individually or to groups.
    - Users will receive an email with a link to the assessment.
    - The email will have a link to the assessment page.
    - The link will contain a token that will be used to access the assessment.
    - The token will expire after 7 days.
    - The token will be used to access the assessment.
    - The assessment will be presented to the user.
    - The user will be able to take the assessment.
    - The user will be able to submit the assessment.
    - The user can use their login credentials to access the assessment.
    - The admin or manager can configure email reminders for assessment assignments.
    - Admin or manager can view the progress of the users' assessments.

### Phase 3: Feedback Management and Reporting

- **Report Management.** Admins will be able to create, read, update, and delete reports.

- **Feedback Management.** Admins will be able to create, read, update, and delete feedback.
    - Feedback will have the following details:
        - Assessment
        - Dimension
        - Type
        - Feedback
        - Created At
        - Updated At
    - Admins can bulk upload feedback from a spreadsheet.
        - The spreadsheet should have the following columns:
            - Assessment
            - Dimension
            - Type
            - Feedback
    - Non-360 assessments will have feedback for each dimension.
    - All users get overall feedback.
    - The reports will pull two feedback entries randomly for each dimension.


- **Report CRUD (create, read, update, delete).** Admins will be able to create, read, update, and delete reports.
- **Feedback CRUD (create, read, update, delete).** Admins will be able to create, read, update, and delete feedback.
- **Report sharing.** Users will be able to share reports with other users.
- **Report exporting.** Users will be able to export reports to PDF, Excel, and CSV.
- **Report importing.** Users will be able to import reports from PDF, Excel, and CSV.
- **Report editing.** Users will be able to edit reports.
- **Report deleting.** Users will be able to delete reports.