/**
 * One-off: sync Kim Byars's auth user email and full_name to match her profile.
 * She's the only email-drift case in prod (audit-profile-auth-email-drift.ts).
 *
 * Before:
 *   profile.email = kbyars@involvedtalent.com  (correct)
 *   auth.users.email = kbyers@involvedtalent.com  (typo)
 *   auth.user_metadata.full_name = "Kim Byers"  (typo)
 *
 * After:
 *   auth.users.email = kbyars@involvedtalent.com
 *   auth.user_metadata.full_name = "Kim Byars"
 *   email_confirm: true  (bypass re-verification — old address is a typo, can't confirm)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

function loadEnv(file: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('=')
    env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }
  return env
}

const prodEnv = loadEnv('.env.production')
const prod = createClient(prodEnv.NEXT_PUBLIC_SUPABASE_URL, prodEnv.SUPABASE_SERVICE_ROLE_KEY)

const AUTH_USER_ID = '13459e0b-fa19-45df-9836-f4392d0267b6'
const TARGET_EMAIL = 'kbyars@involvedtalent.com'
const TARGET_NAME = 'Kim Byars'

async function main() {
  console.log('Fetching current auth user state...')
  const { data: before, error: getErr } = await prod.auth.admin.getUserById(AUTH_USER_ID)
  if (getErr || !before?.user) {
    console.error('Failed to fetch auth user:', getErr)
    process.exit(1)
  }
  console.log(`  before: email=${before.user.email}, full_name=${(before.user.user_metadata as Record<string, unknown>)?.full_name}`)

  if (before.user.email === TARGET_EMAIL && (before.user.user_metadata as Record<string, unknown>)?.full_name === TARGET_NAME) {
    console.log('\nAlready in target state. Nothing to do.')
    return
  }

  console.log(`\nUpdating to: email=${TARGET_EMAIL}, full_name="${TARGET_NAME}"`)
  const { data: after, error: updErr } = await prod.auth.admin.updateUserById(AUTH_USER_ID, {
    email: TARGET_EMAIL,
    email_confirm: true,
    user_metadata: {
      ...(before.user.user_metadata ?? {}),
      full_name: TARGET_NAME,
    },
  })
  if (updErr) {
    console.error('Update failed:', updErr)
    process.exit(1)
  }
  console.log(`  after:  email=${after?.user?.email}, full_name=${(after?.user?.user_metadata as Record<string, unknown>)?.full_name}`)
  console.log('\nDone. Re-run audit-profile-auth-email-drift.ts to confirm 0 drift.')
}

main().catch((e) => { console.error(e); process.exit(1) })
