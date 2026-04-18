import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SESClient, SendEmailCommand } from 'https://esm.sh/@aws-sdk/client-ses@3'

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
    // Supabase's new-format service role keys (sb_secret_*) aren't JWTs and the
    // edge function gateway requires a JWT Authorization header for function-to-
    // function calls. We store the legacy JWT-format key as EDGE_FUNCTION_JWT
    // for internal invocations. Falls back to the service key for older envs.
    const edgeFunctionJwt = Deno.env.get('EDGE_FUNCTION_JWT') || supabaseServiceKey

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

        const emailResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-reminder-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${edgeFunctionJwt}`,
              'apikey': edgeFunctionJwt,
            },
            body: JSON.stringify({
              assignment_ids: group.map(a => a.id),
              user_email: primary.user.email,
              user_name: primary.user.name,
              user_username: primary.user.username,
              assessment_titles: uniqueTitles,
              reminder_frequency: mostFrequent,
              expires: soonestExpires,
            }),
          }
        )

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(`Email send failed: ${errorData.error || emailResponse.statusText}`)
        }

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

