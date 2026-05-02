-- Extend email_logs with SES SNS feedback fields.
-- Schema author already anticipated this in the original status comment.
--
-- Status lifecycle:
--   sent       → SES accepted the send (set at send time)
--   delivered  → SES emitted Delivery event (recipient mailbox accepted)
--   bounced    → SES emitted Bounce event
--   complained → SES emitted Complaint event
--   failed     → send threw at our layer (set at send time)
--
-- bounce_type / bounce_subtype mirror SES values (Permanent/Transient/Undetermined +
-- General/NoEmail/Suppressed/MailboxFull/etc.). complaint_type mirrors SES feedback type.
-- feedback_raw stores the SNS Message JSON for forensic review when an event is unusual.

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS bounce_type text,
  ADD COLUMN IF NOT EXISTS bounce_subtype text,
  ADD COLUMN IF NOT EXISTS complaint_type text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedback_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedback_raw jsonb;

-- Webhook joins SNS events back to send rows by SES MessageId.
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_message_id
  ON public.email_logs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- Dashboard queries filter on status; this index helps the "show me bounces" cases.
CREATE INDEX IF NOT EXISTS idx_email_logs_status_sent_at
  ON public.email_logs (status, sent_at DESC);

COMMENT ON COLUMN public.email_logs.status IS
  'Lifecycle: sent | delivered | bounced | complained | failed. Updated by /api/webhooks/ses-feedback when SNS events arrive.';
COMMENT ON COLUMN public.email_logs.bounce_type IS 'SES Bounce.bounceType (Permanent | Transient | Undetermined).';
COMMENT ON COLUMN public.email_logs.bounce_subtype IS 'SES Bounce.bounceSubType (General, NoEmail, Suppressed, MailboxFull, etc.).';
COMMENT ON COLUMN public.email_logs.complaint_type IS 'SES Complaint.complaintFeedbackType (abuse, fraud, virus, etc.).';
COMMENT ON COLUMN public.email_logs.feedback_raw IS 'Full SNS Message JSON for forensic review of unusual events.';

-- Idempotency log for SNS deliveries — SNS retries on 5xx.
-- We dedupe by SNS MessageId (the envelope id, not the SES MessageId) so a retry
-- becomes a no-op insert.
CREATE TABLE IF NOT EXISTS public.sns_deliveries (
  message_id text PRIMARY KEY,
  topic_arn text NOT NULL,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sns_deliveries IS 'Idempotency tracking for inbound SNS notifications. message_id is the SNS envelope MessageId.';

ALTER TABLE public.sns_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage sns_deliveries"
  ON public.sns_deliveries
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users cannot access sns_deliveries"
  ON public.sns_deliveries
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
