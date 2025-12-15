# Request AWS SES Production Access

## Current Status

AWS SES accounts start in "sandbox mode" which means:
- You can only send emails **to verified email addresses**
- Limited to **200 emails per day**
- Limited to **1 email per second**

To send to any email address and remove these limits, you need to request production access.

## Steps to Request Production Access

### Option 1: AWS Console (Recommended)

1. **Login to AWS Console:**
   ```bash
   aws sso login --profile involved-v2-ses
   ```

2. **Navigate to SES:**
   - Go to: https://console.aws.amazon.com/ses/
   - Make sure you're in the **us-east-1** region (or your configured region)
   - Select **Account dashboard** from the left sidebar

3. **Request Production Access:**
   - Look for the "Request production access" button or link
   - Click it to open the request form

4. **Fill out the Request Form:**
   - **Mail Type:** Select "Transactional" (for user invites, password resets, etc.)
   - **Website URL:** Your application URL (e.g., `https://involved-v2.vercel.app`)
   - **Use case description:** 
     ```
     We are building a talent assessment platform that sends:
     - User invitation emails when new users are added to the system
     - Password reset emails
     - Email verification emails
     
     This is a B2B SaaS application where clients invite their employees to complete assessments.
     ```
   - **Expected sending volume:** 
     - Start with: 1,000-5,000 emails per month
     - Growth: Up to 50,000 emails per month within 6 months
   - **How you plan to handle bounces and complaints:**
     ```
     We will:
     - Monitor bounce and complaint rates in AWS SES Console
     - Set up SNS notifications for bounces and complaints
     - Remove invalid email addresses from our database
     - Implement unsubscribe mechanisms for transactional emails
     ```
   - **How you obtained email addresses:**
     ```
     Email addresses are provided by our clients (organizations) when they:
     - Manually add users to their account
     - Bulk upload users via CSV
     
     All users must accept an invitation before their account is activated.
     We do not send unsolicited emails.
     ```

5. **Submit the Request:**
   - Review all information
   - Click "Submit"
   - You'll receive a confirmation email

### Option 2: AWS CLI (Alternative)

If you prefer using the CLI, you can check your account status:

```bash
# Check current sending quota
aws ses get-send-quota --profile involved-v2-ses --region us-east-1

# Check account sending status
aws ses get-account-sending-enabled --profile involved-v2-ses --region us-east-1
```

However, **production access requests must be submitted through the AWS Console** - there's no CLI command for this.

## What Happens After Submission

1. **Review Process:**
   - AWS typically reviews requests within **24-48 hours**
   - You may receive follow-up questions via email

2. **Approval:**
   - Once approved, you'll receive an email notification
   - Your account will automatically be moved out of sandbox mode
   - You can then send to any email address

3. **If Rejected:**
   - AWS will provide feedback on why
   - You can address their concerns and resubmit

## While Waiting for Approval

You can still use SES in sandbox mode:
- Verify recipient email addresses in AWS SES Console
- Test your email sending functionality
- Send to verified addresses only

## After Production Access is Granted

1. **Monitor Your Sending:**
   - Check bounce and complaint rates regularly
   - Keep bounce rate below 5%
   - Keep complaint rate below 0.1%

2. **Set Up Bounce/Complaint Handling (Recommended):**
   - Configure SNS topics for bounces and complaints
   - Set up Lambda functions to handle these events
   - Automatically remove invalid emails from your database

3. **Best Practices:**
   - Always verify email addresses before sending
   - Implement double opt-in for marketing emails (if you add them later)
   - Provide clear unsubscribe mechanisms
   - Monitor your sending reputation

## Quick Links

- **AWS SES Console:** https://console.aws.amazon.com/ses/
- **Account Dashboard:** https://console.aws.amazon.com/ses/home?region=us-east-1#/account
- **Verified Identities:** https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities

## Current Configuration

- **Region:** us-east-1
- **Sender Email:** jay@cyberworldbuilders.com
- **IAM User:** involved-v2-ses-user
- **Account ID:** 344151725195
