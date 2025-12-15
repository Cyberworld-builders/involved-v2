# Email Setup Guide

## Local Development

### Mailpit (Email Testing)

When running Supabase locally, Mailpit is automatically started for email testing.

- **Web UI**: http://127.0.0.1:54324
- **SMTP Server**: localhost:1025 (no auth required)

The email service automatically uses Mailpit when:
- Running in development mode (`NODE_ENV=development`)
- OR `SMTP_HOST` environment variable is not set

### Testing Emails Locally

1. Start Supabase: `supabase start`
2. Start Next.js: `npm run dev`
3. Send an invite email from the UI
4. View the email in Mailpit: http://127.0.0.1:54324

No additional configuration needed for local development!

## Production/Staging (Vercel)

### Email Sending Options

We support two methods for sending emails in production:

1. **AWS SES SDK** (Recommended for Vercel/serverless)
   - Bypasses DNS resolution issues in serverless environments
   - More reliable in Vercel's serverless functions
   - Uses AWS SDK directly (no SMTP connection needed)

2. **SMTP** (Alternative)
   - Uses the same SMTP provider configured in Supabase Dashboard
   - May encounter DNS resolution issues in serverless environments

### Supabase Email Service

Supabase has built-in email capabilities for authentication emails (password reset, email confirmation, etc.). For our custom application emails (user invites), we can use either AWS SES SDK or SMTP.

**Recommended Approach**: 
1. Use **AWS SES SDK** for custom invite emails (set AWS credentials in Vercel)
2. Configure SMTP in **Supabase Dashboard** → Authentication → SMTP Settings (for Supabase Auth emails)

This way:
- Supabase Auth emails use Supabase's SMTP configuration
- Our custom invite emails use AWS SES SDK (avoids DNS issues)

### Required Environment Variables

**Option 1: AWS SES SDK (Recommended for Vercel)**

Add these to Vercel for production/staging deployments:

```bash
# AWS SES SDK Configuration (recommended - avoids DNS issues)
AWS_ACCESS_KEY_ID=AKIAxxxxx        # AWS IAM access key
AWS_SECRET_ACCESS_KEY=xxxxx         # AWS IAM secret key
AWS_REGION=us-east-1                # AWS region (defaults to us-east-1)
SMTP_FROM=noreply@yourdomain.com    # Verified sender email in SES
SMTP_FROM_NAME=Involved Talent      # From name (optional)

# App Configuration (already set)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=Involved Talent

# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Missing - Need to add:
SUPABASE_SERVICE_ROLE_KEY=xxx      # Required for user creation API
```

**Option 2: SMTP (Alternative)**

If you prefer SMTP or don't have AWS credentials:

```bash
# SMTP Configuration (alternative - may have DNS issues in serverless)
SMTP_HOST=smtp.resend.com          # Or your SMTP provider
SMTP_PORT=587                      # Usually 587 (STARTTLS) or 465 (SSL)
SMTP_USER=resend                   # Your SMTP username
SMTP_PASS=re_xxxxx                 # Your SMTP password/API key
SMTP_SECURE=false                  # true for SSL (port 465), false for STARTTLS (port 587)
SMTP_FROM=noreply@yourdomain.com   # From email address
SMTP_FROM_NAME=Involved Talent     # From name (optional)

# App Configuration (already set)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=Involved Talent

# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Missing - Need to add:
SUPABASE_SERVICE_ROLE_KEY=xxx      # Required for user creation API
```

**Note**: The email service will automatically use AWS SES SDK if `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set, otherwise it falls back to SMTP.

### Recommended SMTP Providers

1. **Resend** (Recommended)
   - Easy setup, good free tier
   - `SMTP_HOST=smtp.resend.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=resend`
   - `SMTP_PASS=re_xxxxx` (API key)

2. **SendGrid**
   - `SMTP_HOST=smtp.sendgrid.net`
   - `SMTP_PORT=587`
   - `SMTP_USER=apikey`
   - `SMTP_PASS=SG.xxxxx` (API key)

3. **AWS SES** (Recommended for Vercel)
   - **Option A: AWS SES SDK** (Recommended - no DNS issues)
     - `AWS_ACCESS_KEY_ID=AKIAxxxxx`
     - `AWS_SECRET_ACCESS_KEY=xxxxx`
     - `AWS_REGION=us-east-1`
   - **Option B: AWS SES SMTP** (Alternative)
     - `SMTP_HOST=email-smtp.region.amazonaws.com`
     - `SMTP_PORT=587`
     - `SMTP_USER=AKIAxxxxx` (IAM user)
     - `SMTP_PASS=xxxxx` (SMTP password)

### Setup Steps

#### Using AWS SES SDK (Recommended)

1. **Get AWS SES Credentials:**
   - Create an IAM user in AWS Console with SES permissions
   - Generate access key and secret key
   - Verify your sender email address in SES

2. **Add AWS credentials to Vercel:**

```bash
# AWS SES SDK credentials
vercel env add AWS_ACCESS_KEY_ID production
# Enter your AWS IAM access key (e.g., AKIAxxxxx)

