# Group Management System - Complete Explanation

## Overview

The Group Management system allows you to organize users within a client into logical groupings. Groups are used for organizing assessments, managing team structures, and assigning roles within teams.

## Key Concepts

### 1. Groups
A **Group** is a collection of users (profiles) that belong to a specific client. Groups have:
- **Name**: Required, unique per client
- **Description**: Optional text describing the group's purpose
- **Client ID**: Every group belongs to exactly one client
- **Target ID**: Optional reference to a profile who is the "target" of the group (used for rating/assessment scenarios)

### 2. Group Members
Each user in a group is a **Group Member** with:
- **Profile ID**: Reference to the user's profile
- **Role**: A text field describing the member's role/position in the group (e.g., "Developer", "Manager", "Leader", "Analyst")
- **Group ID**: Reference to the group they belong to

### 3. Positions in Groups

**The "Position" field is for organizational purposes only.**

The `position` field (stored as `role` in the database) in the CSV template and form is used for:

- **Organizational Labeling**: Helps client managers organize users during personnel audits and team management
- **Display**: Shown in the UI when viewing group members (e.g., "Jane Smith (Developer)")
- **Team Structure**: Provides visual clarity about team hierarchy and roles
- **Flexibility**: It's a free-text field, so you can use any position name (e.g., "Developer", "Manager", "Team Lead", "Analyst", "Coordinator")

**Important Note**: The position field is **NOT used for**:
- Report calculations or score aggregations
- Data filtering in report generation
- Assessment logic or scoring
- Any computational dependencies

**Note**: The position field is different from:
- User profile roles (admin, manager, client, user, unverified) - these are system-level permissions
- Access levels (member, client_admin, super_admin) - these are permission boundaries

The group member position is specifically about the user's **organizational position or function within that particular group** - it's metadata for management purposes, not a functional dependency.

## CSV Upload Feature

### Template Structure

The CSV template includes the following columns:

1. **Group Name** (required): The name of the group
2. **Target Name** (optional): Name of the target user for this group
3. **Target Email** (optional): Email of the target user
4. **Name** (required): Name of a user to add to the group
5. **Email** (required): Email of the user to add
6. **Position** (optional): The organizational position of this user in the group (e.g., "Developer", "Manager"). Used for organizational purposes only and does not affect assessments or reports.

### How CSV Upload Works

1. **Template Download**: Click "Download Template" to get a CSV file with example data
2. **File Format**: The CSV must have headers in the first row: `Group Name,Target Name,Target Email,Name,Email,Role`
3. **Processing**:
   - Each row represents one user being added to a group
   - Multiple rows with the same "Group Name" and "Target" will add multiple users to the same group
   - If a group doesn't exist, it's created automatically
   - Users are matched by email or name
   - The "Role" value from the CSV is stored in the `group_members.role` field

### Example CSV Content

```csv
Group Name,Target Name,Target Email,Name,Email,Position
"Engineering Team","John Doe","john.doe@example.com","Jane Smith","jane.smith@example.com","Developer"
"Engineering Team","John Doe","john.doe@example.com","Bob Johnson","bob.johnson@example.com","Manager"
"Marketing Team","Alice Brown","alice.brown@example.com","Charlie Davis","charlie.davis@example.com","Analyst"
```

**Note:** The CSV header can be either "Position" or "Role" - both are supported for backward compatibility.

### Important Notes About CSV Upload

- **Position Field**: The "Position" column in the CSV is processed and stored for organizational purposes. If you leave it blank, it will be stored as an empty string. **Note:** Position does not affect assessments or reports - it's organizational metadata only.
- **User Matching**: Users must already exist in the system and belong to the same client
- **Group Creation**: Groups are created automatically if they don't exist
- **Target Assignment**: The target user is set for the entire group (all rows with the same group name share the same target)

## Manual Group Creation

### Creating a Group via Form

1. Click "Create New Group"
2. Fill in:
   - **Group Name**: Required
   - **Description**: Optional
   - **Target**: Optional dropdown to select a target user
3. Add users by clicking "+ Add Users To This Group"
4. For each user, you can set their **Position In Group** (text field) - this is optional and used for organizational purposes only
5. Click "Create Group"

### Editing a Group

1. Click "Edit" on an existing group
2. Modify name, description, or target
3. Add/remove users
4. Update roles for existing members
5. Click "Update Group"

## Database Schema

