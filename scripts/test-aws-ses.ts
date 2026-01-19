/**
 * Test script to verify AWS SES credentials and send a test email
 * Run with: npx tsx scripts/test-aws-ses.ts
 */

import { SESClient, SendEmailCommand, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses'

// Load environment variables from .env files (try multiple files)
import { config } from 'dotenv'
import { resolve } from 'path'

// Try .env.vercel first (where AWS credentials are), then .env.local
config({ path: resolve(process.cwd(), '.env.vercel') })
config({ path: resolve(process.cwd(), '.env.local') })

// Try both naming conventions and trim whitespace (env vars can have trailing newlines)
const accessKeyId = (process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID)?.trim()
const secretAccessKey = (process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)?.trim()
const region = (process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1').trim()
const fromEmail = (process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL || process.env.SMTP_FROM)?.trim()
const testEmail = (process.env.TEST_EMAIL || 'test@example.com').trim()

async function testAWSCredentials() {
  console.log('🔍 Testing AWS SES Configuration...\n')
  
  // Check if credentials are provided
  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ AWS SES credentials not found!')
    console.log('Required environment variables (use either naming convention):')
    console.log('  - AWS_SES_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID')
    console.log('  - AWS_SES_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY')
    console.log('Optional:')
    console.log('  - AWS_SES_REGION or AWS_REGION (default: us-east-1)')
    console.log('  - EMAIL_FROM or AWS_SES_FROM_EMAIL or SMTP_FROM')
    console.log('  - TEST_EMAIL (default: test@example.com)')
    console.log('\nNote: Credentials are loaded from .env.local file')
    process.exit(1)
  }

  console.log('✅ Credentials found:')
  console.log(`   Access Key ID: ${accessKeyId.substring(0, 8)}...`)
  console.log(`   Region: ${region}`)
  console.log(`   From Email: ${fromEmail || 'NOT SET'}`)
  console.log(`   Test Email: ${testEmail}\n`)

  // Create SES client
  const sesClient = new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  try {
    // Test 1: Verify credentials by checking identity verification
    console.log('📧 Test 1: Verifying credentials...')
    if (fromEmail) {
      try {
        const verifyCommand = new GetIdentityVerificationAttributesCommand({
          Identities: [fromEmail],
        })
        const verifyResponse = await sesClient.send(verifyCommand)
        const verificationStatus = verifyResponse.VerificationAttributes?.[fromEmail]?.VerificationStatus
        
        if (verificationStatus === 'Success') {
          console.log(`   ✅ From email "${fromEmail}" is verified in SES\n`)
        } else if (verificationStatus === 'Pending') {
          console.log(`   ⚠️  From email "${fromEmail}" is pending verification\n`)
        } else {
          console.log(`   ⚠️  From email "${fromEmail}" verification status: ${verificationStatus || 'Unknown'}\n`)
        }
      } catch (error) {
        console.log(`   ⚠️  Could not check verification status: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
      }
    }

    // Test 2: Send a test email
    if (!fromEmail) {
      console.log('⚠️  EMAIL_FROM not set, skipping email send test')
      console.log('   Set EMAIL_FROM or AWS_SES_FROM_EMAIL to test email sending\n')
      process.exit(0)
    }

    // Use fromEmail as test recipient if testEmail is the default (since fromEmail should be verified)
    const recipientEmail = testEmail === 'test@example.com' ? fromEmail : testEmail
    
    console.log('📧 Test 2: Sending test email...')
    console.log(`   From: ${fromEmail}`)
    console.log(`   To: ${recipientEmail}`)
    console.log(`   ${recipientEmail === fromEmail ? '(Using from email as recipient since it should be verified)' : ''}\n`)
    
    const sendCommand = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: 'Test Email from Involved V2',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <html>
                <body>
                  <h2>Test Email from Involved V2</h2>
                  <p>This is a test email to verify AWS SES configuration.</p>
                  <p>If you received this email, your AWS SES setup is working correctly!</p>
                  <hr>
                  <p style="color: #666; font-size: 12px;">
                    Sent at: ${new Date().toISOString()}<br>
                    Region: ${region}
                  </p>
                </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `Test Email from Involved V2\n\nThis is a test email to verify AWS SES configuration.\n\nIf you received this email, your AWS SES setup is working correctly!\n\nSent at: ${new Date().toISOString()}\nRegion: ${region}`,
            Charset: 'UTF-8',
          },
        },
      },
    })

    const response = await sesClient.send(sendCommand)
    console.log('   ✅ Email sent successfully!')
    console.log(`   Message ID: ${response.MessageId}\n`)
    console.log('🎉 AWS SES is configured and working correctly!\n')
    
  } catch (error) {
    console.error('❌ Error:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Name:', error.name)
      
      // Common error messages
      if (error.message.includes('InvalidParameterValue')) {
        console.error('\n   💡 Tip: The email address may not be verified in SES')
      } else if (error.message.includes('AccessDenied')) {
        console.error('\n   💡 Tip: Check IAM permissions for SES')
      } else if (error.message.includes('InvalidClientTokenId')) {
        console.error('\n   💡 Tip: Check AWS credentials are correct')
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        console.error('\n   💡 Tip: Check AWS secret access key is correct')
      }
    }
    process.exit(1)
  }
}

testAWSCredentials()

