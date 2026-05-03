# Infrastructure State Audit & Migration Proposal

> **TL;DR** — AWS production resources for Involved Talent v2 are split across
> two unrelated Terraform state files, neither of which fully matches what's
> deployed. We're deferring the cleanup. To unblock the email observability
> feature for Craig's high-value campaign, we'll add the small remaining
> infrastructure (six SNS subscriptions) **via AWS CLI**, document each
> command precisely so a future TF migration can reconstruct it, and tackle
> the full IaC consolidation next week. See
> [`SES_FEEDBACK_CLI_RUNBOOK.md`](./SES_FEEDBACK_CLI_RUNBOOK.md).

---

## Where we're at

There are two Terraform state stories, neither healthy:

### State A — Legacy repo (`/Users/gus/Web/talent-assessment/infrastructure/`)

- **Backend**: S3 bucket `talent-assessment-terraform-state-1758896259`, key
  `infrastructure/terraform.tfstate`, region `us-east-2`, DynamoDB lock table
  `talent-assessment-terraform-locks`.
- **Resources tracked**: 107 (full v1 stack — VPC, EC2, ECS, ECR, S3 buckets,
  CloudFront, Secrets Manager, SES, OIDC providers, IAM, SNS).
- **Drift**: `terraform plan` would destroy ~10 resources whose `.tf` definitions
  are missing from the repo. The PDF/ECS service stack and a couple of IAM
  pieces were applied directly from local-only `.tf` files that were never
  committed. Files exist in `origin/feature/vercel-oidc-ses` for ~15 of the
  missing resources but were never merged to main; the PDF/ECS stack does not
  appear in any commit on any branch.
- **Last applied**: `2026-01-29`.

### State B — `involved-v2/infrastructure/` (this repo)

- **Backend**: None. State was kept in a local `terraform.tfstate` file by
  the developer who applied it. The local file is **lost or unrecoverable**.
- **Resources** the `.tf` files claim to manage (10 total):
  - 2 Vercel OIDC providers (`vercel_staging`, `vercel_production`)
  - 1 IAM role + 2 inline role policies (SES send / config)
  - 3 SES email identities (`noreply@`, `admin@`, `support@`)
  - 1 IAM user + 1 user policy (SMTP fallback)
- **Reality**: those resources were applied to AWS at some point. They exist
  today. With no state file, Terraform here can't see them — running
  `terraform apply` from this directory would attempt to **create** them and
  fail with "already exists" errors.

### How the two states overlap with reality

| AWS resource | Legacy state owns? | involved-v2 stub claims to own? |
|---|---|---|
| OIDC `oidc.vercel.com/jaylong255s-projects` | Yes (`vercel`) | Yes (`vercel_staging`) |
| OIDC `oidc.vercel.com/involved-talent` | No | Yes (`vercel_production`) |
| IAM role `talent-assessment-vercel-ses-role` | Yes (`vercel_ses_role`) | Yes (`vercel_ses_role`) |
| Inline role policies on the role (SES send/config) | No (legacy uses separate managed policy + attachment) | Yes (inline `ses_send`/`ses_config`) |
| SES `noreply@involvedtalent.com` | Yes (`production_test_emails["..."]` for_each) | Yes (`noreply`) |
| SES `admin@involvedtalent.com` | Yes (for_each) | Yes (`admin`) |
| SES `support@involvedtalent.com` | Yes (for_each) | Yes (`support`) |
| IAM user `ses-smtp-involvedtalent` | No | Yes (`ses_smtp_user`) |
| IAM user policy `AmazonSesSendingAccess` | No | Yes (`ses_smtp_send`) |
| 6 SNS topics (bounces/complaints/deliveries × staging+prod) | Yes | N/A |
| 2 SES configuration sets | Yes | N/A |
| 6 SES event destinations | Yes | N/A |
| 6 SNS topic subscriptions for our webhook | **Not deployed yet** | N/A |
| ECS PDF service stack (10 resources) | Yes (state) but no `.tf` definitions exist | N/A |
| Everything else (VPC, EC2, S3, CloudFront, Secrets, etc.) | Yes (~75 resources) | N/A |

## How this happened

Without assigning blame, the chain of events as best I can reconstruct:

1. The legacy `talent-assessment` repo was the original source of IaC for the
   v1 application. State was correctly stored in S3 from the beginning.
2. As v2 emerged, a small SES-related TF setup was added in
   `involved-v2/infrastructure/` to provision the OIDC + role + identities
   needed for v2's email path. The intent was a quick local apply with full
   migration to the legacy bucket "later." State was never moved to S3.
3. Some of the resources defined in v2's local TF — the IAM role, the SES
   email identities — were already managed by the legacy state under
   different addresses. This wasn't reconciled at the time.
