import { NextRequest, NextResponse } from 'next/server'

interface SendEmailRequest {
  to: string
  toName: string
  username?: string
  subject: string
  body: string
  assignments: Array<{
    assessmentTitle: string
    url?: string | null
  }>
  expirationDate: string
}

/**
 * Replace shortcodes in email body with actual values
 */
function replaceShortcodes(
  body: string,
  name: string,
  username: string,
  email: string,
  assessments: string,
  expirationDate: string
): string {
  return body
    .replace(/{name}/g, name)
    .replace(/{username}/g, username)
    .replace(/{email}/g, email)
    .replace(/{assessments}/g, assessments)
    .replace(/{expiration-date}/g, expirationDate)
}

/**
 * Format expiration date for display
 */
function formatExpirationDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Send assignment email via API route
 * This is a placeholder - you'll need to integrate with an email service
 * like Resend, SendGrid, AWS SES, or similar
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json()
    const { to, toName, username: providedUsername, subject, body: emailBody, assignments, expirationDate } = body

    // Format assessments list
    const assessmentsList = assignments
      .map((a) => `- ${a.assessmentTitle}`)
      .join('\n')

    // Format expiration date
    const formattedExpiration = formatExpirationDate(expirationDate)

    // Use provided username or derive from email
    const username = providedUsername || to.split('@')[0]

    // Replace shortcodes in email body
    const processedBody = replaceShortcodes(
      emailBody,
      toName,
      username,
      to,
      assessmentsList,
      formattedExpiration
    )

    // Note: processedBody is used directly in email (HTML conversion would happen in email service)
    // The body is already processed with template replacements above

    // TODO: Integrate with email service (Resend, SendGrid, AWS SES, etc.)
    // For now, we'll log the email and return success
    // In production, replace this with actual email sending logic
    
    console.log('📧 Email to send:')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Body:', processedBody)
    
    // NOTE: In production, uncomment and configure one of the email services below
    // The email is currently being logged but not actually sent

    // Example: Using Resend (uncomment and configure when ready)
    /*
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: to,
      subject: subject,
      html: processedBody.replace(/\n/g, '<br>'),
    })

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }
    */

    // Example: Using AWS SES (uncomment and configure when ready)
    /*
    const ses = new AWS.SES({
      region: process.env.AWS_SES_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
      },
    })

    const params = {
      Source: process.env.EMAIL_FROM || 'noreply@example.com',
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: processedBody.replace(/\n/g, '<br>'),
            Charset: 'UTF-8',
          },
        },
      },
    }

    await ses.sendEmail(params).promise()
    */

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      },
      { status: 500 }
    )
  }
}

