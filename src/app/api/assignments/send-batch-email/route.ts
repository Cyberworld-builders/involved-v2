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
  const dashboardLink = `${baseUrl}/dashboard`
  const year = new Date().getFullYear()

  const defaultSubject = subject || 'New assessments have been assigned to you'
  const defaultBody = emailBody || 'Hello {name}, you have been assigned {assessments}. Please complete by {expiration-date}. Dashboard: {dashboard-link}. © {year} Involved Talent.'

  // Send emails — fire and forget (don't await, let them complete in background)
  const emailPromises: Promise<void>[] = []

  for (const [userId, data] of byUser) {
    const { user: u, assignments: userAssignments } = data
    const password = passwords?.[userId]
    const assessmentList = userAssignments.map(a => a.assessmentTitle).join(', ')
    const firstExpires = userAssignments[0]?.expires
    const expirationStr = firstExpires ? new Date(firstExpires).toLocaleDateString() : 'N/A'

    // Build assignment links HTML
    const assignmentLinksHtml = userAssignments.map(a => {
      const link = a.url ? `<a href="${a.url}">${a.assessmentTitle}</a>` : a.assessmentTitle
      return `<li>${link}</li>`
    }).join('')

    // Replace shortcodes
    let processedBody = defaultBody
      .replace(/{name}/g, u.name)
      .replace(/{username}/g, u.username || u.email)
      .replace(/{email}/g, u.email)
      .replace(/{assessments}/g, assessmentList)
      .replace(/{expiration-date}/g, expirationStr)
      .replace(/{dashboard-link}/g, dashboardLink)
      .replace(/{year}/g, String(year))

    if (password) {
      processedBody = processedBody.replace(/{password}/g, password)
    } else {
      processedBody = processedBody.replace(/{password}/g, '')
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2D2E30; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; color: #ffffff;">Assessment Notification</h2>
        </div>
        <div style="padding: 20px;">
          ${processedBody.split('\n').map(line => `<p>${line}</p>`).join('')}
          ${assignmentLinksHtml ? `<ul>${assignmentLinksHtml}</ul>` : ''}
          ${password ? `<p style="background: #f3f4f6; padding: 12px; border-radius: 4px;"><strong>Your temporary password:</strong> ${password}</p>` : ''}
          <p><a href="${dashboardLink}" style="background-color: #FFBA00; color: #2D2E30; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Go to Dashboard</a></p>
        </div>
        <div style="padding: 16px 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
          &copy; ${year} Involved Talent
        </div>
      </div>
    `

    const textBody = processedBody

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
