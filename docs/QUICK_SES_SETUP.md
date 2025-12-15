# Quick AWS SES Setup - Your Credentials

## Your AWS SES Configuration

- **SMTP Host**: `email-smtp.us-east-1.amazonaws.com`
- **SMTP Port**: `587` (STARTTLS - recommended) or `465` (TLS)
- **SMTP User**: `AKIAVAIIKSSFQYOZT6E6`
- **SMTP Password**: `BL+ZSg2W8rWPdiqLk6Y4FpXeDWWB2Og8khowOkO/flKq`
- **Sender Email**: `jay@cyberworldbuilders.com`
- **Sender Name**: `Involved Talent`

## Step 1: Configure Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Project Settings** (gear icon) → **Authentication** → Scroll to **SMTP Settings**
4. Toggle **"Enable Custom SMTP"** to **ON**
5. Enter these values:
   - **SMTP Host**: `email-smtp.us-east-1.amazonaws.com`
   - **SMTP Port**: `587`
   - **SMTP User**: `AKIAVAIIKSSFQYOZT6E6`
   - **SMTP Password**: `BL+ZSg2W8rWPdiqLk6Y4FpXeDWWB2Og8khowOkO/flKq`
   - **Sender Email**: `jay@cyberworldbuilders.com`
   - **Sender Name**: `Involved Talent`
6. Click **"Save"**
7. Wait for Supabase to test the connection (should show success)

## Step 2: Add to Vercel

Run these commands in your terminal (from the project directory):

```bash
cd /Users/jaylong/Web/Involved/involved-v2

# Add SMTP Host
vercel env add SMTP_HOST production
# When prompted, enter: email-smtp.us-east-1.amazonaws.com

# Add SMTP Port
vercel env add SMTP_PORT production
# When prompted, enter: 587

# Add SMTP User
vercel env add SMTP_USER production
# When prompted, enter: AKIAVAIIKSSFQYOZT6E6

# Add SMTP Password
vercel env add SMTP_PASS production
# When prompted, enter: BL+ZSg2W8rWPdiqLk6Y4FpXeDWWB2Og8khowOkO/flKq

# Add SMTP Secure (false for port 587)
vercel env add SMTP_SECURE production
# When prompted, enter: false

# Add From Email
vercel env add SMTP_FROM production
# When prompted, enter: jay@cyberworldbuilders.com

# Add From Name
vercel env add SMTP_FROM_NAME production
# When prompted, enter: Involved Talent

# Also add to preview environment
vercel env add SMTP_HOST preview
vercel env add SMTP_PORT preview
vercel env add SMTP_USER preview
vercel env add SMTP_PASS preview
vercel env add SMTP_SECURE preview
vercel env add SMTP_FROM preview
vercel env add SMTP_FROM_NAME preview
```

## Step 3: Verify

1. **Test in Supabase**: Try a password reset or email confirmation
2. **Test in Your App**: Send a user invite from your app
3. **Check Logs**: Vercel Dashboard → Functions → Logs for any errors

## Troubleshooting

If emails still fail:
- Double-check all values match exactly (no extra spaces)
- Ensure `jay@cyberworldbuilders.com` is verified in AWS SES
- Check Vercel logs for specific error messages
- Verify AWS SES account is out of sandbox mode (or recipient is verified)
