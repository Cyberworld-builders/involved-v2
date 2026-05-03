import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CAPACITY_LIMITS, classifyBatchVolume } from '@/lib/email/capacity-limits'

/**
 * GET /api/admin/email-campaign
 *
 * Survey-scoped email observability for the campaign dashboard tab.
 *
 * Two modes:
 *   - List mode: returns surveys (with client + assessment) for the selector,
 *     optionally filtered by client_id. Returns the most recent surveys first.
 *   - Detail mode: when `survey` query param is set, returns aggregated stats
 *     for that survey: status breakdown, completion rate, pending assignments
 *     (proxy for upcoming reminders), capacity classification, and a health
 *     rollup. Honors `from` / `to` for the date window (defaults: last 7 days).
 *
 * Super-admin only — same gate as /api/admin/email-dashboard.
 */

interface StatusBreakdown {
  sent: number
  delivered: number
  bounced: number
  complained: number
  failed: number
  total: number
}

interface BounceComplaint {
  recipient_email: string
  status: 'bounced' | 'complained'
  bounce_type: string | null
  bounce_subtype: string | null
  complaint_type: string | null
  feedback_received_at: string | null
  related_entity_id: string | null
  subject: string
}

type HealthLevel = 'green' | 'yellow' | 'red'

interface HealthRollup {
  level: HealthLevel
  reasons: string[]
  bounce_rate: number
  complaint_rate: number
  failure_rate: number
}

