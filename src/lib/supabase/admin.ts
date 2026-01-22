import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with service role key
 * This should ONLY be used in server-side API routes
 * Never expose the service role key to the client
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // #region agent log
  const hasUrl = !!supabaseUrl
  const hasKey = !!serviceRoleKey
  const keyLength = serviceRoleKey?.length || 0
  // #endregion

  if (!supabaseUrl || !serviceRoleKey) {
    // #region agent log
    console.error('createAdminClient: Missing credentials', { hasUrl, hasKey, keyLength })
    // #endregion
    throw new Error('Missing Supabase admin credentials. Check environment variables.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

