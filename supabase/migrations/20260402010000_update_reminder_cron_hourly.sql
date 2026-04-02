-- Change reminder cron from daily (9 AM UTC) to hourly
-- This allows reminders to fire within an hour of their scheduled time
-- instead of waiting up to 24 hours for the next daily run

SELECT cron.unschedule('send-assignment-reminders');

SELECT cron.schedule(
  'send-assignment-reminders',
  '0 * * * *', -- Top of every hour
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
