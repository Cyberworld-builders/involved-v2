# AWS SES Setup for Supabase

This guide walks you through setting up AWS SES (Simple Email Service) for email sending in Supabase and Vercel.

## Prerequisites

- AWS account with SES service enabled
- Domain verified in AWS SES (or email address verified if using sandbox mode)
- Access to your Supabase project dashboard
- Access to Vercel project settings

## Step 1: Get AWS SES SMTP Credentials

1. **Go to AWS SES Console:**
   - Navigate to https://console.aws.amazon.com/ses/
   - Select your AWS region (e.g., `us-east-1`, `us-west-2`, etc.)

2. **Create SMTP Credentials:**
   - In the left sidebar, click **"SMTP Settings"**
   - Click **"Create SMTP Credentials"**
   - This will redirect you to IAM (Identity and Access Management)
   - Enter a username (e.g., `supabase-smtp-user`) and click **"Create User"**
   - **IMPORTANT**: Download and save the credentials file - you can only view the password once!
   - Note down:
     - **SMTP Username**: Starts with `AKIA...` (IAM access key ID)
     - **SMTP Password**: The password shown (save this securely!)

3. **Find Your SMTP Endpoint:**
   - Go back to SES Console → SMTP Settings
   - Note your **SMTP Server Name** (format: `email-smtp.REGION.amazonaws.com`)
   - Common regions:
     - `us-east-1`: `email-smtp.us-east-1.amazonaws.com`
     - `us-west-2`: `email-smtp.us-west-2.amazonaws.com`
     - `eu-west-1`: `email-smtp.eu-west-1.amazonaws.com`

4. **Verify Your Email/Domain:**
   - In SES Console, go to **"Verified identities"**
   - Ensure your sender email address or domain is verified
   - If in sandbox mode, you can only send to verified addresses

## Step 2: Configure Supabase Dashboard

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SMTP Settings:**
   - Go to **Project Settings** (gear icon in sidebar)
   - Click **"Authentication"** in the left menu
   - Scroll down to **"SMTP Settings"** section

3. **Enable Custom SMTP:**
   - Toggle **"Enable Custom SMTP"** to **ON**

4. **Enter AWS SES Credentials:**
   - **SMTP Host**: `email-smtp.YOUR-REGION.amazonaws.com` (e.g., `email-smtp.us-east-1.amazonaws.com`)
   - **SMTP Port**: `587` (for STARTTLS) or `465` (for SSL/TLS)
   - **SMTP User**: Your SMTP username (starts with `AKIA...`)
   - **SMTP Password**: Your SMTP password (from Step 1)
   - **Sender Email**: Your verified email address (e.g., `noreply@yourdomain.com`)
   - **Sender Name**: `Involved Talent` (or your preferred name)

5. **Save Configuration:**
   - Click **"Save"** at the bottom
   - Supabase will test the connection - wait for confirmation

## Step 3: Add Same Credentials to Vercel

Use the **exact same credentials** you just entered in Supabase:

```bash
# Set SMTP Host (replace REGION with your AWS region)
vercel env add SMTP_HOST production
# Enter: email-smtp.us-east-1.amazonaws.com (or your region)

# Set SMTP Port
vercel env add SMTP_PORT production
# Enter: 587 (for STARTTLS) or 465 (for SSL)

# Set SMTP User (your IAM access key ID)
vercel env add SMTP_USER production
# Enter: AKIAxxxxx (your SMTP username from AWS)

# Set SMTP Password
vercel env add SMTP_PASS production
# Enter: your-smtp-password (the password from AWS)

# Set SMTP Secure
vercel env add SMTP_SECURE production
# Enter: false (for port 587) or true (for port 465)

# Set From Email
vercel env add SMTP_FROM production
# Enter: noreply@yourdomain.com (your verified SES email)

# Set From Name
vercel env add SMTP_FROM_NAME production
# Enter: Involved Talent

# Also add to preview and development environments
vercel env add SMTP_HOST preview
vercel env add SMTP_PORT preview
vercel env add SMTP_USER preview
vercel env add SMTP_PASS preview
vercel env add SMTP_SECURE preview
vercel env add SMTP_FROM preview
vercel env add SMTP_FROM_NAME preview
```

## Step 4: Verify Configuration

1. **Test in Supabase:**
   - Try triggering a password reset or email confirmation
   - Check your email inbox

2. **Test in Your App:**
   - Deploy to Vercel (or wait for auto-deploy)
   - Send a user invite from your app
   - Check the recipient's inbox

3. **Check Logs:**
   - In Vercel Dashboard → Your Project → Functions → Logs
   - Look for email sending errors or success messages

## Troubleshooting

### "Email sending failed" Error

**Check:**
- All SMTP environment variables are set in Vercel
- Credentials match exactly between Supabase and Vercel
- AWS SES account is out of sandbox mode (or recipient is verified)
- Sender email/domain is verified in AWS SES

### "Authentication failed" Error

**Check:**
- SMTP username and password are correct
- No extra spaces in credentials
- IAM user has SES sending permissions

### "Connection timeout" Error

**Check:**
- SMTP host is correct for your AWS region
- Port 587 or 465 is not blocked by firewall
- Network connectivity to AWS

### AWS SES Sandbox Mode

If your SES account is in sandbox mode:
- You can only send to verified email addresses
- Request production access in AWS SES Console → Account dashboard
- This usually takes 24-48 hours for approval

## Security Notes

- **Never commit SMTP credentials to Git**
- Store credentials securely (use Vercel environment variables)
- Rotate SMTP credentials periodically
- Use IAM roles with least privilege for SES access

## Cost Considerations

- AWS SES: $0.10 per 1,000 emails (after free tier)
- First 62,000 emails/month are free (if sent from EC2)
- Monitor usage in AWS SES Console → Sending statistics

## Next Steps

After setup:
1. Test email sending from your app
2. Monitor email deliverability in AWS SES
3. Set up bounce/complaint handling (recommended)
4. Consider setting up SNS notifications for bounces
