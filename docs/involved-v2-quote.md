# Involved Talent v2 - Scope Discussion

## Overview

The following is a draft of the scope of work for the Involved Talent v2 project. Please review and provide feedback wherever you see that something is incorrect or if you find that anything is missing. Once we have an agreement on the scope, I will draft a proposal for a fixed-price contract with well defined milestones and deliverables based on this plan.

**NOTE:** The major differences in this version and the previous document are as follows:

1. It's more focused on specific deliverables that are more well-defined as clear requirements.
2. I have addressed the Leaders and Blockers style assessments, including details on the feedback library system and the question pool feature.
3. I added a section on custom report templates
4. I removed any plans to use mock data or static assessments (which originally was meant to allow for testing email and report functionality early on) in favor of pressing forward with the full assessment editor feature with an emphasis on speed of execution.

5. I removed most if not all allocation for custom UI design and branding apart from the assessments and the reports, which are going to be emulated from the legacy design. Also, I'm confident the minimalist professional out-of-the-box design from the Tailwind.css and React.js components will be more than acceptable.
6. Other smaller changes like the slider field and some other minor things I may have already forgotten.

Be encouraged to request revisions and clarifications before we finalize the quote. I'm confident that this covers nearly all of the scope and that I can keep this within your budget and delivered on time. Now would be the time to correct any details so that a big list of changes doesn't cause misunderstandings in phase 4. I think we both would prefer to spend the last week of this development cycle discussing things like AI generated feedback libraries and advanced custom report generation rather a large list of small changes that we made assumptions on or forgot. It's always going to happen to some degree, but it doesn't have to be painful and now is a good time to firm it up as much as possible.

## Phase 1: Environment Setup and Identity/Client/User/Group Management

> **Summary of Deliverables:**
> - Environment setup with Vercel deployments and a Supabase backend.
> - Authentication and identity management.
> - Navigation and page layout.
> - User profile management.
> - Client CRUD (create, read, update, delete).
> - User CRUD with bulk upload.
> - Group CRUD with bulk upload.
> - User Invites.
> - Industries CRUD with bulk upload.
> - Benchmarks CRUD with bulk upload.

- **Environment setup with Vercel deployments and a Supabase backend.** Developer will have the ability to make changes locally and deploy to an environment in the cloud that the client can access and test.

- **Authentication and identity management.** Users will be able to sign up, sign in, and sign out. They will be able to reset their password if they forget it. They will be able to verify their email address if they need to.

- **Navigation and page layout.** The navigation and page layout will be consistent and easy to use. The layout will be responsive and work on all devices.

- **User profile management.** Users will be able to update their profile information. They will be able to update their password.

- **Client CRUD (create, read, update, delete).** Admins will be able to create, read, update, and delete clients.
  - Client details include:
    - Name
    - Address
    - Logo
    - Background Image
    - Primary Color
    - Accent Color

- **User CRUD.** Admins and managers will be able to create, read, update, and delete users.
  - User details include:
    - Name
    - Email
    - Password
    - Role
    - Status
    - Client
    - Industry
  - Admins and managers can bulk upload users with groups from a spreadsheet.
    - The spreadsheet should have the following columns:
      - Name
      - Email
      - Username (Note: System will auto-generate usernames if not provided)
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

- **Industries.** Admins will be able to create, read, update, and delete industries and assign users to them.

- **Benchmarks.** Admins will be able to create, read, update, and delete benchmarks for assessment dimensions by industry.
  - Benchmarks will have the following details:
    - Assessment
    - Industry
    - Dimension
    - Value
  - Admins can bulk upload benchmarks from a spreadsheet.
    - The spreadsheet should have the following columns:
      - Assessment
      - Industry
      - Dimension
      - Value

## Phase 2: Assessment Management and Assignment

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
    - Timed (not critical at this juncture)
    - Time Limit (not critical at this juncture)
    - Target
    - 360 Assessment (boolean)
  - Rich Text fields will have a WYSIWYG editor and will render with formatting on the assessment page.
  - Admins can add dimensions and fields to the assessment.
  - Multiple Choice and Slider fields will have the ability to add anchors and edit values.
    - Need to be able to pull anchors from template. See Digital Ocean legacy anchors.
    - Need to make sure I can add anchors when needed and these new ones can be saved as templates.
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

## Phase 3: Feedback Management and Reporting

> **Summary of Deliverables:**
> - Report management.
> - Feedback management.
> - Report templates.

- **Report Management.** Admins will be able to generate reports for surveys.
  - Reports will be generated for each survey.
  - Managers can view reports for their surveys on a web page.
  - Reports can be exported to PDF, Excel, and CSV.
    - Need bulk downloads - zipped file or something like that.
  - For **the 360**, each dimension, the report will show an overall score broken down by Peer, Direct Report, Supervisor, Self, and Other as well as the industry benchmark and GEOnorm for their group.
  - **For the Involved-Leader and Involved-Blocker**, the reports will resemble the one from the Digital Ocean Legacy reports, which are also located in the Slack Channel for this platform - need to make sure these details are captured here; This will include the person's overall scores (means for all dimensions) and then for each dimension, the target's score for a given dimension compared to the GEONorm and the Industry Benchmark. This will also include feedback as described below.
  - Indicators for suggested improvement areas will be shown in each dimension breakdown.

