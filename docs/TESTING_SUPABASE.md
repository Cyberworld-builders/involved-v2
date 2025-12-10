# Supabase Connection Testing

This document explains how to test your Supabase connection in the involved-v2 application.

## Overview

The application includes comprehensive utilities to test Supabase connectivity from both client and server contexts.

## Files Added

- **`src/lib/supabase/test-connection.ts`** - Core testing utilities
- **`src/app/api/test-supabase/route.ts`** - API endpoint for server-side testing
- **`src/app/dashboard/test-supabase/page.tsx`** - UI page for manual testing

## Usage

### 1. Using the Dashboard UI (Recommended)

The easiest way to test your Supabase connection:

1. Navigate to `/dashboard/test-supabase` in your browser
2. Click "Run All Tests" to test both browser and server connections
3. View detailed results including:
   - Connection status
   - Environment variable configuration
   - Authentication status
   - Database query capability

### 2. Using the API Endpoint

Test the server-side connection programmatically:

```bash
curl http://localhost:3000/api/test-supabase
```

**Response Example:**

```json
{
  "success": true,
  "message": "Successfully connected to Supabase (server)",
  "details": {
    "hasSession": true,
    "user": "user@example.com",
    "canQueryDatabase": true
  },
  "environment": {
    "hasUrl": true,
    "hasAnonKey": true,
    "allConfigured": true
  },
  "timestamp": "2024-11-20T22:30:00.000Z"
}
```

### 3. Programmatic Testing

Import and use the test utilities in your code:

#### Browser-side Testing

```typescript
import { testBrowserConnection } from '@/lib/supabase/test-connection';

const result = await testBrowserConnection();
console.log(result);
```

#### Server-side Testing

```typescript
import { testServerConnection } from '@/lib/supabase/test-connection';

const result = await testServerConnection();
console.log(result);
```

#### Environment Variable Check

```typescript
import { testEnvironmentVariables } from '@/lib/supabase/test-connection';

const envCheck = testEnvironmentVariables();
if (!envCheck.allConfigured) {
  console.error('Missing environment variables!');
}
```

## What Gets Tested

### 1. Environment Variables
- ✅ `NEXT_PUBLIC_SUPABASE_URL` is set
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

### 2. Authentication
- ✅ Can connect to Supabase Auth
- ✅ Session status (authenticated or not)
- ✅ User information if logged in

### 3. Database Access
- ✅ Can query the `clients` table
- ✅ Row Level Security (RLS) policies working correctly
- ✅ Network connectivity to Supabase

## Interpreting Results

### Success ✅
```json
{
  "success": true,
  "message": "Successfully connected to Supabase",
  "details": {
    "hasSession": true,
    "user": "user@example.com",
    "canQueryDatabase": true
  }
}
```
Everything is working correctly!

### Missing Environment Variables ❌
```json
{
  "success": false,
  "message": "Environment variables not configured",
  "details": {
    "hasUrl": false,
    "hasAnonKey": false
  }
}
```
**Fix:** Add the required environment variables to `.env.local`

### Database Query Failed ❌
```json
{
  "success": false,
  "message": "Connected to Supabase but failed to query database",
  "details": {
    "error": "permission denied for table clients",
    "hasSession": false
  }
}
```
**Fix:** Check your RLS policies or sign in with a valid user

### Connection Error ❌
```json
{
  "success": false,
  "message": "Failed to connect to Supabase",
  "details": {
    "error": "Network error"
  }
}
```
**Fix:** Verify your Supabase URL is correct and your project is active

## Troubleshooting

### Problem: Environment variables not found

**Solution:**
1. Create `.env.local` in the project root
2. Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Restart your development server

### Problem: Database queries fail

**Solution:**
1. Check your Supabase RLS policies
2. Ensure you're authenticated if policies require it
3. Verify the `clients` table exists in your database

### Problem: Tests work locally but fail in production

**Solution:**
1. Verify environment variables are set in your hosting platform (Vercel, etc.)
2. Check that your Supabase project is not paused
3. Verify your production URL is whitelisted in Supabase dashboard

## Integration with CI/CD

You can use the API endpoint in your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Test Supabase Connection
  run: |
    response=$(curl -s http://localhost:3000/api/test-supabase)
    success=$(echo $response | jq -r '.success')
    if [ "$success" != "true" ]; then
      echo "Supabase connection test failed"
      exit 1
    fi
```

## Development Tips

1. **Run tests after every deployment** to catch configuration issues early
2. **Use the dashboard UI during development** for quick visual feedback
3. **Check the API endpoint** before running database migrations
4. **Monitor the tests** after environment variable changes

## API Reference

### `testBrowserConnection()`
Tests Supabase connection from browser context.

**Returns:** `Promise<ConnectionTestResult>`

### `testServerConnection()`
Tests Supabase connection from server context.

**Returns:** `Promise<ConnectionTestResult>`

### `testEnvironmentVariables()`
Checks if environment variables are configured.

**Returns:** `{ hasUrl: boolean, hasAnonKey: boolean, allConfigured: boolean }`

### `getSupabaseStatus()`
Gets comprehensive status report.

**Returns:** `Promise<{ environment, connectionTest? }>`

## Security Notes

- Test results do **not** expose sensitive credentials
- User email is only shown if you're authenticated
- Environment variable status only shows presence, not values
- Safe to use in production for debugging

---

**Need Help?** Check the `/dashboard/test-supabase` page for interactive testing and troubleshooting tips.

