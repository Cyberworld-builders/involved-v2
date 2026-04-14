-- Add error_message column for failed email sends.
-- Also widens the documented status values to include 'failed'.

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS error_message text;

COMMENT ON COLUMN public.email_logs.error_message IS 'Populated when status=''failed''. Contains the provider/error message from the send attempt.';
COMMENT ON COLUMN public.email_logs.status IS 'sent | failed | delivered | bounced | complained. "sent" and "failed" are populated at send time; the others are set later when SNS delivery events are persisted.';

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs (status);
