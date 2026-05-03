# Ship SES Feedback Pipeline via AWS CLI

> Scope: subscribe the involved-v2 webhook to the six existing SES feedback
> SNS topics so SES bounce/complaint/delivery events reach the application.
> See [`STATE_AND_MIGRATION_PROPOSAL.md`](./STATE_AND_MIGRATION_PROPOSAL.md)
> for why we're using CLI instead of Terraform this week.
>
> Total AWS resources created: **six** (`aws_sns_topic_subscription`).
> Reversible via `aws sns unsubscribe`. No resource creates anything that
> overlaps with either Terraform state file.
>
> All commands run against AWS account `068732175988` in region `us-east-2`.

---

## Pre-requisites

1. **AWS SSO logged in** with the production profile. The profile is
   confusingly named `sandbox-profile` in `~/.aws/config`, but it points to
   the production Involved Talent account:
   ```bash
   aws sso login --profile sandbox-profile
   aws sts get-caller-identity --profile sandbox-profile
   # Account: 068732175988
   ```
2. **PR #280 merged and deployed** to *both* production and staging Vercel
   projects. The webhook URLs must respond before the subscriptions are
   created — SNS will deliver a `SubscriptionConfirmation` immediately and
   the webhook auto-confirms by GETing the embedded `SubscribeURL`.
3. **Vercel env vars set** (see "Vercel env vars" section below) before
   deploy, so sends actually flow events into SNS in the first place.

---

## Vercel env vars

Set in the **production** Vercel project (`involved-talent` team):

| Variable | Value |
|---|---|
| `SES_CONFIGURATION_SET` | `talent-assessment-ses-production-config` |
| `SES_FEEDBACK_TOPIC_ARNS` | `arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-bounces,arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-complaints,arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-deliveries` |

Set in the **staging** Vercel project (`jaylong255s-projects` team):

| Variable | Value |
|---|---|
| `SES_CONFIGURATION_SET` | `talent-assessment-ses-config` |
| `SES_FEEDBACK_TOPIC_ARNS` | `arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-bounces,arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-complaints,arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-deliveries` |

Apply to **Production**, **Preview**, and **Development** scopes in each
Vercel project. Trigger a redeploy after setting them.

---

## CLI commands — review before running

Each command below has:
- **Purpose**: what it does
- **Command**: copy-paste ready
- **Expected output**: what success looks like
- **Future TF mapping**: the resource block this becomes when we migrate

### 0 — Verify webhooks are reachable

Before subscribing, confirm both webhook URLs respond. If these 404, fix the
deploy first or the auto-confirmation will silently fail.

```bash
curl -i https://my.involvedtalent.com/api/webhooks/ses-feedback
curl -i https://involved-v2.cyberworldbuilders.dev/api/webhooks/ses-feedback
# Expect: HTTP/2 200, JSON body { "status": "ok", "endpoint": "ses-feedback" }
```

### 1 — Subscribe production webhook to bounces

**Purpose**: SES emits Bounce events for production sends, SNS publishes to
the `*-production-bounces` topic, and SNS delivers each event to our webhook.

**Command**:
```bash
aws sns subscribe \
  --profile sandbox-profile \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-bounces \
  --protocol https \
  --notification-endpoint https://my.involvedtalent.com/api/webhooks/ses-feedback \
  --return-subscription-arn
```

**Expected output**:
```json
{
    "SubscriptionArn": "arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-bounces:<uuid>"
}
```

If the SubscriptionArn is `pending confirmation`, our webhook didn't
auto-confirm. Check Vercel logs for `[ses-feedback] Subscription confirmed`
within 60 seconds. If absent, the webhook is unreachable from SNS.

**Future TF mapping**:
```hcl
resource "aws_sns_topic_subscription" "involved_v2_prod_bounces" {
  topic_arn              = aws_sns_topic.ses_production_bounces.arn
  protocol               = "https"
  endpoint               = "https://my.involvedtalent.com/api/webhooks/ses-feedback"
  endpoint_auto_confirms = true
  raw_message_delivery   = false
}
```

### 2 — Subscribe production webhook to complaints

**Command**:
```bash
aws sns subscribe \
  --profile sandbox-profile \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-complaints \
  --protocol https \
  --notification-endpoint https://my.involvedtalent.com/api/webhooks/ses-feedback \
  --return-subscription-arn
```

**Future TF mapping**:
```hcl
resource "aws_sns_topic_subscription" "involved_v2_prod_complaints" {
  topic_arn              = aws_sns_topic.ses_production_complaints.arn
  protocol               = "https"
  endpoint               = "https://my.involvedtalent.com/api/webhooks/ses-feedback"
  endpoint_auto_confirms = true
  raw_message_delivery   = false
}
```

### 3 — Subscribe production webhook to deliveries

**Command**:
```bash
aws sns subscribe \
  --profile sandbox-profile \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-deliveries \
  --protocol https \
  --notification-endpoint https://my.involvedtalent.com/api/webhooks/ses-feedback \
  --return-subscription-arn
```

