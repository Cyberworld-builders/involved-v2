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
  // Example starter post (replace path after you upload a clip)
  {
    slug: 'welcome',
    title: 'Welcome & quick tour',
    description: 'A quick walkthrough of the dashboard and the Phase I workflow.',
    publishedAt: '2025-01-01',
    tags: ['Getting Started'],
    video: { bucket: 'resources-videos', path: 'getting-started/welcome.mp4' },
  },
  {
    slug: 'upload-test',
    title: 'Upload test',
    description: 'Test clip to verify uploads and streaming from Supabase Storage.',
    publishedAt: '2025-12-12',
    tags: ['Getting Started'],
    video: { bucket: 'resources-videos', path: 'getting-started/upload-test.mov' },
  },
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

Copy/paste this into a file named \`.csv\` (or download the template from the app and edit it):

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
    video: { bucket: 'resources-videos', path: 'getting-started/user-onboarding.mp4' },
  },
]

export function getResourcePostBySlug(slug: string) {
  return RESOURCE_POSTS.find((p) => p.slug === slug) || null
}


