/**
 * Email log helper for admin email dashboard.
 * Writes a row to email_logs after each send; provider_message_id (e.g. SES MessageId)
 * is stored so admins can manually investigate in AWS if needed.
 * Logging is best-effort: failures are logged to console and do not throw.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type EmailLogType =
  | 'assignment'
  | 'reminder'
  | 'invite'
  | 'password_reset'
  | 'magic_link'

export interface LogEmailParams {
  emailType: EmailLogType
  recipientEmail: string
  subject: string
  providerMessageId?: string | null
  relatedEntityType?: string | null
  relatedEntityId?: string | null
}

export async function logEmail(params: LogEmailParams): Promise<void> {
  const {
    emailType,
    recipientEmail,
    subject,
    providerMessageId,
    relatedEntityType,
    relatedEntityId,
  } = params

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('email_logs').insert({
      email_type: emailType,
      recipient_email: recipientEmail,
      subject: subject || '',
      provider_message_id: providerMessageId ?? null,
      related_entity_type: relatedEntityType ?? null,
      related_entity_id: relatedEntityId ?? null,
      status: 'sent',
    })

    if (error) {
      console.error('[email-log] Failed to insert email_log:', error.message)
    }
  } catch (err) {
    console.error('[email-log] Error logging email:', err)
  }
}
