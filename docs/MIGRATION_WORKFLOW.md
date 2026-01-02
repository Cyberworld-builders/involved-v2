# Supabase Migration Workflow Guide

## The Problem

We've been experiencing issues where migrations aren't properly applied and we have to resort to `supabase db reset`. This document outlines the correct workflow to avoid these issues.

**Key Issue:** Migration 013 was marked as applied in `schema_migrations` table, but the actual SQL changes weren't executed. This created an inconsistent state where the migration system thought the column existed, but it didn't.

## Root Causes

1. **PostgREST Schema Cache**: PostgREST caches the database schema and doesn't automatically refresh after migrations
2. **Missing Migration Numbers**: Gaps in migration numbering (e.g., missing 015) can cause confusion
3. **Inconsistent Workflow**: Mixing `db reset` with `migration up` causes state inconsistencies
4. **Remote vs Local Sync**: Migrations applied locally but not remotely (or vice versa)

## Correct Migration Workflow

### 1. Creating a New Migration

```bash
# Always use the Supabase CLI to create migrations
supabase migration new <descriptive_name>

# Example:
supabase migration new create_answers_table
# This creates: supabase/migrations/YYYYMMDDHHMMSS_create_answers_table.sql
```

**DO NOT:**
- Manually create migration files with custom numbers
- Skip migration numbers
- Create files like `017_create_answers_table.sql` manually

### 2. Writing Migration SQL

**Best Practices:**
- Use `IF NOT EXISTS` for idempotency
- Use `CREATE OR REPLACE` for functions
- Always include `DROP CONSTRAINT IF EXISTS` before adding constraints
- Test migrations on a clean database first

**Example:**
```sql
-- Good: Idempotent migration
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status TEXT;

-- Bad: Will fail if column exists
ALTER TABLE profiles
ADD COLUMN status TEXT;
```

### 3. Applying Migrations Locally

**For Local Development:**

```bash
# Option 1: Apply new migrations (recommended for ongoing development)
supabase migration up

# Option 2: Reset everything (only when you need a clean slate)
supabase db reset
```

**When to use each:**
- `migration up`: When you've created new migrations and want to apply them
- `db reset`: When you want to start fresh (drops all data, reapplies all migrations)

### 4. Refreshing PostgREST Schema Cache

**The Critical Step:** After applying migrations, PostgREST needs to refresh its schema cache.

```bash
# Restart Supabase to refresh schema cache
supabase stop
supabase start

# OR just restart the API service
supabase stop --no-backup
supabase start
```

**Why this is necessary:**
- PostgREST caches the database schema for performance
- When you add columns/tables via migrations, the cache becomes stale
- Restarting forces PostgREST to reload the schema

### 5. Checking Migration Status

```bash
# Check which migrations are applied
supabase migration list

# This shows:
# - Local migrations (files in supabase/migrations/)
# - Remote migrations (applied to remote database)
# - Time applied
```

**What to look for:**
- ✅ All local migrations should be applied remotely
- ⚠️ If local > remote: You need to push migrations
- ⚠️ If remote > local: You need to pull migrations

### 6. Pushing Migrations to Remote

```bash
# Push local migrations to remote database
supabase db push

# This applies all local migrations that haven't been applied remotely
```

**Important:** Always test migrations locally first before pushing to remote!

## Complete Workflow Example

### Scenario: Adding a new column to profiles table

```bash
# 1. Create migration
supabase migration new add_status_to_profiles

# 2. Edit the migration file
# File: supabase/migrations/YYYYMMDDHHMMSS_add_status_to_profiles.sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

# 3. Apply locally
supabase migration up

# 4. Restart to refresh schema cache
supabase stop
supabase start

# 5. Test your changes
# ... test your API endpoints ...

# 6. Check migration status
supabase migration list

# 7. Push to remote (when ready)
supabase db push
```

## Common Issues and Solutions

### Issue 1: "Column not found in schema cache"

**Symptom:**
```
Error: Could not find the 'status' column of 'profiles' in the schema cache
```

**Solution:**
```bash
# Restart Supabase to refresh schema cache
supabase stop
supabase start
```

**Prevention:** Always restart after applying migrations

### Issue 2: Migration conflicts

**Symptom:**
```
Error: duplicate key value violates unique constraint "schema_migrations_pkey"
```

