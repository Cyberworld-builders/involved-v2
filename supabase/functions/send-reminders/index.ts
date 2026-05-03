import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SESClient, SendEmailCommand } from 'https://esm.sh/@aws-sdk/client-ses@3'

// ────────────────────────────────────────────────────────────────────────────
// Inline reminder-send path
// ────────────────────────────────────────────────────────────────────────────
// Previously this function called a separate `send-reminder-email` edge function
// over HTTP for each user. That inter-function call hit Supabase's rate limit
// after ~60 back-to-back invocations. This version inlines the SES send + log
// into the same function process, eliminating that hop. SES client + STS
// credentials are cached at module scope so we only assume-role once per warm
// instance.

let cachedSesClient: SESClient | null = null
let cachedSesRegion: string | null = null
let cachedSupabaseForLogs: SupabaseClient | null = null

function getLogsClient(): SupabaseClient {
  if (cachedSupabaseForLogs) return cachedSupabaseForLogs
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  cachedSupabaseForLogs = createClient(url, key)
  return cachedSupabaseForLogs
}

async function getReminderSesClient(): Promise<SESClient> {
  const awsRegion = (Deno.env.get('AWS_SES_REGION') || Deno.env.get('AWS_REGION') || 'us-east-1').trim()
  if (cachedSesClient && cachedSesRegion === awsRegion) return cachedSesClient

  const awsRoleArn = Deno.env.get('AWS_ROLE_ARN')?.trim()
  const awsAccessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID') || Deno.env.get('AWS_ACCESS_KEY_ID')
  const awsSecretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY') || Deno.env.get('AWS_SECRET_ACCESS_KEY')

  const hasAwsSesOidc = !!awsRoleArn
  const hasAwsSesAccessKeys = !!(awsAccessKeyId && awsSecretAccessKey)
  if (!hasAwsSesOidc && !hasAwsSesAccessKeys) {
    throw new Error('AWS SES not configured. Set AWS_ROLE_ARN or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY')
  }

  let credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
  if (awsRoleArn) {
    const awsExternalId = Deno.env.get('AWS_EXTERNAL_ID')
    if (awsExternalId) {
      try {
        const { STSClient, AssumeRoleCommand } = await import('https://esm.sh/@aws-sdk/client-sts@3')
        const stsClient = new STSClient({
          region: awsRegion,
          credentials: (awsAccessKeyId && awsSecretAccessKey)
            ? { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey }
            : undefined,
        })
        const resp = await stsClient.send(new AssumeRoleCommand({
          RoleArn: awsRoleArn,
          RoleSessionName: `supabase-send-reminders-${Date.now()}`,
          ExternalId: awsExternalId,
          DurationSeconds: 3600,
        }))
        if (!resp.Credentials) throw new Error('AssumeRole returned no credentials')
        credentials = {
          accessKeyId: resp.Credentials.AccessKeyId!,
          secretAccessKey: resp.Credentials.SecretAccessKey!,
          sessionToken: resp.Credentials.SessionToken!,
        }
        console.log('[send-reminders] ✅ Assumed IAM role via STS')
      } catch (stsError) {
        console.warn('[send-reminders] STS assume-role failed, falling back to access keys:', stsError)
        if (awsAccessKeyId && awsSecretAccessKey) {
          credentials = { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey }
        } else {
          throw new Error(`STS failed and no access-key fallback: ${stsError instanceof Error ? stsError.message : 'unknown'}`)
        }
      }
    } else {
      if (!awsAccessKeyId || !awsSecretAccessKey) {
        throw new Error('AWS_ROLE_ARN set but no AWS_EXTERNAL_ID or access keys available')
      }
      credentials = { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey }
    }
  } else {
    credentials = { accessKeyId: awsAccessKeyId!, secretAccessKey: awsSecretAccessKey! }
  }

  cachedSesClient = new SESClient({
    region: awsRegion,
    credentials,
    maxAttempts: 3,
  })
  cachedSesRegion = awsRegion
  return cachedSesClient
}

async function logReminderEmail(params: {
  assignment_ids: string[]
  recipient_email: string
  subject: string
  status: 'sent' | 'failed'
  provider_message_id?: string
  error_message?: string
}) {
  try {
    const supabase = getLogsClient()
    const rows = params.assignment_ids.map((id) => ({
      email_type: 'reminder',
      recipient_email: params.recipient_email,
      subject: params.subject,
      provider_message_id: params.provider_message_id ?? null,
      related_entity_type: 'assignment',
      related_entity_id: id,
      status: params.status,
      error_message: params.error_message ?? null,
    }))
    const { error } = await supabase.from('email_logs').insert(rows)
    if (error) console.error('[send-reminders] logReminderEmail insert failed:', error.message)
  } catch (e) {
    console.error('[send-reminders] logReminderEmail threw:', e)
  }
}

