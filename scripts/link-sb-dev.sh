#!/bin/bash
# Link to Dev Supabase (Remote project)
# This ensures we're working with the staging instance, not local

set -e

echo "🔗 Linking to Dev Supabase"
echo "===================================="
echo ""

# Check if .env.dev exists
if [ ! -f .env.dev ]; then
    echo "❌ Error: .env.dev file not found"
    echo ""
    echo "Please create .env.dev with the following variables:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo "  DATABASE_URL=postgresql://postgres:password@db.your-project-ref.supabase.co:5432/postgres"
    exit 1
fi

# Source .env.dev to get environment variables
echo "📋 Loading environment from .env.dev..."
set -a
source .env.dev
set +a

# Extract project ref from SUPABASE_URL
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's/.*\/\/\([^.]*\).*/\1/')

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Error: Could not find project ref in NEXT_PUBLIC_SUPABASE_URL"
    echo "   Expected format: https://your-project-ref.supabase.co"
    exit 1
fi

echo "📋 Project Ref: $PROJECT_REF"
echo ""

# Unlink any existing project (ignore errors if not linked)
echo "1️⃣  Unlinking any existing project..."
npx supabase unlink 2>/dev/null || true

# Extract database password from DATABASE_URL if available
DB_PASSWORD=""
if [ -n "$DATABASE_URL" ] && [[ ! "$DATABASE_URL" =~ "YOUR-DB-PASSWORD" ]]; then
    DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
fi

# Link to dev project
echo "2️⃣  Linking to dev project..."
if [ -n "$DB_PASSWORD" ] && [ "$DB_PASSWORD" != "" ]; then
    echo "   Using database password from DATABASE_URL..."
    echo "$DB_PASSWORD" | npx supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"
else
    echo "   Linking without password (you may be prompted for database password)..."
    npx supabase link --project-ref "$PROJECT_REF"
fi

# Verify we're linked
echo ""
echo "3️⃣  Verifying connection..."
if npx supabase projects list > /dev/null 2>&1; then
    echo "✅ Successfully linked to dev project"
else
    echo "⚠️  Could not verify connection, but link should have completed"
fi

echo ""
echo "✅ Successfully configured for Dev Supabase"
echo ""
echo "📋 Project Information:"
echo "   Project Ref: $PROJECT_REF"
echo "   API URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""
echo "🌐 Dev Supabase URLs:"
echo "   Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "   API:       $NEXT_PUBLIC_SUPABASE_URL"
if [ -n "$DATABASE_URL" ]; then
    echo "   Database:  (from DATABASE_URL)"
fi
echo ""
echo "💡 Tips:"
echo "   - Use 'supabase db push' to push migrations to dev"
echo "   - Use 'supabase db push --include-all' if you have local migrations before remote"
echo "   - Use 'supabase db pull' to pull schema from dev"
echo "   - Use 'supabase migration list' to see migration status"
echo "   - Use '.env.dev' for dev environment variables"
echo "   - Be careful: This is the DEV environment!"
echo ""
echo "📝 Next steps:"
echo "   To push migrations: supabase db push --include-all"
echo ""
