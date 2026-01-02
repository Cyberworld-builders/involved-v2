-- Enable pg_cron extension for scheduling tasks
-- This allows us to schedule the reminder processing function to run automatically
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for making HTTP requests from the database
-- This is needed to call our Edge Function
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Note: Vault setup requires manual configuration
-- After running this migration, you need to manually set up Vault secrets:
-- 1. Go to Supabase Dashboard > Settings > Vault
-- 2. Create secrets:
--    - Name: 'reminder_project_url'
--      Value: 'https://YOUR_PROJECT_REF.supabase.co' (replace with your actual project URL)
--    - Name: 'reminder_service_role_key'
--      Value: 'YOUR_SERVICE_ROLE_KEY' (get from Settings > API > service_role key)
--
-- Or use SQL (requires Vault permissions):
--   INSERT INTO vault.secrets (name, secret)
--   VALUES ('reminder_project_url', 'https://cbpomvoxtxvsatkozhng.supabase.co')
--   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
--
--   INSERT INTO vault.secrets (name, secret)
--   VALUES ('reminder_service_role_key', 'your-service-role-key-here')
--   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- Schedule reminder job to run daily at 9 AM UTC
-- Cron syntax: minute hour day-of-month month day-of-week
-- '0 9 * * *' means: at 9:00 AM UTC every day
-- To change the schedule, update the cron expression below
--
-- IMPORTANT: Before this cron job will work, you must set up Vault secrets:
-- 1. Go to Supabase Dashboard > Settings > Vault
-- 2. Create two secrets:
--    - Name: 'reminder_project_url'
--      Value: 'https://cbpomvoxtxvsatkozhng.supabase.co' (your project URL)
--    - Name: 'reminder_service_role_key'
--      Value: (your service_role key from Settings > API)
--
-- Or use SQL Editor (requires appropriate permissions):
--   INSERT INTO vault.secrets (name, secret)
--   VALUES 
--     ('reminder_project_url', 'https://cbpomvoxtxvsatkozhng.supabase.co'),
--     ('reminder_service_role_key', 'your-service-role-key-here')
--   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
--
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

