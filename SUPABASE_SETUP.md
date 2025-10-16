# Supabase Setup Instructions

This document provides step-by-step instructions for setting up Supabase for the Involved Talent v2 application.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `involved-talent-v2`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

## 2. Get Project Credentials

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

## 3. Set Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. Run Database Migrations

### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Run migrations:
   ```bash
   supabase db push
   ```

### Option B: Using Supabase Dashboard

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_create_clients_table.sql`
3. Paste and run the SQL

## 5. Set Up Storage

The migration automatically creates a `client-assets` storage bucket for client logos and background images.

## 6. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure your site URL (e.g., `http://localhost:3000` for development)
3. Add redirect URLs as needed

## 7. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/dashboard/clients`
3. Try creating a new client to test the database connection

## Database Schema

### Clients Table

The `clients` table includes all the fields from the original Laravel application:

- `id` - UUID primary key
- `name` - Client organization name (required)
- `address` - Physical address (optional)
- `logo` - Logo image URL (optional)
- `background` - Background image URL (optional)
- `primary_color` - Brand primary color (optional)
- `accent_color` - Brand accent color (optional)
- `require_profile` - Whether profile completion is required
- `require_research` - Whether research questions are shown
- `whitelabel` - Whether assessments are white-labeled
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Storage Buckets

- `client-assets` - For storing client logos and background images

## Security

- Row Level Security (RLS) is enabled on the `clients` table
- Only authenticated users can perform CRUD operations
- Storage policies restrict access to authenticated users only

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that your environment variables are set correctly
   - Ensure you're using the correct project URL and anon key

2. **"Permission denied" error**
   - Verify that RLS policies are set up correctly
   - Check that the user is authenticated

3. **Storage upload fails**
   - Ensure the `client-assets` bucket exists
   - Check storage policies are configured

4. **Migration fails**
   - Check that you have the correct permissions
   - Verify the SQL syntax is correct

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Join the [Supabase Discord](https://discord.supabase.com)
- Review the project's GitHub issues
