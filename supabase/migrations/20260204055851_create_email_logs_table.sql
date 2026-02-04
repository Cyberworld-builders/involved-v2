-- Email logs table for admin email dashboard.
-- Stores a row per outbound email so admins can see send status and, when SNS is
-- implemented later, delivery/bounce/complaint status. provider_message_id (e.g.
-- SES MessageId) allows manual investigation in AWS when needed.
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL DEFAULT '',
  provider_message_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  related_entity_type text,
  related_entity_id uuid,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_logs IS 'Outbound email send log for admin dashboard; provider_message_id is SES MessageId or Resend id for manual lookup.';
COMMENT ON COLUMN public.email_logs.email_type IS 'One of: assignment, reminder, invite, password_reset, magic_link';
COMMENT ON COLUMN public.email_logs.provider_message_id IS 'SES MessageId or Resend message id for manual investigation in AWS/Resend.';
COMMENT ON COLUMN public.email_logs.status IS 'sent (default); later: delivered, bounced, complained when SNS events are persisted.';

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs (email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_related ON public.email_logs (related_entity_type, related_entity_id);

-- Only super_admins should read email logs (enforced in API). RLS: no direct client access.
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage email_logs"
  ON public.email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users cannot read/write email_logs via Supabase client; API uses admin client.
CREATE POLICY "Authenticated users cannot access email_logs"
  ON public.email_logs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
