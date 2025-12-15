# Fixed-Price Development Proposal  
**Project:** Involved Talent v2 – Full Web Application  
**Client:** Craig Wallace / Involved Talent  
**Developer:** Jay Long  
**Date:** December 8, 2025  

### 1. Project Overview & Total Fixed Price

We will build the complete Involved Talent v2 platform as defined in the finalized scope document dated December 5–8, 2025.  
The entire project is offered on a **fixed-price basis** for **$8,000 USD (four milestones of $2,000 each).

### 2. Payment Schedule & Milestones (Fixed $2,000 each)

| Milestone | Description (Summary)                                    | Approximate Duration | Payment Trigger |
|-----------|-----------------------------------------------------------|----------------------|-----------------|
| 1         | Environment Setup + Identity/Client/User/Group Management | 1–2 weeks            | When all Phase 1 deliverables are deployed to the staging environment and are reasonably functional and testable |
| 2         | Assessment Management, Assignment, Preview, Publishing & Emails | 1–2 weeks            | When all Phase 2 deliverables are deployed and testable |
| 3         | Feedback Library + Report Generation (PDF/Excel/CSV + bulk download) + Basic Report Templates | 1–2 weeks            | When all Phase 3 deliverables are deployed and reports can be generated and downloaded |
| 4         | Final revisions, edge-case fixes, preferential polish, and production deployment | 1–2 weeks            | Upon final client sign-off and production launch |

**Important note on early milestone release:**  
If a milestone’s requirements are fully met ahead of schedule, the milestone can be demonstrated, approved, and invoiced/released early. This keeps cash flow smooth and rewards fast progress.

### 3. Detailed Requirements by Phase

#### Phase 1: Environment Setup and Identity/Client/User/Group Management

**Environment Setup**
- Environment setup with Vercel deployments and a Supabase backend. Developer will have the ability to make changes locally and deploy to an environment in the cloud that the client can access and test.

**Authentication and Identity Management**
- Users will be able to sign up, sign in, and sign out.
- Users will be able to reset their password if they forget it.
- Users will be able to verify their email address if they need to.

**Navigation and Page Layout**
- The navigation and page layout will be consistent and easy to use.
- The layout will be responsive and work on all devices.

**User Profile Management**
- Users will be able to update their profile information.
- Users will be able to update their password.

**Client CRUD**
- Admins will be able to create, read, update, and delete clients.
- Client details include:
  - Name
  - Address
  - Logo
  - Background Image
  - Primary Color
  - Accent Color

**User CRUD**
- Admins and managers will be able to create, read, update, and delete users.
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

**Group CRUD**
- Admins and managers will be able to create, read, update, and delete groups.
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

**User Invites**
- Users will receive an email with a link to claim their account.
- The email will have a link to the login page.
- The link will contain a token that will be used to claim the account.
- The token will expire after 7 days.
- The token will be used to claim the account.
- The account will be claimed and the user will be redirected to the dashboard.
- The user will be able to login with their email and password.
- The user will be able to update their profile information.
- The user will be able to update their password.
- The user will be able to request a password reset link.

**Industries**
- Admins will be able to create, read, update, and delete industries and assign users to them.

**Benchmarks**
- Admins will be able to create, read, update, and delete benchmarks for assessment dimensions by industry.
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

#### Phase 2: Assessment Management and Assignment

**Assessment Management**
- Admins will be able to create, read, update, and delete assessments.
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

**Assessment Assignment**
- Admins and managers will be able to assign assessments to users and groups.
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

#### Phase 3: Feedback Management and Reporting

**Report Management**
- Admins will be able to generate reports for surveys.
- Reports will be generated for each survey.
- Managers can view reports for their surveys on a web page.
- Reports can be exported to PDF, Excel, and CSV.
  - Need bulk downloads - zipped file or something like that.
