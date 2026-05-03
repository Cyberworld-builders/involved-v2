import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/email-trace?recipient=<email>
 *
 * Returns a unified per-recipient activity timeline drawn from four sources:
 *
 *   1. email_logs               — sent / delivered / bounced / complained / failed
 *   2. auth.audit_log_entries   — login, signup, recovery (magic link / pw reset)
 *      via SECURITY DEFINER public.get_user_auth_events(actor_username)
 *   3. assignments              — started_at / completed_at per assignment for
 *      this user (as the rater / assessment-taker)
 *   4. answers                  — first/last answer per assignment with the
 *      count, as a "responded N of M" marker without flooding the timeline
 *      with one event per question
 *
 * Used by the User Trace tab to answer: "they say they didn't get the email /
 * couldn't log in / didn't take the assessment — what actually happened?"
 *
 * Super-admin only — the route checks profile.access_level. The auth-events
 * RPC is service_role gated, but the route enforces the user-facing auth.
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

interface AuthEventRow {
  id: string
  created_at: string
  ip_address: string | null
  payload: { action?: string; log_type?: string; traits?: Record<string, unknown> } | null
}

interface AssignmentRow {
  id: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  assessment: { id: string; title: string } | { id: string; title: string }[] | null
}

type EventType =
  | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
  | 'login' | 'logout' | 'magic_link_or_recovery' | 'signup' | 'auth_other'
  | 'started_assignment' | 'completed_assignment' | 'last_answer'

interface TimelineEvent {
  id: string
  event_type: EventType
  source: 'email' | 'auth' | 'assignment' | 'answers'
  email_type?: string
  subject?: string
  assignment_title?: string
  detail?: string
  timestamp: string
  related_entity_type?: string | null
  related_entity_id?: string | null
  provider_message_id?: string | null
}

