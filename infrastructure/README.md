# AWS SES Infrastructure for Involved v2

This Terraform configuration creates the necessary AWS resources for sending emails via AWS SES (Simple Email Service) using the AWS SES SDK.

## Prerequisites

1. **Set up AWS SSO profile for account 344151725195:**
   ```bash
   # Run the setup script to add the profile
   ./setup-aws-profile.sh
   
   # Or manually add to ~/.aws/config:
   # [profile involved-v2-ses]
   # sso_session = cyberworld
   # sso_account_id = 344151725195
   # sso_role_name = AdministratorAccess
   # region = us-east-1
   # output = json
   ```

2. **Terraform installed:**
   ```bash
   # Check if Terraform is installed
   terraform version
   
   # If not installed, install via Homebrew (macOS)
   brew install terraform
   ```

3. **AWS SSO Login:**
   ```bash
   # Login to AWS SSO with the involved-v2-ses profile
   aws sso login --profile involved-v2-ses
   
   # Verify you're in the correct account
   aws sts get-caller-identity --profile involved-v2-ses
   # Should show account: 344151725195
   ```

## Resources Created

This Terraform configuration creates:

1. **IAM User** (`involved-v2-ses-user` by default)
   - Dedicated IAM user for SES email sending
   - Minimal permissions (only `ses:SendEmail` and `ses:SendRawEmail`)

2. **IAM Access Keys**
   - Access Key ID and Secret Access Key for the IAM user
   - Used as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Vercel

3. **SES Email Identity**
   - Verifies the sender email address
   - Required before sending emails from that address

## Quick Start

1. **Navigate to infrastructure directory:**
   ```bash
   cd infrastructure
   ```

2. **Set up AWS profile (if not already done):**
   ```bash
   ./setup-aws-profile.sh
   ```

3. **Login to AWS SSO:**
   ```bash
   aws sso login --profile involved-v2-ses
   ```

3. **Review the plan:**
   ```bash
   terraform init
   terraform plan
   ```

4. **Apply the configuration:**
   ```bash
   terraform apply
   ```

5. **Save the outputs:**
   After applying, Terraform will output:
   - `iam_access_key_id` - Use this as `AWS_ACCESS_KEY_ID` in Vercel
   - `iam_secret_access_key` - Use this as `AWS_SECRET_ACCESS_KEY` in Vercel (SAVE SECURELY!)
   - `aws_region` - Use this as `AWS_REGION` in Vercel
   - `vercel_env_commands` - Copy-paste commands to set Vercel environment variables

6. **Verify email in SES:**
   - After applying, check your email inbox for a verification email from AWS SES
   - Click the verification link to verify the sender email address
   - You cannot send emails until the email is verified

## Configuration

### Variables

You can customize the configuration by creating a `terraform.tfvars` file:

```hcl
aws_region    = "us-east-1"
sender_email  = "jay@cyberworldbuilders.com"
sender_name   = "Involved Talent"
iam_user_name = "involved-v2-ses-user"
```

Or override variables via command line:

```bash
terraform apply -var="sender_email=noreply@yourdomain.com"
```

### Available Variables

- `aws_region` (default: `"us-east-1"`) - AWS region for SES
- `sender_email` (default: `"jay@cyberworldbuilders.com"`) - Email address to verify and use as sender
- `sender_name` (default: `"Involved Talent"`) - Display name for emails
- `iam_user_name` (default: `"involved-v2-ses-user"`) - Name for the IAM user
- `domain_name` (default: `""`) - Optional domain name to verify (leave empty for email-only)
- `tags` (default: project tags) - Tags to apply to all resources

## Setting Up Vercel Environment Variables

After running `terraform apply`, you'll get output with commands to set Vercel environment variables.

Alternatively, manually set these in Vercel:

```bash
# Get the values from terraform output
terraform output -json

# Then set in Vercel:
vercel env add AWS_ACCESS_KEY_ID production
# Enter the access key ID from terraform output

vercel env add AWS_SECRET_ACCESS_KEY production
# Enter the secret access key from terraform output

vercel env add AWS_REGION production
# Enter: us-east-1 (or your chosen region)

vercel env add SMTP_FROM production
# Enter: jay@cyberworldbuilders.com (or your sender email)

vercel env add SMTP_FROM_NAME production
# Enter: Involved Talent
```

**Important:** Also add these to `preview` and `development` environments in Vercel.

## AWS SES Sandbox Mode

By default, AWS SES accounts start in "sandbox mode", which means:
- You can only send emails to verified email addresses
- Limited to 200 emails per day
- 1 email per second sending rate

To request production access:
1. Go to AWS SES Console → Account dashboard
2. Click "Request production access"
3. Fill out the form (usually approved in 24-48 hours)

## Domain Verification (Optional)

If you want to verify a domain instead of just an email address, uncomment the domain-related resources in `main.tf` and set `domain_name` in your `terraform.tfvars`:

```hcl
domain_name = "involvedtalent.com"
```

Then add the DNS records that Terraform outputs to your domain's DNS provider.

## Troubleshooting

### "Profile involved-v2-ses not found"
- Run the setup script: `./setup-aws-profile.sh`
- Or manually add the profile to `~/.aws/config` (see Prerequisites section)
- Login to SSO: `aws sso login --profile involved-v2-ses`
- Verify account: `aws sts get-caller-identity --profile involved-v2-ses` (should show 344151725195)

### "Email not verified"
- Check your email inbox for the verification email from AWS SES
- Click the verification link
- Wait a few minutes for verification to complete

### "Access Denied" errors
- Ensure you're logged into AWS SSO: `aws sso login --profile cyberworld`
- Check that your SSO role has permissions to create IAM users and SES identities

### "Rate limit exceeded"
- If in sandbox mode, you're limited to 200 emails/day and 1 email/second
- Request production access to remove these limits

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning:** This will delete the IAM user and access keys. Make sure you have the credentials saved if you need them later!

## Security Notes

- **Never commit** `terraform.tfvars` files with sensitive values
- The `iam_secret_access_key` output is sensitive - save it securely
- Rotate access keys periodically
- Use least privilege IAM policies (already configured)
- Monitor SES usage in AWS Console

## Cost

- AWS SES: $0.10 per 1,000 emails (after free tier)
- First 62,000 emails/month are free (if sent from EC2)
- IAM users and SES identities are free
- Monitor usage in AWS SES Console → Sending statistics

## Next Steps

After infrastructure is created:

1. Verify the sender email address (check inbox)
2. Set Vercel environment variables (use terraform output commands)
3. Test email sending from your app
4. Request production access if needed (to send to any email address)
5. Monitor email deliverability in AWS SES Console