function generateReminderEmailBody(
  userName: string,
  assessmentTitles: string[],
  dashboardUrl: string,
  userEmail: string,
  expires?: string
): string {
  const loginUrl = dashboardUrl.replace(/\/dashboard\/?$/, `/auth/forgot-password?email=${encodeURIComponent(userEmail)}`)
  const expirationStr = expires
    ? new Date(expires).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const multiple = assessmentTitles.length > 1
  const heading = multiple ? 'Reminder: Complete Your Assessments' : 'Reminder: Complete Your Assessment'
  const intro = multiple
    ? 'This is a friendly reminder that you have incomplete assessment assignments:'
    : 'This is a friendly reminder that you have an incomplete assessment assignment:'
  const listHtml = assessmentTitles.map((t) => `<li>${t}</li>`).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff;">
          <tr>
            <td style="background-color: #2D2E30; color: #ffffff; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 20px; color: #ffffff;">${heading}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 20px;">
              <p style="margin: 0 0 16px 0;">Hello ${userName},</p>
              <p style="margin: 0 0 16px 0;">${intro}</p>
              <ul style="margin: 0 0 16px 0;">${listHtml}</ul>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #4F46E5; border-radius: 4px;">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0;">Click the button above to open your dashboard. You will need to request a log-in magic link to complete your ${multiple ? 'assessments' : 'assessment'}. You will be prompted to do so immediately upon landing on the dashboard.</p>
              ${expirationStr ? `<p style="margin: 0 0 16px 0;">Please complete your assignments by ${expirationStr}.</p>` : ''}
              <p style="margin: 0 0 16px 0;">You can access your assignments at any time from your dashboard (<a href="${loginUrl}" style="color: #4F46E5;">${dashboardUrl}</a>) by requesting a log-in magic link.</p>
              <p style="margin: 0 0 16px 0;">If you have any questions, please contact us at: <a href="mailto:support@involvedtalent.com" style="color: #4F46E5;">support@involvedtalent.com</a></p>
              <p style="margin: 0 0 8px 0;">Thank you!</p>
              <p style="margin: 0 0 16px 0;">-Involved Talent Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; border-top: 1px solid #dddddd;">
              <p style="margin: 0; font-size: 12px; color: #666666;">&copy; ${new Date().getFullYear()} Involved Talent</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function generateReminderEmailText(
  userName: string,
  assessmentTitles: string[],
  dashboardUrl: string,
  userEmail: string,
  expires?: string
): string {
  const loginUrl = dashboardUrl.replace(/\/dashboard\/?$/, `/auth/forgot-password?email=${encodeURIComponent(userEmail)}`)
  const expirationStr = expires
    ? new Date(expires).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const multiple = assessmentTitles.length > 1
  const intro = multiple
    ? 'This is a friendly reminder that you have incomplete assessment assignments:'
    : 'This is a friendly reminder that you have an incomplete assessment assignment:'
  const listText = assessmentTitles.map((t) => `- ${t}`).join('\n')

  return `
Hello ${userName},

${intro}

${listText}

Go to Dashboard: ${loginUrl}

Click the link above to open your dashboard. You will need to request a log-in magic link to complete your ${multiple ? 'assessments' : 'assessment'}. You will be prompted to do so immediately upon landing on the dashboard.
${expirationStr ? `\nPlease complete your assignments by ${expirationStr}.\n` : ''}
You can access your assignments at any time from your dashboard (${dashboardUrl}) by requesting a log-in magic link.

If you have any questions, please contact us at: support@involvedtalent.com

Thank you!
-Involved Talent Team
  `.trim()
}

/**
 * Inline send-a-reminder-email. Returns messageId on success; throws on failure.
 * Always attempts to log to email_logs (sent or failed) before returning/throwing.
 */
async function sendReminderEmailInline(params: {
  assignment_ids: string[]
  user_email: string
  user_name: string
  assessment_titles: string[]
  expires?: string
}): Promise<string> {
  const { assignment_ids, user_email, user_name, assessment_titles, expires } = params

  let baseUrl = (Deno.env.get('NEXT_PUBLIC_APP_URL') || Deno.env.get('APP_URL') || 'http://localhost:3000').trim().replace(/\/+$/, '')
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = `https://${baseUrl}`
  const dashboardUrl = `${baseUrl}/dashboard`
  const fromEmail = (Deno.env.get('EMAIL_FROM') || Deno.env.get('AWS_SES_FROM_EMAIL') || 'noreply@example.com').trim()

  const subject = assessment_titles.length > 1
    ? 'Reminder: Complete Your Assessments'
    : `Reminder: Complete Your Assessment - ${assessment_titles[0]}`
  const htmlBody = generateReminderEmailBody(user_name, assessment_titles, dashboardUrl, user_email, expires)
  const textBody = generateReminderEmailText(user_name, assessment_titles, dashboardUrl, user_email, expires)

  // ConfigurationSetName routes Bounce/Complaint/Delivery events through SES →
  // SNS → /api/webhooks/ses-feedback. Reminders need this for the same reason
  // batch sends do — without it, no SNS feedback flows for reminder emails.
  const configurationSetName = Deno.env.get('SES_CONFIGURATION_SET')?.trim() || undefined

  try {
    const ses = await getReminderSesClient()
    const resp = await ses.send(new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [user_email] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: htmlBody, Charset: 'UTF-8' },
          Text: { Data: textBody, Charset: 'UTF-8' },
        },
      },
      ConfigurationSetName: configurationSetName,
    }))
    const messageId = resp.MessageId ?? `ses-${Date.now()}`
    await logReminderEmail({ assignment_ids, recipient_email: user_email, subject, status: 'sent', provider_message_id: messageId })
    return messageId
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown SES error'
    await logReminderEmail({ assignment_ids, recipient_email: user_email, subject, status: 'failed', error_message: errorMessage })
    throw new Error(errorMessage)
  }
}

