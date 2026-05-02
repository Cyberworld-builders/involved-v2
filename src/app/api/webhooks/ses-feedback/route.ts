import { NextRequest, NextResponse } from 'next/server'
import MessageValidator from 'sns-validator'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/webhooks/ses-feedback
 *
 * Receives SNS-delivered SES events (Bounce | Complaint | Delivery) and updates
 * the corresponding email_logs row by SES MessageId. Authenticates each request
 * by validating the SNS message signature against AWS's published certificate
 * chain — this is the primary auth mechanism. SNS is a public HTTPS endpoint
 * by design; the signature is what proves a request is legitimately from AWS.
 *
 * Defense in depth:
 *   1. SNS message signature validation (sns-validator)
 *   2. TopicArn allowlist via SES_FEEDBACK_TOPIC_ARN env var
 *   3. Idempotency on SNS MessageId (sns_deliveries table dedupes retries)
 *   4. Auto-confirm SubscriptionConfirmation by GETing the SubscribeURL
 *
 * Returns 200 quickly for all valid messages — SNS retries on 5xx for hours,
 * which would amplify any transient downstream failure.
 */

interface SnsEnvelope {
  Type: 'SubscriptionConfirmation' | 'Notification' | 'UnsubscribeConfirmation'
  MessageId: string
  TopicArn: string
  Message: string
  Timestamp: string
  SignatureVersion: string
  Signature: string
  SigningCertURL: string
  SubscribeURL?: string
  Token?: string
}

interface SesEvent {
  eventType?: string
  notificationType?: string
  mail?: {
    messageId?: string
    timestamp?: string
  }
  bounce?: {
    bounceType?: string
    bounceSubType?: string
    timestamp?: string
  }
  complaint?: {
    complaintFeedbackType?: string
    timestamp?: string
  }
  delivery?: {
    timestamp?: string
  }
}

const validator = new MessageValidator()

function validateEnvelope(envelope: SnsEnvelope): Promise<void> {
  return new Promise((resolve, reject) => {
    validator.validate(envelope as unknown as Record<string, unknown>, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export async function POST(request: NextRequest) {
  let envelope: SnsEnvelope
  try {
    envelope = (await request.json()) as SnsEnvelope
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 1. Signature validation — rejects spoofed messages.
  try {
    await validateEnvelope(envelope)
  } catch (err) {
    console.error('[ses-feedback] SNS signature validation failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  // 2. TopicArn allowlist — rejects messages from any topic but ours.
  // Production wires three topics (bounces, complaints, deliveries) to one
  // configuration set. Allow a comma-separated allowlist so a single webhook
  // serves all three.
  const allowed = (process.env.SES_FEEDBACK_TOPIC_ARNS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (allowed.length > 0 && !allowed.includes(envelope.TopicArn)) {
    console.warn(`[ses-feedback] Unexpected TopicArn: ${envelope.TopicArn}`)
    return NextResponse.json({ error: 'Unexpected topic' }, { status: 403 })
  }

  // 3. Idempotency — SNS retries; dedupe on envelope MessageId.
  const adminClient = createAdminClient()
  const { error: dedupeErr } = await adminClient
    .from('sns_deliveries')
    .insert({ message_id: envelope.MessageId, topic_arn: envelope.TopicArn, type: envelope.Type })
  if (dedupeErr) {
    // Unique-key violation = SNS retry; treat as success.
    if ((dedupeErr as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, deduplicated: true })
    }
    console.error('[ses-feedback] sns_deliveries insert failed:', dedupeErr)
    // Don't 500 — SNS will retry forever and we'll still have lost the event.
    // Log and proceed; worst case we double-process if the dedupe insert itself
    // races, which is harmless because the event update is also idempotent.
  }

  // 4. SubscriptionConfirmation — auto-confirm by GETing SubscribeURL.
  if (envelope.Type === 'SubscriptionConfirmation') {
    if (!envelope.SubscribeURL) {
      return NextResponse.json({ error: 'Missing SubscribeURL' }, { status: 400 })
    }
    try {
      const confirm = await fetch(envelope.SubscribeURL, { method: 'GET' })
      if (!confirm.ok) {
        console.error(`[ses-feedback] SubscribeURL returned ${confirm.status}`)
        return NextResponse.json({ error: 'Confirmation failed' }, { status: 502 })
      }
      console.log(`[ses-feedback] Subscription confirmed for ${envelope.TopicArn}`)
      return NextResponse.json({ ok: true, confirmed: true })
    } catch (err) {
      console.error('[ses-feedback] Confirmation request failed:', err)
      return NextResponse.json({ error: 'Confirmation request failed' }, { status: 502 })
    }
  }

  if (envelope.Type === 'UnsubscribeConfirmation') {
    // Unexpected outside operator action — log and ack.
    console.warn(`[ses-feedback] Unsubscribe received for ${envelope.TopicArn}`)
    return NextResponse.json({ ok: true })
  }

  // 5. Notification — parse SES event from inner Message and update email_logs.
  let event: SesEvent
  try {
    event = JSON.parse(envelope.Message) as SesEvent
  } catch {
    console.error('[ses-feedback] Failed to parse Message JSON')
    return NextResponse.json({ error: 'Invalid Message JSON' }, { status: 400 })
  }

  const sesMessageId = event.mail?.messageId
  if (!sesMessageId) {
    console.warn('[ses-feedback] Event missing mail.messageId; nothing to correlate')
    return NextResponse.json({ ok: true, note: 'no messageId' })
  }

  const eventType = event.eventType || event.notificationType
  const update: Record<string, unknown> = {
    feedback_received_at: new Date().toISOString(),
    feedback_raw: event,
  }

  switch (eventType) {
    case 'Bounce':
      update.status = 'bounced'
      update.bounce_type = event.bounce?.bounceType ?? null
      update.bounce_subtype = event.bounce?.bounceSubType ?? null
      break
    case 'Complaint':
      update.status = 'complained'
      update.complaint_type = event.complaint?.complaintFeedbackType ?? null
      break
    case 'Delivery':
      // Don't overwrite a terminal status (bounced/complained). Filter the
      // update to rows currently in 'sent', and advance them to 'delivered'.
      update.status = 'delivered'
      update.delivered_at = event.delivery?.timestamp || new Date().toISOString()
      break
    default:
      console.warn(`[ses-feedback] Unhandled event type: ${eventType}`)
      return NextResponse.json({ ok: true, note: `unhandled type ${eventType}` })
  }

  let q = adminClient.from('email_logs').update(update).eq('provider_message_id', sesMessageId)
  if (eventType === 'Delivery') q = q.eq('status', 'sent')

  const { error: updateErr } = await q.select('id')
  if (updateErr) {
    console.error('[ses-feedback] email_logs update failed:', updateErr)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, eventType })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'ses-feedback' })
}
