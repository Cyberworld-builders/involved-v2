# Email Dashboard – Implementation Plan and Future Work

This document describes the current admin email dashboard and planned improvements (SNS event persistence, reminder logging, IAM).

## Current Implementation (Phase 1)

### What We Have

- **`email_logs` table**  
  One row per outbound email: `email_type`, `recipient_email`, `subject`, `provider_message_id` (SES MessageId or Resend id), `sent_at`, `related_entity_type`/`related_entity_id`, `status` (default `sent`).  
  Storing **provider_message_id** allows admins to look up specific emails in AWS (or Resend) when investigating issues.

- **Logging at send time**  
  All sends that go through the app record a row:
  - **email-service** (`sendEmail` / `sendInviteEmail`): optional `logMetadata` (e.g. `emailType`, `relatedEntityId`); after success we write to `email_logs` with the returned message id.
  - **Assignment emails** (`POST /api/assignments/send-email`): after SES/Resend success we call `logEmail` with `emailType: 'assignment'` and optional `assignmentId` if the client sends it.
  - **Magic link** (`POST /api/assignments/send-magic-link-email`): after send we log with `emailType: 'magic_link'`.
  - **Password reset** (`POST /api/auth/reset-password`): uses `sendEmail` with `logMetadata: { emailType: 'password_reset' }`.
  - **Invite** (`POST /api/users/[id]/invite`): uses `sendInviteEmail` with `userInviteId` so the log row has `related_entity_type: 'user_invite'` and `related_entity_id: invite.id`.

- **Admin dashboard**  
  - **Route:** `GET /api/admin/email-dashboard` (super_admin only).  
  - **Query params:** `from`, `to`, `emailType`, `recipient`, `status`, `page`, `pageSize`.  
  - **Response:** Paginated `email_logs` (with optional enrichment from `assignments`/`user_invites`) plus **SES aggregate** when AWS is configured: `GetSendStatistics` (last 14 days) summed into `sent`, `bounces`, `complaints` for the widget.

- **UI**  
  - **Page:** `/dashboard/admin/emails` (super_admin only).  
  - **Aggregate widget** at top: SES delivery attempts, bounces, complaints (last 14 days).  
  - **Filters:** Date range, type, recipient search, status.  
  - **Table:** Configurable columns (sent_at, type, recipient, subject, status, related, provider_message_id).  
  - **Message ID:** Shown and copyable for manual lookup in AWS/Resend.

### Not Yet Logged

- **Reminder emails**  
  Sent by the Supabase Edge Function `send-reminder-email` (Deno), which uses SES directly. There is no app DB in that context. Options for later:
  - Add an internal API (e.g. `POST /api/admin/email-logs`) that accepts a shared secret and writes one row; the Edge Function calls it after a successful send (with `emailType: 'reminder'`, `assignmentId`, `provider_message_id`).
  - Or run a small backend in the same region that the Edge Function can call.

---

## Future Work

### 1. SES Event Persistence (SNS)

**Goal:** Update `email_logs.status` when SES reports delivery, bounce, or complaint so the dashboard shows real delivery status, not only “sent”.

**Steps:**

1. **SES Configuration Set**  
   Create (or reuse) a configuration set that publishes **Send**, **Delivery**, **Bounce**, **Complaint** to SNS topics (e.g. in `talent-assessment` Terraform: `ses-production.tf` or equivalent).

2. **Use the Configuration Set when sending**  
   In `email-service.ts` and in `POST /api/assignments/send-email` and `send-magic-link-email`, add the configuration set name to the SES `SendEmailCommand` so every send is tied to that set and SES will publish events to SNS.

3. **Consume SNS events**  
   - **Option A – HTTP endpoint**  
     SNS topic subscribes to an HTTPS URL (e.g. `POST /api/admin/email-events/webhook`).  
     - Implement subscription confirmation (SNS sends a GET or POST with `SubscribeURL`; call it once).  
     - On notification: parse SNS payload, extract SES event and `mail.messageId`, find row in `email_logs` by `provider_message_id`, update `status` to `delivered` / `bounced` / `complained` (and optionally store raw event in an `email_events` table).  
   - **Option B – SQS**  
     SNS → SQS → worker (Next.js API route or Lambda) that performs the same update by `provider_message_id`.

4. **IAM**  
   The Vercel app does not need new SES permissions to *receive* events; the webhook is invoked by AWS. If you use Lambda or an AWS worker to process SNS/SQS, that role needs the usual `sns:Subscribe` / `sqs:ReceiveMessage` etc. No change to “list messages” in SES (there is no such API).

### 2. talent-assessment – IAM and SES

- **Aggregate only (current):**  
  The Vercel OIDC role already has (or can have) `ses:GetSendStatistics` for the dashboard widget. No change required if that permission is present.

- **If you add SES v2 metrics later:**  
  Add `sesv2:BatchGetMetricData` (and any related v2 read) to the Vercel OIDC policy so the app can pull aggregate metrics over custom date ranges.

- **SNS / Configuration Set:**  
  Configure the Configuration Set and SNS topics in AWS (Terraform or console). The app only needs to send with that configuration set (existing `ses:SendEmail` is enough).

### 3. Reminder Emails in email_logs

- Add an internal endpoint (e.g. `POST /api/admin/email-logs`) protected by a shared secret or service role, body: `emailType`, `recipient_email`, `subject`, `provider_message_id`, `related_entity_type`, `related_entity_id`.
- In the Supabase Edge Function `send-reminder-email`, after a successful SES send, call this endpoint with `emailType: 'reminder'`, `related_entity_type: 'assignment'`, `related_entity_id: assignment_id`, and the SES `MessageId`.
- Then the admin table will show reminder sends and, once SNS is in place, their delivery/bounce status.

### 4. Optional: Assignment ID in assignment send-email

- The create-assignment UI could send the first (or list of) created assignment id(s) in the body of `POST /api/assignments/send-email` (e.g. `assignmentId` or `assignmentIds`).
- The route already accepts optional `assignmentId` and stores it in `email_logs` as `related_entity_id`; the client just needs to pass it so “Related” in the dashboard links to the correct assignment.

---

## Summary

| Item | Status |
|------|--------|
| `email_logs` table + migration | Done |
| Logging from email-service, invite, reset-password, assignment send, magic-link | Done |
| Admin API (logs + SES aggregate) | Done |
| Admin UI (widget + table, filters, columns, message ID copy) | Done |
| Reminder emails in email_logs | Not yet (Edge Function; add internal API + call from Edge) |
| SES Configuration Set + SNS → update status | Planned |
| talent-assessment IAM (v2 metrics / SNS if needed) | As above |

Using **provider_message_id** in every log row gives admins a reliable way to manually investigate any email in AWS (or Resend) when needed.
