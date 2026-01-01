#!/bin/bash
# Vercel Environment Variables Cleanup Script
# This script removes old AWS access keys to ensure OIDC is used

set -e

echo "🧹 Cleaning up Vercel environment variables..."
echo ""
echo "This will remove AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from all environments"
echo "to ensure AWS SES OIDC (AWS_ROLE_ARN) is used instead."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "Removing AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from Development..."
vercel env rm AWS_ACCESS_KEY_ID development --yes
vercel env rm AWS_SECRET_ACCESS_KEY development --yes

echo ""
echo "Removing AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from Preview..."
vercel env rm AWS_ACCESS_KEY_ID preview --yes
vercel env rm AWS_SECRET_ACCESS_KEY preview --yes

echo ""
echo "Removing AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from Production..."
vercel env rm AWS_ACCESS_KEY_ID production --yes
vercel env rm AWS_SECRET_ACCESS_KEY production --yes

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Verify AWS_ROLE_ARN is set correctly in Vercel Dashboard"
echo "   Expected: arn:aws:iam::068732175988:role/talent-assessment-vercel-ses-role"
echo "2. Redeploy your application"
echo "3. Check logs to confirm OIDC is being used (look for 'Using OIDC credentials')"