function flatRel<T>(rel: T | T[] | null): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
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

    // Look up the profile so we can correlate to assignments and answers.
    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id, name, auth_user_id, client:clients!profiles_client_id_fkey(name)')
      .ilike('email', recipient)
      .maybeSingle()

    // Run the four data fetches in parallel — they don't depend on each other.
    const [emailRes, authRes, assignmentsRes] = await Promise.all([
      admin
        .from('email_logs')
        .select(`id, email_type, subject, status, sent_at, delivered_at, feedback_received_at,
                 bounce_type, bounce_subtype, complaint_type, related_entity_type, related_entity_id,
                 provider_message_id, error_message`)
        .ilike('recipient_email', recipient)
        .order('sent_at', { ascending: false })
        .limit(500),
      admin.rpc('get_user_auth_events', { p_actor_username: recipient }),
      recipientProfile
        ? admin
            .from('assignments')
            .select('id, started_at, completed_at, created_at, assessment:assessments!assignments_assessment_id_fkey(id, title)')
            .eq('user_id', recipientProfile.id)
            .order('created_at', { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [] as AssignmentRow[], error: null }),
    ])

    const emails = (emailRes.data ?? []) as EmailLogRow[]
    const authEvents = (authRes.data ?? []) as AuthEventRow[]
    const assignments = (assignmentsRes.data ?? []) as AssignmentRow[]

    // Pull answer rollups (first answer / last answer per assignment) only for
    // assignments this user actually has, to avoid scanning the whole table.
    const assignmentIds = assignments.map(a => a.id)
    let answerRollups: Array<{ assignment_id: string; min_at: string; max_at: string; n: number }> = []
    if (assignmentIds.length > 0 && recipientProfile) {
      const { data: answersRows } = await admin
        .from('answers')
        .select('assignment_id, created_at')
        .in('assignment_id', assignmentIds)
        .eq('user_id', recipientProfile.id)
      const byAssignment = new Map<string, { min: string; max: string; n: number }>()
      for (const a of answersRows ?? []) {
        const ex = byAssignment.get(a.assignment_id)
        if (!ex) {
          byAssignment.set(a.assignment_id, { min: a.created_at, max: a.created_at, n: 1 })
        } else {
          if (a.created_at < ex.min) ex.min = a.created_at
          if (a.created_at > ex.max) ex.max = a.created_at
          ex.n++
        }
      }
      answerRollups = Array.from(byAssignment.entries()).map(([assignment_id, v]) => ({
        assignment_id, min_at: v.min, max_at: v.max, n: v.n,
      }))
    }

    const events: TimelineEvent[] = []
    const totals = {
      sends: 0, deliveries: 0, bounces: 0, complaints: 0, failures: 0,
      logins: 0, magic_links_or_recoveries: 0, signups: 0,
      started_assignments: 0, completed_assignments: 0, total_answers: 0,
    }

    // ─── Email events ─────────────────────────────────────────────────────
    for (const row of emails) {
      events.push({
        id: row.id,
        event_type: row.status === 'failed' ? 'failed' : 'sent',
        source: 'email',
        email_type: row.email_type,
        subject: row.subject,
        timestamp: row.sent_at,
        detail: row.status === 'failed' && row.error_message ? row.error_message : undefined,
        related_entity_type: row.related_entity_type,
        related_entity_id: row.related_entity_id,
        provider_message_id: row.provider_message_id,
      })
      if (row.status === 'failed') { totals.failures++; continue }
      totals.sends++
      if (row.status === 'delivered' && row.delivered_at) {
        events.push({
          id: row.id, event_type: 'delivered', source: 'email',
          email_type: row.email_type, subject: row.subject, timestamp: row.delivered_at,
          related_entity_type: row.related_entity_type, related_entity_id: row.related_entity_id,
          provider_message_id: row.provider_message_id,
        })
        totals.deliveries++
      } else if (row.status === 'bounced' && row.feedback_received_at) {
        events.push({
          id: row.id, event_type: 'bounced', source: 'email',
          email_type: row.email_type, subject: row.subject, timestamp: row.feedback_received_at,
          detail: `${row.bounce_type ?? 'Bounce'}${row.bounce_subtype ? ` / ${row.bounce_subtype}` : ''}`,
          related_entity_type: row.related_entity_type, related_entity_id: row.related_entity_id,
          provider_message_id: row.provider_message_id,
        })
        totals.bounces++
      } else if (row.status === 'complained' && row.feedback_received_at) {
        events.push({
          id: row.id, event_type: 'complained', source: 'email',
          email_type: row.email_type, subject: row.subject, timestamp: row.feedback_received_at,
          detail: row.complaint_type ?? undefined,
          related_entity_type: row.related_entity_type, related_entity_id: row.related_entity_id,
          provider_message_id: row.provider_message_id,
        })
        totals.complaints++
      }
    }

    // ─── Auth events ──────────────────────────────────────────────────────
    // Filter out high-noise actions (token_refreshed, user_modified) — they're
    // not useful for support triage and would drown out the signal.
    const SKIP_ACTIONS = new Set(['token_refreshed', 'user_modified'])
    for (const ev of authEvents) {
      const action = ev.payload?.action ?? 'unknown'
      if (SKIP_ACTIONS.has(action)) continue
      let eventType: EventType = 'auth_other'
      let detail: string | undefined
      switch (action) {
        case 'login':
          eventType = 'login'; totals.logins++; break
        case 'logout':
          eventType = 'logout'; break
        case 'user_signedup':
          eventType = 'signup'; totals.signups++; break
        case 'user_recovery_requested':
          // Both magic-link and password-reset land here. Distinguish if we can.
          eventType = 'magic_link_or_recovery'
          totals.magic_links_or_recoveries++
          break
        case 'user_invitation_requested':
          eventType = 'auth_other'; detail = 'Invitation sent'; break
        default:
          detail = action
      }
      events.push({
        id: ev.id,
        event_type: eventType,
        source: 'auth',
        timestamp: ev.created_at,
        detail,
      })
    }

    // ─── Assignment events ────────────────────────────────────────────────
    for (const a of assignments) {
      const title = flatRel(a.assessment)?.title
      if (a.started_at) {
        events.push({
          id: `${a.id}-started`,
          event_type: 'started_assignment',
          source: 'assignment',
          timestamp: a.started_at,
          assignment_title: title,
          related_entity_type: 'assignment',
          related_entity_id: a.id,
        })
        totals.started_assignments++
      }
      if (a.completed_at) {
        events.push({
          id: `${a.id}-completed`,
          event_type: 'completed_assignment',
          source: 'assignment',
          timestamp: a.completed_at,
          assignment_title: title,
          related_entity_type: 'assignment',
          related_entity_id: a.id,
        })
        totals.completed_assignments++
      }
    }

    // ─── Answer rollups ───────────────────────────────────────────────────
    // One event per assignment marking the last answer time + count. Helps
    // identify "they answered most of the questions and then stopped."
    const assignmentTitleById = new Map(assignments.map(a => [a.id, flatRel(a.assessment)?.title ?? null]))
    for (const r of answerRollups) {
      totals.total_answers += r.n
      // Skip if completed — completed event already conveys finality.
      const matchingAssignment = assignments.find(a => a.id === r.assignment_id)
      if (matchingAssignment?.completed_at) continue
      events.push({
        id: `${r.assignment_id}-last-answer`,
        event_type: 'last_answer',
        source: 'answers',
        timestamp: r.max_at,
        assignment_title: assignmentTitleById.get(r.assignment_id) ?? undefined,
        detail: `Last activity (${r.n} answers so far, no completion yet)`,
        related_entity_type: 'assignment',
        related_entity_id: r.assignment_id,
      })
    }

    // Most recent first.
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    const allTs = events.map(e => e.timestamp)
    const earliest = allTs.length ? allTs.reduce((m, x) => x < m ? x : m, allTs[0]) : null
    const latest = allTs.length ? allTs.reduce((m, x) => x > m ? x : m, allTs[0]) : null

    return NextResponse.json({
      recipient,
      profile: recipientProfile
        ? {
            id: recipientProfile.id,
            name: recipientProfile.name ?? null,
            client_name: flatRel(recipientProfile.client as { name: string } | { name: string }[] | null)?.name ?? null,
          }
        : null,
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
