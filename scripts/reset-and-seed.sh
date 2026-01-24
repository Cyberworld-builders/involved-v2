#!/bin/bash
# Reset database and run all seeders in the correct order
# This ensures the admin user is created before the 360-demo seeder runs

set -e

echo "🔄 Resetting database..."
supabase db reset

# Wait for services to be ready (especially PostgREST)
echo ""
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
  echo "⚠️  Warning: PostgREST may not be fully ready. The seeder may fail if services aren't ready."
fi

echo ""
echo "🌱 Running 360-demo seeder..."
npm run seed:360-demo

echo ""
echo "✅ Database reset and seeding complete!"
echo ""
echo "📊 Migration status:"
supabase migration list
