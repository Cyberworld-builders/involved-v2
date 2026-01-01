# Vercel Environment Variables Cleanup

## Current Status (as of check)

### ✅ Correctly Configured
- `AWS_ROLE_ARN` - Set for Development, Preview, Production (10h ago)
- `AWS_REGION` - Set for Development, Preview, Production
- `SMTP_FROM` - Set for all environments
- `SMTP_FROM_NAME` - Set for all environments

### ⚠️ Needs Cleanup

#### 1. Old AWS Access Keys (Should be removed)
These conflict with OIDC and may cause the system to use access keys instead of OIDC:

- `AWS_ACCESS_KEY_ID` - Set for Development, Preview, Production
- `AWS_SECRET_ACCESS_KEY` - Set for Development, Preview, Production

**Action:** Remove these from all environments to ensure OIDC is used.

#### 2. Resend API Key (Optional - can keep as fallback)
- `RESEND_API_KEY` - Set for Development, Preview, Production

**Action:** 
- **Option A:** Remove if you want to use AWS SES exclusively
- **Option B:** Keep as fallback (current code will use AWS SES first, then Resend if AWS SES fails)

#### 3. SMTP Variables (Optional - can keep as last resort)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` - Set for Preview, Production

**Action:** 
- Can be removed if you're confident AWS SES will work
- Or keep as a last resort fallback (lowest priority)

## Recommended Cleanup Commands

### Remove Old AWS Access Keys (Required)

```bash
# Remove from Development
vercel env rm AWS_ACCESS_KEY_ID development
vercel env rm AWS_SECRET_ACCESS_KEY development

# Remove from Preview
vercel env rm AWS_ACCESS_KEY_ID preview
vercel env rm AWS_SECRET_ACCESS_KEY preview

# Remove from Production
vercel env rm AWS_ACCESS_KEY_ID production
vercel env rm AWS_SECRET_ACCESS_KEY production
```

### Remove Resend (Optional - if you want AWS SES exclusively)

```bash
# Remove from Development
vercel env rm RESEND_API_KEY development

# Remove from Preview
vercel env rm RESEND_API_KEY preview

# Remove from Production
vercel env rm RESEND_API_KEY production
```

### Remove SMTP Variables (Optional - if you want AWS SES exclusively)

```bash
# Remove from Preview
vercel env rm SMTP_HOST preview
vercel env rm SMTP_PORT preview
vercel env rm SMTP_USER preview
vercel env rm SMTP_PASS preview
vercel env rm SMTP_SECURE preview

# Remove from Production
vercel env rm SMTP_HOST production
vercel env rm SMTP_PORT production
vercel env rm SMTP_USER production
vercel env rm SMTP_PASS production
vercel env rm SMTP_SECURE production
```

## Verify AWS_ROLE_ARN Value

Expected value (from Terraform output):
```
arn:aws:iam::068732175988:role/talent-assessment-vercel-ses-role
```

To verify in Vercel:
1. Go to Vercel Dashboard > Project Settings > Environment Variables
2. Check that `AWS_ROLE_ARN` matches the above value
3. Ensure it's set for Production, Preview, and Development

## After Cleanup

After removing the old access keys, the email service priority will be:

1. **AWS SES with OIDC** (`AWS_ROLE_ARN`) ✅ - Will be used
2. AWS SES with Access Keys - ❌ Removed, won't be used
3. Resend - ⚠️ Optional (can keep as fallback)
4. SMTP - ⚠️ Optional (can keep as last resort)

## Verification After Cleanup

After cleanup and redeploy, check the logs for:

- ✅ `Using OIDC credentials (AWS_ROLE_ARN)` - Confirms OIDC is working
- ✅ `[Email Service] priority: AWS SES (OIDC)` - Confirms correct priority
- ❌ Should NOT see: `Using access keys` - This means cleanup worked

## Current Environment Variables Summary

```
✅ AWS_ROLE_ARN (all environments) - OIDC role for AWS SES
✅ AWS_REGION (all environments) - AWS region
✅ SMTP_FROM (all environments) - From email address
✅ SMTP_FROM_NAME (all environments) - From name

⚠️ AWS_ACCESS_KEY_ID (all environments) - REMOVE
⚠️ AWS_SECRET_ACCESS_KEY (all environments) - REMOVE
⚠️ RESEND_API_KEY (all environments) - OPTIONAL (remove if using AWS SES exclusively)
⚠️ SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE (Preview, Production) - OPTIONAL (remove if using AWS SES exclusively)
```
