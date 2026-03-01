import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SESClient, SendEmailCommand } from 'https://esm.sh/@aws-sdk/client-ses@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderEmailRequest {
  assignment_id: string
  user_email: string
  user_name: string
  user_username: string
  assessment_title: string
  assignment_url: string
  reminder_frequency: string
}

/**
 * Format reminder frequency for display
 */
function formatFrequency(frequency: string): string {
  if (frequency === '+1 week') return '1 week'
  if (frequency === '+2 weeks') return '2 weeks'
  if (frequency === '+3 weeks') return '3 weeks'
  if (frequency === '+1 month') return '1 month'
  return frequency
}

/**
 * Generate reminder email HTML body
 * Uses inline styles on the button for Outlook compatibility; includes raw URL and dashboard link.
 */
function generateReminderEmailBody(
  userName: string,
  assessmentTitle: string,
  assignmentUrl: string,
  frequency: string,
  dashboardUrl: string
): string {
  const formattedFrequency = formatFrequency(frequency)

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
              <h2 style="margin: 0; font-size: 20px; color: #ffffff;">Reminder: Complete Your Assessment</h2>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 20px;">
              <p style="margin: 0 0 16px 0;">Hello ${userName},</p>
              <p style="margin: 0 0 16px 0;">This is a friendly reminder that you have an incomplete assessment assignment:</p>
              <p style="margin: 0 0 16px 0;"><strong>${assessmentTitle}</strong></p>
              <p style="margin: 0 0 16px 0;">Please complete this assessment at your earliest convenience.</p>
              <!-- Bulletproof Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #4F46E5; border-radius: 4px;">
                    <a href="${assignmentUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Complete Assessment</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0;">You will receive reminders every ${formattedFrequency} until this assessment is completed.</p>
              <p style="margin: 0 0 16px 0;">You can also access your dashboard: <a href="${dashboardUrl}" style="color: #4F46E5; text-decoration: underline;">${dashboardUrl}</a></p>
              <!-- Fallback URL -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; border-top: 1px solid #dddddd;">
                <tr>
                  <td style="padding-top: 16px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666;">If the button above doesn't work, copy and paste this link into your browser:</p>
                    <p style="margin: 0; font-size: 12px; color: #666666; word-break: break-all;">${assignmentUrl}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 20px; border-top: 1px solid #dddddd;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666;">If you have any questions, please contact your administrator.</p>
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
  assessmentTitle: string,
  assignmentUrl: string,
  frequency: string,
  dashboardUrl: string
): string {
  const formattedFrequency = formatFrequency(frequency)
  
  return `
Reminder: Complete Your Assessment

Hello ${userName},

This is a friendly reminder that you have an incomplete assessment assignment:

${assessmentTitle}

Please complete this assessment at your earliest convenience.

Access your assessment here: ${assignmentUrl}

If the link doesn't work, copy and paste the URL above into your browser.

You will receive reminders every ${formattedFrequency} until this assessment is completed.

You can also open your dashboard to see all your assignments: ${dashboardUrl}

If you have any questions, please contact your administrator.

This is an automated reminder email.
  `.trim()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: ReminderEmailRequest = await req.json()
    const {
      user_email,
      user_name,
      assessment_title,
      assignment_url,
      reminder_frequency,
    } = body

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
      assessment_title,
      assignment_url,
      reminder_frequency,
      dashboardUrl
    )
    const textBody = generateReminderEmailText(
      user_name,
      assessment_title,
      assignment_url,
      reminder_frequency,
      dashboardUrl
    )

    // Send email
    const sendCommand = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [user_email],
      },
      Message: {
        Subject: {
          Data: `Reminder: Complete Your Assessment - ${assessment_title}`,
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
    console.log(`✅ Reminder email sent to ${user_email}. Message ID: ${response.MessageId}`)

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
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