vercel env add AWS_SECRET_ACCESS_KEY production
# Enter your AWS IAM secret key

vercel env add AWS_REGION production
# Enter: us-east-1 (or your preferred AWS region)

vercel env add SMTP_FROM production
# Enter your verified sender email in SES

vercel env add SMTP_FROM_NAME production
# Enter: Involved Talent (or your app name)

# Also add Supabase service role key (required for user creation)
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY development
```

#### Using SMTP (Alternative)

1. **Configure SMTP in Supabase Dashboard:**
   - Go to your Supabase project → Authentication → Settings → SMTP
   - Enable "Custom SMTP"
   - Enter your SMTP provider credentials (Resend, SendGrid, etc.)
   - Save the configuration

2. **Add the same SMTP credentials to Vercel:**

```bash
# Get these values from your Supabase SMTP configuration
vercel env add SMTP_HOST production
# Enter the same SMTP_HOST you used in Supabase (e.g., smtp.resend.com)

vercel env add SMTP_PORT production
# Enter the same SMTP_PORT (usually 587)

vercel env add SMTP_USER production
# Enter the same SMTP_USER

vercel env add SMTP_PASS production
# Enter the same SMTP_PASS/API key

vercel env add SMTP_SECURE production
# Enter: false (for port 587) or true (for port 465)

vercel env add SMTP_FROM production
# Enter your verified sender email

vercel env add SMTP_FROM_NAME production
# Enter: Involved Talent (or your app name)

# Also add Supabase service role key (required for user creation)
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY development
```

## Current Status

### ✅ Already Set in Vercel
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`

### ❌ Missing in Vercel

**Required for user creation:**
- `SUPABASE_SERVICE_ROLE_KEY` - **Required for user creation**

**Required for email sending (choose one option):**

**Option 1: AWS SES SDK (Recommended)**
- `AWS_ACCESS_KEY_ID` - **Required for AWS SES SDK**
- `AWS_SECRET_ACCESS_KEY` - **Required for AWS SES SDK**
- `AWS_REGION` - Optional (defaults to us-east-1)
- `SMTP_FROM` - Optional (defaults to noreply@involvedtalent.com)
- `SMTP_FROM_NAME` - Optional (defaults to "Involved Talent")

**Option 2: SMTP (Alternative)**
- `SMTP_HOST` - **Required for SMTP**
- `SMTP_PORT` - **Required for SMTP**
- `SMTP_USER` - **Required for SMTP**
- `SMTP_PASS` - **Required for SMTP**
- `SMTP_SECURE` - Optional (defaults to false)
- `SMTP_FROM` - Optional (defaults to noreply@involvedtalent.com)
- `SMTP_FROM_NAME` - Optional (defaults to "Involved Talent")

## Testing

### Local Testing
1. Start Supabase: `supabase start`
2. Send invite from UI
3. Check Mailpit: http://127.0.0.1:54324

### Production Testing
1. Set all required environment variables in Vercel
2. Deploy to staging/preview
3. Send invite from UI
4. Check recipient's inbox (or email service dashboard)

## Troubleshooting

### Emails not sending locally
- Ensure Supabase is running: `supabase status`
- Check Mailpit is accessible: http://127.0.0.1:54324
- Check SMTP port 1025 is accessible (should be automatic)

### Emails not sending in production

**If using AWS SES SDK:**
- Verify `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` are set
- Check AWS IAM user has SES permissions
- Verify sender email is verified in AWS SES
- Check Vercel function logs for errors

**If using SMTP:**
- Verify all SMTP environment variables are set in Vercel
- Check SMTP credentials are correct
- Verify SMTP port (587 for STARTTLS, 465 for SSL)
- If you see "queryA EBADNAME" errors, switch to AWS SES SDK (avoids DNS issues)
- Check Vercel function logs for errors

### User creation failing
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- Get the key from Supabase Dashboard → Settings → API → service_role key

