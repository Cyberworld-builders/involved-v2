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

async function main() {
  const authIdOnProfile = '13459e0b-fa19-45df-9836-f4392d0267b6'
  const { data, error } = await prod.auth.admin.getUserById(authIdOnProfile)
  console.log('getUserById result:')
  console.log('  error:', error)
  console.log('  data:', data ? JSON.stringify(data, null, 2) : null)

  // Check recent user_invites
  const { data: invites } = await prod
    .from('user_invites')
    .select('*')
    .eq('email', 'kbyars@involvedtalent.com')
    .order('created_at', { ascending: false })
  console.log('\nuser_invites:')
  console.log(JSON.stringify(invites, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
