-- Enable pg_cron extension for scheduling tasks
-- This allows us to schedule the reminder processing function to run automatically
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for making HTTP requests from the database
-- This is needed to call our Edge Function
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store project URL in Vault for secure access
-- Note: Replace 'YOUR_PROJECT_REF' with your actual Supabase project reference
-- The project URL format is: https://YOUR_PROJECT_REF.supabase.co
-- You can find this in your Supabase dashboard under Settings > API
DO $$
DECLARE
  project_url TEXT;
BEGIN
  -- Get project URL from Supabase settings or use environment variable
  -- For now, we'll use a placeholder that needs to be updated
  project_url := current_setting('app.settings.supabase_url', true);
  
  -- If not set, use a default pattern (will need manual update)
  IF project_url IS NULL OR project_url = '' THEN
    -- This will need to be updated with your actual project URL
    -- You can update it later via: UPDATE vault.secrets SET secret = 'https://your-project.supabase.co' WHERE name = 'project_url';
    project_url := 'https://YOUR_PROJECT_REF.supabase.co';
  END IF;
  
  -- Store in Vault (will create if doesn't exist, update if exists)
  INSERT INTO vault.secrets (name, secret)
  VALUES ('reminder_project_url', project_url)
  ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
END $$;

-- Store service role key in Vault for secure access
-- Note: This should be set via Supabase Dashboard > Settings > API > service_role key
-- Or via: UPDATE vault.secrets SET secret = 'your-service-role-key' WHERE name = 'service_role_key';
-- IMPORTANT: Never commit the service role key to version control
DO $$
BEGIN
  -- Check if service role key is already stored
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'reminder_service_role_key') THEN
    -- Insert placeholder (must be updated manually)
    INSERT INTO vault.secrets (name, secret)
    VALUES ('reminder_service_role_key', 'YOUR_SERVICE_ROLE_KEY_HERE');
    
    RAISE NOTICE '⚠️  Please update the service_role_key in vault.secrets:';
    RAISE NOTICE '    UPDATE vault.secrets SET secret = ''your-actual-key'' WHERE name = ''reminder_service_role_key'';';
  END IF;
END $$;

-- Schedule reminder job to run daily at 9 AM UTC
-- Cron syntax: minute hour day-of-month month day-of-week
-- '0 9 * * *' means: at 9:00 AM UTC every day
-- To change the schedule, update the cron expression below
SELECT cron.schedule(
  'send-assignment-reminders',
  '0 9 * * *', -- 9 AM UTC every day
  $$
  SELECT
    net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'reminder_project_url') || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'reminder_service_role_key')
      ),
      body := jsonb_build_object(
        'triggered_at', now(),
        'source', 'pg_cron'
      )
    ) AS request_id;
  $$
);

-- Verify the job was created
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count
  FROM cron.job
  WHERE jobname = 'send-assignment-reminders';
  
  IF job_count > 0 THEN
    RAISE NOTICE '✅ Cron job "send-assignment-reminders" created successfully';
    RAISE NOTICE '   Schedule: Daily at 9:00 AM UTC';
    RAISE NOTICE '   To view job details: SELECT * FROM cron.job WHERE jobname = ''send-assignment-reminders'';';
  ELSE
    RAISE WARNING '❌ Failed to create cron job';
  END IF;
END $$;

-- Create a view to monitor reminder job runs
CREATE OR REPLACE VIEW reminder_job_status AS
SELECT 
  j.jobid,
  j.jobname,
  j.schedule,
  j.active,
  jr.runid,
  jr.start_time,
  jr.end_time,
  jr.status,
  jr.return_message,
  CASE 
    WHEN jr.end_time IS NULL AND jr.start_time < NOW() - INTERVAL '1 hour' THEN 'STUCK'
    WHEN jr.status = 'succeeded' THEN 'SUCCESS'
    WHEN jr.status = 'failed' THEN 'FAILED'
    ELSE 'RUNNING'
  END AS current_status
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT *
  FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) jr ON true
WHERE j.jobname = 'send-assignment-reminders';

-- Add helpful comments
COMMENT ON VIEW reminder_job_status IS 'Monitor the status of the reminder cron job. Check this view to see if reminders are running successfully.';
