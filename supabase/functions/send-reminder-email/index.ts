import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SESClient, SendEmailCommand } from 'https://esm.sh/@aws-sdk/client-ses@3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Log an outbound reminder email to email_logs, one row per assignment in
 * the batch. All rows share a provider_message_id so the audit UI can tie
 * them back to the same send. Best-effort; never throws.
 */
async function logReminderEmail(params: {
  assignment_ids: string[]
  recipient_email: string
  subject: string
  status: 'sent' | 'failed'
  provider_message_id?: string
  error_message?: string
}) {
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(url, key)
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
    if (error) {
      console.error('[send-reminder-email] logEmail insert failed:', error.message)
    }
  } catch (e) {
    console.error('[send-reminder-email] logEmail threw:', e)
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderEmailRequest {
  assignment_ids: string[]
  user_email: string
  user_name: string
  user_username: string
  assessment_titles: string[]
  reminder_frequency: string
  expires?: string
}

/**
 * Generate reminder email HTML body.
 * Accepts an array of assessment titles so one email can cover every pending
 * assignment a user has, instead of firing N separate reminders.
 * Uses inline styles on the button for Outlook compatibility; includes raw URL and dashboard link.
 */
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
          <!-- Header -->
          <tr>
            <td style="background-color: #2D2E30; color: #ffffff; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 20px; color: #ffffff;">${heading}</h2>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 20px;">
              <p style="margin: 0 0 16px 0;">Hello ${userName},</p>
              <p style="margin: 0 0 16px 0;">${intro}</p>
              <ul style="margin: 0 0 16px 0;">${listHtml}</ul>
              <!-- Big Blue Button -->
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
          <!-- Footer -->
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

/**
 * Generate plain text version of reminder email
 */
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Hoisted so catch block can log failure with request context
  let body: ReminderEmailRequest | undefined

  try {
    body = await req.json() as ReminderEmailRequest
    const {
      assignment_ids,
      user_email,
      user_name,
      assessment_titles,
      expires,
    } = body

    if (!Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'assignment_ids (array) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!Array.isArray(assessment_titles) || assessment_titles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'assessment_titles (array) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let baseUrl = (Deno.env.get('NEXT_PUBLIC_APP_URL') || Deno.env.get('APP_URL') || 'http://localhost:3000').trim().replace(/\/+$/, '')
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`
    }
    const dashboardUrl = `${baseUrl}/dashboard`

    // Get email configuration from environment
    const awsRoleArn = Deno.env.get('AWS_ROLE_ARN')?.trim()
    const awsAccessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID') || Deno.env.get('AWS_ACCESS_KEY_ID')
    const awsSecretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY') || Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const awsRegion = (Deno.env.get('AWS_SES_REGION') || Deno.env.get('AWS_REGION') || 'us-east-1').trim()
    const fromEmail = (Deno.env.get('EMAIL_FROM') || Deno.env.get('AWS_SES_FROM_EMAIL') || 'noreply@example.com').trim()

    // Check if email service is configured
    const hasAwsSesOidc = !!awsRoleArn
    const hasAwsSesAccessKeys = !!(awsAccessKeyId && awsSecretAccessKey)
    const hasAwsSes = hasAwsSesOidc || hasAwsSesAccessKeys

    if (!hasAwsSes) {
      console.warn('⚠️ AWS SES not configured. Email would be sent to:', user_email)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AWS SES not configured. Please set AWS_ROLE_ARN or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare AWS SES credentials
    // Priority: AssumeRole (if ROLE_ARN + EXTERNAL_ID) > Access Keys
    let credentials
    
    if (awsRoleArn) {
      // Try to assume role using STS (requires initial credentials or OIDC)
      const awsExternalId = Deno.env.get('AWS_EXTERNAL_ID')
      
      if (awsExternalId) {
        try {
          // Import STS client for role assumption
          const { STSClient, AssumeRoleCommand } = await import('https://esm.sh/@aws-sdk/client-sts@3')
          
          // Create STS client with initial credentials (if available) or use default chain
          const stsClient = new STSClient({
            region: awsRegion,
            // If we have access keys, use them to assume the role
            // Otherwise, rely on default credential chain (e.g., from environment)
            credentials: (awsAccessKeyId && awsSecretAccessKey) ? {
              accessKeyId: awsAccessKeyId,
              secretAccessKey: awsSecretAccessKey,
            } : undefined,
          })
          
          // Assume the role
          const assumeRoleResponse = await stsClient.send(new AssumeRoleCommand({
            RoleArn: awsRoleArn,
            RoleSessionName: `supabase-edge-function-${Date.now()}`,
            ExternalId: awsExternalId,
            DurationSeconds: 3600, // 1 hour
          }))
          
          if (assumeRoleResponse.Credentials) {
            credentials = {
              accessKeyId: assumeRoleResponse.Credentials.AccessKeyId!,
              secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey!,
              sessionToken: assumeRoleResponse.Credentials.SessionToken!,
            }
            console.log('✅ Assumed AWS IAM role via STS')
          } else {
            throw new Error('Failed to assume role: No credentials returned')
          }
        } catch (stsError) {
          console.warn('⚠️ Failed to assume role, falling back to access keys:', stsError)
          // Fallback to access keys if role assumption fails
          if (awsAccessKeyId && awsSecretAccessKey) {
            credentials = {
              accessKeyId: awsAccessKeyId,
              secretAccessKey: awsSecretAccessKey,
            }
            console.log('✅ Using AWS SES access keys (fallback)')
          } else {
            throw new Error(`Failed to assume role and no access keys available: ${stsError instanceof Error ? stsError.message : 'Unknown error'}`)
          }
        }
      } else {
        // No external ID, use access keys directly
        if (awsAccessKeyId && awsSecretAccessKey) {
          credentials = {
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey,
          }
          console.log('✅ Using AWS SES access keys (no EXTERNAL_ID provided)')
        } else {
          throw new Error('AWS_ROLE_ARN set but no AWS_EXTERNAL_ID or access keys available')
        }
      }
    } else {
      // No role ARN, use access keys directly
      if (awsAccessKeyId && awsSecretAccessKey) {
        credentials = {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        }
        console.log('✅ Using AWS SES access keys')
      } else {
        throw new Error('No AWS credentials configured (need AWS_ROLE_ARN+EXTERNAL_ID or access keys)')
      }
    }

    // Create SES client
    const sesClient = new SESClient({
      region: awsRegion,
      credentials,
    })

    // Generate email content
    const htmlBody = generateReminderEmailBody(
      user_name,
      assessment_titles,
      dashboardUrl,
      user_email,
      expires
    )
    const textBody = generateReminderEmailText(
      user_name,
      assessment_titles,
      dashboardUrl,
      user_email,
      expires
    )

    const subject = assessment_titles.length > 1
      ? 'Reminder: Complete Your Assessments'
      : `Reminder: Complete Your Assessment - ${assessment_titles[0]}`

    // Send email
    const sendCommand = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [user_email],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    })

    const response = await sesClient.send(sendCommand)
    console.log(`✅ Reminder email sent to ${user_email} covering ${assignment_ids.length} assignment(s). Message ID: ${response.MessageId}`)

    await logReminderEmail({
      assignment_ids,
      recipient_email: user_email,
      subject,
      status: 'sent',
      provider_message_id: response.MessageId,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminder email sent successfully',
        messageId: response.MessageId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error sending reminder email:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    if (body?.user_email && Array.isArray(body?.assignment_ids) && body.assignment_ids.length > 0) {
      const titles = body.assessment_titles ?? []
      const failedSubject = titles.length > 1
        ? 'Reminder: Complete Your Assessments'
        : `Reminder: Complete Your Assessment - ${titles[0] ?? ''}`
      await logReminderEmail({
        assignment_ids: body.assignment_ids,
        recipient_email: body.user_email,
        subject: failedSubject,
        status: 'failed',
        error_message: errMsg,
      })
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: errMsg,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

