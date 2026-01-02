# Supabase Edge Functions

This directory contains Supabase Edge Functions for the reminder system.

## Functions

### `send-reminders`

Main function that processes assignment reminders. This function:
- Queries assignments due for reminders
- Sends reminder emails via `send-reminder-email`
- Updates `next_reminder` timestamps

**Trigger:** Called by pg_cron job daily at 9 AM UTC

### `send-reminder-email`

Sends individual reminder emails to users. This function:
- Generates reminder email content (HTML and plain text)
- Sends email via AWS SES
- Returns success/failure status

**Trigger:** Called by `send-reminders` function

## Setup

### 1. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy send-reminders
supabase functions deploy send-reminder-email

# Or deploy individually
supabase functions deploy send-reminders --project-ref your-project-ref
supabase functions deploy send-reminder-email --project-ref your-project-ref
```

### 2. Set Environment Variables

Set these in your Supabase Dashboard under Project Settings > Edge Functions:

**For `send-reminders`:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin access)
- `BASE_URL` - Your application base URL (optional, defaults to Supabase URL)

**For `send-reminder-email`:**
- `AWS_ROLE_ARN` - AWS IAM role ARN (for OIDC, preferred)
- `AWS_SES_ACCESS_KEY_ID` - AWS access key (fallback)
- `AWS_SES_SECRET_ACCESS_KEY` - AWS secret key (fallback)
- `AWS_SES_REGION` - AWS region (default: us-east-1)
- `EMAIL_FROM` - From email address (e.g., noreply@yourdomain.com)

### 3. Set Up pg_cron Job

Run migration 020 to set up the scheduled job:

```bash
supabase db push
```

Then update the Vault secrets with your actual values:

```sql
-- Update project URL
UPDATE vault.secrets 
SET secret = 'https://your-project-ref.supabase.co' 
WHERE name = 'reminder_project_url';

-- Update service role key (get from Supabase Dashboard > Settings > API)
UPDATE vault.secrets 
SET secret = 'your-service-role-key-here' 
WHERE name = 'reminder_service_role_key';
```

### 4. Verify Setup

Check that the cron job is active:

```sql
SELECT * FROM cron.job WHERE jobname = 'send-assignment-reminders';
```

Check recent job runs:

```sql
SELECT * FROM reminder_job_status;
```

## Testing

### Test Reminder Processing

Manually trigger the reminder function:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Test Email Sending

Create a test assignment with `next_reminder` set to current time:

```sql
-- Create test assignment (replace with actual IDs)
UPDATE assignments 
SET next_reminder = NOW() 
WHERE id = 'assignment-id-here' 
AND reminder = true;
```

Then trigger the reminder function.

## Monitoring

### View Job Status

```sql
SELECT * FROM reminder_job_status;
```

### View Recent Runs

```sql
SELECT 
  runid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-assignment-reminders')
ORDER BY start_time DESC
LIMIT 10;
```

### Check Function Logs

View logs in Supabase Dashboard:
- Go to Edge Functions
- Click on function name
- View "Logs" tab

## Troubleshooting

### Cron Job Not Running

1. Check if pg_cron is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Check job status:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-assignment-reminders';
   ```

3. Check for errors in job runs:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-assignment-reminders')
   AND status = 'failed'
   ORDER BY start_time DESC;
   ```

### Emails Not Sending

1. Check Edge Function logs in Supabase Dashboard
2. Verify AWS SES credentials are correct
3. Check that `EMAIL_FROM` is verified in AWS SES
4. Test email sending manually via the function

### Reminders Not Being Found

1. Verify assignments exist with correct criteria:
   ```sql
   SELECT id, reminder, completed, next_reminder 
   FROM assignments 
   WHERE reminder = true 
   AND completed = false 
   AND next_reminder IS NOT NULL
   AND next_reminder <= NOW() + INTERVAL '1 day';
   ```

2. Check that `next_reminder` is in the correct timezone
3. Verify the query time range in the function

## Local Development

To test Edge Functions locally:

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve send-reminders --no-verify-jwt
supabase functions serve send-reminder-email --no-verify-jwt
```

Then test with:

```bash
curl -X POST http://localhost:54321/functions/v1/send-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Security Notes

- Never commit service role keys or AWS credentials to version control
- Use Supabase Vault for storing sensitive values
- Use AWS IAM roles (OIDC) instead of access keys when possible
- Regularly rotate credentials
- Monitor function logs for suspicious activity

