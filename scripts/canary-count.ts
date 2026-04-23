import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

async function main() {
  const envArg = process.argv.find(a => a.startsWith('--env='))?.split('=')[1]
  if (envArg !== 'staging' && envArg !== 'production') { console.error('--env required'); process.exit(1) }
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(resolve(__dirname, `../.env.${envArg}`), 'utf-8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('='); env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: client } = await sb.from('clients').select('id').eq('name', 'Canary Load Test').maybeSingle()
  if (!client) { console.log('no client'); return }
  const { count: profCount } = await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('client_id', client.id)
  const { data: assessments } = await sb.from('assessments').select('id').like('title', 'Canary 360 %')
  const assessmentIds = (assessments ?? []).map(a => a.id)
  const { count: assignCount } = await sb.from('assignments').select('id', { count: 'exact', head: true }).in('assessment_id', assessmentIds)
  console.log(`profiles in canary client: ${profCount}`)
  console.log(`canary assessments: ${assessmentIds.length}`)
  console.log(`assignments pointing at canary assessments: ${assignCount}`)
}
main().catch(e => { console.error(e); process.exit(1) })
