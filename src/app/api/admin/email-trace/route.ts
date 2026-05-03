import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/email-trace?recipient=<email>
 *
 * Returns a per-recipient timeline derived from email_logs. Each row produces
 * one or more events: a `sent` event (from sent_at), and follow-up events
 * (`delivered`, `bounced`, `complained`) when SNS feedback updated the row.
 * Failed-at-send rows produce a single `failed` event.
 *
 * Login/auth events (Supabase `auth.audit_log_entries`) are intentionally not
 * joined in this endpoint yet — that's a separate piece of work. This trace
 * answers "what did we send and how did SES report it" for support triage.
 *
 * Super-admin only.
 */

interface EmailLogRow {
  id: string
  email_type: string
  subject: string
  status: string
  sent_at: string
  delivered_at: string | null
  feedback_received_at: string | null
  bounce_type: string | null
  bounce_subtype: string | null
  complaint_type: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  provider_message_id: string | null
  error_message: string | null
}

interface TimelineEvent {
  id: string
  event_type: 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
  email_type: string
  subject: string
  timestamp: string
  detail?: string
  related_entity_type: string | null
  related_entity_id: string | null
  provider_message_id: string | null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('access_level')
      .eq('auth_user_id', user.id)
      .single()
    if (profile?.access_level !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const recipient = request.nextUrl.searchParams.get('recipient')?.trim()
    if (!recipient) {
      return NextResponse.json({ error: 'recipient query param required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: rows, error } = await admin
      .from('email_logs')
      .select(`id, email_type, subject, status, sent_at, delivered_at, feedback_received_at,
               bounce_type, bounce_subtype, complaint_type, related_entity_type, related_entity_id,
               provider_message_id, error_message`)
      .ilike('recipient_email', recipient)
      .order('sent_at', { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const logs = (rows ?? []) as EmailLogRow[]
    const events: TimelineEvent[] = []
    const totals = { sends: 0, deliveries: 0, bounces: 0, complaints: 0, failures: 0 }

    for (const row of logs) {
      // The `sent` event is always present when the row exists. Even bounced/
      // complained rows started at `sent` — we want to show the full progression.
      events.push({
        id: row.id,
        event_type: row.status === 'failed' ? 'failed' : 'sent',
        email_type: row.email_type,
        subject: row.subject,
        timestamp: row.sent_at,
        detail: row.status === 'failed' && row.error_message ? row.error_message : undefined,
        related_entity_type: row.related_entity_type,
        related_entity_id: row.related_entity_id,
        provider_message_id: row.provider_message_id,
      })
      if (row.status === 'failed') {
        totals.failures++
        continue
      }
      totals.sends++

      if (row.status === 'delivered' && row.delivered_at) {
        events.push({
          id: row.id,
          event_type: 'delivered',
          email_type: row.email_type,
          subject: row.subject,
          timestamp: row.delivered_at,
          related_entity_type: row.related_entity_type,
          related_entity_id: row.related_entity_id,
          provider_message_id: row.provider_message_id,
        })
        totals.deliveries++
      } else if (row.status === 'bounced' && row.feedback_received_at) {
        events.push({
          id: row.id,
          event_type: 'bounced',
          email_type: row.email_type,
          subject: row.subject,
          timestamp: row.feedback_received_at,
          detail: `${row.bounce_type ?? 'Bounce'}${row.bounce_subtype ? ` / ${row.bounce_subtype}` : ''}`,
          related_entity_type: row.related_entity_type,
          related_entity_id: row.related_entity_id,
          provider_message_id: row.provider_message_id,
        })
        totals.bounces++
      } else if (row.status === 'complained' && row.feedback_received_at) {
        events.push({
          id: row.id,
          event_type: 'complained',
          email_type: row.email_type,
          subject: row.subject,
          timestamp: row.feedback_received_at,
          detail: row.complaint_type ?? undefined,
          related_entity_type: row.related_entity_type,
          related_entity_id: row.related_entity_id,
          provider_message_id: row.provider_message_id,
        })
        totals.complaints++
      }
    }

    // Most recent first.
    events.sort((a, b) => (b.timestamp.localeCompare(a.timestamp)))

    const earliest = logs.length ? logs[logs.length - 1].sent_at : null
    const latest = logs.length ? logs[0].sent_at : null

    return NextResponse.json({
      recipient,
      events,
      totals,
      earliest,
      latest,
    })
  } catch (err) {
    console.error('[email-trace] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
