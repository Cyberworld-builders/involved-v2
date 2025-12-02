#!/bin/bash

# Deploy migrations to staging Supabase project
# Sources .env.staging for configuration

set -e

# Source .env.staging to get environment variables
if [ -f .env.staging ]; then
  echo "📋 Loading environment from .env.staging..."
  set -a
  source .env.staging
  set +a
else
  echo "❌ Error: .env.staging file not found"
  exit 1
fi

# Extract project ref from SUPABASE_URL (now in environment)
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's/.*\/\/\([^.]*\).*/\1/')

if [ -z "$PROJECT_REF" ]; then
  echo "❌ Error: Could not find project ref in .env.staging"
  exit 1
fi

echo "🚀 Deploying migrations to staging Supabase..."
echo "📋 Project Ref: $PROJECT_REF"

# Push migrations to remote database
echo "📤 Pushing migrations..."

# Extract database password from DATABASE_URL if available
DB_PASSWORD=""
if [ -n "$DATABASE_URL" ] && [[ ! "$DATABASE_URL" =~ "YOUR-DB-PASSWORD" ]]; then
  DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
fi

# Use Supabase CLI with database password
echo "📝 Using Supabase CLI..."

# Check if already linked
if [ -f "supabase/.temp/project-ref" ]; then
  CURRENT_REF=$(cat supabase/.temp/project-ref)
  if [ "$CURRENT_REF" != "$PROJECT_REF" ]; then
    echo "⚠️  Project is linked to different ref: $CURRENT_REF"
    echo "   Unlinking and re-linking to $PROJECT_REF..."
    npx supabase unlink 2>/dev/null || true
  else
    echo "✅ Already linked to $PROJECT_REF"
  fi
else
  # Link to staging project using database password
  echo "📎 Linking to staging project with database password..."
  if [ -n "$DB_PASSWORD" ]; then
    echo "$DB_PASSWORD" | npx supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"
  else
    npx supabase link --project-ref "$PROJECT_REF"
  fi
fi

# Push migrations
npx supabase db push

echo ""
echo "✅ Migration deployment complete!"
echo ""
echo "Verify in Supabase Dashboard:"
echo "  - Tables: assessments, dimensions, fields"
echo "  - Storage: assessment-assets bucket"
echo "  - URL: https://supabase.com/dashboard/project/$PROJECT_REF"

