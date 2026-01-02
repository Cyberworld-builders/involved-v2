# Assignment Reminder System Implementation Guide

## Overview

The assignment reminder system enables administrators to schedule automated email reminders for users who have incomplete assessment assignments. This document explains how the system works, what has been implemented, and what additional functionality is needed to complete the feature.

---

## Current Implementation Status

### ✅ Completed Features

1. **Database Schema** (Migration 019)
   - `reminder` (BOOLEAN) - Whether reminders are enabled for an assignment
   - `reminder_frequency` (TEXT) - Frequency string (e.g., "+1 week", "+2 weeks", "+3 weeks", "+1 month")
   - `next_reminder` (TIMESTAMP WITH TIME ZONE) - Calculated timestamp for when the next reminder should be sent
   - Index on `next_reminder` for efficient queries on incomplete assignments with reminders enabled

2. **Assignment Creation UI**
   - "Enable Email Reminders" toggle in assignment creation form
   - "Reminder Frequency" dropdown (shown when reminders are enabled)
   - Options: 1 Week, 2 Weeks, 3 Weeks, Monthly

3. **Assignment Creation API**
   - Accepts `reminder` and `reminder_frequency` parameters
   - Calculates `next_reminder` timestamp from `reminder_frequency` when creating assignments
   - Stores reminder configuration in database

### ❌ Missing Features

1. **Scheduled Reminder Processor**
   - No automated process to check for assignments due for reminders
   - No email sending logic for reminders
   - No `next_reminder` update after sending

2. **Reminder Email Template**
   - Need reminder-specific email template (different from initial assignment email)

3. **Reminder Management**
   - No UI to view/edit reminder settings for existing assignments
   - No way to manually trigger reminders for testing

---

## How the Reminder System Works

### Data Flow

```
1. Admin creates assignment with reminders enabled
   ↓
2. System calculates next_reminder = now + reminder_frequency
   ↓
3. Assignment stored with reminder=true, reminder_frequency, next_reminder
   ↓
4. [SCHEDULED TASK] Runs daily/hourly to check for due reminders
   ↓
5. Query: assignments WHERE reminder=true AND completed=false 
          AND next_reminder BETWEEN now AND now+1day
   ↓
6. For each assignment found:
   - Send reminder email to user
   - Calculate new next_reminder = now + reminder_frequency
   - Update assignment.next_reminder
   ↓
7. Repeat until assignment is completed or expires
```

### Reminder Frequency Calculation

When an assignment is created with reminders enabled:
- **"+1 week"** → `next_reminder = now + 7 days`
- **"+2 weeks"** → `next_reminder = now + 14 days`
- **"+3 weeks"** → `next_reminder = now + 21 days`
- **"+1 month"** → `next_reminder = now + 1 month`

After sending a reminder, the system recalculates:
- `next_reminder = now + reminder_frequency`

This continues until the assignment is completed or expires.

---

## Supabase Scheduling Options

Supabase provides several options for implementing scheduled tasks:

### Option 1: pg_cron + Edge Function (Recommended)

**How it works:**
- Use PostgreSQL's `pg_cron` extension to schedule SQL commands
- Combine with `pg_net` extension to make HTTP requests to Edge Functions
- Edge Function contains the reminder processing logic

**Pros:**
- Native Supabase solution
- No external dependencies
- Managed by Supabase infrastructure
- Can be configured via Supabase Dashboard

**Cons:**
- Requires Edge Function deployment
- Slightly more complex setup

**Best for:** Production deployments, when you want everything managed by Supabase

### Option 2: pg_cron + API Route (Alternative)

**How it works:**
- Use `pg_cron` to schedule HTTP requests
- Point requests to Next.js API route (`/api/assignments/send-reminders`)
- API route contains reminder processing logic

**Pros:**
- Uses existing Next.js infrastructure
- No Edge Function deployment needed
- Easier to debug (runs in same environment as rest of app)

**Cons:**
- Requires Vercel/Next.js to be always available
- May have cold start delays
- Less ideal for frequent cron jobs

**Best for:** Development, or when you prefer keeping logic in Next.js

### Option 3: External Cron Service

**How it works:**
- Use external service (e.g., cron-job.org, EasyCron, GitHub Actions)
- Service calls API endpoint on schedule
- API route processes reminders

**Pros:**
- Simple setup
- No database extensions needed
- Works with any hosting provider

**Cons:**
- External dependency
- Additional service to manage
- Potential reliability concerns

**Best for:** Quick prototypes, or when Supabase pg_cron is not available

---

## Recommended Implementation: pg_cron + Edge Function

### Architecture

