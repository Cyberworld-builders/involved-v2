#!/bin/bash

# Script to test E2E authentication setup
# This verifies that the global setup can authenticate successfully

set -e

echo "🔍 Checking E2E Test Authentication Setup..."
echo ""

# Check if .env.local exists and load it
if [ -f .env.local ]; then
  echo "✅ Found .env.local, loading environment variables..."
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo "⚠️  No .env.local found"
fi

# Check required environment variables
echo ""
echo "Environment Variables:"
echo "  NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:+✅ set}"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:+✅ set}"
echo "  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:+✅ set}"
echo "  PLAYWRIGHT_TEST_EMAIL: ${PLAYWRIGHT_TEST_EMAIL:-⚠️  not set (will use default)}"
echo "  PLAYWRIGHT_TEST_PASSWORD: ${PLAYWRIGHT_TEST_PASSWORD:-⚠️  not set (will use default)}"
echo ""

# Set defaults if not provided
export PLAYWRIGHT_TEST_EMAIL=${PLAYWRIGHT_TEST_EMAIL:-"e2e-test-admin@involved-talent.test"}
export PLAYWRIGHT_TEST_PASSWORD=${PLAYWRIGHT_TEST_PASSWORD:-"TestPassword123!"}

echo "Using test credentials:"
echo "  Email: $PLAYWRIGHT_TEST_EMAIL"
echo "  Password: ${PLAYWRIGHT_TEST_PASSWORD:0:3}***"
echo ""

# Check if dev server is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Development server is running on http://localhost:3000"
else
  echo "⚠️  Development server not running on http://localhost:3000"
  echo "   Start it with: npm run dev"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""
echo "🧪 Running authentication setup test..."
echo ""

# Run just the auth setup test
npm run test:e2e -- e2e/test-auth-setup.test.ts --project=chromium

echo ""
echo "✅ Authentication setup test complete!"
echo ""
echo "If tests passed, you can now run the full test suite:"
echo "  npm run test:e2e"