/**
 * Fire a single admin summary alert when reminder sends fail.
 * Best-effort; logs but never throws.
 */
async function sendAdminAlert(subject: string, body: string) {
  try {
    const to = Deno.env.get('ADMIN_ALERT_EMAIL')?.trim()
    if (!to) {
      console.warn('[send-reminders] ADMIN_ALERT_EMAIL not set; skipping admin alert')
      return
    }
    const awsAccessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID') || Deno.env.get('AWS_ACCESS_KEY_ID')
    const awsSecretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY') || Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const awsRegion = (Deno.env.get('AWS_SES_REGION') || Deno.env.get('AWS_REGION') || 'us-east-1').trim()
    const fromEmail = (Deno.env.get('EMAIL_FROM') || Deno.env.get('AWS_SES_FROM_EMAIL') || 'noreply@example.com').trim()
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      console.warn('[send-reminders] No AWS creds available for admin alert')
      return
    }
    const ses = new SESClient({
      region: awsRegion,
      credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey },
    })
    await ses.send(new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Text: { Data: body, Charset: 'UTF-8' } },
      },
    }))
    console.log(`[send-reminders] Admin alert sent to ${to}`)
  } catch (e) {
    console.error('[send-reminders] Failed to send admin alert:', e)
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderAssignment {
  id: string
  user_id: string
  assessment_id: string
  reminder_frequency: string
  next_reminder: string
  expires?: string
  url?: string
  user: {
    id: string
    name: string
    email: string
    username: string
  }
  assessment: {
    id: string
    title: string
  }
}

const FREQUENCY_DAYS: Record<string, number> = {
  '+1 day': 1,
  '+2 days': 2,
  '+3 days': 3,
  '+4 days': 4,
  '+5 days': 5,
  '+6 days': 6,
  '+1 week': 7,
  '+2 weeks': 14,
  '+3 weeks': 21,
  '+1 month': 30,
  '+2 months': 60,
  '+3 months': 90,
}

/**
 * Pick the shortest-interval frequency from a list.
 * When a user has pending assignments with mixed cadences we honor the most
 * aggressive one so nobody gets reminded less often than the creator intended.
 */
function pickMostFrequentFrequency(frequencies: string[]): string {
  let best = frequencies[0] ?? '+1 week'
  let bestDays = FREQUENCY_DAYS[best] ?? 7
  for (const f of frequencies) {
    const d = FREQUENCY_DAYS[f] ?? 7
    if (d < bestDays) {
      bestDays = d
      best = f
    }
  }
  return best
}

/**
 * Calculate next reminder date from frequency string
 */
function calculateNextReminder(now: Date, frequency: string): Date {
  const next = new Date(now)
  const days = FREQUENCY_DAYS[frequency]
  if (days === undefined) {
    console.warn(`Unknown reminder frequency: ${frequency}, defaulting to 1 week`)
    next.setDate(next.getDate() + 7)
    return next
  }
  if (frequency === '+1 month') {
    next.setMonth(next.getMonth() + 1)
  } else if (frequency === '+2 months') {
    next.setMonth(next.getMonth() + 2)
  } else if (frequency === '+3 months') {
    next.setMonth(next.getMonth() + 3)
  } else {
    next.setDate(next.getDate() + days)
  }
  return next
}


serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }



    // Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find reminders that are due (next_reminder <= now)
    const now = new Date()

    console.log(`🔍 Checking for reminders due before ${now.toISOString()}`)

    // Pull every pending reminder so we can build a per-user digest, then decide
    // whether the user is due by checking if any one of their assignments has
    // next_reminder <= now. The email includes the user's full pending list.
    const { data: pendingAssignments, error: queryError } = await supabase
      .from('assignments')
      .select(`
        id,
        user_id,
        assessment_id,
        reminder_frequency,
        url,
        expires,
        next_reminder,
        user:profiles!assignments_user_id_fkey(id, name, email, username),
        assessment:assessments!assignments_assessment_id_fkey(id, title)
      `)
      .eq('reminder', true)
      .eq('completed', false)
      .not('next_reminder', 'is', null)

    if (queryError) {
      console.error('❌ Error querying assignments:', queryError)
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingAssignments || pendingAssignments.length === 0) {
      console.log('✅ No pending reminders')
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group pending assignments by user
    const byUser = new Map<string, ReminderAssignment[]>()
    for (const a of pendingAssignments as ReminderAssignment[]) {
      const list = byUser.get(a.user_id) ?? []
      list.push(a)
      byUser.set(a.user_id, list)
    }

    // A user is due when at least one of their pending assignments has come due
    const dueUsers: Array<[string, ReminderAssignment[]]> = []
    for (const [userId, group] of byUser) {
      const anyDue = group.some(a => new Date(a.next_reminder) <= now)
      if (anyDue) dueUsers.push([userId, group])
    }

    if (dueUsers.length === 0) {
      console.log('✅ No users due for reminders')
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📧 ${dueUsers.length} user(s) due, covering ${dueUsers.reduce((n, [, g]) => n + g.length, 0)} pending assignment(s)`)

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Inline send — no inter-function fetch(), no Supabase rate limit to dodge.
    // Sequential loop keeps SES well under 14/s for any realistic size.
    for (const [userId, group] of dueUsers) {
      const primary = group[0]
      try {
        // Most aggressive cadence wins so we don't silently stretch reminders.
        const mostFrequent = pickMostFrequentFrequency(group.map(a => a.reminder_frequency))
        const nextReminder = calculateNextReminder(new Date(), mostFrequent)

        // Dedupe titles across the user's pending assignments
        const uniqueTitles = Array.from(new Set(group.map(a => a.assessment.title)))

        // Soonest expiration wins — it's the most urgent thing to mention
        const expiresDates = group
          .map(a => a.expires)
          .filter((e): e is string => !!e)
          .sort()
        const soonestExpires = expiresDates[0]

        await sendReminderEmailInline({
          assignment_ids: group.map(a => a.id),
          user_email: primary.user.email,
          user_name: primary.user.name,
          assessment_titles: uniqueTitles,
          expires: soonestExpires,
        })

        // Reschedule all of this user's pending assignments together
        const { error: updateError } = await supabase
          .from('assignments')
          .update({ next_reminder: nextReminder.toISOString() })
          .in('id', group.map(a => a.id))

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`)
        }

        results.sent++
        console.log(`✅ Sent digest reminder to ${primary.user.email} for ${group.length} assignment(s); next at ${nextReminder.toISOString()} (${mostFrequent})`)
      } catch (error) {
        results.failed++
        const errorMsg = `User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        results.errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    const response = {
      message: `Processed ${dueUsers.length} user(s)`,
      timestamp: now.toISOString(),
      ...results,
    }

    console.log(`📊 Reminder processing complete:`, response)

    // Alert admins if any reminders failed. One summary per run, regardless of count.
    if (results.failed > 0) {
      const body = [
        `Reminder cron run at ${now.toISOString()} had failures.`,
        ``,
        `Processed: ${dueUsers.length} user(s)`,
        `Sent: ${results.sent}`,
        `Failed: ${results.failed}`,
        ``,
        `First few errors:`,
        ...results.errors.slice(0, 10).map((e) => `- ${e}`),
        ``,
        `Investigate at: https://supabase.com/dashboard/project/${(supabaseUrl.match(/https?:\/\/([^.]+)/) || [])[1] ?? ''}/functions/send-reminders/logs`,
      ].join('\n')
      await sendAdminAlert(
        `[Involved Talent] ${results.failed} reminder email(s) failed`,
        body
      )
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

