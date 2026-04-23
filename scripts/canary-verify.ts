/**
 * Quick read-only verification of canary state.
 * Usage: npx tsx scripts/canary-verify.ts --env=staging
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

const envArg = process.argv.find(a => a.startsWith('--env='))?.split('=')[1]
if (envArg !== 'staging' && envArg !== 'production') {
  console.error('--env=staging|production required'); process.exit(1)
}
const file = resolve(__dirname, `../.env.${envArg}`)
const env: Record<string, string> = {}
for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const [k, ...r] = t.split('=')
  env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
console.log(`env=${envArg}  supabase=${env.NEXT_PUBLIC_SUPABASE_URL}`)

async function main() {
  const { data: client } = await sb.from('clients').select('id, name, created_at').eq('name', 'Canary Load Test').maybeSingle()
  if (!client) { console.log('NO CANARY CLIENT'); return }
  console.log(`\nclient: ${client.id}  created_at=${client.created_at}`)

  const { data: profiles } = await sb.from('profiles').select('id, email, name, role, access_level, auth_user_id').eq('client_id', client.id).order('created_at', { ascending: true })
  console.log(`\nprofiles (${profiles?.length ?? 0}):`)
  for (const p of profiles ?? []) console.log(`  ${p.email.padEnd(52)} role=${p.role}/${p.access_level} auth=${p.auth_user_id ? p.auth_user_id.slice(0, 8) : '(none)'}`)

  const { data: assessments } = await sb.from('assessments').select('id, title, type, is_360, status, created_by').like('title', 'Canary 360 %').order('title')
  console.log(`\nassessments (${assessments?.length ?? 0}):`)
  for (const a of assessments ?? []) console.log(`  ${a.title.padEnd(20)} type=${a.type} is_360=${a.is_360} status=${a.status} created_by=${a.created_by.slice(0, 8)}`)

  const { data: assignments } = await sb.from('assignments').select('id, user_id, assessment_id', { count: 'exact' }).in('user_id', (profiles ?? []).map(p => p.id))
  console.log(`\nassignments for canary users: ${assignments?.length ?? 0}`)

  if (assessments?.length) {
    const creators = Array.from(new Set(assessments.map(a => a.created_by)))
    for (const c of creators) {
      const { data: u } = await sb.auth.admin.getUserById(c)
      console.log(`\ncreated_by ${c} → auth email=${u?.user?.email ?? '(missing)'}`)
    }
  }

  const { data: adminProfile } = await sb.from('profiles').select('id, email, role, access_level, client_id, auth_user_id').eq('email', 'canary-admin@simulator.amazonses.com')
  console.log(`\ncanary-admin profile rows across all clients: ${adminProfile?.length ?? 0}`)
  for (const p of adminProfile ?? []) console.log(`  profile_id=${p.id.slice(0, 8)} client_id=${p.client_id?.slice(0, 8) ?? '(none)'} role=${p.role}/${p.access_level} auth=${p.auth_user_id?.slice(0, 8)}`)
}
main().catch(e => { console.error(e); process.exit(1) })