- For **the 360**, each dimension, the report will show an overall score broken down by Peer, Direct Report, Supervisor, Self, and Other as well as the industry benchmark and GEOnorm for their group.
- **For the Involved-Leader and Involved-Blocker**, the reports will resemble the one from the Digital Ocean Legacy reports, which are also located in the Slack Channel for this platform - need to make sure these details are captured here; This will include the person's overall scores (means for all dimensions) and then for each dimension, the target's score for a given dimension compared to the GEONorm and the Industry Benchmark. This will also include feedback as described below.
- Indicators for suggested improvement areas will be shown in each dimension breakdown.

**Feedback Management**
- Admins will be able to create, read, update, and delete feedback.
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

**Report Templates**
- Admins will be able to create, read, update, and delete report templates for each assessment.
- These templates will be used to generate custom reports for each survey.
- They will override the default report template for the assessment.
- Clients will have the ability to toggle different report components on and off.
- Clients will have the ability to customize the wording of labels and headings in the report.
- One digital delivery method for completed reports (either automated email or secure in-app retrieval – whichever proves most efficient during development).

### 4. Milestone Acceptance Criteria (Phases 1–3)

A milestone is considered complete and payable when:

- All listed features in that phase are implemented and deployed to the shared staging environment (Vercel + Supabase).  
- The functionality is reasonably viable and usable for its intended purpose (i.e., a reasonable person would consider the feature “built and working”).  
- The vast majority of normal-use test cases function correctly.

This does **not** require 100 % bug-free perfection or final visual polish. Minor bugs, rare edge cases, and preferential styling/UI adjustments are expected and will be addressed in Phase 4 without delaying milestone payment.  

The experience working on the v1 re-launch combined with many years of building similar platforms gives me deep insight into your exact needs, so the core functionality delivered in Phases 1-3 will already be very close to the final desired state.

### 5. Phase 4 - Revisions, Edge-Case Fixes & Enhancements

Phase 4 is reserved for:

- Fixing any remaining bugs or edge cases discovered during real use  
- Preferential revisions (layout tweaks, wording changes, small UX improvements, etc.)  
- Final polish before production launch

Priorities will be agreed together after a full demo/review of Phases 1-3.

**Scope protection for Phase 4:**  
This phase is capped at approximately **20 hours** of work included in the fixed price. If requested revisions clearly exceed the original agreed specifications (e.g., major new features), we will discuss and quote those separately.  

The only currently anticipated area that could potentially generate open-ended customization is advanced report template design/customization. While the base report templates and export functionality will be complete in Phase 3, highly bespoke or iteratively evolving report layouts can become open-ended. Should this occur, we will either (a) complete a reasonable level of customization within the 20-hour cap, or (b) table further enhancements for a future phase at an additional fixed price. All other features in the system are standard, well-understood web-application patterns that I have built many times and can deliver with high confidence.

### 6. What Is Included in the Fixed Price

- All functionality as described in the scope document (Phases 1–4)  
- Staging environment accessible to you at all times  
- Responsive, professional Tailwind-based UI (minimalist but clean and branded where specified)  
- PDF, Excel, and CSV report export with bulk-download capability  
- One digital delivery method for completed reports (either automated email or secure in-app retrieval – whichever proves most efficient during development)  
- Full production deployment and post-launch knowledge transfer  
- Up to 20 hours of Phase 4 revisions/fixes as described above

### 7. What Is Explicitly Excluded (available as future phases if desired)

- Highly complex or open-ended report template customization beyond the base system delivered in Phase 3  
- Advanced AI features and integrations. (This is not a priority for the initial release, but could be added in a future phase if desired.)
- Ongoing maintenance or hosting fees (Vercel and Supabase costs are paid directly by you)  
- Third-party paid services (e.g., premium email delivery, advanced AI features, etc.)

### 8. Timeline Estimate

Assuming prompt feedback and approval at each milestone:  
Start → Finish in approximately **6–8 weeks** (mid-February 2026 target production launch).

### 9. Acceptance

Let me know when you want to move forward or if you need adjustments to the scope or timeline.

Thank you for the trust — I’m excited to deliver Involved Talent v2 quickly, on budget, and to a standard you’ll be proud of.

Best regards,  
Jay Long  
Full-Stack Developer  
jay@cyberworldbuilders.com

