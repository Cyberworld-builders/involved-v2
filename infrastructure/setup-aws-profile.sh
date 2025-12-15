#!/bin/bash
# Script to set up AWS SSO profile for account 344151725195

echo "Setting up AWS SSO profile for account 344151725195..."

# Check if profile already exists
if grep -q "344151725195" ~/.aws/config; then
    echo "Profile for account 344151725195 already exists!"
    grep -A 5 "344151725195" ~/.aws/config
    exit 0
fi

# Add profile to ~/.aws/config
cat >> ~/.aws/config << 'EOF'

[profile involved-v2-ses]
sso_session = cyberworld
sso_account_id = 344151725195
sso_role_name = AdministratorAccess
region = us-east-1
output = json
EOF

echo "Profile 'involved-v2-ses' added to ~/.aws/config"
echo ""
echo "Next steps:"
echo "1. Login to AWS SSO: aws sso login --profile involved-v2-ses"
echo "2. Verify access: aws sts get-caller-identity --profile involved-v2-ses"
echo "3. Update Terraform to use this profile"
