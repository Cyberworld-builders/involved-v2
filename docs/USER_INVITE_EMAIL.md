# User Invite Email Functionality

This document describes the user invite email feature that allows administrators to send invitation emails to new users.

## Overview

The user invite system enables authenticated users to:
- Send invitation emails to new users
- Generate secure, time-limited invite tokens
- Track invite status (pending, accepted, expired, revoked)
- View invite history for users

## Architecture

### Database Schema

The `user_invites` table stores invite information:

```sql
CREATE TABLE user_invites (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),  -- User being invited
  token TEXT UNIQUE NOT NULL,                -- Secure invite token
  expires_at TIMESTAMP NOT NULL,             -- Token expiration date (7 days)
  status TEXT DEFAULT 'pending',             -- pending | accepted | expired | revoked
  invited_by UUID REFERENCES profiles(id),   -- User who sent the invite
  accepted_at TIMESTAMP,                     -- When invite was accepted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

#### Send Invite Email

**POST** `/api/users/[id]/invite`

Sends an invitation email to the specified user.

**Request:**
- No body required
- User ID is passed in the URL path
- Requires authentication

**Response:**
```json
{
  "success": true,
  "invite": {
    "id": "uuid",
    "profile_id": "uuid",
    "token": "secure-token",
    "expires_at": "2024-01-08T00:00:00Z",
    "status": "pending"
  },
  "messageId": "email-message-id"
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - User profile not found
- `500 Internal Server Error` - Failed to create invite or send email

#### Get User Invites

**GET** `/api/users/[id]/invite`

Retrieves all invites for the specified user.

**Request:**
- User ID is passed in the URL path
- Requires authentication

**Response:**
```json
{
  "invites": [
    {
      "id": "uuid",
      "profile_id": "uuid",
      "token": "secure-token",
      "expires_at": "2024-01-08T00:00:00Z",
      "status": "pending",
      "invited_by": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Services and Utilities

#### Email Service (`src/lib/services/email-service.ts`)

Provides functions for generating and sending invite emails:

- `generateInviteEmail(data)` - Generates HTML and text email templates
- `sendInviteEmail(data)` - Sends an invite email
- `formatExpirationDate(date)` - Formats date for display in emails

#### Invite Token Generation (`src/lib/utils/invite-token-generation.ts`)

Provides functions for managing invite tokens:

- `generateInviteToken()` - Generates a secure 64-character hex token
- `getTokenExpiration(fromDate?)` - Calculates token expiration (7 days)
- `validateTokenFormat(token)` - Validates token format
- `validateInviteToken(token, expirationDate)` - Validates token and checks expiration
- `generateInviteTokenWithExpiration()` - Generates token with expiration metadata

## Usage Examples

### Sending an Invite Email

```typescript
// From a client component or API route
const response = await fetch(`/api/users/${userId}/invite`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})

const data = await response.json()

if (data.success) {
  console.log('Invite sent successfully:', data.invite)
}
```

### Programmatic Email Sending

```typescript
import { sendInviteEmail } from '@/lib/services/email-service'
import { generateInviteTokenWithExpiration } from '@/lib/utils/invite-token-generation'

// Generate token
const { token, expiresAt } = generateInviteTokenWithExpiration()

// Send email
const result = await sendInviteEmail({
  recipientEmail: 'user@example.com',
  recipientName: 'John Doe',
  inviteToken: token,
  inviteUrl: `https://app.example.com/auth/invite?token=${token}`,
  expirationDate: expiresAt,
  organizationName: 'My Organization',
})

if (result.success) {
  console.log('Email sent:', result.messageId)
}
```

### Validating an Invite Token

```typescript
import { validateInviteToken } from '@/lib/utils/invite-token-generation'

// Validate token
const validation = validateInviteToken(token, expirationDate)

if (validation.valid) {
  // Token is valid and not expired
  console.log('Token is valid')
} else {
  // Token is invalid or expired
  console.log('Token validation failed:', validation.reason)
}
```

## Email Template

The invite email includes:

- **Subject:** "You're invited to join [Organization Name]"
- **HTML Body:**
  - Organization branding
  - Personalized greeting
  - Call-to-action button
  - Plain text invite link
  - Expiration date warning
  - Security notice
- **Text Body:**
  - Plain text version of all HTML content
  - Suitable for email clients that don't support HTML

### Sample Email

```
Hi John Doe,

You've been invited to join My Organization. Click the button below to accept your invitation and set up your account.

[Accept Invitation Button]

Or copy and paste this link into your browser:
https://app.example.com/auth/invite?token=abc123...

This invitation will expire on Monday, January 8, 2024.

If you didn't expect this invitation, you can safely ignore this email.

---
This is an automated message. Please do not reply to this email.
```

## Security Features

1. **Secure Token Generation:** Uses `crypto.getRandomValues()` for cryptographically secure tokens
2. **Token Format Validation:** Tokens must be exactly 64 hexadecimal characters
3. **Expiration:** Tokens automatically expire after 7 days
4. **Status Tracking:** Invites can be marked as pending, accepted, expired, or revoked
5. **Authentication Required:** All endpoints require authenticated users
6. **Email Validation:** Recipient emails are validated before sending

## Testing

### Unit Tests

- **Email Service:** 88 tests covering email generation and sending
- **Token Generation:** 63 tests covering token creation and validation
- **API Routes:** 8 tests covering invite endpoints

### Integration Tests

- **User Invite Flow:** 8 tests covering end-to-end invite workflow
- Tests token generation, email creation, and sending
- Validates error handling and edge cases

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- src/lib/services/__tests__/email-service.test.ts
npm test -- src/lib/utils/__tests__/invite-token-generation.test.ts
npm test -- src/app/api/users/[id]/invite/__tests__/api-invite-routes.test.ts
npm test -- src/__tests__/integration/user-invite-flow.test.ts
```

## Configuration

### Environment Variables

```env
# Application URL for invite links
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Application name for email templates
NEXT_PUBLIC_APP_NAME="Involved Talent"
```

### Email Service Integration

The current implementation uses a mock email service that logs emails to the console. To integrate with a real email service:

1. Install the email service package (e.g., Resend, SendGrid, AWS SES)
2. Update `src/lib/services/email-service.ts` in the `sendEmail()` function
3. Add required environment variables for the email service

Example for Resend:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const { data, error } = await resend.emails.send({
  from: process.env.EMAIL_FROM || 'noreply@example.com',
  to: to,
  subject: subject,
  html: htmlBody,
  text: textBody,
})
```

## Future Enhancements

Potential improvements for future iterations:

1. **Bulk Invites:** Send invites to multiple users at once
2. **Custom Templates:** Allow custom email templates per organization
3. **Reminder Emails:** Send reminder emails for pending invites
4. **Resend Invites:** Ability to resend expired invites
5. **Invite Analytics:** Track invite open rates and acceptance rates
6. **Role-Based Invites:** Specify user role in the invite
7. **Custom Expiration:** Allow custom expiration periods
8. **Webhook Integration:** Notify external systems when invites are accepted

## Related Issues

- Issue #45: Implement user invite email sending
- Issue #46: Token generation and validation
- Issue #47-52: User account claim flow (future work)

## Migration

To apply the database migration:

```bash
# Using Supabase CLI
npx supabase migration up

# Or apply directly in Supabase SQL Editor
# Run: supabase/migrations/008_create_user_invites_table.sql
```

## Support

For questions or issues related to the user invite functionality, please contact the development team or create an issue in the GitHub repository.
