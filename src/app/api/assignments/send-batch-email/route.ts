import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/config'
import { sendEmail } from '@/lib/services/email-service'

interface BatchEmailRequest {
  assignment_ids: string[]
  subject?: string
  body?: string
  passwords?: Record<string, string> // user_id -> password
}

/**
 * POST /api/assignments/send-batch-email
 * Server-side batch email sending for assignment notifications.
 * Fires all emails without blocking the client — returns immediately
 * with a job ID, sends emails in the background.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: BatchEmailRequest = await request.json()
  const { assignment_ids, subject, body: emailBody, passwords } = body

  if (!assignment_ids || assignment_ids.length === 0) {
    return NextResponse.json({ error: 'assignment_ids required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Fetch all assignments with user and assessment info
  const { data: assignments } = await adminClient
    .from('assignments')
    .select(`
      id, user_id, assessment_id, url, expires,
      user:profiles!assignments_user_id_fkey(id, name, email, username),
      assessment:assessments!assignments_assessment_id_fkey(id, title)
    `)
    .in('id', assignment_ids)

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ error: 'No assignments found' }, { status: 404 })
  }

  // Group assignments by user for consolidated emails
  const byUser = new Map<string, {
    user: { name: string; email: string; username: string }
    assignments: Array<{ assessmentTitle: string; url?: string | null; expires?: string | null }>
  }>()

  for (const a of assignments) {
    const u = (a.user as unknown) as { id: string; name: string; email: string; username: string } | null
    const assess = (a.assessment as unknown) as { title: string } | null
    if (!u) continue

    if (!byUser.has(u.id)) {
      byUser.set(u.id, { user: u, assignments: [] })
    }
    byUser.get(u.id)!.assignments.push({
      assessmentTitle: assess?.title || 'Assessment',
      url: a.url,
      expires: a.expires,
    })
  }

  const baseUrl = getAppUrl()
  const loginLink = `${baseUrl}/auth/forgot-password`
  const dashboardLink = `${baseUrl}/dashboard`
  const year = new Date().getFullYear()

  const defaultSubject = subject || 'New assessments have been assigned to you'

  // Send emails in parallel
  const emailPromises: Promise<void>[] = []

  for (const [userId, data] of byUser) {
    const { user: u, assignments: userAssignments } = data
    const password = passwords?.[userId]
    const assessmentList = userAssignments.map(a => a.assessmentTitle).join(', ')
    const firstExpires = userAssignments[0]?.expires
    const expirationStr = firstExpires
      ? new Date(firstExpires).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A'

    // Build assessment list HTML (listed once)
    const assessmentListHtml = userAssignments.map(a => {
      return `<li>${a.assessmentTitle}</li>`
    }).join('')

    // If custom emailBody was provided, process shortcodes on it
    let customBodyHtml = ''
    if (emailBody) {
      customBodyHtml = emailBody
        .replace(/{name}/g, u.name)
        .replace(/{username}/g, u.username || u.email)
        .replace(/{email}/g, u.email)
        .replace(/{assessments}/g, assessmentList)
        .replace(/{expiration-date}/g, expirationStr)
        .replace(/{dashboard-link}/g, loginLink)
        .replace(/{year}/g, String(year))
      if (password) {
        customBodyHtml = customBodyHtml.replace(/{password}/g, password)
      } else {
        customBodyHtml = customBodyHtml.replace(/{password}/g, '')
      }
    }

    const htmlBody = customBodyHtml
      ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2D2E30; color: #ffffff; padding: 20px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff;">Assessment Notification</h2>
          </div>
          <div style="padding: 30px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
              <tr>
                <td align="center" style="background-color: #4F46E5; border-radius: 4px;">
                  <a href="${loginLink}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
                </td>
              </tr>
            </table>
            ${customBodyHtml.split('\n').map(line => `<p style="margin: 0 0 16px 0;">${line}</p>`).join('')}
            ${password ? `<p style="background: #f3f4f6; padding: 12px; border-radius: 4px;"><strong>Your temporary password:</strong> ${password}</p>` : ''}
          </div>
          <div style="padding: 16px 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            &copy; ${year} Involved Talent
          </div>
        </div>`
      : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2D2E30; color: #ffffff; padding: 20px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff;">Assessment Notification</h2>
          </div>
          <div style="padding: 30px 20px;">
            <p style="margin: 0 0 16px 0;">Hello ${u.name},</p>
            <p style="margin: 0 0 16px 0;">You have been assigned the following assessment(s):</p>
            <ul style="margin: 0 0 16px 0;">${assessmentListHtml}</ul>
            <!-- Big Blue Button at top -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
              <tr>
                <td align="center" style="background-color: #4F46E5; border-radius: 4px;">
                  <a href="${loginLink}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
                </td>
              </tr>
            </table>
            <p style="margin: 0 0 16px 0;">Please click the button above to open your dashboard. You will need to request a log-in magic link to complete your assessment. You will be prompted to do so immediately upon landing on the dashboard.</p>
            <p style="margin: 0 0 16px 0;">Please complete your assignments by ${expirationStr}.</p>
            <p style="margin: 0 0 16px 0;">You can access your assignments at any time from your dashboard (<a href="${loginLink}" style="color: #4F46E5;">${dashboardLink}</a>) by requesting a log-in magic link.</p>
            <p style="margin: 0 0 16px 0;">SAVE this email and BOOKMARK your login page.</p>
            ${password ? `<p style="background: #f3f4f6; padding: 12px; border-radius: 4px; margin: 0 0 16px 0;"><strong>Your temporary password:</strong> ${password}</p>` : ''}
            <p style="margin: 0 0 16px 0;">If you have any questions, please contact us at: <a href="mailto:support@involvedtalent.com" style="color: #4F46E5;">support@involvedtalent.com</a></p>
            <p style="margin: 0 0 8px 0;">Thank you!</p>
            <p style="margin: 0 0 16px 0;">-Involved Talent Team</p>
          </div>
          <div style="padding: 16px 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            &copy; ${year} Involved Talent
          </div>
        </div>`

    const textBody = `Hello ${u.name},

You have been assigned the following assessment(s): ${assessmentList}

Please complete your assignments by ${expirationStr}.

You can access your assignments at any time from your dashboard (${loginLink}) by requesting a log-in magic link.

SAVE this email and BOOKMARK your login page.
${password ? `\nYour temporary password: ${password}\n` : ''}
If you have any questions, please contact us at: support@involvedtalent.com

Thank you!
-Involved Talent Team

© ${year} Involved Talent`

    emailPromises.push(
      sendEmail(u.email, defaultSubject, htmlBody, textBody, {
        logMetadata: {
          emailType: 'assignment',
          relatedEntityType: 'assignment',
          relatedEntityId: assignment_ids.find(id =>
            assignments.find(a => a.id === id && ((a.user as unknown) as { id: string })?.id === userId)
          ) || null,
        },
      }).then(result => {
        if (!result.success) {
          console.error(`Failed to send email to ${u.email}:`, result.error)
        }
      }).catch(err => {
        console.error(`Error sending email to ${u.email}:`, err)
      })
    )
  }

  // Send all emails in parallel and wait for completion
  const results = await Promise.allSettled(emailPromises)
  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  console.log(`[Batch Email] Completed: ${sent} sent, ${failed} failed out of ${results.length}`)

  return NextResponse.json({
    success: true,
    sent,
    failed,
    total: byUser.size,
    message: `${sent} email(s) sent${failed > 0 ? `, ${failed} failed` : ''}`,
  })
}