function classifyHealth(b: StatusBreakdown): HealthRollup {
  const reasons: string[] = []
  let level: HealthLevel = 'green'

  // Hard bounce + complaint rates use status counts directly. Soft bounces aren't
  // distinguished here — bounce_subtype lives on individual rows; for the rollup
  // we treat all bounces as the worse case.
  const denominator = b.total || 1
  const bounce_rate = b.bounced / denominator
  const complaint_rate = b.complained / denominator
  const failure_rate = b.failed / denominator

  if (b.complained > 0) {
    level = 'red'
    reasons.push(`${b.complained} spam complaint(s) recorded`)
  }
  if (bounce_rate > 0.02) {
    level = 'red'
    reasons.push(`Bounce rate ${(bounce_rate * 100).toFixed(1)}% exceeds 2%`)
  }
  if (failure_rate > 0.05) {
    level = 'red'
    reasons.push(`Send-failure rate ${(failure_rate * 100).toFixed(1)}% exceeds 5%`)
  }

  if (level === 'green') {
    if (failure_rate > 0.01) {
      level = 'yellow'
      reasons.push(`Send-failure rate ${(failure_rate * 100).toFixed(1)}% above 1% threshold`)
    }
    if (bounce_rate > 0 && bounce_rate <= 0.02) {
      // bounces but under threshold — informational, not yellow on its own
      reasons.push(`Bounce rate ${(bounce_rate * 100).toFixed(1)}% (within tolerance)`)
    }
  }

  if (level === 'green' && reasons.length === 0) {
    reasons.push('All signals nominal')
  }

  return { level, reasons, bounce_rate, complaint_rate, failure_rate }
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

    const { searchParams } = new URL(request.url)
    const surveyId = searchParams.get('survey')
    const clientId = searchParams.get('clientId')

    const admin = createAdminClient()

    // ─── List mode ──────────────────────────────────────────────────────────
    if (!surveyId) {
      let q = admin
        .from('surveys')
        .select('id, name, created_at, client:clients!surveys_client_id_fkey(id, name), assessment:assessments!surveys_assessment_id_fkey(id, title)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (clientId) q = q.eq('client_id', clientId)

      const { data: surveys, error } = await q
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ surveys: surveys ?? [] })
    }

    // ─── Detail mode ────────────────────────────────────────────────────────
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fromIso = searchParams.get('from') || defaultFrom.toISOString()
    const toIso = searchParams.get('to') || now.toISOString()

    // Survey + client + assessment metadata
    const { data: survey, error: surveyErr } = await admin
      .from('surveys')
      .select('id, name, created_at, client:clients!surveys_client_id_fkey(id, name), assessment:assessments!surveys_assessment_id_fkey(id, title)')
      .eq('id', surveyId)
      .single()
    if (surveyErr || !survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // Assignments under this survey
    const { data: assignments } = await admin
      .from('assignments')
      .select('id, completed, expires, target_id, user_id, sent_at, completed_at')
      .eq('survey_id', surveyId)

    const assignmentIds = (assignments ?? []).map(a => a.id)
    const totalAssignments = assignmentIds.length
    const completedAssignments = (assignments ?? []).filter(a => a.completed).length
    const pendingAssignments = totalAssignments - completedAssignments

    // Email logs joined to those assignments, within date window
    let logRows: Array<{
      id: string
      recipient_email: string
      subject: string
      status: string
      bounce_type: string | null
      bounce_subtype: string | null
      complaint_type: string | null
      feedback_received_at: string | null
      delivered_at: string | null
      sent_at: string
      related_entity_id: string | null
      email_type: string
      error_message: string | null
    }> = []

    if (assignmentIds.length > 0) {
      // PostgREST URL-length cap: chunk if necessary. 500 is a safe count.
      const chunkSize = 500
      for (let i = 0; i < assignmentIds.length; i += chunkSize) {
        const chunk = assignmentIds.slice(i, i + chunkSize)
        const { data, error } = await admin
          .from('email_logs')
          .select('id, recipient_email, subject, status, bounce_type, bounce_subtype, complaint_type, feedback_received_at, delivered_at, sent_at, related_entity_id, email_type, error_message')
          .eq('related_entity_type', 'assignment')
          .in('related_entity_id', chunk)
          .gte('sent_at', fromIso)
          .lte('sent_at', toIso)
          .order('sent_at', { ascending: false })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        logRows = logRows.concat(data ?? [])
      }
    }

    const breakdown: StatusBreakdown = {
      sent: 0,
      delivered: 0,
      bounced: 0,
      complained: 0,
      failed: 0,
      total: 0,
    }
    const bounceComplaintRows: BounceComplaint[] = []
    const recentDeliveries: Array<{ recipient_email: string; delivered_at: string | null; subject: string }> = []
    let latencySumMs = 0
    let latencyCount = 0

    for (const r of logRows) {
      breakdown.total++
      switch (r.status) {
        case 'sent': breakdown.sent++; break
        case 'delivered':
          breakdown.delivered++
          if (recentDeliveries.length < 10) {
            recentDeliveries.push({ recipient_email: r.recipient_email, delivered_at: r.delivered_at, subject: r.subject })
          }
          if (r.delivered_at) {
            const ms = new Date(r.delivered_at).getTime() - new Date(r.sent_at).getTime()
            if (ms > 0) { latencySumMs += ms; latencyCount++ }
          }
          break
        case 'bounced':
          breakdown.bounced++
          bounceComplaintRows.push({
            recipient_email: r.recipient_email,
            status: 'bounced',
            bounce_type: r.bounce_type,
            bounce_subtype: r.bounce_subtype,
            complaint_type: null,
            feedback_received_at: r.feedback_received_at,
            related_entity_id: r.related_entity_id,
            subject: r.subject,
          })
          break
        case 'complained':
          breakdown.complained++
          bounceComplaintRows.push({
            recipient_email: r.recipient_email,
            status: 'complained',
            bounce_type: null,
            bounce_subtype: null,
            complaint_type: r.complaint_type,
            feedback_received_at: r.feedback_received_at,
            related_entity_id: r.related_entity_id,
            subject: r.subject,
          })
          break
        case 'failed': breakdown.failed++; break
      }
    }

    const avg_delivery_latency_ms = latencyCount > 0 ? Math.round(latencySumMs / latencyCount) : null
    const health = classifyHealth(breakdown)

    // Pending assignments → upcoming reminders proxy. We can't know exact sends
    // without the reminder schedule, but the count is a useful "what's coming"
    // signal. Real projection would require parsing reminder configs.
    const projected_upcoming_emails = pendingAssignments

    // Capacity classification based on what's already been sent in the window.
    const capacity = classifyBatchVolume(breakdown.total || 0)

    return NextResponse.json({
      survey,
      window: { from: fromIso, to: toIso },
      breakdown,
      bounce_complaint_rows: bounceComplaintRows,
      recent_deliveries: recentDeliveries,
      avg_delivery_latency_ms,
      health,
      assignments: {
        total: totalAssignments,
        completed: completedAssignments,
        pending: pendingAssignments,
        completion_rate: totalAssignments > 0 ? completedAssignments / totalAssignments : 0,
      },
      projected_upcoming_emails,
      capacity: {
        ...capacity,
        last_verified: CAPACITY_LIMITS.lastVerified,
        ses_daily_quota: CAPACITY_LIMITS.sesDailyQuota,
        reminder_sequential_per_run: CAPACITY_LIMITS.reminderSequentialPerRun,
      },
    })
  } catch (err) {
    console.error('[email-campaign] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