- **Feedback Management.** Admins will be able to create, read, update, and delete feedback.
  - Feedback will have the following details:
    - Assessment
    - Dimension
    - Type
    - Feedback
    - Created At
    - Updated At
  - Admins can bulk upload feedback libraries from a spreadsheet.
    - The spreadsheet should have the following columns:
      - Assessment
      - Dimension
      - Type (Overall/Specific)
      - Feedback
  - Non-360 assessments will have feedback for each dimension.
  - All users get overall feedback.
  - The reports will pull **ONE** specific feedback entry randomly for each dimension.
  - 360 assessments will use text inputs from user assessments rather than feedback from the feedback library.

- **Report Templates.** Admins will be able to create, read, update, and delete report templates for each assessment.
  - These templates will be used to generate custom reports for each survey.
  - They will override the default report template for the assessment.
  - Clients will have the ability to toggle different report components on and off.
  - Clients will have the ability to customize the wording of labels and headings in the report.
  - **Question:** How difficult would it be to have system email users their reports OR log into system and retrieve? Which would be easier and more cost conscious?
    - **Answer:** Probably a custom page with an interface much like the admin/manager interface where they can generate and view reports for everyone, only the basic user's limited access will have it stripped down to just their stuff. Honestly, I don't see the email being substantially more complicated and it could end up being easier. How about if either solution is viable, I'll write the requirement as "one or the other" and then if I get into trouble with one I can pivot to the other and move on. But if they both end up being trivial I'll add both.
    - **Decision:** I am fine for one or the other at this point. I don't think we need both. Just one way they can get them digitally.

## Phase 4: Error Corrections, Revisions, and Enhancements

Once the requirements are met and the above specified functionality exists, we will execute a rigorous testing and validation process to ensure the system is working as expected. I will then make any necessary corrections, revisions, and enhancements to the system within the scope of the proposal. After everything is working as expected, we will deploy the system to the production environment and release the remainder of the proposed budget.

---

## Inline Comments and Discussion

### Comment on "early" (mock data/static assessments)

**Craig Wallace** (Dec 5, 2025, 10:27 AM): Expand on this more - what does this actually mean? If this help insure validity of data and system, lets use it. I am just not sure what this does or does not provide us.

**Jay Long** (Dec 5, 2025, 10:34 AM): @Craig Wallace the only reason i included this was because i looked at the timeline and noticed that we would be several weeks in before i could be in a place to demo emails and reports so i was going to mock an assessment so i could jump ahead and let you get hands on with things like working through assessments and reviewing reports while i worked on the nitty gritty details of the assessment editor system.

i worked a bit ahead on this and i'm now feeling confident that if i get intense i can move fast enough to get to this point by the end of week two, which seems quick enough to me personally. if i'm right, then this is just extra unnecessary work.

mockups are more for pitch meetings. we already know what we want and we know that we want it. so lets just hurry up and build it was my thought.

### Comment on "Multiple Choice and Slider fields will have the ability to add anchors and edit values"

**Craig Wallace** (Dec 5, 2025, 11:01 AM): Need to be able to pull anchors from template. See Digital Ocean legacy anchors there. Also dropped comments in Slack. AND need to make sure I can add anchors when needed and these new ones can be save as templates.

**Jay Long** (Dec 5, 2025, 11:12 AM): @Craig Wallace gotcha

### Comment on "Reports can be exported to PDF, Excel, and CSV"

**Craig Wallace** (Dec 5, 2025, 11:04 AM): need bulk downloads - zipped file or something like that.

### Comment on "For the Involved-Leader and Involved-Blocker reports"

**Jay Long** (Dec 5, 2025, 11:45 AM): @Craig Wallace i'll pull these both up and compare them side by side to be clear. that said, i'm going to push for a robust report template customization system so hopefully if i'm able to really deliver on this requirement it will be good enough where this isn't all that important. but it's useful to keep in mind, particularly when seeding the initial default templates.

**Craig Wallace** (Dec 5, 2025, 1:41 PM): The 360 is more complex, so if we have all that in there, the others should be easier.

### Comment on "two" (specific feedback entries)

**Craig Wallace** (Dec 5, 2025, 11:24 AM): ONE specific feedback

### Comment on "Timed"

**Craig Wallace** (Dec 5, 2025, 10:54 AM): not critical at this juncture

**Jay Long** (Dec 5, 2025, 10:59 AM): @Craig Wallace ok cool. i don't think it would have made much of a difference either way, but i'll leave the feature off to make sure it doesn't slow me down. i'll probably keep the database column there for future use and make it nullable. you won't see it in the ui.

### Comment on "Time Limit"

**Craig Wallace** (Dec 5, 2025, 10:55 AM): not critical at this juncture

### Comment on "360 Assessment (boolean)"

**Craig Wallace** (Dec 5, 2025, 10:57 AM): Why does the 360 have it owns bullet here? I am just confused by this.

**Jay Long** (Dec 5, 2025, 11:02 AM): @Craig Wallace it just indicates whether or not it's a 360 assessment. most of the assessments all share common attributes but there's certain aspects of a 360 that set it apart. it's possible i'll end up doing this differently but i'm highly confident having a field set to true if 360, false if else will be helpful in several scenarios.

**Craig Wallace** (Dec 5, 2025, 11:35 AM): Got it

### Comment on "Username"

**Craig Wallace** (Dec 5, 2025, 10:35 AM): Probably better to have system create usernames rather than me do it. UNLESS you know of an easy way for me to do this

**Jay Long** (Dec 5, 2025, 10:38 AM): @Craig Wallace that works
