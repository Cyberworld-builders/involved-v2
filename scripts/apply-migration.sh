#!/bin/bash
# Helper script to apply migrations and refresh schema cache

set -e

echo "🔄 Applying migrations..."
supabase migration up

echo "🔄 Restarting Supabase to refresh PostgREST schema cache..."
supabase stop
supabase start

# Wait for services to be ready (especially PostgREST)
echo "⏳ Waiting for services to initialize..."
sleep 5

# Verify PostgREST is responding
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s -f http://127.0.0.1:54321/rest/v1/ > /dev/null 2>&1; then
    echo "✅ PostgREST is ready!"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "   Waiting for PostgREST... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "⚠️  Warning: PostgREST may not be fully ready. If you see schema cache errors, wait a few more seconds."
fi

echo "✅ Migrations applied and schema cache refreshed!"
echo ""
echo "📊 Migration status:"
supabase migration list

echo ""
echo "💡 Tip: If you still see schema cache errors, wait a few seconds for PostgREST to fully initialize."