**Solution:**
1. Check migration list: `supabase migration list`
2. Identify duplicate or missing migrations
3. Rename migrations to fix numbering gaps
4. Manually sync schema_migrations table if needed

**Prevention:** Always use `supabase migration new` to create migrations

### Issue 2b: Migration marked as applied but changes not executed

**Symptom:**
- Migration appears in `schema_migrations` table
- But the actual database changes (columns, tables) don't exist
- Error: "Could not find the 'column' in the schema cache"

**Solution:**
1. Create a new idempotent migration to ensure the changes exist:
   ```bash
   supabase migration new ensure_column_exists
   ```
2. Write idempotent SQL that checks if the change exists before applying:
   ```sql
   DO $$
   BEGIN
       IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'profiles' AND column_name = 'status'
       ) THEN
           ALTER TABLE profiles ADD COLUMN status TEXT;
       END IF;
   END $$;
   ```
3. Apply the migration: `npm run db:migrate:refresh`

**Prevention:** 
- Always use `IF NOT EXISTS` in migrations
- Test migrations on clean database before applying
- Verify changes exist after migration: `psql -c "SELECT ... FROM information_schema.columns ..."`

### Issue 3: Migrations applied locally but not remotely

**Symptom:**
- Migration list shows local migrations not applied remotely
- Remote database missing columns/tables

**Solution:**
```bash
# Push local migrations to remote
supabase db push
```

**Prevention:** Always push migrations after testing locally

### Issue 4: Need to rollback a migration

**Symptom:**
- Migration applied but needs to be undone

**Solution:**
```bash
# Option 1: Create a new migration to undo changes
supabase migration new revert_previous_change
# Write SQL to undo the previous migration

# Option 2: Reset and reapply (local only, loses data)
supabase db reset
```

**Note:** Supabase doesn't support automatic rollbacks. Always create reverse migrations.

## Migration Numbering

**DO:**
- Let Supabase CLI generate migration numbers automatically
- Use descriptive names: `create_answers_table`, `add_status_to_profiles`

**DON'T:**
- Manually number migrations (e.g., `017_create_answers_table.sql`)
- Skip numbers
- Use generic names: `migration_1`, `update_table`

## Testing Migrations

### Before Applying:

1. **Review SQL carefully**
   - Check for syntax errors
   - Verify idempotency (can run multiple times safely)
   - Check for data loss risks

2. **Test on clean database:**
   ```bash
   # Create a test database
   supabase db reset
   supabase migration up
   ```

3. **Verify schema:**
   ```bash
   # Check tables/columns exist
   supabase db diff
   ```

### After Applying:

1. **Restart Supabase:**
   ```bash
   supabase stop && supabase start
   ```

2. **Test API endpoints:**
   - Verify new columns are accessible
   - Test queries that use new schema

3. **Check migration status:**
   ```bash
   supabase migration list
   ```

## Automation Script

Create a helper script to automate the workflow:

```bash
#!/bin/bash
# File: scripts/apply-migration.sh

echo "Applying migrations..."
supabase migration up

echo "Restarting Supabase to refresh schema cache..."
supabase stop
supabase start

echo "Migration applied and schema cache refreshed!"
echo "Run 'supabase migration list' to verify"
```

## Checklist for Every Migration

- [ ] Created migration using `supabase migration new`
- [ ] Wrote idempotent SQL (uses `IF NOT EXISTS`, etc.)
- [ ] Tested migration on clean database
- [ ] Applied migration with `supabase migration up`
- [ ] Restarted Supabase (`supabase stop && supabase start`)
- [ ] Tested API endpoints that use new schema
- [ ] Verified with `supabase migration list`
- [ ] Pushed to remote when ready (`supabase db push`)

## Summary

**The Golden Rules:**

1. ✅ Always use `supabase migration new` to create migrations
2. ✅ Always restart Supabase after applying migrations (`supabase stop && supabase start`)
3. ✅ Always test migrations locally before pushing to remote
4. ✅ Always use idempotent SQL (`IF NOT EXISTS`, etc.)
5. ✅ Always check migration status with `supabase migration list`

**The Workflow:**
```
Create → Write SQL → Apply → Restart → Test → Push
```

Following this workflow will eliminate the need for frequent `db reset` operations.

