# Remote Supabase Migration Workflow

## Current Status

You're connected to **staging Supabase** (not local). Here's what you need to know:

## Migration Status

From `supabase migration list`:
- ✅ Migrations 001-014: Applied both locally and remotely
- ⚠️ Migration 016: Local only (needs to be pushed)
- ⚠️ Migration 017: Local only (needs to be pushed)  
- ⚠️ Migration 20251230090835: Local only (needs to be pushed)

## Pushing Migrations to Remote

### Before Pushing

1. **Review the migrations:**
   ```bash
   # Check what will be applied
   supabase migration list
   ```

2. **Verify migration SQL is safe:**
   - Uses `IF NOT EXISTS` for idempotency
   - Won't break existing data
   - Has been tested locally

3. **Backup remote database** (if possible):
   - Use Supabase dashboard to create a backup
   - Or use `pg_dump` if you have direct access

### Pushing Migrations

```bash
# Push all local migrations to remote
supabase db push
```

**What this does:**
- Applies migrations 016, 017, and 20251230090835 to staging
- Updates the remote `schema_migrations` table
- **PostgREST cache refreshes automatically** (no restart needed on remote)

### After Pushing

1. **Verify migrations were applied:**
   ```bash
   supabase migration list
   # Should show all migrations with Remote column filled
   ```

2. **Test your API endpoints:**
   - Verify new columns/tables are accessible
   - Test functionality that uses new schema

3. **Check for errors:**
   - Review Supabase dashboard logs
   - Test API endpoints that use new schema

## Important Differences: Remote vs Local

### Local Development
- Need to restart Supabase after migrations (`supabase stop && supabase start`)
- PostgREST cache doesn't auto-refresh
- Use `npm run db:migrate:refresh` (applies + restarts)

### Remote/Staging
- **No restart needed** - PostgREST refreshes automatically
- Use `supabase db push` to apply migrations
- Changes are immediate (no restart step)

## Safety Checklist for Remote Migrations

- [ ] Reviewed migration SQL for safety
- [ ] Verified migrations use `IF NOT EXISTS` (idempotent)
- [ ] Tested migrations locally first
- [ ] Checked `supabase migration list` to see what will be pushed
- [ ] Have backup of remote database (if critical)
- [ ] Ready to push: `supabase db push`
- [ ] Verified migrations applied: `supabase migration list`
- [ ] Tested API endpoints after push

## Rollback Strategy

**If a migration fails on remote:**

1. **Don't panic** - Supabase will rollback the transaction
2. **Check the error** in Supabase dashboard or logs
3. **Fix the migration** locally
4. **Create a new migration** to fix the issue (don't modify existing migrations)
5. **Test locally** before pushing again

**Note:** Supabase doesn't support automatic rollbacks. Always create reverse migrations if needed.

## Current Migrations to Push

### Migration 016: `enhance_assessments_for_legacy_compatibility.sql`
- Adds `insights_table` column to fields table
- Should be safe (uses `IF NOT EXISTS`)

### Migration 017: `create_answers_table.sql`
- Creates answers table
- Should be safe (creates new table)

### Migration 20251230090835: `ensure_status_column_exists.sql`
- Ensures status column exists in profiles
- Should be safe (idempotent, checks before adding)

## Ready to Push?

Run:
```bash
supabase db push
```

This will apply all three migrations to staging. PostgREST will automatically refresh its schema cache.

