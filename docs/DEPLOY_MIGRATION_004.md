# Deploy Migration 004 to Staging

This migration creates the assessments, dimensions, and fields tables for the assessment management system.

## Staging Project Details
- **Project URL**: https://cbpomvoxtxvsatkozhng.supabase.co
- **Project Ref**: cbpomvoxtxvsatkozhng
- **Region**: East US (North Virginia)

## Method 1: Using Supabase Dashboard SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your staging project: **Involved v2**

2. **Open SQL Editor**
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Apply Migration**
   - Copy the entire contents of `supabase/migrations/004_create_assessments_and_related_tables.sql`
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

4. **Verify Migration**
   - Check that tables were created:
     - Go to **Table Editor** → You should see `assessments`, `dimensions`, and `fields` tables
   - Check storage bucket:
     - Go to **Storage** → You should see `assessment-assets` bucket

## Method 2: Using Supabase CLI (If Authenticated)

If you have Supabase CLI authenticated:

```bash
# Login to Supabase
npx supabase login

# Link to staging project
npx supabase link --project-ref cbpomvoxtxvsatkozhng

# Push migrations
npx supabase db push
```

## What This Migration Creates

### Tables
- **assessments** - Full assessment data with branding and settings
- **dimensions** - Assessment dimensions with hierarchical support
- **fields** - Assessment fields/questions with anchors stored as JSONB

### Storage
- **assessment-assets** bucket - For logo and background images

### Security
- Row Level Security (RLS) policies for all tables
- Users can only access their own assessments

### Indexes
- Performance indexes on foreign keys and commonly queried fields

## Verification Checklist

After applying the migration, verify:

- [ ] `assessments` table exists with all columns
- [ ] `dimensions` table exists with all columns
- [ ] `fields` table exists with all columns
- [ ] `assessment-assets` storage bucket exists
- [ ] RLS policies are enabled on all tables
- [ ] Storage policies are created for `assessment-assets` bucket

## Next Steps

After migration is applied:
1. Test creating an assessment via the UI
2. Test adding dimensions and fields
3. Test image uploads
4. Verify data persists correctly