**Future TF mapping**:
```hcl
resource "aws_sns_topic_subscription" "involved_v2_prod_deliveries" {
  topic_arn              = aws_sns_topic.ses_production_deliveries.arn
  protocol               = "https"
  endpoint               = "https://my.involvedtalent.com/api/webhooks/ses-feedback"
  endpoint_auto_confirms = true
  raw_message_delivery   = false
}
```

### 4-6 — Subscribe staging webhook to bounces, complaints, deliveries

**Commands** (three subscriptions to three staging topics):
```bash
aws sns subscribe \
  --profile sandbox-profile \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-bounces \
  --protocol https \
  --notification-endpoint https://involved-v2.cyberworldbuilders.dev/api/webhooks/ses-feedback \
  --return-subscription-arn

aws sns subscribe \
  --profile sandbox-profile \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-complaints \
  --protocol https \
  --notification-endpoint https://involved-v2.cyberworldbuilders.dev/api/webhooks/ses-feedback \
  --return-subscription-arn

aws sns subscribe \
  --profile sandbox-profile \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-deliveries \
  --protocol https \
  --notification-endpoint https://involved-v2.cyberworldbuilders.dev/api/webhooks/ses-feedback \
  --return-subscription-arn
```

**Future TF mapping** (three resources, addresses
`involved_v2_staging_bounces`, `involved_v2_staging_complaints`,
`involved_v2_staging_deliveries`, identical pattern to production but
pointing at the staging topics + URL).

---

## Verification

### Confirm subscriptions are active

```bash
for TOPIC in talent-assessment-ses-production-bounces \
             talent-assessment-ses-production-complaints \
             talent-assessment-ses-production-deliveries \
             talent-assessment-ses-bounces \
             talent-assessment-ses-complaints \
             talent-assessment-ses-deliveries; do
  echo "=== $TOPIC ==="
  aws sns list-subscriptions-by-topic \
    --profile sandbox-profile \
    --region us-east-2 \
    --topic-arn arn:aws:sns:us-east-2:068732175988:$TOPIC \
    --query 'Subscriptions[*].[Endpoint,SubscriptionArn]' \
    --output table
done
```

Each topic should show one subscription with a SubscriptionArn that's a UUID
(not the literal string `PendingConfirmation`).

### Smoke test — production

Send to SES simulator addresses from the production app environment. These
do not deliver to a real mailbox but trigger real Bounce / Complaint /
Delivery events.

| Simulator | Triggers |
|---|---|
| `bounce@simulator.amazonses.com` | Bounce (Permanent / General) |
| `complaint@simulator.amazonses.com` | Delivery, then Complaint a few seconds later |
| `success@simulator.amazonses.com` | Delivery only |

After ~10 seconds, check `email_logs` for the recipient:

```sql
SELECT recipient_email, status, bounce_type, complaint_type,
       delivered_at, feedback_received_at
FROM email_logs
WHERE recipient_email LIKE '%simulator.amazonses.com'
ORDER BY sent_at DESC
LIMIT 10;
```

Expected: rows transitioning from `sent` → `bounced` / `complained` /
`delivered` with appropriate sub-fields populated. If `status` stays at
`sent`, either the configuration set isn't being included in the send
(check `SES_CONFIGURATION_SET` env var), or the webhook isn't receiving
events (check Vercel logs for `[ses-feedback]`).

### Smoke test — staging

Same procedure against the staging environment. Verify on the staging
Supabase instance.

---

## Rollback / unsubscribe

If you need to remove a subscription (e.g., webhook URL changes, project
gets archived, or you're cleaning up before a TF migration):

```bash
# List subscriptions on a topic
aws sns list-subscriptions-by-topic \
  --profile sandbox-profile \
  --region us-east-2 \
  --topic-arn <topic-arn> \
  --query 'Subscriptions[*].SubscriptionArn'

# Unsubscribe (use the returned SubscriptionArn)
aws sns unsubscribe \
  --profile sandbox-profile \
  --region us-east-2 \
  --subscription-arn <subscription-arn>
```

Subscriptions in `PendingConfirmation` cannot be unsubscribed by ARN — they
expire automatically after 3 days, or you can delete them via the AWS console.

---

## Reverse-engineering into Terraform (next week)

When migrating this work into `involved-v2/infrastructure/`:

1. The SNS topics, configuration sets, and event destinations these
   subscribe to are already in legacy TF state. They'll be carried over
   during Phase 1+2 of the migration plan in `STATE_AND_MIGRATION_PROPOSAL.md`.
2. The six subscriptions become six `aws_sns_topic_subscription` resources
   (HCL provided in each section above).
3. Use `terraform import aws_sns_topic_subscription.<name> <subscription-arn>`
   for each. Subscription ARNs available from the `list-subscriptions-by-topic`
   command in the verification section.
4. After import, `terraform plan` should report no changes. Webhook URLs may
   become a variable (`var.involved_v2_webhook_url_production` and
   `_staging`) at that point.

No CLI step in this runbook creates anything that conflicts with the
existing legacy state or with what the migrated involved-v2 state will
manage — these are pure additions.
