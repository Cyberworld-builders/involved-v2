#!/bin/bash

# Environment Switcher Script
# Easily switch between local, staging, and production Supabase configurations

set -e

ENV_TYPE=$1

if [ -z "$ENV_TYPE" ]; then
    echo "Usage: ./switch-env.sh [local|staging|production]"
    echo ""
    echo "Current environment:"
    if [ -f .env.local ]; then
        if grep -q "127.0.0.1:54321" .env.local; then
            echo "  💻 Local Supabase (http://127.0.0.1:54321)"
        elif grep -q "staging" .env.local 2>/dev/null; then
            echo "  🔶 Staging Supabase"
        elif grep -q "production" .env.local 2>/dev/null; then
            echo "  🟢 Production Supabase"
        else
            echo "  ☁️  Cloud Supabase (unknown)"
        fi
    else
        echo "  ⚠️  No .env.local file found"
    fi
    exit 1
fi

case $ENV_TYPE in
    local)
        echo "🔄 Switching to LOCAL Supabase..."
        if [ -f .env.local.backup ]; then
            cp .env.local.backup .env.local
        else
            # Recreate from scratch
            cat > .env.local << 'LOCALEOF'
# Local Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
LOCALEOF
        fi
        echo "✅ Switched to LOCAL Supabase (http://127.0.0.1:54321)"
        echo "💡 Make sure local Supabase is running: npx supabase status"
        ;;
    staging)
        echo "🔄 Switching to STAGING Supabase..."
        if [ ! -f .env.staging ]; then
            echo "❌ Error: .env.staging file not found"
            echo "Please create .env.staging with your staging Supabase credentials"
            exit 1
        fi
        # Backup current local env
        cp .env.local .env.local.backup 2>/dev/null || true
        cp .env.staging .env.local
        echo "✅ Switched to STAGING Supabase"
        echo "⚠️  Make sure you've configured .env.staging with your staging credentials"
        ;;
    production)
        echo "🔄 Switching to PRODUCTION Supabase..."
        if [ ! -f .env.production ]; then
            echo "❌ Error: .env.production file not found"
            echo "Please create .env.production with your production Supabase credentials"
            echo ""
            echo "You can copy .env.staging as a template:"
            echo "  cp .env.staging .env.production"
            exit 1
        fi
        # Backup current local env
        cp .env.local .env.local.backup 2>/dev/null || true
        cp .env.production .env.local
        echo "✅ Switched to PRODUCTION Supabase"
        echo "⚠️  Make sure you've configured .env.production with your production credentials"
        echo "⚠️  WARNING: You are now connected to PRODUCTION!"
        ;;
    *)
        echo "❌ Invalid option: $ENV_TYPE"
        echo "Usage: ./switch-env.sh [local|staging|production]"
        exit 1
        ;;
esac

echo ""
echo "🔄 Restart your dev server to apply changes:"
echo "   npm run dev"
