// Authenticate as canary admin and hit /api/admin/email-campaign on staging,
// dump the response. Used to diagnose dashboard render issues.
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

const APP_URL = 'https://involved-v2.cyberworldbuilders.dev'
const CANARY_ADMIN_EMAIL = 'canary-admin@simulator.amazonses.com'
const CANARY_ADMIN_PASSWORD = 'CanaryAdmin!123'

function buildAuthCookie(supabaseUrl: string, session: { access_token: string; refresh_token: string }): string {
  const projectRef = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0]
  const tokenName = `sb-${projectRef}-auth-token`
  const cookieValue = encodeURIComponent(JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: 'bearer',
    user: null,
  }))
  return `${tokenName}=${cookieValue}`
}

async function main() {
  const surveyId = process.argv.find(a => a.startsWith('--survey='))?.split('=')[1]
  if (!surveyId) { console.error('--survey=<id> required'); process.exit(1) }

  const env: Record<string,string> = {}
  for (const line of fs.readFileSync(resolve(__dirname, `../.env.staging`), 'utf-8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('='); env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }

  // Sign in as canary admin via the staging Supabase
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await sb.auth.signInWithPassword({ email: CANARY_ADMIN_EMAIL, password: CANARY_ADMIN_PASSWORD })
  if (error || !data.session) { console.error('sign-in failed:', error); process.exit(1) }

  // We need the canary admin to have super_admin access_level for the API to allow them.
  // The seed function sets it to 'super_admin' — but let's check.
  const adminSb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: profile } = await adminSb.from('profiles').select('access_level, role').eq('email', CANARY_ADMIN_EMAIL).single()
  console.log('canary admin profile:', profile)

  if (profile?.access_level !== 'super_admin') {
    console.log('elevating canary admin to super_admin temporarily...')
    await adminSb.from('profiles').update({ access_level: 'super_admin' }).eq('email', CANARY_ADMIN_EMAIL)
  }

  const cookie = buildAuthCookie(env.NEXT_PUBLIC_SUPABASE_URL, data.session)

  const url = `${APP_URL}/api/admin/email-campaign?survey=${surveyId}`
  console.log(`\nGET ${url}`)
  const resp = await fetch(url, { headers: { Cookie: cookie } })
  console.log(`status: ${resp.status}`)
  const body = await resp.text()
  try {
    const json = JSON.parse(body)
    console.log('response:')
    console.log(JSON.stringify(json, null, 2).slice(0, 3000))
  } catch {
    console.log('non-JSON response:', body.slice(0, 500))
  }
}
main().catch(e => { console.error(e); process.exit(1) })
