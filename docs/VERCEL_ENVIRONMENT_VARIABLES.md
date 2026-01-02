# Vercel Environment Variables Configuration

## Email Service Configuration (Priority Order)

The email service uses the following priority order:

1. **AWS SES with OIDC** (Recommended for Production)
   - Uses `AWS_ROLE_ARN` for secure, short-lived credentials
   - Follows AWS security best practices
   - No long-lived access keys needed

2. **AWS SES with Access Keys** (Fallback for Local Development)
   - Uses `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
   - Only used if OIDC is not available

3. **Resend** (Alternative Service)
   - Uses `RESEND_API_KEY`
   - Only used if AWS SES is not configured

4. **SMTP** (Last Resort)
   - Uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

## Required Environment Variables for Production (Vercel)

### AWS SES with OIDC (Recommended)

```bash
# AWS OIDC Configuration (Preferred - No long-lived credentials!)
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME
AWS_REGION=us-east-1

# Email Configuration
EMAIL_FROM=noreply@involvedtalent.com
# OR
SMTP_FROM=noreply@involvedtalent.com
SMTP_FROM_NAME=Involved Talent
```

### AWS SES with Access Keys (Not Recommended for Production)

⚠️ **Only use for local development or if OIDC is not available**

```bash
# AWS Access Keys (Fallback - Not recommended for production)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Email Configuration
EMAIL_FROM=noreply@involvedtalent.com
# OR
SMTP_FROM=noreply@involvedtalent.com
SMTP_FROM_NAME=Involved Talent
```

## Variables to Remove from Vercel

If you have the following variables set in Vercel, **remove them** to ensure OIDC takes precedence:

- ❌ `AWS_ACCESS_KEY_ID` (if `AWS_ROLE_ARN` is set)
- ❌ `AWS_SECRET_ACCESS_KEY` (if `AWS_ROLE_ARN` is set)
- ❌ `RESEND_API_KEY` (if you want to use AWS SES with OIDC)
- ❌ `SMTP_HOST` (if you want to use AWS SES)

## How to Configure in Vercel

1. Go to your Vercel project **Settings** > **Environment Variables**
2. Add the following variables for **Production**, **Preview**, and **Development** environments:

   ```
   AWS_ROLE_ARN=arn:aws:iam::068732175988:role/talent-assessment-vercel-ses-role
   AWS_REGION=us-east-1
   EMAIL_FROM=noreply@involvedtalent.com
   SMTP_FROM_NAME=Involved Talent
   ```

3. **Remove** any old `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` variables if they exist
4. **Remove** `RESEND_API_KEY` if you want to use AWS SES exclusively

## Verification

After deploying, check the logs to verify which email service is being used:

- Look for: `✅ Using OIDC credentials (AWS_ROLE_ARN)` - This confirms OIDC is working
- Look for: `⚠️ Using access keys` - This means OIDC is not configured, check `AWS_ROLE_ARN`
- Look for: `[Email Service] priority: AWS SES (OIDC)` - Confirms correct priority

## Troubleshooting

### OIDC Not Working

1. Verify `AWS_ROLE_ARN` is set correctly in Vercel
2. Check that the IAM role exists in AWS and has the correct trust policy
3. Verify the OIDC provider is configured in AWS IAM
4. Check Vercel deployment logs for OIDC errors

### Still Using Access Keys

1. Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from Vercel environment variables
2. Ensure `AWS_ROLE_ARN` is set
3. Redeploy the application

### Resend Taking Precedence

1. Remove `RESEND_API_KEY` from Vercel if you want to use AWS SES
2. Or ensure `AWS_ROLE_ARN` is set (AWS SES with OIDC takes priority over Resend)

## Related Documentation

- [Terraform OIDC Setup](../../legacy/infrastructure/vercel-oidc.tf)
- [AWS SES Production Configuration](../../legacy/infrastructure/ses-production.tf)

