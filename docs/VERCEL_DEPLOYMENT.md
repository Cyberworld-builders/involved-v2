# Vercel Deployment Configuration

## Automatic Deployments Disabled

Automatic deployments from Git are currently **disabled** to prevent rate limiting during active development.

### Current Configuration

The `vercel.json` file contains:
```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

This means:
- ✅ **No automatic deployments** on push/PR
- ✅ **Manual deployments still work** via CLI or dashboard
- ✅ **Prevents rate limiting** during active development

## Manual Deployment

### Via Vercel CLI

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Deploy specific branch
vercel --prod --branch=main
```

### Via Vercel Dashboard

1. Go to your project: https://vercel.com/jaylong255s-projects/involved-v2
2. Click "Deployments" tab
3. Click "Deploy" button
4. Select branch and environment

## Re-enabling Automatic Deployments

When ready to re-enable automatic deployments:

1. **Option 1: Remove from vercel.json**
   ```bash
   # Delete or modify vercel.json
   rm vercel.json
   # Or set deploymentEnabled to true
   ```

2. **Option 2: Update via Vercel Dashboard**
   - Go to Project Settings → Git
   - Enable "Automatic deployments from Git"

3. **Option 3: Use Ignored Build Step**
   Instead of disabling all deployments, you can use an "Ignored Build Step" to conditionally skip builds:
   ```json
   {
     "ignoreCommand": "bash scripts/vercel-ignore-build.sh"
   }
   ```

## Ignored Build Step Alternative

If you want to keep deployments enabled but skip builds conditionally, create a script:

```bash
#!/bin/bash
# scripts/vercel-ignore-build.sh

# Skip builds for non-main branches during active development
if [[ "$VERCEL_GIT_COMMIT_REF" != "main" ]] ; then
  echo "🛑 - Skipping build for branch: $VERCEL_GIT_COMMIT_REF"
  exit 0
fi

echo "✅ - Building for branch: $VERCEL_GIT_COMMIT_REF"
exit 1
```

Then in `vercel.json`:
```json
{
  "ignoreCommand": "bash scripts/vercel-ignore-build.sh"
}
```

## Current Status

- **Automatic Deployments**: ❌ Disabled
- **Manual Deployments**: ✅ Available
- **Rate Limiting**: ✅ Avoided

## When to Re-enable

Consider re-enabling automatic deployments when:
- Development pace slows down
- You want CI/CD integration
- You're ready for automatic preview deployments on PRs
- Rate limiting is no longer a concern