4. PDF/ECS service work was applied to AWS directly from local-only `.tf`
   files that never reached any commit. State for those 10 resources lives
   only in the legacy state file.
5. The local state file in `involved-v2/infrastructure/` was eventually lost
   (machine wipe, not committed, gitignored, or just gone — the exact cause
   doesn't matter).

The result: AWS has 100+ resources, two state files don't agree on which one
manages what, and several resources are "double-claimed" or "unclaimed."

## Why we're deferring the cleanup

- **Time pressure**: Craig's Frontier 360 campaign is the survival-of-the-product
  use case. Email observability (bounce/complaint/delivery feedback) is a
  prerequisite for confidently running it. Cleanup of IaC is unrelated to the
  feature work and would burn days we don't have this week.
- **Risk profile**: A botched state migration could destroy the IAM role
  Vercel uses for SES, the OIDC providers, or the v1 stack still serving
  legacy users. Doing it under deadline pressure is exactly when mistakes
  happen.
- **Reversibility**: The CLI commands we're going to run are small,
  well-understood, individually reversible (each `aws sns subscribe` has a
  matching `aws sns unsubscribe`), and create no resources that overlap with
  either state file. They're safe to defer-codify.

## What we're doing instead, this week

See [`SES_FEEDBACK_CLI_RUNBOOK.md`](./SES_FEEDBACK_CLI_RUNBOOK.md) for the
exact commands. Summary:

1. Subscribe our webhook URL (per environment) to the six existing SNS topics.
2. Set `SES_CONFIGURATION_SET` and `SES_FEEDBACK_TOPIC_ARNS` env vars in
   Vercel for both staging and production.
3. Deploy [PR #280](https://github.com/Cyberworld-builders/involved-v2/pull/280)
   so the webhook is reachable before the subscriptions arrive.
4. Smoke test against SES simulator addresses.

These steps create exactly **six new resources in AWS**: six
`aws_sns_topic_subscription` resources. Nothing else changes. Each subscription
is tied to a topic that already exists in legacy state, so we're not
introducing new orphans — we're adding to the orphan list intentionally,
fully documented.

## Migration plan for next week

A separate Github issue will track the full migration. Outline:

### Phase 1 — Reconcile legacy state with reality

1. Cherry-pick `cloudwatch.tf`, `vercel-oidc.tf`, `supabase-oidc.tf` from
   `origin/feature/vercel-oidc-ses` into the legacy repo's main, validate
   they exactly match deployed state.
2. Reconstruct the 10 PDF/ECS resources from `terraform state show` into new
   `.tf` files in legacy. Use `lifecycle { ignore_changes = [container_definitions] }`
   on the ECS task definition to avoid round-trip JSON drift.
3. Iterate `terraform plan` until it reports "0 to add, 0 to change, 0 to
   destroy."

### Phase 2 — Migrate state to involved-v2

1. Configure new S3 backend in `involved-v2/infrastructure/versions.tf`:
   same bucket `talent-assessment-terraform-state-1758896259`, new key
   `involved-v2/terraform.tfstate`, same lock table.
2. Reconstruct `.tf` files in involved-v2/infrastructure for **every**
   resource currently in legacy state (107 + the new 6 subscriptions). Use
   the legacy `.tf` as the starting point.
3. For each resource: `terraform import <addr> <id>` into the new state.
4. Plan = "no changes."

### Phase 3 — Decommission legacy IaC

1. In legacy repo: rename `infrastructure/backend.tf` →
   `backend.tf.DECOMMISSIONED` so `terraform init` fails noisily.
2. Add `infrastructure/DECOMMISSIONED.md` at the top of legacy infrastructure
   pointing at involved-v2 as canonical.
3. Tighten S3 bucket policy on the legacy state key (`infrastructure/terraform.tfstate`)
   to deny writes. Belt-and-suspenders against accidental apply from another
   workstation.
4. Optional: keep the legacy state file in S3 indefinitely as historical
   reference; it's cheap.

### Phase 4 — Reverse-engineer the CLI work into TF

The CLI runbook documents each command and the corresponding TF resource it
should map to. Use it as a checklist when reconstructing TF for the
subscriptions.

## Lessons baked into the migrated setup

- **No local state** for any TF instantiation, ever. Every backend block
  uses S3 + DynamoDB locking from day one.
- **No "we'll migrate later" stubs.** A separate state file with no path to
  consolidation is exactly how this happened. New IaC either lives in the
  shared state from the start, or doesn't exist.
- **Resources have one owner.** No two state files manage the same AWS
  resource. The migration audit will explicitly cross-check.
- **Drift detection in CI.** A scheduled job runs `terraform plan` weekly
  and pages on non-zero diffs. Catches "applied locally, never committed"
  earlier.
