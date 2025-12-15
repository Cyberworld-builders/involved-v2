export type ResourcePost = {
  slug: string
  title: string
  description: string
  /** ISO date string for display/sorting */
  publishedAt?: string
  tags?: string[]
  /**
   * Markdown body content rendered on the detail page.
   * Keep this relatively short and scannable (best for walkthroughs).
   */
  bodyMarkdown?: string
  video: {
    bucket: 'resources-videos'
    /** Path inside the bucket (e.g. "getting-started/welcome.mp4") */
    path: string
  }
}

/**
 * Hard-coded "Resources" posts.
 *
 * Upload videos to the `resources-videos` Supabase Storage bucket, then paste the
 * storage path here (no CMS needed).
 */
export const RESOURCE_POSTS: ResourcePost[] = [
  {
    slug: 'user-onboarding',
    title: 'User onboarding (single + bulk) — end-to-end',
    description:
      'How to add users, send invites, and how users claim accounts and set passwords.',
    publishedAt: '2025-12-13',
    tags: ['Onboarding', 'Users', 'Admin'],
    bodyMarkdown: `
## Overview

This guide walks through the full onboarding flow:

- Add a **single user** (recommended for one-offs)
- **Bulk upload** users from CSV (recommended for batches)
- Send/verify invites
- What the invited user does to **activate** their account

> Tip: Record this as a walkthrough video and attach it to this post.

---

## Prerequisites

- You are signed in as an admin (or have permission to manage users).
- The **Clients** and **Industries** you need already exist.
- **Access model:**
  - **Super admins** can see all clients and all users, and can choose any client when creating users.
  - **Client admins** only see **their own client and its users**. Any users they create are **automatically associated with their client**.

---

## Option A: Add a single user (recommended for one-off invites)

1. Go to **Dashboard → Users**
2. Click **Add User**
3. Fill out:
   - **Name**
   - **Email** (this is where the invite will be sent)
   - **Username** (if required)
   - **Client** (who the user belongs to)
     - If you are a **client admin**, this will be **pre-selected to your client** and you **cannot change it**.
     - If you are a **super admin**, you can choose any existing client.
   - **Industry** (if applicable)
   - **Access Level** (if visible): typically **Member**
4. Click **Create User**

### After creating the user

- Confirm the user appears in the Users list.
  - Client admins will only see **users for their own client**.
  - Super admins will see all users.
- The user is **already associated with the selected client** as soon as you save.
  - The **invite email is only for verifying/activating their auth account** (password + first login); it does **not** change which client they belong to.
- Next, send the invite (see **“Send invite + verify delivery”** below).

---

## Option B: Bulk upload users from CSV (recommended for batches)

1. Go to **Dashboard → Users**
2. Click **Bulk Upload**
3. Download the template (if available) and format your CSV.

### CSV format

You can download an up-to-date sample CSV from the app:

1. Go to **Dashboard → Users → Bulk Upload**
2. Click **Download Template**

The template uses this exact header row:

| Column | Required | Example | Notes |
|---|---:|---|---|
| Name | Yes | Jane Smith | No commas (CSV quoting is not supported in the current uploader). |
| Email | Yes | jane.smith@example.com | Must be a valid email; should be unique. |
| Username | No | janesmith | If blank, the system will generate one from Name. |
| Industry | Yes | Healthcare | Should match an existing Industry name (case-insensitive) or the user may be created without an industry assignment. |
| Client Name | No | Acme Corp | Optional; if provided, should match an existing Client name (case-insensitive). For **client admins**, any value here is ignored and users are always created under **your client**. |

### Sample CSV

Copy/paste this into a file named .csv (or download the template from the app and edit it):

| Name | Email | Username | Industry | Client Name |
|---|---|---|---|---|
| John Doe | john.doe@example.com | johndoe | Technology | Acme Corp |
| Jane Smith | jane.smith@example.com | janesmith | Healthcare | MedCorp |
| Bob Johnson | bob.johnson@example.com | bobjohnson | Finance | FinanceCorp |

Additional notes:

- Use a header row (first row).
- Keep emails clean and unique.
- If you have optional columns, leave the column present and values blank (don’t remove columns mid-file).
- Avoid commas inside fields (the current CSV parser uses simple comma-splitting).

### Upload

1. Choose the CSV file
2. Preview parsed users (if preview is shown)
3. Click **Create Users**

### After upload completes

- Review any per-row errors shown.
- Confirm users were created and appear in the Users list.
- Next, send invites (see below).

---

## Send invite + verify delivery

For each user you want to onboard:

1. Open the user record (or user actions menu)
2. Click **Invite** / **Send invite**
3. Confirm success message

### What to check

- Invite status (if displayed)
- Email delivered to the intended inbox
- If the invite email is missing:
  - check spam/junk
  - confirm the user’s email address is correct
  - resend invite

---

## What the invited user does (account activation)

1. User opens the invite email
2. Clicks the invite/claim link
3. They are taken to the **claim account** flow
4. They set a password (and any required profile fields)
5. On success, they can sign in at **/auth/login**

### Troubleshooting for users

- “Link expired” or “Invalid token”: ask an admin to resend the invite.
- Password issues: user can use **Forgot Password** (if enabled) or admin can resend invite.

---

## Recommended admin checklist (end-to-end)

- [ ] Create client + industry (if needed) — **super admin** only
- [ ] Create users (single or bulk)
  - Super admins: choose the correct client for each user
  - Client admins: users are automatically scoped to your client
- [ ] Send invite(s)
- [ ] Confirm user can claim + set password
- [ ] Confirm user can sign in
- [ ] Confirm user shows correct client/industry + access level
`,
    video: { bucket: 'resources-videos', path: 'phase-1/user-onboarding.mp4' },
  },
  {
    slug: 'assessments-phase-1',
    title: 'Assessments: create, view, edit & delete (details + dimensions)',
    description:
      'How to manage assessments in Phase 1: create, view, edit and delete assessment details and dimensions (no fields/settings yet).',
    publishedAt: '2025-12-15',
    tags: ['Assessments', 'Phase 1', 'Dimensions'],
    bodyMarkdown: `
## Overview

This guide covers the **Phase 1** assessment lifecycle:

- Create a new **assessment** (details only)
- View the **Assessments** list
- Edit an assessment’s **details** and **dimensions**
- Delete an assessment

> Note: In **Phase 1** we only manage **Details** and **Dimensions**.  
> The **Fields** and **Settings** tabs will be introduced in later phases and are intentionally **out of scope** here.

---

## Prerequisites

- You are signed in as a user with permission to manage assessments (typically a super admin or designated admin).
- You understand that:
  - An **Assessment** is the container.
  - **Dimensions** are the high-level categories inside an assessment (e.g. *Communication*, *Leadership*, *Technical Skills*).
  - Benchmarks are tied to dimensions and rely on them being set up correctly.

---

## Create a new assessment (Details tab)

1. Go to **Dashboard → Assessments**.
2. Click **Create Assessment** (or similar button in the header).
3. On the **Details** tab, fill out:
   - **Name** – short, clear label (e.g. “Consulting Foundations v1”).
   - **Description** – what this assessment is for and who it’s for.
4. Click **Save** / **Create Assessment**.

After saving:

- You’ll be redirected to the assessment detail/edit screen.
- The assessment should now appear in the **Assessments** table.

---

## View assessments

1. Go to **Dashboard → Assessments**.
2. You’ll see a table of assessments with key information (name, client/industry, status, actions).
3. From this table you can:
   - **View / Edit** an assessment’s details and dimensions.
   - **Manage Benchmarks** (once dimensions exist).
   - **Delete** an assessment (if enabled).

Use the **Edit** or **View** action to manage details and dimensions.

---

## Manage dimensions for an assessment

Dimensions are required for benchmarking and for structuring the assessment. In Phase 1 you should **expect to:**

- Add new dimensions
- Rename or adjust existing dimensions
- Reorder dimensions (if drag-and-drop is enabled)
- Remove dimensions you no longer need (subject to benchmark implications)

### Open the Dimensions tab

1. From **Dashboard → Assessments**, find the assessment you want to update.
2. Click **Edit** (or open the assessment details).
3. In the assessment editor, switch to the **Dimensions** tab.

### Add a new dimension

1. On the **Dimensions** tab, click **Add Dimension** (or the “+” button).
2. For each dimension, fill in:
   - **Name** – e.g. “Leadership”, “Client Management”, “Technical Execution”.
   - **Short description** – optional, but helpful context for raters and reporting.
3. Click **Save** or confirm the row to add the dimension.
4. Repeat for each additional dimension you need.

> Tip: Think of dimensions as the “chapters” of your assessment.  
> Benchmarks and (later) fields/questions will sit **inside** these dimensions.

### Edit an existing dimension

1. On the **Dimensions** tab, locate the dimension you want to change.
2. Click into the **Name** or **Description** field (or use the provided **Edit** action).
3. Update the text as needed.
4. Save the changes (either per-row or via the main **Save** button, depending on your UI).

### Reorder dimensions (if drag-and-drop is enabled)

If your Phase 1 build includes drag-and-drop:

1. On the **Dimensions** tab, hover over the drag handle (often a “grip” icon) next to a dimension.
2. Click and hold the handle.
3. Drag the dimension up or down to the desired position.
4. Release to drop it in place.
5. Ensure you click **Save** (if required) so the new order is persisted.

The order you set here controls the order in which dimensions appear in:

- The assessment UI
- Benchmark management screens
- Any reports that are dimension-aware

### Remove a dimension (be careful)

1. On the **Dimensions** tab, find the dimension you want to remove.
2. Click the **Delete/Remove** action for that dimension.
3. Confirm the deletion when prompted.

**Important considerations:**

- If you have **benchmarks** tied to this dimension, removing the dimension may:
  - Remove or orphan associated benchmark records, or
  - Prevent further use of those benchmarks.
- In Phase 1, plan your dimensions **before** you invest heavily in benchmarks, to avoid rework.

---

## Bulk upload benchmark values for dimensions (CSV)

Once you have dimensions and an industry selected, you can bulk upload **benchmark values** for each dimension using a CSV file.

This is done from the **Benchmarks** workflow (per assessment + industry):

1. Go to **Dashboard → Benchmarks**.
2. Choose an assessment, then choose an industry.
3. On the **Manage Benchmarks** page for that assessment/industry:
   - Click **📥 Download Template** to get a CSV template.
   - After editing the CSV, click **📤 Upload CSV** to load the values.

### CSV format (benchmarks by dimension)

The template generated by **Download Template** uses this header row:

| Column          | Required | Example      | Notes |
|-----------------|:--------:|-------------|-------|
| Dimension Name  | Yes      | Leadership  | Name of an existing dimension in the assessment. Used as a fallback if code doesn’t match. |
| Dimension Code  | Yes      | LEAD        | Code of an existing dimension. Matching is tried by **code first**, then by name (case-insensitive). |
| Benchmark Value | Yes      | 75          | Number between **0 and 100**. Rows outside this range are rejected. |

> The parser also accepts a column named **Value** instead of **Benchmark Value**, which is what the in-app template uses.

### Sample CSV (for valid test data)

You can use this as an example when testing bulk upload. Assume your assessment has these dimensions:

- Leadership (code: LEAD)
- Communication (code: COMM)
- Technical Execution (code: TECH)

Then a valid CSV might look like:

| Dimension Name       | Dimension Code | Benchmark Value |
|----------------------|----------------|-----------------|
| Leadership           | LEAD           | 80              |
| Communication        | COMM           | 75              |
| Technical Execution  | TECH           | 90              |

Save this as a .csv file, or use the **Download Template** button and edit the **Value/Benchmark Value** column to include numbers between 0 and 100.

### Upload & apply

1. In **Manage Benchmarks** for the chosen assessment + industry:
   - Click **📤 Upload CSV**.
   - Select your edited CSV file.
2. The app will validate the file:
   - Required columns must exist.
   - Dimension names/codes must match existing dimensions.
   - Benchmark values must be valid numbers between 0 and 100.
3. If the file is valid:
   - You’ll see a success message with how many rows were loaded.
   - The benchmark values will appear in the table for each dimension.
4. Click **Save Benchmarks** to persist the uploaded values.

---

## Edit an assessment (details + dimensions)

To update an existing assessment:

1. Go to **Dashboard → Assessments**.
2. Find the target assessment and click **Edit**.
3. On the **Details** tab you can update:
   - Name
   - Description
   - Client / Industry (if applicable)
4. On the **Dimensions** tab you can:
   - Add new dimensions
   - Rename / update descriptions
   - Reorder dimensions (if enabled)
   - Remove dimensions (with care)
5. Save your changes.

Changes to dimensions will affect:

- How benchmarks are organized.
- What shows up in benchmark management screens for that assessment.

---

## Delete an assessment (Phase 1 behavior)

> Use this carefully – deleting an assessment is usually a **destructive** action.

1. Go to **Dashboard → Assessments**.
2. Locate the assessment you want to delete.
3. Use the **Delete** action (trash icon or “Delete” button).
4. Confirm the deletion in the dialog.

When you delete an assessment in Phase 1:

- The assessment and its **dimensions** are removed.
- Any associated **benchmarks** for that assessment/dimensions may also be removed or become unusable.
- Users will no longer see this assessment in selection lists or benchmark flows.

Consider exporting or documenting key benchmark values before deleting, if you might need them later.

---

## Recommended workflow for Phase 1 assessments

1. **Design** your assessment on paper (name, purpose, list of dimensions).
2. **Create** the assessment and fill in **Details**.
3. **Define Dimensions**:
   - Add all required dimensions.
   - Name them clearly.
   - Order them in the sequence you want to present/review.
4. **Validate**:
   - Confirm the assessment appears in the **Assessments** table.
   - Open the **Dimensions** tab and verify everything looks correct.
5. **(Optional, Phase 1)**: Set up **Benchmarks** for each dimension.
6. Only after Phase 1 is stable, move on to later phases that add **Fields** and **Settings**.
`,
    video: { bucket: 'resources-videos', path: 'phase-1/assessments-dimensions.mp4' },
  },
  {
    slug: 'benchmarks-phase-1',
    title: 'Benchmarks: set industry benchmark values for dimensions',
    description:
      'How to set, edit, bulk upload, and manage benchmark values for assessment dimensions by industry.',
    publishedAt: '2025-12-15',
    tags: ['Benchmarks', 'Phase 1', 'Dimensions'],
    bodyMarkdown: `
## Overview

This guide covers managing **benchmark values** for assessment dimensions by industry in Phase 1:

- Navigate to benchmark management
- Set benchmark values manually (per dimension)
- Bulk upload benchmark values from CSV
- Edit existing benchmark values
- Delete benchmark values

> Note: Benchmarks are **industry-specific** and **dimension-specific**.  
> Each assessment dimension can have different benchmark values for different industries.

---

## Prerequisites

- You are signed in as a user with permission to manage benchmarks (typically a super admin or designated admin).
- An **assessment** exists with **dimensions** already defined.
- At least one **industry** exists in the system.
- You understand that:
  - **Benchmarks** are numeric values (0-100) that represent target performance levels.
  - Benchmarks are set **per dimension** and **per industry**.
  - The same dimension can have different benchmark values for different industries.

---

## Navigate to benchmark management

1. Go to **Dashboard → Benchmarks**.
2. You'll see a list of available assessments.
3. Click on the assessment you want to manage benchmarks for.
4. You'll see a list of available industries.
5. Click on the industry you want to set benchmarks for.

You're now on the **Manage Benchmarks** page for that assessment + industry combination.

---

## Set benchmark values manually

On the **Manage Benchmarks** page, you'll see a table with all dimensions for the selected assessment:

1. For each dimension, find the **Benchmark Value** input field.
2. Enter a number between **0 and 100** (e.g., 75, 82.5).
   - This represents the target performance level for that dimension in this industry.
3. Repeat for all dimensions you want to set benchmarks for.
4. Click **Save Benchmarks** at the bottom of the table.

After saving:

- You'll see a success message.
- The benchmark values are now saved and will be used for reporting and comparisons.

### Tips

- You can leave some dimensions blank if you don't have benchmark values for them yet.
- You can enter decimal values (e.g., 75.5).
- Values must be between 0 and 100 (the system will reject values outside this range).

---

## Bulk upload benchmark values (CSV)

For assessments with many dimensions, bulk uploading from CSV is faster than entering values manually.

### Download the template

1. On the **Manage Benchmarks** page, click **📥 Download Template**.
2. A CSV file will download with:
   - All dimensions for the selected assessment
   - Column headers: **Dimension Name**, **Dimension Code**, **Value**
   - Empty value cells ready for you to fill in

### CSV format (benchmarks by dimension)

The template uses this exact header row:

| Column          | Required | Example      | Notes |
|-----------------|:--------:|-------------|-------|
| Dimension Name  | Yes      | Leadership  | Name of an existing dimension in the assessment. Used as a fallback if code doesn't match. |
| Dimension Code  | Yes      | LEAD        | Code of an existing dimension. Matching is tried by **code first**, then by name (case-insensitive). |
| Value           | Yes      | 75          | Number between **0 and 100**. Rows outside this range are rejected. |

> The parser also accepts a column named **Benchmark Value** instead of **Value**, which is what some templates use.

### Sample CSV (for valid test data)

You can use this as an example when testing bulk upload. Assume your assessment has these dimensions:

- Leadership (code: LEAD)
- Communication (code: COMM)
- Technical Execution (code: TECH)

Then a valid CSV might look like:

| Dimension Name       | Dimension Code | Value |
|----------------------|----------------|-------|
| Leadership           | LEAD           | 80    |
| Communication        | COMM           | 75    |
| Technical Execution  | TECH           | 90    |

Save this as a .csv file, or use the **Download Template** button and edit the **Value** column to include numbers between 0 and 100.

### Upload & apply

1. On the **Manage Benchmarks** page, click **📤 Upload CSV**.
2. Select your edited CSV file.
3. The app will validate the file:
   - Required columns must exist.
   - Dimension names/codes must match existing dimensions in the assessment.
   - Benchmark values must be valid numbers between 0 and 100.
4. If the file is valid:
   - You'll see a success message showing how many values were loaded.
   - The benchmark values will appear in the table (but are **not saved yet**).
5. **Click Save Benchmarks** to persist the uploaded values.

### Validation rules

- **Dimension matching**: The system tries to match by **code first**, then by **name** (case-insensitive).
- **Value range**: All values must be between **0 and 100**. Rows outside this range are rejected.
- **Missing dimensions**: If a row references a dimension that doesn't exist in the assessment, that row is skipped.
- **Duplicate dimensions**: If multiple rows reference the same dimension, the **last matching row** wins.

---

## Edit existing benchmark values

1. On the **Manage Benchmarks** page, find the dimension you want to update.
2. Click into the **Benchmark Value** input field.
3. Change the number to the new value (still must be 0-100).
4. Click **Save Benchmarks** at the bottom.

The updated value will replace the previous benchmark for that dimension in this industry.

---

## Delete benchmark values

You can remove a benchmark value in two ways:

### Method 1: Clear the input

1. Find the dimension with the benchmark you want to remove.
2. Clear the **Benchmark Value** input field (delete the number).
3. Click **Save Benchmarks**.

The benchmark will be removed from the database.

### Method 2: Use the Delete button

1. Find the dimension with the benchmark you want to remove.
2. Click the **Delete** button in the **Actions** column.
3. Confirm the deletion when prompted.
4. The benchmark is immediately removed (no need to click Save).

> Note: Deleting a benchmark only removes it for this **assessment + industry** combination.  
> Other industries can still have benchmark values for the same dimension.

---

## Recommended workflow for Phase 1 benchmarks

1. **Plan your benchmarks**:
   - Decide which dimensions need benchmark values.
   - Determine appropriate target values (0-100) for each industry.
   - Consider industry-specific performance expectations.

2. **Set up dimensions first**:
   - Ensure your assessment has all required dimensions defined.
   - Verify dimension names and codes are correct (they're used for CSV matching).

3. **Choose your method**:
   - **Manual entry**: Good for a few dimensions or when values need careful review.
   - **CSV upload**: Good for many dimensions or when you have data in a spreadsheet.

4. **Validate before saving**:
   - Review all values in the table before clicking **Save Benchmarks**.
   - Check that values are reasonable for the industry context.

5. **Save and verify**:
   - Click **Save Benchmarks**.
   - Confirm the success message.
   - Verify values appear correctly in the table.

6. **Repeat for other industries**:
   - Navigate back to select a different industry.
   - Set benchmarks for that industry's context.

---

## Troubleshooting

### "No dimensions found for this assessment"

- **Cause**: The assessment doesn't have any dimensions defined yet.
- **Solution**: Go to **Dashboard → Assessments**, edit the assessment, and add dimensions on the **Dimensions** tab. Then return to benchmark management.

### "CSV validation failed"

- **Cause**: The CSV file doesn't match the expected format or contains invalid data.
- **Solutions**:
  - Download a fresh template and use that as your starting point.
  - Ensure all required columns are present.
  - Check that dimension names/codes match exactly (case-insensitive).
  - Verify all values are numbers between 0 and 100.

### "No matching dimension found for row"

- **Cause**: A row in your CSV references a dimension that doesn't exist in the assessment.
- **Solution**: Check the dimension name and code in your CSV against the actual dimensions in the assessment. Update the CSV or add the missing dimension to the assessment.

### Values not saving

- **Cause**: You may have forgotten to click **Save Benchmarks** after uploading CSV or making manual changes.
- **Solution**: After uploading CSV or editing values, always click **Save Benchmarks** to persist changes.

---

## Understanding benchmarks in context

- **Benchmarks are comparative**: They represent target performance levels that can be compared against actual assessment results.
- **Industry-specific**: The same dimension (e.g., "Leadership") can have different benchmark values for different industries (e.g., 75 for Healthcare, 80 for Technology).
- **Dimension-scoped**: Benchmarks are tied to specific dimensions within an assessment, not to the assessment as a whole.
- **Used in reporting**: Benchmark values are used to:
  - Compare individual or group performance against targets.
  - Generate reports showing performance gaps.
  - Identify areas where performance exceeds or falls short of industry standards.
`,
    video: { bucket: 'resources-videos', path: 'phase-1/benchmarks.mp4' },
  },
  {
    slug: 'clients',
    title: 'Clients: create and edit client organizations',
    description:
      'How to create new clients, edit existing client information, configure branding, and manage client-specific settings.',
    publishedAt: '2025-12-15',
    tags: ['Clients', 'Phase 1', 'Admin'],
    bodyMarkdown: `
## Overview

This guide covers managing **client organizations** in Phase 1:

- Create a new client
- Edit existing client information
- Configure branding (logo, colors, images)
- Manage client-specific settings (profile requirements, research questions, whitelabeling)

> Note: Client management is restricted by access level.  
> **Super admins** can create and manage all clients.  
> **Client admins** can only view and edit their own assigned client.

---

## Prerequisites

- You are signed in as a user with permission to manage clients:
  - **Super admin**: Can create new clients and manage all clients.
  - **Client admin**: Can only view and edit their own assigned client (cannot create new clients).
- You understand that:
  - A **Client** is an organization (company, department, etc.) that uses the platform.
  - Clients can have custom branding applied to assessments.
  - Client settings affect how users from that client interact with the platform.

---

## Navigate to client management

1. Go to **Dashboard → Clients**.
2. You'll see a list of clients you have access to:
   - **Super admins**: See all clients in the system.
   - **Client admins**: See only their own assigned client.
3. From this page you can:
   - **View** client details (click on a client row).
   - **Edit** a client (click the Edit action).
   - **Create** a new client (super admins only - click **Add Client** button).

---

## Create a new client

> **Access restriction**: Only **super admins** can create new clients.  
> Client admins will not see the **Add Client** button.

1. Go to **Dashboard → Clients**.
2. Click **Add Client** (top right).
3. Fill out the form sections below, then click **Create Client**.

### Client Information

**Name** (required)
- The name of the client organization.
- Example: "Acme Corporation", "Healthcare Partners LLC"
- This appears in client lists, user assignments, and reports.

**Address** (optional)
- Global office address of the client.
- Example: "123 Main St, New York, NY 10001"
- Used for reference and reporting purposes.

### Branding & Images

**Logo** (optional)
- Client logo image file.
- Accepted formats: Any image format (PNG, JPG, SVG, etc.)
- **Usage**: This logo appears in the header of white-labeled assessments assigned to this client's users.
- **Best practices**:
  - Use a high-resolution image (at least 200x200 pixels).
  - Transparent background (PNG) works best for logos.
  - Keep file size reasonable (under 2MB recommended).

**Background Image** (optional)
- Client background image file.
- Accepted formats: Any image format (PNG, JPG, etc.)
- **Usage**: This background appears in the header of white-labeled assessments assigned to this client's users.
- **Best practices**:
  - Use a high-resolution image (recommended: 1920x1080 or similar).
  - Consider how it will look with the logo overlaid.
  - Keep file size reasonable (under 5MB recommended).

**Primary Color** (default: #2D2E30)
- The primary brand color for the client.
- **Usage**: Affects the look of white-labeled assessments and the Client Dashboard.
- You can:
  - Use the color picker to select a color visually.
  - Enter a hex color code directly (e.g., #2D2E30, #FF5733).
- **Format**: Hex color code (6 digits, with or without # prefix).

**Accent Color** (default: #FFBA00)
- The secondary brand color for the client.
- **Usage**: Used for highlights, buttons, and accents in white-labeled assessments and the Client Dashboard.
- You can:
  - Use the color picker to select a color visually.
  - Enter a hex color code directly (e.g., #FFBA00, #00C9FF).
- **Format**: Hex color code (6 digits, with or without # prefix).

### Client Settings

**Require users to complete their profile?** (Yes/No, default: No)
- **If Yes**: Upon initial login, users from this client will be prompted to:
  - Fill out their personal information.
  - Specify an email address.
  - Change their password.
- **If No**: Users can skip profile completion and use the platform immediately.
- **Use case**: Enforce data collection for compliance or reporting requirements.

**Show research questions?** (Yes/No, default: No)
- **If Yes**: Upon initial login, users from this client will be asked to fill out optional research questions.
- **If No**: Research questions are not shown to users from this client.
- **Use case**: Collect additional demographic or research data for analysis.

**Whitelabel client-assigned assessments?** (Yes/No, default: No)
- **If Yes**: All assessments assigned by a Client Admin from this client will be white-labeled with:
  - The client's logo (if provided).
  - The client's background image (if provided).
  - The client's primary and accent colors.
- **If No**: Assessments use the default platform branding.
- **Use case**: Provide a branded experience that matches the client's visual identity.

### After creating the client

- You'll see a success message.
- You'll be redirected to the **Clients** list page.
- The new client will appear in the table.
- You can now:
  - Assign users to this client.
  - Assign assessments to this client.
  - Edit the client's information or settings.

---

## Edit an existing client

1. Go to **Dashboard → Clients**.
2. Find the client you want to edit in the table.
3. Click the **Edit** action (or click on the client row to view details, then click Edit).
4. The edit form will load with the current client data pre-filled.
5. Make your changes to any fields:
   - **Client Information**: Name, Address
   - **Branding & Images**: Logo, Background Image, Primary Color, Accent Color
   - **Client Settings**: Profile requirements, Research questions, Whitelabeling
6. Click **Save Changes**.

### Important notes about editing

- **Logo and Background**: If you upload new images, they will replace the existing ones. If you don't upload new images, the existing ones are preserved.
- **Colors**: You can change colors at any time. Changes will apply to new white-labeled assessments going forward.
- **Settings**: Changes to settings (require profile, research questions, whitelabel) will affect:
  - **New users** created after the change.
  - **Existing users** on their next login (for profile/research requirements).
  - **New assessments** assigned after the change (for whitelabeling).

### After saving changes

- You'll see a success message.
- You'll be redirected to the **Clients** list page.
- The updated information will be reflected immediately.

---

## Understanding client settings in context

### Profile requirements

- **When it applies**: Only affects users from this client.
- **Timing**: Users are prompted on their **first login** after the setting is enabled.
- **Can be changed**: Yes, you can enable/disable this setting at any time.
- **Impact**: Users cannot proceed past the profile screen until they complete it (if required).

### Research questions

- **When it applies**: Only affects users from this client.
- **Timing**: Users are prompted on their **first login** after the setting is enabled.
- **Can be changed**: Yes, you can enable/disable this setting at any time.
- **Impact**: Research questions are optional, but users will see them if enabled.

### Whitelabeling

- **When it applies**: Only affects assessments assigned by Client Admins from this client.
- **Timing**: Applies to assessments assigned **after** the setting is enabled.
- **Can be changed**: Yes, you can enable/disable this setting at any time.
- **Impact**: 
  - **If enabled**: Assessments use client branding (logo, background, colors).
  - **If disabled**: Assessments use default platform branding.
- **Note**: Super admin-assigned assessments are not affected by this setting.

---

## Recommended workflow for Phase 1 clients

1. **Plan your client setup**:
   - Determine client name and basic information.
   - Gather branding assets (logo, background image, brand colors).
   - Decide on settings (profile requirements, research questions, whitelabeling).

2. **Create the client**:
   - Go to **Dashboard → Clients → Add Client**.
   - Fill in **Client Information** (name is required).
   - Upload **Branding & Images** (logo, background, set colors).
   - Configure **Client Settings** based on your requirements.
   - Click **Create Client**.

3. **Verify the client**:
   - Confirm the client appears in the **Clients** list.
   - Check that branding assets display correctly (if uploaded).
   - Verify settings are set as intended.

4. **Assign users**:
   - Go to **Dashboard → Users**.
   - Create users and assign them to this client.
   - Or bulk upload users with this client specified.

5. **Test client experience** (optional):
   - Log in as a user from this client.
   - Verify profile/research requirements (if enabled).
   - Check that whitelabeling appears correctly (if enabled and assessments are assigned).

6. **Edit as needed**:
   - Return to **Dashboard → Clients** to make changes.
   - Update branding, settings, or information as requirements evolve.

---

## Troubleshooting

### "Add Client" button is missing

- **Cause**: You are not a super admin. Only super admins can create new clients.
- **Solution**: Contact a super admin to create the client, or request super admin access if needed.

### Client not appearing in the list

- **Cause (for client admins)**: You can only see your own assigned client.
- **Solution**: If you need to see other clients, you need super admin access.
- **Cause (for super admins)**: There may be a database error or the client was deleted.
- **Solution**: Check the browser console for errors, or verify the client exists in the database.

### Logo or background image not displaying

- **Cause**: Image file may be corrupted, too large, or in an unsupported format.
- **Solutions**:
  - Try a different image file.
  - Ensure the file is a valid image format (PNG, JPG, etc.).
  - Reduce the file size if it's very large.
  - Check that the image uploaded successfully (you should see a preview).

### Color picker not working

- **Cause**: Browser may not support the color input type, or there's a JavaScript error.
- **Solutions**:
  - Enter the hex color code directly in the text field (e.g., #2D2E30).
  - Ensure your browser is up to date.
  - Check the browser console for JavaScript errors.

### Settings not applying to users

- **Cause**: Settings only affect:
  - **New users** created after the setting change.
  - **Existing users** on their next login (for profile/research requirements).
  - **New assessments** assigned after the change (for whitelabeling).
- **Solution**: 
  - For profile/research: Users need to log out and log back in to see the prompts.
  - For whitelabeling: Only new assessments assigned after enabling will be white-labeled.

### "Failed to create/update client" error

- **Cause**: There may be a validation error, database issue, or network problem.
- **Solutions**:
  - Check that the **Name** field is filled in (it's required).
  - Verify your internet connection.
  - Check the browser console for detailed error messages.
  - Ensure you have the necessary permissions (super admin for create, super admin or client admin for edit).

---

## Best practices

- **Naming**: Use clear, consistent naming for clients (e.g., "Acme Corp" not "acme" or "ACME CORPORATION").
- **Branding**: 
  - Test logo and background images to ensure they look good together.
  - Use brand colors that provide good contrast for readability.
  - Keep image file sizes reasonable to ensure fast loading.
- **Settings**: 
  - Enable profile requirements only if you need to collect user data for compliance or reporting.
  - Enable research questions only if you plan to use the data for analysis.
  - Enable whitelabeling if the client wants a branded assessment experience.
- **Organization**: Create clients before creating users, so you can assign users to clients during user creation.
`,
    video: { bucket: 'resources-videos', path: 'phase-1/clients.mp4' },
  },
  {
    slug: 'industries-create-edit',
    title: 'Industries: create and manage industry categories',
    description:
      'How to create, edit, and delete industry categories used for user classification and benchmark management.',
    publishedAt: '2025-12-15',
    tags: ['Industries', 'Phase 1', 'Admin'],
    bodyMarkdown: `
## Overview

This guide covers managing **industry categories** in Phase 1:

- Create a new industry
- Edit existing industry information
- Delete industries
- View the industries list

> Note: Industries are used for:
> - **User classification**: Assigning users to industry categories
> - **Benchmark management**: Setting industry-specific benchmark values for assessment dimensions

---

## Prerequisites

- You are signed in as a user with permission to manage industries (typically a super admin or designated admin).
- You understand that:
  - An **Industry** is a category used to classify users and organize benchmarks.
  - Industries are referenced when creating users and managing benchmarks.
  - Examples: "Technology", "Healthcare", "Finance", "Consulting"

---

## Navigate to industry management

1. Go to **Dashboard → Industries**.
2. You'll see a list of all industries in the system.
3. From this page you can:
   - **View** all industries in a table
   - **Create** a new industry (click **Add Industry** button)
   - **Edit** an existing industry (click **Edit** action)
   - **Delete** an industry (click **Delete** action)

---

## Create a new industry

1. Go to **Dashboard → Industries**.
2. Click **Add Industry** (top right).
3. Fill out the form:
   - **Industry Name** (required): Enter a unique industry name.
     - Examples: "Technology", "Healthcare", "Finance", "Consulting", "Manufacturing"
     - Use clear, descriptive names that users will recognize.
     - Avoid duplicates (the system may allow them, but it's confusing).
4. Click **Create Industry**.

### After creating the industry

- You'll see a success message.
- You'll be redirected to the **Industries** list page.
- The new industry will appear in the table.
- You can now:
  - Assign users to this industry when creating users.
  - Set benchmarks for this industry when managing benchmarks.

---

## Edit an existing industry

1. Go to **Dashboard → Industries**.
2. Find the industry you want to edit in the table.
3. Click the **Edit** action.
4. The edit form will load with the current industry name pre-filled.
5. Update the **Industry Name** field.
6. Click **Update Industry**.

### Important notes about editing

- **Name changes**: Changing an industry name will update it everywhere it's referenced:
  - User records that reference this industry will show the new name.
  - Benchmark records for this industry will still be associated with it (by ID, not name).
- **No conflicts**: The system uses unique IDs internally, so renaming won't break associations.

### After saving changes

- You'll see a success message.
- You'll be redirected to the **Industries** list page.
- The updated name will be reflected immediately in the table and throughout the system.

---

## Delete an industry

> **Warning**: Deleting an industry is a **destructive** action. Use this carefully.

1. Go to **Dashboard → Industries**.
2. Find the industry you want to delete in the table.
3. Click the **Delete** action.
4. Confirm the deletion in the dialog that appears.
5. The industry will be removed from the system.

### Important considerations before deleting

- **User associations**: Users assigned to this industry may:
  - Lose their industry assignment (set to null), or
  - Need to be reassigned to a different industry.
- **Benchmark associations**: Benchmarks set for this industry may:
  - Be removed, or
  - Become orphaned (depending on system behavior).
- **Best practice**: Before deleting an industry:
  1. Check if any users are assigned to it.
  2. Check if any benchmarks reference it.
  3. Consider renaming or merging instead of deleting if it's still in use.

---

## View the industries list

The industries list shows:

- **Name**: The industry name (e.g., "Technology", "Healthcare").
- **Created**: The date the industry was created (formatted as a date).
- **Actions**: Edit and Delete buttons for each industry.

The list is sorted alphabetically by name for easy browsing.

---

## Understanding industries in context

### User classification

- When creating users, you can assign them to an industry.
- Industries help organize users for reporting and analysis.
- Users can be filtered and grouped by industry in reports.

### Benchmark management

- Benchmarks are set **per industry** and **per dimension**.
- When managing benchmarks, you select:
  1. An **assessment** (which has dimensions).
  2. An **industry** (which determines the benchmark context).
- The same dimension can have different benchmark values for different industries.
  - Example: "Leadership" dimension might have a benchmark of 80 for Technology, but 75 for Healthcare.

### Industry naming best practices

- **Be specific**: Use clear, unambiguous names (e.g., "Healthcare" not "Health").
- **Be consistent**: Use consistent capitalization and formatting across all industries.
- **Avoid duplicates**: Don't create multiple industries with similar names (e.g., "Tech" and "Technology").
- **Think ahead**: Consider how industries will be used in reporting and filtering.

---

## Recommended workflow for Phase 1 industries

1. **Plan your industries**:
   - Determine which industry categories you need.
   - Consider your user base and reporting requirements.
   - Avoid creating too many industries (keep it manageable).

2. **Create industries first**:
   - Go to **Dashboard → Industries → Add Industry**.
   - Create all industries you'll need before creating users or managing benchmarks.
   - This ensures industries are available when you need them.

3. **Verify the industries**:
   - Confirm all industries appear in the **Industries** list.
   - Check that names are clear and consistent.

4. **Use industries**:
   - Assign users to industries when creating users.
   - Set benchmarks for industries when managing benchmarks.

5. **Maintain as needed**:
   - Edit industry names if requirements change.
   - Delete industries only if they're no longer needed and not in use.

---

## Troubleshooting

### "Failed to create industry" error

- **Cause**: There may be a validation error, database issue, or network problem.
- **Solutions**:
  - Check that the **Industry Name** field is filled in (it's required).
  - Verify your internet connection.
  - Check the browser console for detailed error messages.
  - Ensure you have the necessary permissions.

### Industry not appearing in the list

- **Cause**: There may be a database error or the industry was deleted.
- **Solution**: Check the browser console for errors, or verify the industry exists in the database.

### "Failed to update industry" error

- **Cause**: There may be a validation error, database issue, or network problem.
- **Solutions**:
  - Check that the **Industry Name** field is filled in (it's required).
  - Verify your internet connection.
  - Check the browser console for detailed error messages.
  - Ensure you have the necessary permissions.

### "Failed to delete industry" error

- **Cause**: The industry may be in use (referenced by users or benchmarks), or there may be a database constraint.
- **Solutions**:
  - Check if any users are assigned to this industry (reassign them first if needed).
  - Check if any benchmarks reference this industry (remove or update them first if needed).
  - Check the browser console for detailed error messages.
  - Contact support if the error persists.

### Industry name appears duplicated

- **Cause**: You may have accidentally created multiple industries with the same or similar names.
- **Solution**: 
  - Review the industries list and identify duplicates.
  - Consider merging users/benchmarks from duplicate industries into one.
  - Delete the duplicate industries if they're not in use.

---

## Best practices

- **Create before use**: Create industries before creating users or managing benchmarks, so they're available when needed.
- **Naming consistency**: Use consistent naming conventions (e.g., all title case, or all lowercase).
- **Keep it simple**: Don't create too many industries. Start with a manageable set and add more as needed.
- **Document purpose**: Consider documenting what each industry represents if your team needs clarity.
- **Regular review**: Periodically review your industries list to:
  - Remove unused industries.
  - Merge similar industries if needed.
  - Update names for clarity.
`,
    video: { bucket: 'resources-videos', path: 'phase-1/industries.mp4' },
  },
]

export function getResourcePostBySlug(slug: string) {
  return RESOURCE_POSTS.find((p) => p.slug === slug) || null
}


