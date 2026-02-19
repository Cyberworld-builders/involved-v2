# Next.js ECS AWS Deployment Plan

Deploy the involved-v2 Next.js app to AWS ECS on the existing talent-assessment ECS cluster (Fargate), add an ALB with a new target group and listener, and use the same Supabase backend. Single task for now; no existing ALB in Terraform so ALB + TG + listener will be created.

**Status:** Plan only. Execute when ready.

---

## Current state

- **involved-v2**: Next.js app; infra in `involved-v2/infrastructure` is **SES only** (IAM user, access key); no ECS/ALB.
- **talent-assessment**: Has VPC, single public subnet (us-east-2a), EC2 (Laravel + Traefik), **ECS cluster** `talent-assessment-pdf-cluster`, and **PDF service** (Fargate, no ALB). Account 068732175988, region us-east-2. See `talent-assessment/infrastructure/main.tf` (lines 967–1123).
- **ALB**: Not present in Terraform. `talent-assessment/infrastructure/INFRASTRUCTURE_PLAN.md` describes a planned ALB but it was never added. We **create** ALB + target group + listener for the Next.js app.

## Where to put Terraform

**Recommendation: add all new resources in talent-assessment infra.**

- Reuses existing cluster, VPC, subnet(s), and IAM patterns (execution/task roles, log group).
- Single Terraform state; one `terraform apply` for cluster + PDF + Next.js + ALB.
- `pdf_app_url` in `talent-assessment/infrastructure/terraform.tfvars` can stay as-is until cutover, then set to the new ALB URL (or custom domain) so the PDF service keeps hitting the correct report view.

**Alternative:** Keep infra in involved-v2 repo and use the same AWS account (TalentAdmin) with `data` sources for `aws_ecs_cluster`, `aws_vpc`, `aws_subnet`; then add ALB, ECR, task definition, and service in involved-v2. Same end result, infra split across two repos.

---

## 1. ALB requirement: second subnet

ALB needs **2 subnets in different AZs**. Today there is only one public subnet (`aws_subnet.dev_subnet` in `var.availability_zone`).

- Add a second public subnet (e.g. `10.0.2.0/24` in `us-east-2b`), same route table and IGW, and use `[aws_subnet.dev_subnet.id, aws_subnet.dev_subnet_2.id]` for the ALB `subnets` argument.

## 2. Application Load Balancer + target group + listener

- **ALB**: New `aws_lb` (application, internet-facing), in the two public subnets, with a security group allowing 80 (and 443 if you add HTTPS later).
- **Target group**: `aws_lb_target_group` for the Next.js app:
  - `target_type = "ip"` (Fargate).
  - `port = 3000`.
  - `vpc_id = aws_vpc.dev_vpc.id`.
  - Health check: `path = "/api/health"`, `matcher = "200"`, reasonable interval/timeout/thresholds (e.g. 30s interval, 5s timeout, 2 healthy / 2 unhealthy).
- **Listener**: `aws_lb_listener` on port 80, `default_action` forward to this target group. (Optional later: second listener on 443 with ACM cert and same target group.)

No existing ALB to attach to; this is a new ALB dedicated to the Next.js app (or add more target groups/listener rules later if you want one ALB for multiple apps).

## 3. Security groups

- **ALB SG**: Ingress 80 (and 443 if needed) from `0.0.0.0/0`; egress all (or to VPC + HTTPS).
- **Next.js tasks SG**: Ingress only from the ALB security group on port 3000; egress 80/443 (and 0–65535 if you prefer) for Supabase, ECR, etc. Same pattern as talent-assessment `INFRASTRUCTURE_PLAN.md` “ECS Security Group” but for port 3000.

## 4. Next.js app: Docker and standalone build

- **Dockerfile** (in involved-v2 root or `app/`): Multi-stage build:
  - Stage 1: `node:20` (or 20-slim), copy `package*.json`, `npm ci`, copy app, run `npm run build` (with `output: 'standalone'`).
  - Stage 2: minimal image (e.g. `node:20-alpine`), copy only `standalone` output and `node_modules/.cache` if needed, expose 3000, `CMD ["node", "server.js"]` (or the path Next gives in `.next/standalone`).
  - Build for linux/amd64: `docker build --platform linux/amd64 ...`.
- **next.config.ts**: Add `output: 'standalone'` so the build produces a self-contained server. Required for ECS.

## 5. Health endpoint

ALB and ECS health checks need a stable route. Next.js has no `/health` today.

- Add **GET** `src/app/api/health/route.ts` returning `NextResponse.json({ ok: true }, { status: 200 })`. Use this path in both the target group health check and the ECS task container `healthCheck` (e.g. `curl -f http://localhost:3000/api/health`).

