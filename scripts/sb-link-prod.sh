#!/bin/bash
# Link to Production Supabase (Remote project)
# This ensures we're working with the production instance.
# Mirrors scripts/sb-link-staging.sh but sources .env.production.

set -e

echo "🔗 Linking to PRODUCTION Supabase"
echo "===================================="
echo "⚠️  This is the PRODUCTION environment. Be careful with destructive commands."
echo ""

if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found"
    echo ""
    echo "Please create .env.production with the following variables:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo "  DATABASE_URL=postgresql://postgres:password@db.your-project-ref.supabase.co:5432/postgres"
    exit 1
fi

echo "📋 Loading environment from .env.production..."
set -a
source .env.production
set +a

PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's/.*\/\/\([^.]*\).*/\1/')

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Error: Could not find project ref in NEXT_PUBLIC_SUPABASE_URL"
    echo "   Expected format: https://your-project-ref.supabase.co"
    exit 1
fi

echo "📋 Project Ref: $PROJECT_REF"
echo ""

echo "1️⃣  Unlinking any existing project..."
npx supabase unlink 2>/dev/null || true

DB_PASSWORD=""
if [ -n "$DATABASE_URL" ] && [[ ! "$DATABASE_URL" =~ "YOUR-DB-PASSWORD" ]]; then
    DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
fi

echo "2️⃣  Linking to production project..."
if [ -n "$DB_PASSWORD" ] && [ "$DB_PASSWORD" != "" ]; then
    echo "   Using database password from DATABASE_URL..."
    echo "$DB_PASSWORD" | npx supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"
else
    echo "   Linking without password (you may be prompted for database password)..."
    npx supabase link --project-ref "$PROJECT_REF"
fi

echo ""
echo "3️⃣  Verifying connection..."
if npx supabase projects list > /dev/null 2>&1; then
    echo "✅ Successfully linked to production project"
else
    echo "⚠️  Could not verify connection, but link should have completed"
fi

echo ""
echo "✅ Successfully configured for PRODUCTION Supabase"
echo ""
echo "📋 Project Information:"
echo "   Project Ref: $PROJECT_REF"
echo "   API URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""
echo "🌐 Production Supabase URLs:"
echo "   Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "   API:       $NEXT_PUBLIC_SUPABASE_URL"
echo ""
echo "💡 Tips:"
echo "   - Use 'npm run db:push' to push migrations to production"
echo "   - Use 'supabase db pull' to pull schema from production"
echo "   - Use 'supabase migration list' to see migration status"
echo "   - When done, switch back: npm run sb:link:staging"
echo ""
echo "🚨 You are linked to PRODUCTION. Switch back to staging when done."
