# Environment Configuration Guide

This project uses separate environment files for local, staging, and production Supabase configurations.

## Environment Files

### `.env.local` - Local Development (Default)
- **Purpose**: Connect to your local Supabase instance
- **Usage**: Development and testing
- **Contains**: Local Supabase credentials (safe default keys)
- **Status**: ✅ Already configured and ready to use

### `.env.staging` - Staging Environment
- **Purpose**: Connect to your staging Supabase project
- **Usage**: Pre-production testing and QA
- **Contains**: Template for staging credentials (needs to be filled in)
- **Status**: ⚠️ Requires configuration

### `.env.production` - Production Environment (Future)
- **Purpose**: Connect to your production Supabase project
- **Usage**: Production deployment
- **Contains**: Will be created when ready for production
- **Status**: 📅 Not yet created (coming after staging)

### `.env.example` - Template
- **Purpose**: Shows all required environment variables
- **Usage**: Reference for new developers
- **Status**: 📝 Committed to repository (safe to commit)

## Quick Start

### For Local Development (Default)

Your `.env.local` is already configured! Just start your dev server:

```bash
npm run dev
```

This will automatically use the local Supabase instance running at `http://127.0.0.1:54321`.

### For Staging Environment

1. **Get your Supabase credentials:**
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your **staging** project
   - Navigate to **Settings → API**

2. **Update `.env.staging`:**
   ```bash
   # Open the file
   nano .env.staging
   
   # Replace the placeholder values:
   NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key
   ```

3. **Switch to staging:**
   ```bash
   ./switch-env.sh staging
   # or manually:
   cp .env.staging .env.local
   ```

4. **For staging deployment:**
   Set environment variables directly in your deployment platform (Vercel, Netlify, etc.)

### For Production (Coming Soon)

Production environment will be set up after a couple weeks of development and staging validation.

## Switching Between Environments

### Method 1: Use the switcher script (Recommended)
```bash
# Switch to local (default)
./switch-env.sh local

# Switch to staging
./switch-env.sh staging

# Switch to production (when available)
./switch-env.sh production

# Check current environment
./switch-env.sh
```

### Method 2: Copy the env file manually
```bash
# Switch to local
cp .env.local.backup .env.local

# Switch to staging
cp .env.staging .env.local

# Switch to production (when available)
cp .env.production .env.local
```

### Method 3: Use different scripts
You can add these to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:staging": "./switch-env.sh staging && next dev",
    "dev:local": "./switch-env.sh local && next dev"
  }
}
```

## Environment Variables Explained

| Variable | Description | Public? |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes (sent to browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/anonymous key for client-side | ✅ Yes (sent to browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key with full access | ❌ No (server-only) |
| `DATABASE_URL` | Direct database connection string | ❌ No (server-only) |

**Important**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets in them!

## Security Best Practices

1. ✅ **DO commit** `.env.example` to git (no secrets)
2. ❌ **DON'T commit** `.env.local` or `.env.cloud` (contains credentials)
3. ✅ **DO use** service role key only in server-side code
4. ❌ **DON'T expose** service role key to the browser
5. ✅ **DO rotate** keys if they're accidentally exposed

## Troubleshooting

### Connection Failed
- Check that local Supabase is running: `npx supabase status`
- Verify the URL matches your environment:
  - Local: `127.0.0.1:54321`
  - Staging: `https://your-staging-project.supabase.co`
  - Production: `https://your-production-project.supabase.co`

### Authentication Errors
- Ensure the anon key matches your environment
- For staging/production, verify credentials are from the correct project

### Missing Environment Variables
- Check that `.env.local` exists in the project root
- Restart your dev server after changing env files
- Clear Next.js cache: `rm -rf .next`

## Local Supabase Commands

```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# Check status
npx supabase status

# Reset database
npx supabase db reset
```

## Deployment

### Staging Deployment
1. **Never commit** real credentials to git
2. **Use platform environment variables** (Vercel, Netlify, etc.)
3. **Set these variables** in your staging deployment:
   - `NEXT_PUBLIC_SUPABASE_URL` (staging URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (staging key)
   - `SUPABASE_SERVICE_ROLE_KEY` (staging key)

### Production Deployment (Coming Soon)
Production will be set up after staging is validated and tested for a couple of weeks.

**Production Checklist (for future use):**
- [ ] Create separate production Supabase project
- [ ] Create `.env.production` file
- [ ] Run migrations on production database
- [ ] Set up production deployment pipeline
- [ ] Configure monitoring and alerts

## Need Help?

- Local Supabase: See `SUPABASE_SETUP.md`
- Testing: See `TESTING_SUPABASE.md`
- General setup: See `README.md`

