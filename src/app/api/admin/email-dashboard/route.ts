import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SESClient, GetSendStatisticsCommand } from '@aws-sdk/client-ses'

const PAGE_SIZE = 50
const MAX_PAGE = 100

/**
 * GET /api/admin/email-dashboard
 * Super-admin only. Returns email_logs for the given filters plus optional SES aggregate.
 * Query: from, to (date), emailType, recipient (search), status, page.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

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
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const emailType = searchParams.get('emailType')
    const recipient = searchParams.get('recipient')?.trim() || ''
    const status = searchParams.get('status')
    const page = Math.min(Math.max(0, parseInt(searchParams.get('page') || '0', 10)), MAX_PAGE)
    const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE), 10)), 100)

    const admin = createAdminClient()

    let query = admin
      .from('email_logs')
      .select('id, email_type, recipient_email, subject, provider_message_id, sent_at, related_entity_type, related_entity_id, status, created_at', { count: 'exact' })
      .order('sent_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (fromDate) {
      query = query.gte('sent_at', fromDate)
    }
    if (toDate) {
      query = query.lte('sent_at', toDate)
    }
    if (emailType) {
      query = query.eq('email_type', emailType)
    }
    if (recipient) {
      query = query.ilike('recipient_email', `%${recipient}%`)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: rows, error: logsError, count } = await query

    if (logsError) {
      console.error('[email-dashboard] logs error:', logsError)
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    const logs = rows || []

    const assignmentIds = [...new Set(
      logs
        .filter((r) => r.related_entity_type === 'assignment' && r.related_entity_id)
        .map((r) => r.related_entity_id as string)
    )]
    const inviteIds = [...new Set(
      logs
        .filter((r) => r.related_entity_type === 'user_invite' && r.related_entity_id)
        .map((r) => r.related_entity_id as string)
    )]

    const assignments: Record<string, { title?: string }> = {}
    const invites: Record<string, { email?: string }> = {}

    if (assignmentIds.length > 0) {
      const { data: assignmentsData } = await admin
        .from('assignments')
        .select('id, assessments(title)')
        .in('id', assignmentIds)
      if (assignmentsData) {
        for (const a of assignmentsData) {
          const row = a as { id: string; assessments: { title: string } | { title: string }[] | null }
          const assessment = Array.isArray(row.assessments) ? row.assessments[0] : row.assessments
          assignments[row.id] = {
            title: assessment?.title ?? undefined,
          }
        }
      }
    }
    if (inviteIds.length > 0) {
      const { data: invitesData } = await admin
        .from('user_invites')
        .select('id, profiles(email)')
        .in('id', inviteIds)
      if (invitesData) {
        for (const inv of invitesData) {
          const row = inv as { id: string; profiles: { email: string } | { email: string }[] | null }
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
          invites[row.id] = { email: profile?.email }
        }
      }
    }

    const enrichedLogs = logs.map((row) => ({
      ...row,
      related_display:
        row.related_entity_type === 'assignment' && row.related_entity_id
          ? assignments[row.related_entity_id]?.title || row.related_entity_id
          : row.related_entity_type === 'user_invite' && row.related_entity_id
            ? invites[row.related_entity_id]?.email || row.related_entity_id
            : null,
    }))

    let aggregate: { sent: number; bounces: number; complaints: number } | null = null

    const awsRoleArn = process.env.AWS_ROLE_ARN?.trim()
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
    const hasAws = !!awsRoleArn || !!(awsAccessKeyId && awsSecretAccessKey)

    if (hasAws) {
      try {
        let credentials
        if (awsRoleArn) {
          const { awsCredentialsProvider } = await import('@vercel/functions/oidc')
          credentials = awsCredentialsProvider({ roleArn: awsRoleArn })
        } else {
          credentials = {
            accessKeyId: awsAccessKeyId!,
            secretAccessKey: awsSecretAccessKey!,
          }
        }
        const sesClient = new SESClient({
          region: (process.env.AWS_REGION || 'us-east-1').trim(),
          credentials,
        })
        const res = await sesClient.send(new GetSendStatisticsCommand({}))
        const points = res.SendDataPoints || []
        aggregate = {
          sent: points.reduce((sum, p) => sum + (p.DeliveryAttempts ?? 0), 0),
          bounces: points.reduce((sum, p) => sum + (p.Bounces ?? 0), 0),
          complaints: points.reduce((sum, p) => sum + (p.Complaints ?? 0), 0),
        }
      } catch (sesErr) {
        console.warn('[email-dashboard] SES GetSendStatistics failed:', sesErr)
      }
    }

    return NextResponse.json({
      logs: enrichedLogs,
      total: count ?? 0,
      page,
      pageSize,
      aggregate,
    })
  } catch (err) {
    console.error('[email-dashboard] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
