# Email Observability — SES Feedback Wiring + Capacity Reference

Operational reference for the email management dashboard. Two purposes:

1. **SES → SNS → webhook**: how feedback events reach `email_logs`.
2. **Capacity ceilings**: tested limits used by the dashboard's capacity panel.
   When infra changes, **update the constants in `src/lib/email/capacity-limits.ts`
   and the "last verified" date below**.

---

## SES feedback pipeline (production)

The pipeline already exists in AWS account `068732175988` (region `us-east-2`)
and was set up before this dashboard work began. Inventory:

| Resource | Name / ARN | Notes |
|---|---|---|
| Configuration set | `talent-assessment-ses-production-config` | Used by all production sends. Sends without it produce **no SNS events**. |
| SNS topic (bounces) | `arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-bounces` | Event destination wired |
| SNS topic (complaints) | `arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-complaints` | Event destination wired |
| SNS topic (deliveries) | `arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-deliveries` | Event destination wired |
| Staging analogues | `talent-assessment-ses-config` + `talent-assessment-ses-{bounces,complaints,deliveries}` | Same shape, no `-production-` suffix |

A second configuration set exists (`talent-assessment-ses-config`, the staging
counterpart). Production code paths must reference the production one.

### Subscribing the webhook

The three production topics initially had no subscribers — events were
published into the void. Subscribe one webhook to all three:

```bash
WEBHOOK=https://my.involvedtalent.com/api/webhooks/ses-feedback
PROFILE=sandbox-profile
REGION=us-east-2

for TOPIC in talent-assessment-ses-production-bounces \
             talent-assessment-ses-production-complaints \
             talent-assessment-ses-production-deliveries; do
  AWS_PROFILE=$PROFILE aws sns subscribe \
    --topic-arn arn:aws:sns:$REGION:068732175988:$TOPIC \
    --protocol https \
    --notification-endpoint "$WEBHOOK" \
    --region $REGION
done
```

The webhook auto-confirms subscriptions on first call. If `pending_confirmation`
stays true for more than a minute, the webhook is unreachable from SNS or the
deploy hasn't picked up the route yet.

### Required env vars (Vercel — production project)

```
SES_CONFIGURATION_SET=talent-assessment-ses-production-config
SES_FEEDBACK_TOPIC_ARNS=arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-bounces,arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-complaints,arn:aws:sns:us-east-2:068732175988:talent-assessment-ses-production-deliveries
```

For staging, swap `production-` out of the names.

### Smoke testing

SES provides simulator addresses that don't actually deliver. Send to:

- `bounce@simulator.amazonses.com` → triggers a permanent bounce (~seconds)
- `complaint@simulator.amazonses.com` → triggers a complaint event
- `success@simulator.amazonses.com` → success only (no bounce/complaint, but a
  Delivery event still fires)

After sending, check `email_logs.status` for the corresponding row:
- `bounced` with non-null `bounce_type`
- `complained` with non-null `complaint_type`
- `delivered` with non-null `delivered_at` (only for rows previously `sent`)

The original send row is keyed by SES `MessageId` (stored as
`provider_message_id`); the SNS event's `mail.messageId` is what the webhook
joins on.

### Webhook security model

Three-layer defense, all in `/api/webhooks/ses-feedback/route.ts`:

1. **SNS message signature** — `sns-validator` walks AWS's certificate chain.
   This is the primary auth. Without a valid signature, requests are rejected
   with 403.
2. **Topic ARN allowlist** — `SES_FEEDBACK_TOPIC_ARNS` env var. Even a
   correctly-signed message from another topic is rejected.
3. **MessageId idempotency** — `sns_deliveries` table dedupes envelope
   MessageIds. SNS retries on 5xx for hours; this prevents double-processing.

OIDC and IAM are **outbound only** (us → SES). They are not relevant for
inbound webhook authentication.

---

## Capacity ceilings — dashboard reference

These numbers feed the capacity panel and warning thresholds in the survey
dashboard. They are *tested* limits, not theoretical. Re-test if the underlying
infrastructure changes (e.g. AWS auth, Vercel plan, Supabase compute).

| Path | Tested ceiling | Bottleneck | Last verified |
|---|---|---|---|
| Batch assignment emails (one batch via `send-batch-email`) | ~450 parallel sends | STS `AssumeRoleWithWebIdentity` throttling at the AWS account level | 2026-04-29 |
| Reminder sends (one cron run via `send-reminders`) | ~500 sequential sends | Supabase function compute / runtime | 2026-04-29 |
| SES daily quota | 50,000/day at last check | Account-level SES limit; check `aws ses get-send-quota` | 2026-04-29 |

**When you upgrade infra:**
1. Re-run the canary harness (`scripts/canary.ts`) on staging, then production.
2. Update the limit in `src/lib/email/capacity-limits.ts`.
3. Update the row in this table.
4. Update the "last verified" date.

The dashboard tooltip surfaces these numbers verbatim, with a "last verified"
caveat. Drift is the failure mode: the constants and this doc are the only
sources of truth — there is no automatic capacity probe.

### Dashboard health classification

Computed live; **no derived health data is stored in the database**. Only the
raw events (`email_logs`, `sns_deliveries`) persist. Thresholds:

| State | Trigger |
|---|---|
| Red | Any complaint, hard-bounce rate >2%, send-failure rate >5% in the visible window |
| Yellow | Soft-bounce rate >5%, capacity utilization 50-100% of ceiling, send-failure rate 1-5% |
| Green | Everything else |
| Latency | Always shown, always labeled "informational, not a health signal" |

These are defaults; tune in code without migrations.

---

## Known infra-as-code gap

The Terraform in `infrastructure/` is **not** in sync with what's deployed to
AWS. `terraform plan` against the existing config tries to create resources
that already exist in production (OIDC providers, IAM roles, SES identities,
SMTP user). State has never been initialized; no remote backend is configured.

The SES feedback pipeline (config set, SNS topics, event destinations) lives
entirely outside Terraform. It was provisioned manually before this work.

**Implication:** changes to the SES feedback wiring should be done via AWS CLI
(or console) and documented here, not via `terraform apply`. Re-aligning the
TF state with reality is a separate effort: import every existing resource,
configure a remote backend, then add new resources through TF as normal.