### `groups` table
- `id` (UUID, primary key)
- `client_id` (UUID, foreign key to clients)
- `name` (TEXT, required)
- `description` (TEXT, nullable)
- `target_id` (UUID, nullable, foreign key to profiles)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- **Unique constraint**: `(client_id, name)` - group names must be unique per client

### `group_members` table
- `id` (UUID, primary key)
- `group_id` (UUID, foreign key to groups)
- `profile_id` (UUID, foreign key to profiles)
- `role` (TEXT, default: 'member') - **This is the role field from CSV/form**
- `created_at` (TIMESTAMP)
- **Unique constraint**: `(group_id, profile_id)` - a user can only be in a group once

### Legacy Fields (for compatibility)
- `position` (TEXT, nullable) - legacy field, not actively used
- `leader` (BOOLEAN, default: false) - legacy field, not actively used

## Use Cases

### 1. Team Organization
Create groups for different teams (Engineering, Marketing, Sales) and assign users with appropriate roles.

### 2. Assessment Groups
Create groups with a target user where other members will rate/assess that target. The target_id field links to the person being assessed.

### 3. Role-Based Access
Use roles like "Manager" or "Leader" to identify group leadership, which can be used in queries to determine permissions or responsibilities.

### 4. Bulk Import
Use CSV upload to quickly create multiple groups and assign many users at once, including their roles.

## API Endpoints

### Group Management
- `GET /api/groups` - List all groups
- `POST /api/groups` - Create a group
- `GET /api/groups/[id]` - Get group details
- `PUT /api/groups/[id]` - Update a group
- `DELETE /api/groups/[id]` - Delete a group

### Bulk Upload
- `POST /api/groups/upload` - Upload groups via CSV (uses different format - see below)

**Note**: The `/api/groups/upload` endpoint uses a simpler CSV format (Name, Description, Client Name) and does NOT support roles. For role-based bulk uploads, use the client groups page CSV import feature.

## Common Questions

### Q: Is the "Position" field in the CSV template actually used?
**A: YES, for organizational purposes!** The position field is:
- Read from the CSV during import (supports both "Position" and "Role" headers)
- Stored in the `group_members.role` database column
- Displayed in the UI when viewing groups
- Editable in the form when manually creating/editing groups
- **Note:** It does NOT affect assessments, reports, or any data calculations - it's organizational metadata only

### Q: Why don't I see a role field in the simple group creation form?
**A: You do!** When you add users to a group (either manually or via CSV), each user has a "Role In Group" field. In the manual form, it appears as a text input next to each member. In the CSV, it's the "Role" column.

### Q: What's the difference between user roles and group member positions?
**A:**
- **User roles** (admin, manager, client, user, unverified): System-level permissions that control what a user can do in the application
- **Group member positions** (Developer, Manager, Analyst, etc.): Organizational labels describing the user's position/function within a specific group. These are for organizational purposes only and do not affect system functionality, assessments, or reports.

### Q: Can I use any position name?
**A: Yes!** The position field is free-text, so you can use any descriptive name (e.g., "Senior Developer", "Team Lead", "Project Manager"). Since positions are organizational metadata only, there are no restrictions or special meanings.

### Q: What happens if I leave the Position field blank in CSV?
**A:** It will be stored as an empty string. The position field is optional - groups and assignments will work perfectly fine without positions specified.

## Best Practices

1. **Use Descriptive Role Names**: Make roles clear and meaningful (e.g., "Senior Developer" vs just "Developer")
2. **Be Consistent**: Use consistent role naming across groups (e.g., always use "Manager" not sometimes "Manager" and sometimes "Mgr")
3. **Include Roles in CSV**: Even though optional, including roles in CSV uploads makes data more complete
4. **Review After Import**: After CSV import, review the groups to ensure roles were assigned correctly
5. **Use Targets Appropriately**: Set target_id when the group is for rating/assessing a specific person

## Troubleshooting

### CSV Import Not Working
- Check that headers match exactly: `Group Name,Target Name,Target Email,Name,Email,Role`
- Ensure users exist in the system and belong to the same client
- Verify email addresses match exactly (case-sensitive matching)

### Roles Not Showing
- Check that the role field was included in your CSV
- Verify the role was saved by editing the group and checking member roles
- Ensure you're viewing the correct group detail page

### Duplicate Group Names
- Group names must be unique per client
- If importing duplicates, the system will create groups with the same name but different IDs
- Consider using more specific names (e.g., "Engineering Team Q1" vs "Engineering Team")