## 6. ECR repository for Next.js

- New `aws_ecr_repository` (e.g. `involved-v2-nextjs` or `involved-talent-v2-app`).
- Optional: lifecycle policy to limit image count (same idea as PDF service in talent-assessment `main.tf`).

Build and push from CI or local:

```bash
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-2.amazonaws.com
docker build --platform linux/amd64 -t <ecr-url>:latest .
docker push <ecr-url>:latest
```

## 7. ECS task definition and service (same cluster)

- **Task definition** (e.g. family `involved-v2-nextjs`):
  - Fargate, `awsvpc`, same execution role pattern as PDF (pull image, logs); task role if the app needs AWS APIs (e.g. SES) or leave minimal.
  - Container: image = ECR URL, port 3000, `NODE_ENV=production`.
  - Env vars (or Secrets Manager): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (set to ALB URL or custom domain once DNS is set).
  - Logs: `awslogs` to a new CloudWatch log group (e.g. `/ecs/involved-v2-nextjs`).
  - Container `healthCheck`: `CMD-SHELL` curl to `http://localhost:3000/api/health` (same path as ALB).
- **Service**:
  - Cluster: existing `aws_ecs_cluster.pdf_cluster.id`.
  - `desired_count = 1`, Fargate, same subnet(s) and **new** security group (Next.js tasks SG).
  - **load_balancer** block: attach to the new target group (container name + 3000). This registers tasks with the ALB.

## 8. IAM

- Reuse **existing** ECS task execution role (or create a second one for Next.js if you want separation): same `AmazonECSTaskExecutionRolePolicy` for ECR + CloudWatch.
- Task role: if the app only talks to Supabase, minimal; if it uses SES, attach a policy (or reuse an existing SES policy) so the task can send email.

## 9. Variables and secrets

- **Terraform variables** (in talent-assessment): e.g. `nextjs_supabase_url`, `nextjs_supabase_anon_key`, `nextjs_supabase_service_role_key` (sensitive), `nextjs_app_url` (ALB DNS or custom domain). You can reuse the same Supabase values as the PDF service and add `nextjs_app_url` for the public URL.
- **Sensitive values**: Keep service role key in `tfvars` (not committed) or move to **Secrets Manager** and reference in the task definition `secrets` block.

## 10. After Terraform: DNS and HTTPS (optional)

- Point a DNS record at the ALB once the task is healthy: set the record (A or CNAME) to the ALB DNS name from `aws_lb.*.dns_name`.
- For HTTPS: request an **ACM certificate** (e.g. for `involved-v2.cyberworldbuilders.dev`), validate via DNS, add an `aws_lb_listener` on 443 with the cert and forward to the same target group; optionally redirect HTTP → HTTPS.

## 11. PDF service `pdf_app_url` after cutover

- Today `talent-assessment/infrastructure/terraform.tfvars` has `pdf_app_url = "https://involved-v2.cyberworldbuilders.dev"` (Vercel). Once the ECS app is live and DNS points to the ALB (or custom domain), set `pdf_app_url` to that URL, then re-apply so the PDF service tasks get the new env and can call the correct report view URL.

---

## Summary: what to add

| Item | Where | Notes |
|------|--------|------|
| Second subnet (ALB) | talent-assessment `main.tf` | e.g. 10.0.2.0/24, us-east-2b |
| ALB + ALB SG | talent-assessment `main.tf` | Subnets = [subnet1, subnet2] |
| Target group | talent-assessment `main.tf` | Port 3000, path `/api/health` |
| Listener (80) | talent-assessment `main.tf` | Default forward to TG |
| Next.js tasks SG | talent-assessment `main.tf` | Ingress 3000 from ALB SG |
| ECR repo (Next.js) | talent-assessment `main.tf` | Image name for app |
| Task definition + service | talent-assessment `main.tf` | Same cluster, load_balancer block |
| Dockerfile | involved-v2 repo | Multi-stage, standalone, linux/amd64 |
| `output: 'standalone'` | involved-v2 `next.config.ts` | Required for Docker/ECS |
| `GET /api/health` | involved-v2 `src/app/api/health/route.ts` | For ALB + ECS health checks |
| New tf vars | talent-assessment `variables.tf` / `terraform.tfvars` | Supabase + nextjs_app_url |

---

## What you’re not changing

- Supabase: same project and config; only the app host moves from Vercel to ECS.
- PDF service: stays on the same cluster; no ALB in front of it; only `pdf_app_url` may change after DNS cutover.
- Single Next.js task for now; scale later by increasing `desired_count` and/or adding auto-scaling.

---

*Next step when executing: concrete Terraform snippets (second subnet, ALB, TG, listener, SG, ECR, task def, service) and the exact Dockerfile + health route changes.*
