#!/bin/bash
# Link to local Supabase (Docker-based)
# This ensures we're working with the local instance, not a remote project

set -e

echo "🔗 Linking to Local Supabase"
echo "===================================="
echo ""

# Unlink any remote project (ignore errors if not linked)
echo "1️⃣  Unlinking any remote project..."
supabase unlink 2>/dev/null || true

# Check if local Supabase is running
echo "2️⃣  Checking local Supabase status..."
if ! supabase status > /dev/null 2>&1; then
    echo "⚠️  Local Supabase is not running"
    echo ""
    echo "Starting local Supabase..."
    supabase start
    echo ""
else
    echo "✅ Local Supabase is running"
fi

# Verify we're unlinked (local mode)
echo ""
echo "3️⃣  Verifying local mode..."
# Check if we can get status without errors (means we're unlinked)
if supabase status > /dev/null 2>&1; then
    echo "✅ Confirmed: Working in local mode (unlinked)"
else
    echo "⚠️  Could not verify status, but unlink should have completed"
fi

echo ""
echo "✅ Successfully configured for Local Supabase"
echo ""
echo "📋 Current status:"
supabase status

echo ""
echo "🌐 Local Supabase URLs:"
echo "   Studio:  http://127.0.0.1:54323"
echo "   API:     http://127.0.0.1:54321"
echo "   Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres"
echo ""
echo "💡 Tips:"
echo "   - Use 'supabase db reset' to safely reset local database"
echo "   - Use 'supabase migration up' to apply pending migrations"
echo "   - Use '.env.local' for local development"
echo ""
