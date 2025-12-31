#!/bin/bash
# Helper script to apply migrations and refresh schema cache

set -e

echo "🔄 Applying migrations..."
supabase migration up

echo "🔄 Restarting Supabase to refresh PostgREST schema cache..."
supabase stop
supabase start

echo "✅ Migrations applied and schema cache refreshed!"
echo ""
echo "📊 Migration status:"
supabase migration list

echo ""
echo "💡 Tip: If you still see schema cache errors, wait a few seconds for PostgREST to fully initialize."