```
┌─────────────────┐
│  pg_cron Job    │ (Runs daily at 9 AM UTC)
│  (PostgreSQL)   │
└────────┬────────┘
         │ HTTP POST
         ↓
┌─────────────────┐
│  Edge Function  │ (send-reminders)
│  - Query DB     │
│  - Send emails  │
│  - Update next_reminder │
└─────────────────┘
```

### Step 1: Create Edge Function

Create a new Supabase Edge Function at `supabase/functions/send-reminders/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current time and tomorrow (to catch reminders due today)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    // Query assignments due for reminders
    const { data: assignments, error: queryError } = await supabase
      .from('assignments')
      .select(`
        id,
        user_id,
        assessment_id,
        reminder_frequency,
        user:profiles!assignments_user_id_fkey(id, name, email, username),
        assessment:assessments!assignments_assessment_id_fkey(id, title)
      `)
      .eq('reminder', true)
      .eq('completed', false)
      .not('next_reminder', 'is', null)
      .gte('next_reminder', now.toISOString())
      .lt('next_reminder', tomorrow.toISOString())

    if (queryError) {
      console.error('Error querying assignments:', queryError)
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${assignments.length} assignment(s) due for reminders`)

    // Process each assignment
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const assignment of assignments) {
      try {
        // Calculate next reminder date
        const nextReminder = calculateNextReminder(
          new Date(),
          assignment.reminder_frequency
        )

        // Send reminder email (call existing email API)
        const emailResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-reminder-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              assignment_id: assignment.id,
              user_email: assignment.user.email,
              user_name: assignment.user.name,
              assessment_title: assignment.assessment.title,
            }),
          }
        )

        if (!emailResponse.ok) {
          throw new Error(`Email send failed: ${emailResponse.statusText}`)
        }

        // Update next_reminder in database
        const { error: updateError } = await supabase
          .from('assignments')
          .update({ next_reminder: nextReminder.toISOString() })
          .eq('id', assignment.id)

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`)
        }

        results.sent++
        console.log(`✅ Sent reminder for assignment ${assignment.id}`)
      } catch (error) {
        results.failed++
        const errorMsg = `Assignment ${assignment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        results.errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${assignments.length} reminder(s)`,
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateNextReminder(now: Date, frequency: string): Date {
  const next = new Date(now)
  
  if (frequency === '+1 week') {
    next.setDate(next.getDate() + 7)
  } else if (frequency === '+2 weeks') {
    next.setDate(next.getDate() + 14)
  } else if (frequency === '+3 weeks') {
    next.setDate(next.getDate() + 21)
  } else if (frequency === '+1 month') {
    next.setMonth(next.getMonth() + 1)
  } else {
    // Default to 1 week if unknown frequency
    next.setDate(next.getDate() + 7)
  }
  
  return next
}
```

### Step 2: Create Reminder Email Edge Function

Create `supabase/functions/send-reminder-email/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Import your email sending utility (adapt to your email service)

serve(async (req) => {
  try {
    const { assignment_id, user_email, user_name, assessment_title } = await req.json()

    // Generate assignment URL (use your existing URL generator logic)
    // ... generate URL ...

    // Send email using your email service (AWS SES, Resend, etc.)
    // ... send email ...

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Step 3: Set Up pg_cron Job

Create a migration file `supabase/migrations/020_setup_reminder_cron.sql`:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store project URL and service role key in Vault (for security)
-- Note: Replace with your actual values
SELECT vault.create_secret(
  'https://your-project-ref.supabase.co',
  'project_url'
);

SELECT vault.create_secret(
  'your-service-role-key-here',
  'service_role_key'
);

-- Schedule reminder job to run daily at 9 AM UTC
-- Cron syntax: minute hour day month day-of-week
SELECT cron.schedule(
  'send-assignment-reminders',
  '0 9 * * *', -- 9 AM UTC every day
  $$
  SELECT
    net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := jsonb_build_object('triggered_at', now())
    ) AS request_id;
  $$
);

-- Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'send-assignment-reminders';
```

### Step 4: Alternative - Use Next.js API Route

If you prefer to use a Next.js API route instead of Edge Functions:

1. Create `/api/assignments/send-reminders/route.ts`
2. Use external cron service to call this endpoint
3. Or use Vercel Cron Jobs (if on Vercel Pro)

**Vercel Cron Configuration** (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/assignments/send-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

---

## Implementation Checklist

### Phase 1: Core Reminder Processing
- [ ] Create Edge Function for reminder processing (`send-reminders`)
- [ ] Create Edge Function for sending reminder emails (`send-reminder-email`)
- [ ] Implement reminder email template (different from assignment email)
- [ ] Set up pg_cron job to trigger daily
- [ ] Test reminder processing end-to-end

### Phase 2: Email Integration
- [ ] Integrate with existing email service (AWS SES/Resend)
- [ ] Create reminder-specific email template
- [ ] Include assignment link in reminder email
- [ ] Add unsubscribe/preference management (optional)

### Phase 3: Management & Monitoring
- [ ] Add UI to view/edit reminder settings for existing assignments
- [ ] Add manual "Send Reminder" button for testing
- [ ] Add logging/monitoring for reminder processing
- [ ] Add error handling and retry logic
- [ ] Create admin dashboard for reminder statistics

### Phase 4: Advanced Features
- [ ] Stop reminders when assignment expires
- [ ] Stop reminders when assignment is completed
- [ ] Add reminder history/audit log
- [ ] Support custom reminder frequencies
- [ ] Rate limiting to prevent email spam

---

## Testing the Reminder System

### Manual Testing

1. **Create test assignment with reminders:**
   ```sql
   INSERT INTO assignments (user_id, assessment_id, expires, reminder, reminder_frequency, next_reminder)
   VALUES (
     'user-uuid',
     'assessment-uuid',
     NOW() + INTERVAL '30 days',
     true,
     '+1 week',
     NOW() + INTERVAL '1 day'  -- Set to tomorrow for testing
   );
   ```

2. **Manually trigger reminder function:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/send-reminders \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

3. **Verify email sent and next_reminder updated:**
   ```sql
   SELECT id, next_reminder, updated_at 
   FROM assignments 
   WHERE id = 'assignment-uuid';
   ```

### Automated Testing

Create a test that:
1. Creates an assignment with `next_reminder` set to current time
2. Calls the reminder function
3. Verifies email was sent (mock email service)
4. Verifies `next_reminder` was updated correctly

---

## Monitoring & Maintenance

### Key Metrics to Track

- Number of reminders sent per day
- Reminder success rate (emails delivered)
- Reminder failure rate (with error details)
- Average time between reminders
- Assignments with reminders that never complete

### Logging

Ensure the Edge Function logs:
- Timestamp of each run
- Number of assignments found
- Success/failure for each reminder
- Error details for failures
- Next reminder dates calculated

### Alerts

Set up alerts for:
- Reminder function failures
- High email failure rates
- Cron job not running (check `cron.job_run_details`)

---

## Security Considerations

1. **Service Role Key Protection**
   - Store in Supabase Vault (not in code)
   - Use Vault secrets in pg_cron jobs
   - Never expose in client-side code

2. **Rate Limiting**
   - Limit reminders per user per day
   - Prevent reminder spam
   - Respect email service rate limits

3. **Access Control**
   - Edge Functions should verify service role key
   - Only allow authorized services to trigger reminders
   - Log all reminder sends for audit

---

## Troubleshooting

### Cron Job Not Running

1. Check if pg_cron is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Check cron job status:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-assignment-reminders';
   ```

3. Check recent job runs:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-assignment-reminders')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

### Reminders Not Being Sent

1. Verify assignments exist with correct `next_reminder`:
   ```sql
   SELECT id, reminder, completed, next_reminder 
   FROM assignments 
   WHERE reminder = true 
   AND completed = false 
   AND next_reminder IS NOT NULL
   AND next_reminder <= NOW() + INTERVAL '1 day';
   ```

2. Check Edge Function logs in Supabase Dashboard
3. Verify email service credentials are correct
4. Test email sending manually

### next_reminder Not Updating

1. Check Edge Function error logs
2. Verify database update query is executing
3. Check RLS policies allow updates
4. Verify service role key has proper permissions

---

## Future Enhancements

1. **Smart Reminders**
   - Increase frequency as expiration approaches
   - Stop reminders if user hasn't started assignment after X reminders

2. **Reminder Preferences**
   - Allow users to opt-out of reminders
   - Let users choose their preferred reminder frequency

3. **Multi-Channel Reminders**
   - SMS reminders (via Twilio)
   - In-app notifications
   - Slack/Teams notifications

4. **Analytics Dashboard**
   - Reminder effectiveness metrics
   - Completion rates by reminder frequency
   - Best time to send reminders

---

## References

- [Supabase Cron Documentation](https://supabase.com/docs/guides/cron)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_cron Extension](https://github.com/citusdata/pg_cron)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)

---

## Conclusion

The reminder system foundation is complete with database schema and UI. To fully activate the system, implement the scheduled reminder processor using Supabase's pg_cron extension combined with Edge Functions. This provides a robust, scalable solution that runs entirely within Supabase's infrastructure.

The recommended approach (pg_cron + Edge Function) offers the best balance of reliability, maintainability, and integration with Supabase's ecosystem.

